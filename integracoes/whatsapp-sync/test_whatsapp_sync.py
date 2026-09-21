#!/usr/bin/env python3
"""Teste local: SQLite sintético no formato da ponte + servidor HTTP fake do Sales Brain."""
import json, os, sqlite3, subprocess, sys, tempfile, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HERE = Path(__file__).parent
received = []
IGNORE = ["5511900000001@s.whatsapp.net"]


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.headers.get("x-api-key") != "chave-teste":
            self.send_response(401); self.end_headers(); self.wfile.write(b'{"error":"Unauthorized"}'); return
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        received.append(body)
        resp = {"accepted": len(body["messages"]), "skipped": 0, "duplicates": 0,
                "ignore_jids": IGNORE, "cursor_ack": None}
        data = json.dumps(resp).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(data)

    def log_message(self, *a):  # silencioso
        pass


def make_db(path):
    conn = sqlite3.connect(path)
    conn.executescript("""
    CREATE TABLE chats (jid TEXT PRIMARY KEY, name TEXT, last_message_time TIMESTAMP);
    CREATE TABLE messages (id TEXT, chat_jid TEXT, sender TEXT, content TEXT, timestamp TIMESTAMP,
      is_from_me BOOLEAN, media_type TEXT, filename TEXT, url TEXT, media_key BLOB, file_sha256 BLOB,
      file_enc_sha256 BLOB, file_length INTEGER, PRIMARY KEY (id, chat_jid));
    """)
    chats = [("5521988887777@s.whatsapp.net", "Dr. Fulano - Hosp. Santa Clara"),
             ("5511900000001@s.whatsapp.net", "Mãe"),
             ("120363012345@g.us", "Família"),
             ("status@broadcast", None)]
    conn.executemany("INSERT INTO chats VALUES (?,?,NULL)", chats)
    # formato do driver Go: '2026-09-21 14:03:00.123456789-03:00'
    rows = [
        ("A1", "5521988887777@s.whatsapp.net", "5521988887777@s.whatsapp.net", "Bom dia, podemos falar do PS?", "2026-09-21 11:03:00.5-03:00", 0, "", ),
        ("A2", "5521988887777@s.whatsapp.net", "5511999999999@s.whatsapp.net", "Claro, te ligo às 15h", "2026-09-21 11:04:10-03:00", 1, "", ),
        ("A3", "5521988887777@s.whatsapp.net", "5521988887777@s.whatsapp.net", "", "2026-09-21 11:05:00-03:00", 0, "image", ),
        ("B1", "5511900000001@s.whatsapp.net", "5511900000001@s.whatsapp.net", "Vem almoçar domingo?", "2026-09-21 12:00:00-03:00", 0, "", ),
        ("G1", "120363012345@g.us", "5511977776666@s.whatsapp.net", "kkk", "2026-09-21 12:30:00-03:00", 0, "", ),
        ("S1", "status@broadcast", "5521988887777@s.whatsapp.net", "status", "2026-09-21 12:31:00-03:00", 0, "", ),
        ("E1", "5521988887777@s.whatsapp.net", "5521988887777@s.whatsapp.net", "", "2026-09-21 12:32:00-03:00", 0, "", ),
        ("OLD", "5521988887777@s.whatsapp.net", "5521988887777@s.whatsapp.net", "mensagem antiga", "2020-01-01 10:00:00-03:00", 0, "", ),
    ]
    conn.executemany("INSERT INTO messages (id, chat_jid, sender, content, timestamp, is_from_me, media_type) VALUES (?,?,?,?,?,?,?)", rows)
    conn.commit(); conn.close()


def main():
    tmp = Path(tempfile.mkdtemp())
    db = tmp / "messages.db"; make_db(db)
    server = HTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    cfg = {"sales_brain_url": f"http://127.0.0.1:{server.server_port}/ingest-whatsapp", "ingest_api_key": "chave-teste",
           "whatsapp_db_path": str(db), "state_path": str(tmp / "state.json"), "device": "mac-teste",
           "owner_phone": "5511999999999", "batch_size": 3, "initial_lookback_days": 36500}
    cfg_path = tmp / "config.json"; cfg_path.write_text(json.dumps(cfg))
    script = str(HERE / "whatsapp_sync.py")

    # rodada 1: lookback enorme => pega tudo (batch_size 3 força paginação)
    r = subprocess.run([sys.executable, script, "--once", "--config", str(cfg_path)], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
    sent = [m for b in received for m in b["messages"]]
    ids = sorted(m["id"] for m in sent)
    # grupo, broadcast e vazio ficam fora. B1 (chat pessoal) sai porque o servidor devolve
    # ignore_jids já na 1ª página do lote (batch_size 3) e a 2ª página é filtrada localmente.
    assert ids == ["A1", "A2", "A3", "OLD"], ids
    a1 = next(m for m in sent if m["id"] == "A1")
    assert a1["timestamp"] == "2026-09-21T14:03:00Z", a1  # -03:00 -> UTC
    assert a1["sender"] == "5521988887777" and a1["is_from_me"] is False and a1["chat_name"].startswith("Dr. Fulano")
    a2 = next(m for m in sent if m["id"] == "A2"); assert a2["is_from_me"] is True and a2["sender"] == "5511999999999"
    a3 = next(m for m in sent if m["id"] == "A3"); assert a3["media_type"] == "image"
    state = json.loads((tmp / "state.json").read_text())
    assert state["ignore_jids"] == IGNORE and state["cursor"] == "2026-09-21 15:32:00", state
    assert received[-1]["stats"]["db_last_message_time"] is not None

    # rodada 2: nada novo => só heartbeat, e nada reenviado
    n = len(received)
    r = subprocess.run([sys.executable, script, "--once", "--config", str(cfg_path)], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
    assert received[n:][-1]["messages"] == [], received[n:]

    # rodada 3: chega mensagem nova do chat ignorado (Mãe) e do comercial => só o comercial sai do Mac
    conn = sqlite3.connect(db)
    conn.execute("INSERT INTO messages (id, chat_jid, sender, content, timestamp, is_from_me, media_type) VALUES ('B2','5511900000001@s.whatsapp.net','x','oi','2026-09-21 16:00:00-03:00',0,'')")
    conn.execute("INSERT INTO messages (id, chat_jid, sender, content, timestamp, is_from_me, media_type) VALUES ('A4','5521988887777@s.whatsapp.net','x','Proposta recebida, vamos avaliar','2026-09-21 16:01:00-03:00',0,'')")
    conn.commit(); conn.close()
    n = len(received)
    r = subprocess.run([sys.executable, script, "--once", "--config", str(cfg_path)], capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
    new_ids = [m["id"] for b in received[n:] for m in b["messages"]]
    assert new_ids == ["A4"], new_ids

    # chave errada => sai com erro claro
    bad = dict(cfg, ingest_api_key="errada"); (tmp / "bad.json").write_text(json.dumps(bad))
    r = subprocess.run([sys.executable, script, "--once", "--config", str(tmp / "bad.json")], capture_output=True, text=True)
    assert r.returncode != 0 and "recusou a chave" in (r.stdout + r.stderr)

    # dry-run não grava estado nem envia
    n = len(received)
    r = subprocess.run([sys.executable, script, "--once", "--dry-run", "--config", str(cfg_path)], capture_output=True, text=True)
    assert r.returncode == 0 and len(received) == n and '"device": "mac-teste"' in r.stdout
    server.shutdown()
    print("OK: todos os cenários passaram")


if __name__ == "__main__":
    main()
