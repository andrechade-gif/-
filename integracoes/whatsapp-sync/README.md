# WhatsApp → Sales Brain (sidecar do Mac)

Sincroniza as conversas do WhatsApp lidas pela ponte local **whatsapp-mcp** (a mesma
pareada por QR code que já entrega as notificações do Sales Brain) para a edge
function `ingest-whatsapp` do CRM. A partir daí o Sales Brain agrupa a conversa,
extrai contexto com IA, cria/atualiza leads, contatos e cargos e avança o pipeline.

Só usa Python 3 da biblioteca padrão (o `/usr/bin/python3` do macOS serve).

## Como funciona

1. Lê `whatsapp-bridge/store/messages.db` em modo somente leitura.
2. Mantém um cursor incremental em `~/.whatsapp-sync/state.json`.
3. Filtra localmente: grupos, status, mensagens vazias, chats em `local_ignore_jids`
   e chats que o Sales Brain devolveu em `ignore_jids` (contatos marcados como
   pessoais/internos na Central de Conversas). Esses chats **nunca saem do Mac**.
4. Envia lotes (`batch_size`) para `ingest-whatsapp` com o header `x-api-key`.
5. Sem mensagens novas, envia um heartbeat vazio (aparece em Fontes → WhatsApp).

Funciona igual para WhatsApp pessoal ou WhatsApp Business: basta a ponte estar
pareada com o número desejado (Aparelhos conectados → Conectar aparelho).
Para ler dois números, rode duas instâncias da ponte com `store/` separados e
duas configs do sidecar com `device` diferente.

## Instalação em um comando

No Mac onde a ponte whatsapp-mcp está pareada, com o repositório clonado:

```bash
cd integracoes/whatsapp-sync
INGEST_API_KEY='<valor do secret INGEST_API_KEY ou SALES_BRAIN_API_KEY no Lovable>' bash install.sh
```

O `install.sh` copia o script, grava `~/.whatsapp-sync/config.json` (telefone 5518998145192,
30 dias de histórico), faz a primeira rodada para validar a chave e carrega o launchd
a cada 2 minutos. Variáveis opcionais: `OWNER_PHONE`, `DEVICE`, `LOOKBACK_DAYS`, `WHATSAPP_DB_PATH`.

## Instalação manual

```bash
mkdir -p ~/whatsapp-sync ~/.whatsapp-sync ~/Library/Logs
cp whatsapp_sync.py ~/whatsapp-sync/
cp config.example.json ~/.whatsapp-sync/config.json
chmod 600 ~/.whatsapp-sync/config.json
```

Edite `~/.whatsapp-sync/config.json`:

| Campo | O que colocar |
|---|---|
| `ingest_api_key` | o valor do secret `INGEST_API_KEY` cadastrado no Lovable (Sales Brain) |
| `whatsapp_db_path` | caminho do `messages.db` da ponte (padrão `~/whatsapp-mcp/whatsapp-bridge/store/messages.db`) |
| `owner_phone` | seu número com DDI, só dígitos (ex. `5511999999999`) |
| `device` | um nome para esta máquina/número (ex. `mac-andre`, `mac-business`) |
| `initial_lookback_days` | quantos dias de histórico enviar na primeira rodada (padrão 7) |
| `local_ignore_jids` | chats que nunca devem sair do Mac, mesmo antes do CRM aprender |

Teste sem enviar nada:

```bash
python3 ~/whatsapp-sync/whatsapp_sync.py --once --dry-run | head -60
```

Primeira rodada real:

```bash
python3 ~/whatsapp-sync/whatsapp_sync.py --once -v
```

## Rodar a cada 2 minutos com launchd

```bash
sed "s#/Users/SEU_USUARIO#$HOME#g" com.doutorai.whatsapp-sync.plist > ~/Library/LaunchAgents/com.doutorai.whatsapp-sync.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.doutorai.whatsapp-sync.plist
launchctl kickstart -k gui/$(id -u)/com.doutorai.whatsapp-sync
tail -f ~/Library/Logs/whatsapp-sync.log
```

Parar: `launchctl bootout gui/$(id -u)/com.doutorai.whatsapp-sync`.

## Operação

| Situação | Comando |
|---|---|
| Reenviar os últimos N dias | `whatsapp_sync.py --reset-cursor N` e depois `--once` |
| Ver o que seria enviado | `--once --dry-run` |
| Chave recusada (HTTP 401) | confira `INGEST_API_KEY` no Lovable e no `config.json` |
| Banco não encontrado | ajuste `whatsapp_db_path`; a ponte precisa ter rodado ao menos uma vez |

## Contrato enviado ao Sales Brain

`POST {sales_brain_url}` com header `x-api-key`:

```json
{
  "device": "mac-andre",
  "owner_phone": "5511999999999",
  "messages": [
    {
      "id": "3EB0ABC...",
      "chat_jid": "5521988887777@s.whatsapp.net",
      "chat_name": "Dr. Fulano",
      "sender": "5521988887777",
      "content": "texto",
      "timestamp": "2026-09-21T14:03:00Z",
      "is_from_me": false,
      "media_type": ""
    }
  ],
  "stats": { "db_last_message_time": "...", "rows_read": 3, "skipped": {"grupo": 1}, "cursor": "..." }
}
```

Resposta esperada: `{ "accepted", "skipped", "duplicates", "ignore_jids": [...], "cursor_ack" }`.
`ignore_jids` é gravado no estado local e passa a filtrar as próximas rodadas.

## Testes

```bash
python3 test_whatsapp_sync.py
```

Cria um SQLite sintético no formato da ponte (timestamps do driver Go com fuso),
um servidor HTTP fake e valida: filtro de grupo/status/vazio, conversão de fuso,
paginação, aprendizado de `ignore_jids`, heartbeat sem duplicar, chave inválida e dry-run.
