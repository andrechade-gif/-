#!/bin/bash
# Instalador do sidecar WhatsApp -> Sales Brain (macOS).
# Uso (um comando, dentro da pasta integracoes/whatsapp-sync do repositório):
#   INGEST_API_KEY='<chave do Lovable>' OWNER_PHONE=5518998145192 bash install.sh
# Variáveis opcionais: WHATSAPP_DB_PATH, DEVICE (padrão mac-andre), LOOKBACK_DAYS (padrão 30)
set -euo pipefail

: "${INGEST_API_KEY:?Defina INGEST_API_KEY (valor do secret INGEST_API_KEY ou SALES_BRAIN_API_KEY no Lovable)}"
OWNER_PHONE="${OWNER_PHONE:-5518998145192}"
DEVICE="${DEVICE:-mac-andre}"
LOOKBACK_DAYS="${LOOKBACK_DAYS:-30}"
WHATSAPP_DB_PATH="${WHATSAPP_DB_PATH:-$HOME/whatsapp-mcp/whatsapp-bridge/store/messages.db}"

HERE="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$HOME/whatsapp-sync"
CFG_DIR="$HOME/.whatsapp-sync"
LABEL="com.doutorai.whatsapp-sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ ! -f "$WHATSAPP_DB_PATH" ]; then
  echo "Banco da ponte não encontrado em $WHATSAPP_DB_PATH."
  echo "Ajuste WHATSAPP_DB_PATH=/caminho/para/store/messages.db e rode de novo."
  exit 2
fi

mkdir -p "$APP_DIR" "$CFG_DIR" "$HOME/Library/Logs" "$HOME/Library/LaunchAgents"
cp "$HERE/whatsapp_sync.py" "$APP_DIR/whatsapp_sync.py"
chmod +x "$APP_DIR/whatsapp_sync.py"

python3 - "$CFG_DIR/config.json" <<PY
import json, sys, os
path = sys.argv[1]
cfg = {}
if os.path.exists(path):
    cfg = json.load(open(path))
cfg.update({
  "sales_brain_url": "https://qieinndhyngeruxaqomd.supabase.co/functions/v1/ingest-whatsapp",
  "ingest_api_key": os.environ["INGEST_API_KEY"],
  "whatsapp_db_path": os.environ["WHATSAPP_DB_PATH"],
  "state_path": os.path.join(os.environ["CFG_DIR"], "state.json"),
  "device": os.environ["DEVICE"],
  "owner_phone": os.environ["OWNER_PHONE"],
  "initial_lookback_days": int(os.environ["LOOKBACK_DAYS"]),
})
cfg.setdefault("batch_size", 200)
cfg.setdefault("include_groups", False)
cfg.setdefault("local_ignore_jids", [])
json.dump(cfg, open(path, "w"), indent=2, ensure_ascii=False)
PY
export CFG_DIR
chmod 600 "$CFG_DIR/config.json"

# primeira rodada agora, para validar chave e banco
python3 "$APP_DIR/whatsapp_sync.py" --once -v --config "$CFG_DIR/config.json"

sed "s#/Users/SEU_USUARIO#$HOME#g" "$HERE/com.doutorai.whatsapp-sync.plist" > "$PLIST"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/$LABEL"

echo
echo "Pronto. O sidecar roda a cada 2 minutos. Log: ~/Library/Logs/whatsapp-sync.log"
echo "Confira em https://doutorai-sales-brain.lovable.app/conversas (aba Fontes) o card WhatsApp verde."
