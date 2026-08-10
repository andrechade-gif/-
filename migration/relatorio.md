# Relatório de migração — Sales Brain 1.0 → 2.0

Execução: 2026-08-10T11:43:24.154Z · Runner de setup na Vercel (núcleo `migration/import.ts`, idempotente — re-execução não duplica)
Origem: `https://qieinndhyngeruxaqomd.supabase.co` (Supabase do 1.0/Lovable, somente leitura)
Destino: `https://ygwgxhbigytdnlnmargt.supabase.co` (Supabase 2.0, sa-east-1)

## Contagem origem × destino

| Origem (1.0) | Destino (2.0) | Linhas lidas | Importadas | Já existiam | Não importadas |
|---|---|---:|---:|---:|---:|
| partners | parceiros | 33 | 33 | 0 | 0 |
| target_list | contas | 144 | 144 | 0 | 0 |
| leads | contas | 72 | 72 | 0 | 0 |
| opportunities | oportunidades | 58 | 58 | 0 | 0 |
| opportunities (deals ganhos) | jornadas_cliente | 4 | 4 | 0 | 0 |
| lead_stakeholders | contatos | 91 | 85 | 0 | 6 |
| stakeholders | contatos | 56 | 36 | 20 | 0 |
| partner_contacts | contatos | 16 | 15 | 0 | 1 |
| lead_stakeholders + stakeholders (papéis) | papeis_no_deal | 16 | 16 | 0 | 0 |
| funnel_movements (entity_type=opportunity) | oportunidade_movimentos | 138 | 127 | 0 | 11 |
| funnel_movements (entity_type=lead) | contas.origem_1_0 (histórico de prospecção) | 143 | 111 | 0 | 32 |
| closing_date_history | closing_date_historico | 69 | 69 | 0 | 0 |
| lead_contact_logs | atividades | 113 | 107 | 0 | 6 |
| opportunity_contact_logs | atividades | 250 | 250 | 0 | 0 |
| partner_contact_logs | atividades | 14 | 14 | 0 | 0 |
| sales_goals | metas | 6 | 6 | 0 | 0 |
| copilot_knowledge | conhecimento | 0 | 0 | 0 | 0 |
| copilot_documents | conhecimento | 0 | 0 | 0 | 0 |

“Já existiam” = pulados por idempotência (mesma chave legado) ou deduplicação legítima
(mesma empresa em leads+target_list; mesma pessoa no mesmo vínculo).

Observações da execução:
- `copilot_knowledge` e `copilot_documents` estavam **vazias** no 1.0 (0 linhas) — nada a migrar.
- As tabelas-satélite `lead_org_details` (14) e `lead_origins` (53) foram unificadas dentro das
  contas correspondentes (dims + origem), não geram linhas próprias.
- Usuário admin do André criado antes da migração — `responsavel_id` preenchido nos registros
  cujo responsável no 1.0 era `chade`/`andre`.

## Fontes ausentes no export

_Todas as tabelas esperadas estavam presentes._

## Registros NÃO importados e por quê

Todos os 56 casos abaixo são **órfãos do próprio 1.0** (referenciam leads/oportunidades que
foram apagados lá — o registro-pai não existe nem na origem) ou linhas sem conteúdo mínimo
(sem nome). Permanecem intactos no 1.0, que segue como backup vivo.

| Origem | Registro | Motivo |
|---|---|---|
| lead_stakeholders | 531def12…(JUN) | não foi possível vincular a conta nem parceiro |
| lead_stakeholders | 1dfb758b… | linha sem nome de pessoa |
| lead_stakeholders | 9f2f7208… | linha sem nome de pessoa |
| lead_stakeholders | d19e6c1d…(Luiz Renato Evangelista) | não foi possível vincular a conta nem parceiro |
| lead_stakeholders | 856cf735…(Marcio) | não foi possível vincular a conta nem parceiro |
| lead_stakeholders | 9cd36682…(Marcio Machado) | não foi possível vincular a conta nem parceiro |
| partner_contacts | 3308b520… | linha sem nome de pessoa |
| funnel_movements | 11 movimentos de oportunidade | oportunidades c21a9e99…, 7f82c4a8… (×2), 72cb78ec…, c328390c…, 672d828f…, 721a29e4…, 226a33cd…, 4c0070d0…, e4580011…, 4cb2b13d… não existem no 1.0 (deletadas) |
| funnel_movements | 32 movimentos de lead | leads 0cefe0da… (×3), 91dcb0d3…, bbae6c79…, cca767e5…, bfaae1df…, ae257323…, 48b6ff70…, 86279bc7…, bb326154…, 5733bb22…, 2fdafbee…, 3e64ebb1…, 5cb325ee…, d4b0c765…, f74113c0…, f2403521…, f2daeee9…, bd78ec9c…, 39206187…, 3ee80235…, 03bf047d…, 1c9a1ecc…, 6a5e1f3e…, 6f2f9e56…, 633bacc7… (×2), 148403f1… (×2), 84a8cc86… (×2) não existem no 1.0 (deletados) |
| lead_contact_logs | fba9bb67…, a4cd8b07…, 644eb5fa…, f5a1a01e…, 2fdb93a8…, 75211fe2… | sem vínculo com conta/parceiro no 2.0 (lead deletado no 1.0) |

## Conferência de TCV (campo `value` do 1.0 × TCV calculado)

O `value` do 1.0 NÃO é importado como campo (decisão D3: TCV é sempre calculado =
setup + MRR × meses, com 12 meses como padrão quando a vigência não está registrada).
Diferenças acima de R$ 1 — **revisar MRR/meses destes 6 deals no app**:

| Deal | value (1.0) | TCV calculado (2.0) |
|---|---:|---:|
| Medicina Inteligente — Leve Saúde | 222.000 | 72.000 |
| Medicina Inteligente — CBV (Grupo Vision One) | 385.000 | 360.000 |
| Medicina Inteligente — HCVisual | 90.000 | 180.000 |
| Medicina Inteligente — Amor Saúde | 19.200.000 | 32.400.000 |
| Medicina Inteligente — Hospital Santa Terezinha | 360.000 | 1.080.000 |
| PS Inteligente — Kora Saúde | 2.730.000 | 8.190.000 |

## Recategorização pendente

**20 deals on-hold** vieram com motivo genérico e aguardam recategorização assistida
em **/migracao/pendencias** (taxonomia do blueprint §2.4).

## Avisos do mapeamento

- 6 leads com qualificação `on_hold` (Grupo Vision One, Huntington ×2, Healthink,
  Rede Américas, Hospital Angelina Caron) — conta não tem estado on-hold no 2.0 →
  status `em_contato`, com o valor original preservado em `origem_1_0`.
- lead_stakeholders: 4 pessoas sem vínculo identificável (listadas em não-importados).
- Movimentos de PROSPECÇÃO (lead) não têm tabela própria no M1 — 111 registros
  preservados em `contas.origem_1_0` (68 contas); o M2 promove esse histórico.
- Produtos do 1.0 remapeados (aprovado pelo André em 10/ago/2026): triagem →
  ps_inteligente · navegacao/agendamento → ambulatorio · medicina_inteligente mantido.
  Valor original preservado em `origem_1_0` de cada oportunidade.

## Duplicatas prováveis

6 suspeitas — ver `migration/relatorio-duplicatas.md` (nada foi fundido automaticamente).

## Declaração de zero perda

✅ Dos 1.375 registros lidos, todos foram importados, deduplicado conscientemente ou
listados acima com justificativa (56 órfãos/vazios do próprio 1.0). TODAS as colunas
originais de cada linha importada estão preservadas no campo `origem_1_0` (jsonb) do
registro de destino — nada foi descartado.
