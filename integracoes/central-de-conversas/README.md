# Central de Conversas — Sales Brain como base única de contexto comercial

Integração que faz o Sales Brain (Lovable, projeto `6c6d237d-0f93-460a-9d4e-52936d01dd38`,
Supabase `qieinndhyngeruxaqomd`) ler continuamente WhatsApp, e-mail e reuniões, e a partir
disso criar leads, cadastrar contatos e cargos, atualizar o contexto e avançar o pipeline.

## Arquitetura

```
WhatsApp (ponte whatsapp-mcp no Mac) ──sidecar (2 min)──▶ ingest-whatsapp ─▶ whatsapp_messages
Read AI (webhook ao fim da reunião) ─────────────────────▶ ingest-meeting  ─▶ interaction_events
Google Calendar + Drive (notas Gemini) ──cron 15 min────▶ sync-calendar   ─▶ interaction_events
Gmail ───────────────────────────────────cron 10 min────▶ sync-gmail      ─▶ interaction_events
                                                                                   │
                                          process-interactions (cron 5 min + gatilhos)
                                          1. agrupa WhatsApp por janela de silêncio (15 min)
                                          2. casa com o CRM: telefone, e-mail, domínio, nome
                                          3. IA (Lovable AI gateway) extrai empresa, contatos,
                                             cargos, resumo, próximos passos e sinal de estágio
                                          4. aplica: log de contato, contexto, stakeholders,
                                             tarefas, avanço de lead, sugestões de oportunidade
                                                                                   │
                                   leads · lead_stakeholders · opportunities · stakeholders
                                   funnel_movements · seller_tasks · interaction_suggestions
```

Tela no CRM: **/conversas** (Revisão, Sugestões, Linha do tempo, Fontes, Configurações) e
aba **Interações** nos diálogos de lead e oportunidade.

## O que acontece com cada conversa

| Situação | Ação automática |
|---|---|
| Contato já conhecido (telefone/e-mail no CRM) | log de contato, contexto atualizado, contatos/cargos completados, tarefas dos próximos passos |
| Lead em `nao_contactado`/`nao_responde` com conversa real | passa para `em_contato` (com funnel_movements) |
| Sinal de proposta/negociação em lead sem oportunidade | sugestão "criar oportunidade" (ou automático, se ligado nas Configurações) |
| Sinal de avanço em oportunidade | sugestão de mudança de estágio (ou automático, se ligado). Perda e on hold nunca são automáticos |
| Conversa comercial com instituição identificada e sem cadastro | **cria o lead** com contatos, cargos, contexto, origem, log, Target List e avisa por WhatsApp |
| Conversa comercial sem instituição identificável | fila de Revisão com botão "Criar lead" pré-preenchido |
| Conversa pessoal/spam (confiança ≥ 0,8) | descartada, texto apagado, contato entra na lista de ignorados e nunca mais sai do Mac |

Regras fixas: nunca rebaixa estágio, nunca sobrescreve campo já preenchido de um contato,
tudo fica auditado em `interaction_events.applied_actions`.

## Como as fontes chegam hoje

- **WhatsApp**: sidecar no Mac (única peça que precisa ser instalada por você).
- **Read AI, Gmail e Google Calendar**: uma rotina Claude ("Sales Brain · Central de
  Conversas") roda de hora em hora, lê as fontes pelas contas já conectadas e grava em
  `interaction_events`. Não precisa de webhook no Read AI nem de conector Google no Lovable.
  Se um dia esses conectores forem ligados no Lovable, as funções nativas assumem sem
  duplicar (mesmos `dedupe_key`).
- Telefone 5518998145192 já está cadastrado como destinatário (categoria `conversas`) e
  como telefone interno.

## Passos manuais (uma vez)

1. **Chave do sidecar**: em Lovable → Sales Brain → Cloud → Secrets, copie o valor de
   `SALES_BRAIN_API_KEY` (já aceito pelo `ingest-whatsapp`) ou crie `INGEST_API_KEY`.
2. **Sidecar do WhatsApp no Mac**: `cd integracoes/whatsapp-sync && INGEST_API_KEY='<chave>' bash install.sh`.
   Em 2 minutos o card "WhatsApp" em /conversas → Fontes fica verde.
3. **Opcional**: webhook do Read AI (`ingest-meeting?token=<READAI_WEBHOOK_SECRET>`) e conectores
   Google no Lovable, para o caminho nativo em vez da rotina Claude.
4. **Contexto histórico**: em /conversas → Fontes, "Recarregar identidades do CRM" garante
   que todos os telefones e e-mails já cadastrados sejam reconhecidos. Para importar
   conversas antigas do WhatsApp, rodar `whatsapp_sync.py --reset-cursor 90` e depois `--once`.

## Ajustes de comportamento

Em /conversas → Configurações: responsável padrão dos leads criados, ligar/desligar criação
automática de leads, avanço automático de leads e de oportunidades, confiança mínima,
domínios e telefones internos (para não tratar colegas como clientes), janela de silêncio,
grupos de WhatsApp (ignorados por padrão).

## Segurança e privacidade

- Escrita nas tabelas só via service role; leitura só para usuários autenticados.
- `ingest-whatsapp` exige `x-api-key`; `ingest-meeting` exige o token; `interactions-actions`
  exige usuário logado.
- Chats marcados como ignorados/internos são filtrados **no Mac** (o sidecar recebe a lista
  em cada resposta) e o texto já recebido é apagado do banco.
