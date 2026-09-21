#!/usr/bin/env python3
"""
Sidecar de sincronização WhatsApp -> Sales Brain (Doutor-AI).

Lê o banco SQLite da ponte local whatsapp-mcp (whatsapp-bridge/store/messages.db),
mantém um cursor incremental e envia as mensagens novas para a edge function
`ingest-whatsapp` do Sales Brain. Só usa a biblioteca padrão do Python 3.

Privacidade: chats marcados como ignorados/internos pelo Sales Brain (campo
`ignore_jids` da resposta) e chats listados em `local_ignore_jids` da config
nunca saem do Mac. Grupos são ignorados por padrão.

Uso:
  whatsapp_sync.py --once            # uma rodada (modo launchd)
  whatsapp_sync.py --loop            # roda continuamente (intervalo em config)
  whatsapp_sync.py --once --dry-run  # mostra o lote sem enviar
  whatsapp_sync.py --reset-cursor 7  # volta o cursor 7 dias
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import logging
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_CONFIG_PATH = Path.home() / ".whatsapp-sync" / "config.json"
DEFAULT_STATE_PATH = Path.home() / ".whatsapp-sync" / "state.json"
DEFAULT_DB_PATH = Path.home() / "whatsapp-mcp" / "whatsapp-bridge" / "store" / "messages.db"

DEFAULTS = {
    "sales_brain_url": "https://qieinndhyngeruxaqomd.supabase.co/functions/v1/ingest-whatsapp",
    "ingest_api_key": "",
    "whatsapp_db_path": str(DEFAULT_DB_PATH),
    "state_path": str(DEFAULT_STATE_PATH),
    "device": "mac-andre",
    "owner_phone": "",
    "batch_size": 200,
    "include_groups": False,
    "initial_lookback_days": 7,
    "loop_interval_seconds": 60,
    "request_timeout_seconds": 60,
    "local_ignore_jids": [],
}

SQL_FETCH = """
SELECT m.id, m.chat_jid, c.name, m.sender, m.content, m.timestamp, m.is_from_me, m.media_type
FROM messages m
LEFT JOIN chats c ON c.jid = m.chat_jid
WHERE datetime(m.timestamp) >= datetime(?)
ORDER BY datetime(m.timestamp) ASC, m.id ASC
LIMIT ?
"""

SQL_LAST = "SELECT MAX(datetime(timestamp)) FROM messages"

log = logging.getLogger("whatsapp-sync")


# ---------------------------------------------------------------- config/state
def load_config(path: Path) -> dict:
    cfg = dict(DEFAULTS)
    if path.exists():
        with path.open(encoding="utf-8") as fh:
            cfg.update(json.load(fh))
    # variáveis de ambiente têm precedência (útil para launchd/CI)
    env_map = {
        "SALES_BRAIN_URL": "sales_brain_url",
        "INGEST_API_KEY": "ingest_api_key",
        "WHATSAPP_DB_PATH": "whatsapp_db_path",
        "WHATSAPP_SYNC_STATE": "state_path",
        "WHATSAPP_SYNC_DEVICE": "device",
        "WHATSAPP_OWNER_PHONE": "owner_phone",
    }
    for env, key in env_map.items():
        if os.environ.get(env):
            cfg[key] = os.environ[env]
    cfg["whatsapp_db_path"] = os.path.expanduser(str(cfg["whatsapp_db_path"]))
    cfg["state_path"] = os.path.expanduser(str(cfg["state_path"]))
    return cfg


def load_state(path: Path) -> dict:
    if path.exists():
        with path.open(encoding="utf-8") as fh:
            return json.load(fh)
    return {"cursor": None, "boundary_ids": [], "ignore_jids": [], "last_ok_at": None}


def save_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False, indent=2)
    tmp.replace(path)


# ---------------------------------------------------------------- helpers
def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def to_sqlite_utc(d: dt.datetime) -> str:
    return d.astimezone(dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def parse_sqlite_ts(value) -> dt.datetime | None:
    """Aceita os formatos que o driver Go (mattn/go-sqlite3) grava."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return dt.datetime.fromtimestamp(float(value), tz=dt.timezone.utc)
    s = str(value).strip().replace("T", " ")
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    # Go grava até nanossegundos; datetime aceita até microssegundos
    if "." in s:
        head, tail = s.split(".", 1)
        frac = ""
        tz = ""
        for i, ch in enumerate(tail):
            if ch in "+-":
                frac, tz = tail[:i], tail[i:]
                break
        else:
            frac = tail
        s = f"{head}.{frac[:6].ljust(6, '0')}{tz}"
    for fmt in ("%Y-%m-%d %H:%M:%S.%f%z", "%Y-%m-%d %H:%M:%S%z", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
        try:
            parsed = dt.datetime.strptime(s, fmt)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=dt.timezone.utc)
            return parsed
        except ValueError:
            continue
    return None


def jid_phone(jid: str) -> str:
    """Telefone (só dígitos) de um JID individual; vazio para grupos/@lid."""
    if not jid or "@" not in jid:
        return ""
    local, domain = jid.split("@", 1)
    if domain not in ("s.whatsapp.net", "c.us"):
        return ""
    local = local.split(":", 1)[0]
    return "".join(ch for ch in local if ch.isdigit())


def is_group(jid: str) -> bool:
    return jid.endswith("@g.us")


def should_skip(row: dict, cfg: dict, ignore: set[str]) -> str | None:
    jid = row["chat_jid"] or ""
    if jid == "status@broadcast" or jid.endswith("@broadcast"):
        return "broadcast"
    if is_group(jid) and not cfg["include_groups"]:
        return "grupo"
    phone = jid_phone(jid)
    if jid in ignore or (phone and phone in ignore):
        return "ignorado"
    if not (row["content"] or "").strip() and not (row["media_type"] or "").strip():
        return "vazio"
    return None


# ---------------------------------------------------------------- core
def fetch_rows(db_path: str, cursor: str, limit: int) -> list[dict]:
    uri = f"file:{db_path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=10)
    try:
        conn.execute("PRAGMA busy_timeout = 5000")
        conn.row_factory = sqlite3.Row
        rows = conn.execute(SQL_FETCH, (cursor, limit)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def fetch_last_message_time(db_path: str) -> str | None:
    uri = f"file:{db_path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, timeout=10)
    try:
        value = conn.execute(SQL_LAST).fetchone()[0]
        return value
    finally:
        conn.close()


def build_messages(rows: list[dict], cfg: dict, state: dict) -> tuple[list[dict], dict, str | None, list[str]]:
    ignore = set(state.get("ignore_jids") or []) | set(cfg.get("local_ignore_jids") or [])
    boundary_ids = set(state.get("boundary_ids") or [])
    skipped: dict[str, int] = {}
    out: list[dict] = []
    max_ts: dt.datetime | None = None
    max_ids: list[str] = []

    for row in rows:
        ts = parse_sqlite_ts(row["timestamp"])
        if ts is None:
            skipped["timestamp_invalido"] = skipped.get("timestamp_invalido", 0) + 1
            continue
        key = f"{row['id']}|{row['chat_jid']}"
        if state.get("cursor") and to_sqlite_utc(ts) == state["cursor"] and key in boundary_ids:
            continue  # já enviado na rodada anterior (mesmo segundo)

        # avança o cursor mesmo para mensagens puladas, senão o filtro trava
        if max_ts is None or ts > max_ts:
            max_ts, max_ids = ts, [key]
        elif ts == max_ts:
            max_ids.append(key)

        reason = should_skip(row, cfg, ignore)
        if reason:
            skipped[reason] = skipped.get(reason, 0) + 1
            continue

        jid = row["chat_jid"]
        sender_raw = row["sender"] or ""
        sender = "".join(ch for ch in sender_raw.split("@", 1)[0] if ch.isdigit()) or sender_raw
        out.append({
            "id": row["id"],
            "chat_jid": jid,
            "chat_name": row["name"] or "",
            "sender": sender if not row["is_from_me"] else (cfg.get("owner_phone") or "me"),
            "content": row["content"] or "",
            "timestamp": ts.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "is_from_me": bool(row["is_from_me"]),
            "media_type": row["media_type"] or "",
        })

    new_cursor = to_sqlite_utc(max_ts) if max_ts else None
    return out, skipped, new_cursor, max_ids


def post(cfg: dict, payload: dict) -> dict:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        cfg["sales_brain_url"],
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "x-api-key": cfg["ingest_api_key"]},
    )
    delay = 2.0
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(req, timeout=cfg["request_timeout_seconds"]) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as err:
            text = err.read().decode("utf-8", "replace")[:300]
            if err.code in (401, 403):
                raise SystemExit(f"Sales Brain recusou a chave (HTTP {err.code}): {text}")
            if err.code == 413 or err.code < 500:
                raise RuntimeError(f"HTTP {err.code}: {text}")
            log.warning("HTTP %s na tentativa %d: %s", err.code, attempt, text)
        except (urllib.error.URLError, TimeoutError) as err:
            log.warning("Falha de rede na tentativa %d: %s", attempt, err)
        time.sleep(delay)
        delay *= 2
    raise RuntimeError("Sales Brain indisponível após 4 tentativas")


def run_once(cfg: dict, dry_run: bool = False) -> int:
    state_path = Path(cfg["state_path"])
    state = load_state(state_path)
    db_path = cfg["whatsapp_db_path"]
    if not Path(db_path).exists():
        log.error("Banco da ponte não encontrado: %s", db_path)
        return 2
    if not cfg["ingest_api_key"] and not dry_run:
        log.error("ingest_api_key ausente (config.json ou env INGEST_API_KEY)")
        return 2

    if not state.get("cursor"):
        start = utc_now() - dt.timedelta(days=int(cfg["initial_lookback_days"]))
        state["cursor"] = to_sqlite_utc(start)
        state["boundary_ids"] = []
        log.info("Cursor inicial: %s (últimos %s dias)", state["cursor"], cfg["initial_lookback_days"])

    total_sent = 0
    while True:
        rows = fetch_rows(db_path, state["cursor"], int(cfg["batch_size"]))
        messages, skipped, new_cursor, boundary = build_messages(rows, cfg, state)
        last_msg_time = fetch_last_message_time(db_path)
        payload = {
            "device": cfg["device"],
            "owner_phone": cfg.get("owner_phone") or "",
            "messages": messages,
            "stats": {
                "db_last_message_time": last_msg_time,
                "rows_read": len(rows),
                "skipped": skipped,
                "cursor": state["cursor"],
            },
        }
        if dry_run:
            print(json.dumps(payload, ensure_ascii=False, indent=2))
        else:
            resp = post(cfg, payload)
            ignore = resp.get("ignore_jids")
            if isinstance(ignore, list):
                state["ignore_jids"] = sorted({str(x) for x in ignore})
            state["last_ok_at"] = utc_now().isoformat()
            log.info(
                "enviadas=%s aceitas=%s puladas_local=%s puladas_servidor=%s duplicadas=%s",
                len(messages), resp.get("accepted"), sum(skipped.values()), resp.get("skipped"), resp.get("duplicates"),
            )
        total_sent += len(messages)

        if new_cursor:
            if new_cursor == state["cursor"]:
                state["boundary_ids"] = sorted(set(state.get("boundary_ids") or []) | set(boundary))
            else:
                state["cursor"], state["boundary_ids"] = new_cursor, sorted(boundary)
        if not dry_run:
            save_state(state_path, state)
        # continua enquanto o lote veio cheio (há mais mensagens novas)
        if len(rows) < int(cfg["batch_size"]) or not new_cursor or dry_run:
            break
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--once", action="store_true", help="uma rodada e sai (padrão)")
    mode.add_argument("--loop", action="store_true", help="roda continuamente")
    parser.add_argument("--dry-run", action="store_true", help="não envia; imprime o lote")
    parser.add_argument("--reset-cursor", type=int, metavar="DIAS", help="reposiciona o cursor N dias atrás e sai")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        stream=sys.stdout,
    )
    cfg = load_config(Path(os.path.expanduser(args.config)))

    if args.reset_cursor is not None:
        state_path = Path(cfg["state_path"])
        state = load_state(state_path)
        state["cursor"] = to_sqlite_utc(utc_now() - dt.timedelta(days=args.reset_cursor))
        state["boundary_ids"] = []
        save_state(state_path, state)
        log.info("Cursor reposicionado para %s", state["cursor"])
        return 0

    if args.loop:
        interval = int(cfg["loop_interval_seconds"])
        while True:
            try:
                run_once(cfg, dry_run=args.dry_run)
            except SystemExit:
                raise
            except Exception as err:  # noqa: BLE001 - loop resiliente
                log.error("Rodada falhou: %s", err)
            time.sleep(interval)
    return run_once(cfg, dry_run=args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
