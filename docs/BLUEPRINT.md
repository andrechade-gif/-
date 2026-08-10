# SALES BRAIN 2.0 — Blueprint M0 (v2 — versão final para avaliação)

Data: 09/ago/2026 · Status: aguardando aprovação final do André (após aprovado: anexar ao knowledge do projeto)
Fontes verificadas por requery: schema Supabase do Sales Brain 1.0 (26 tabelas), raias comerciais do Sistema de Gestão Global, página de entrada do Portal CS, CSS/design system do Sales Brain 1.0, time Vercel do André (5 projetos existentes).

---

## 1. Decisões registradas

| # | Decisão | Detalhe |
|---|---|---|
| D1 | Venda e pós-venda são funis separados | Deal ganho sai do funil de vendas e entra na Jornada de Cliente. A etapa de implementação coexiste no Sales Brain (visão vendedor) e no Portal CS (visão operações), com atualização concomitante. Requisito de arquitetura: chave de sincronização externa desde o dia 1. |
| D2 | Modelo C — dois funis, um modelo de objetos | O objeto Lead deixa de existir. Toda empresa vira **Conta** com status de relacionamento; a prospecção é um board sobre Contas; a **Oportunidade** só nasce quando há deal real. Elimina a duplicação estrutural do 1.0 (stakeholders e logs duplicados). |
| D3 | Novo MRR é a métrica-mestre | Metas, forecast e dashboard falam MRR. Setup e TCV são secundárias, sempre visíveis no deal. TCV é calculado (setup + MRR × meses), nunca digitado. |
| D4 | Convenção de MRR para pricing por volume | **MRR contratado** (piso/mínimo do contrato) é o número oficial de meta e forecast. **MRR esperado** (no volume projetado) é campo de projeção, nunca base de forecast. |
| D5 | Fonte de design | Lógica de plataforma extraída do Portal CS (auth e-mail/senha + magic link + solicitação de acesso aprovada; header com contexto ativo; busca global; copiloto ao vivo). Tokens visuais extraídos do CSS do Sales Brain 1.0 (tema Doutor-AI: azul-médico primário, teal accent, sidebar escura, dark mode, camada editorial monospace/tabular). |
| D6 | Alinhamento com as raias oficiais | O funil 2.0 mapeia as 4 raias comerciais do Sistema de Gestão Global: (1) Prospecção & Qualificação enterprise, (2) Pré-venda clínica & demo, (3) Contratação & fechamento, (4) Pós-fechamento & handover → CS. |
| D7 | Etapa é marco, não reunião | Qualificação e demo acontecem na mesma primeira reunião (teach first). O funil não cria etapa para demo isolada; o marco intermediário do ciclo é a **Validação com comitê** (§2.2), onde os deals de fato passam tempo. |
| D8 | Plataforma viva desde o dia 1 | Deploy em produção no time Vercel do André com domínio próprio (proposta: `salesbrain.doutor-ai.com`). Login primário: **Google OAuth restrito a e-mails @doutor-ai.com**; fallback: e-mail/senha + fluxo de solicitação de acesso com aprovação. Capa/tela de login no estilo do Portal CS. |
| D9 | Stack de construção | **Stack A (aprovada):** Next.js + Vercel (time do André, existente) + Supabase novo e dedicado (PostgreSQL, Auth com Google restrito a domínio, Storage, filas/cron). O banco do 1.0 (Lovable/Supabase) permanece intacto como fonte da migração e backup vivo. |

---

## 2. Funis e taxonomias (proposta para validação)

### 2.1 Funil de prospecção (sobre Contas)

| Status | Critério de saída |
|---|---|
| Na mira | Conta priorizada com contato-alvo identificado → tentativa de contato feita |
| Em contato | Resposta obtida e conversa em andamento → dor confirmada e interesse em avançar |
| Qualificada | Deal real identificado (dor + fit + orçamento plausível) → **nasce a Oportunidade** |
| Descartada (estado) | Sem fit ou sem interesse — guarda motivo |

### 2.2 Funil de vendas (sobre Oportunidades) — 6 etapas

Princípio aplicado (decisão D7): **etapa é marco de compromisso do comprador, não reunião.** No motion real do André, qualificação e demo acontecem na mesma primeira reunião (teach first — o executivo precisa ver valor antes de investir tempo explicando a operação). O marco demorado do ciclo é a validação com o comitê decisor, que ganha etapa própria.

| # | Etapa | Critério de saída | Raia oficial |
|---|---|---|---|
| 1 | Qualificação & demo | Primeira reunião feita: dor mapeada + demo mostrada + fit confirmado + próximo passo agendado | Raia 1–2 |
| 2 | Validação com comitê | Solução apresentada aos stakeholders-chave (diretor clínico em especial); escopo técnico mapeado; critérios e processo de decisão conhecidos (MEDDIC: decision criteria + decision process) | Raia 2 |
| 3 | Proposta | Proposta comercial apresentada ao economic buyer (não só enviada) | Raia 3 |
| 4 | Negociação | Termos comerciais acordados verbalmente (escopo, preço, prazo) | Raia 3 |
| 5 | Fechamento | Contrato emitido e enviado para assinatura | Raia 3 |
| 6 | Assinatura | Contrato assinado → estado GANHO → dispara Jornada de Cliente | Raia 3→4 |

Fechamento e Assinatura permanecem separados: em hospitais, a assinatura atravessa jurídico/compliance e consome semanas — é um gargalo que o funil deve exibir.

**Nota sobre a etapa Validação com comitê (realidade do motion):** a validação tipicamente envolve múltiplas apresentações da plataforma a audiências diferentes (TI/primeiro contato, time clínico, diretoria), em ordem não-linear e com repetições. Cada apresentação é uma Atividade com participantes registrados, e cada audiência alimenta campos MEDDIC específicos (TI → decision criteria técnicos; clínico → metrics, pain, champion; diretoria → economic buyer, decision process, ROI). Duas features derivam disso:

- **Cobertura do comitê** (M2/M3): indicador calculado no card do deal — quais papéis do comitê já participaram de apresentação (técnico ✓ · clínico ✓ · diretoria ✗) — cruzando participantes das Atividades com os papéis do mapa de stakeholders. Torna o critério de saída da etapa visível.
- **Briefing pré-reunião** (M3, potencializado pelo M4): antes de reunião agendada, resumo automático com gaps de MEDDIC do deal + participantes esperados + perguntas sugeridas para aquela audiência.

### 2.3 Estados (ortogonais à etapa)

`aberta` · `ganha` · `perdida` (guarda etapa onde morreu + motivo) · `on_hold` (guarda etapa congelada + motivo).

### 2.4 Taxonomia de motivos (proposta — substitui o "outro" genérico)

- **On-hold:** `orcamento_congelado` · `aguardando_ciclo_orcamentario` · `troca_de_gestao` · `prioridade_interna_do_cliente` · `sem_resposta_do_champion` · `aguardando_projeto_tecnico` · `outro` (detalhe obrigatório)
- **Perda:** `preco` · `concorrente` · `sem_orcamento` · `timing` · `sem_fit_tecnico` · `decisao_interna_do_cliente` · `sem_resposta_definitiva` · `outro` (detalhe obrigatório)

Na migração (M1), os ~20 on-hold do 1.0 passam por recategorização assistida usando esta taxonomia.

---

## 3. Dicionário de dados v1

Convenções: ids UUID; todos os objetos têm `created_at`/`updated_at`; campos preenchidos por IA carregam `fonte_atividade_id` (rastreabilidade, princípio 5).

### CONTA — a organização (novo; dissolve `leads` + `target_list`)
| Campo | Tipo | Justificativa |
|---|---|---|
| nome | texto único | Identidade canônica — acaba com `company` string repetida |
| cnpj | texto? | Deduplicação e futuro enriquecimento |
| tipo | enum: hospital, operadora_verticalizada, plano, clinica, outro | ICP da Doutor-AI |
| segmento / arquetipo | texto | Perfil de conta (M2 refina) |
| curva_abc | enum A/B/C | Priorização de carteira |
| status_relacionamento | enum: na_mira, em_contato, qualificada, cliente, descartada | O funil de prospecção vive aqui |
| origem_tipo + origem_detalhe | enum + json | Migra `lead_origins` (evento, parceiro, indicação, busca ativa, inbound) |
| partner_id | fk parceiro? | Conta originada por parceiro |
| regiao / uf / cidade | texto | Territórios (time futuro) |
| dim_leitos, dim_vidas, dim_atendimentos_mes, dim_hospitais, dim_clinicas, dim_cirurgias_exames | número? | Migra `lead_org_details` — dimensionamento para pricing |
| responsavel | fk usuário | Dono da conta |
| contexto / observacoes | texto | Migra campos livres do 1.0 |

### CONTATO — a pessoa (novo; unifica `lead_stakeholders` + `stakeholders`)
| Campo | Tipo | Justificativa |
|---|---|---|
| conta_id | fk | Pessoa vive na conta, não no deal |
| nome, cargo, email, telefone | texto | Núcleo |
| linkedin, instagram | texto | Já existiam no 1.0 |
| is_focal | bool | Contato principal da conta |
| contexto | texto | Notas sobre a pessoa |

### OPORTUNIDADE — o deal (evolui `opportunities`)
| Campo | Tipo | Justificativa |
|---|---|---|
| conta_id | fk | Substitui `company` string |
| nome | texto | Ex.: "PS Inteligente — Unimed GV" |
| etapa | enum (6 etapas §2.2) | Eixo 1 |
| estado | enum (§2.3) | Eixo 2 — separado da etapa |
| etapa_congelada / etapa_perda | enum? | Preserva `lost_at_stage`; idem para on-hold |
| motivo_hold / motivo_perda + detalhe | enum + texto | Taxonomia §2.4 |
| mrr_contratado | moeda | **Métrica-mestre** (D3/D4) |
| mrr_esperado | moeda? | Projeção por volume |
| setup_valor | moeda? | Receita única |
| contrato_meses | int | Vigência |
| tcv | calculado | setup + mrr_contratado × meses — nunca digitado |
| produtos[] | enum[]: ps_inteligente, ambulatorio, ciclo_receita, medicina_inteligente | Migra `scope_products` |
| volume_mensal, valor_por_atendimento | número? | Pricing por volume |
| closing_date (+ histórico) | data | Migra tabela de histórico do 1.0 — insumo de forecast |
| forecast_categoria | enum: pipeline, best_case, commit | M5 usa; nasce no schema |
| temperatura | enum? | Migra `manual_temperature` |
| responsavel, partner_id | fk | Mantidos |
| comissao_mrr_pct | número | Mantido |
| observacoes | texto | Mantido |

### PAPEL_NO_DEAL — stakeholder de oportunidade (novo conceito)
| Campo | Tipo | Justificativa |
|---|---|---|
| oportunidade_id + contato_id | fk+fk | Liga pessoa ao deal sem duplicar cadastro |
| papel | enum: economic_buyer, champion, influenciador, usuario, bloqueador | Mapa de poder MEDDIC — o enum do 1.0 (champion/promotor/detrator) misturava papel com posição |
| posicao | enum: promotor, neutro, detrator | Eixo separado do papel |
| influencia | enum: alta, media, baixa | Peso no comitê |
| notas | texto | Contexto político |

### MEDDIC_SCORECARD — 1:1 com oportunidade (evolui os campos do 1.0)
| Campo | Tipo | Justificativa |
|---|---|---|
| metrics, economic_buyer, decision_criteria, decision_process, identify_pain, champion | texto + status cada (vazio/parcial/validado) | Os 6 campos migram; o status por dimensão gera o score |
| score | calculado 0–100 | Gaps visíveis; alimenta forecast por inspeção (M5) |
| challenger_teaching, challenger_tailoring, challenger_take_control | texto | Migram do 1.0 |
| evolucao[] | snapshots (data, campo, valor, fonte_atividade_id) | Auditável: de qual reunião veio cada informação |

### ATIVIDADE — o registro atômico (unifica os 3 `contact_logs` + alvo do M4)
| Campo | Tipo | Justificativa |
|---|---|---|
| conta_id (+ oportunidade_id?, parceiro_id?) | fk | Timeline unificada da conta |
| tipo | enum: reuniao, email, ligacao, whatsapp, linkedin, nota, evento, tarefa | Toda interação é atividade |
| data | timestamp | Ordenação da timeline |
| titulo, resumo | texto | Exibição |
| conteudo_ref | ref storage? | Transcrição/ata completa |
| fonte | enum: manual, gemini_meet, read_ai, plaud_drive, gmail, whatsapp, importado_1_0 | Proveniência (M4) |
| participantes[] | contato_ids | Quem estava na reunião |

### PROPOSTA_DE_ATUALIZACAO — fila de aprovação (esqueleto; M4 constrói)
| Campo | Tipo | Justificativa |
|---|---|---|
| atividade_id | fk | Rastreabilidade: extração aponta para a fonte |
| alvo (objeto+campo) + payload | json | O que a IA propõe mudar/criar |
| status | enum: pendente, aprovada, editada, rejeitada | Humano no loop sempre (princípio 4) |
| decidido_em / aplicado_em | timestamp | Auditoria |

### PARCEIRO — mantém o 1.0 e adiciona
`tier` (enum: finder, suporte, global) · `comissao_pct` por tier · contatos de parceiro migram para CONTATO com flag. Demais campos preservados (M7 refina).

### META — evolui `sales_goals`
`ano` · `trimestre?` · `tipo` (empresa, vendedor, parceiro, canal) · `referencia_id` · `valor_mrr` (D3). Quebra mensal e funil reverso: M5.

### JORNADA_DE_CLIENTE — pós-ganho (esqueleto; requisito D1)
`conta_id` · `oportunidade_id` · `etapa_cs` · `external_sync_id` (Portal CS) · `sync_status` · `ultima_sync_em`. Nasce no schema do M1 para a integração futura não exigir refatoração.

### CONHECIMENTO — migra `copilot_knowledge` + `copilot_documents` intactos (M9 evolui para ICP, biblioteca de valor, objeções, playbooks).

### Migração — mapa resumido 1.0 → 2.0
| Origem (1.0) | Destino (2.0) |
|---|---|
| target_list | CONTA (status: na_mira) |
| leads | CONTA (status conforme qualification) + origem + dims |
| lead_stakeholders + stakeholders + partner_contacts | CONTATO (+ PAPEL_NO_DEAL quando ligado a opp) |
| opportunities (54) | OPORTUNIDADE + MEDDIC_SCORECARD |
| *_contact_logs (3 tabelas) | ATIVIDADE (fonte: importado_1_0) |
| funnel_movements + closing_date_history | histórico de movimentos (migra intacto — insumo das métricas) |
| partners, sales_goals, copilot_* | PARCEIRO, META, CONHECIMENTO |
| on_hold com motivo "outro" (~20) | recategorização assistida (§2.4) |

---

## 4. Catálogo de métricas oficial v1

Dono de todas: André. Métrica-mestre de valor: **novo MRR contratado** (D3/D4).

| Métrica | Fórmula | Fonte | Tela | Frequência |
|---|---|---|---|---|
| Novo MRR ganho | Σ mrr_contratado dos deals ganhos no período | oportunidade | Home + Performance | semanal |
| Meta vs realizado | novo MRR acumulado ÷ meta acumulada | meta + oportunidade | Home + Metas | semanal |
| Pipeline coverage | Σ mrr_contratado aberto ÷ meta restante do período | oportunidade + meta | Metas & Forecast | semanal |
| Conversão por etapa | deals etapa N→N+1 ÷ deals que entraram em N | movimentos de funil | Performance | mensal |
| Tempo por etapa | média de dias entre entrada e saída da etapa | movimentos de funil | Performance | mensal |
| Win rate | ganhos ÷ (ganhos + perdidos) | oportunidade | Performance | trimestral |
| Ciclo de venda | média (data_ganho − data_criação) | oportunidade | Performance | trimestral |
| Ticket médio | Σ MRR ganho ÷ nº ganhos | oportunidade | Performance | trimestral |
| Sales velocity | (nº deals abertos × ticket × win rate) ÷ ciclo | derivada | Performance | mensal |
| Deals parados | deals abertos sem atividade há > X dias (X por etapa) | atividade + oportunidade | Funil (badge) + alertas | diária |
| Performance por canal/parceiro | novo MRR e conversão por origem | conta.origem + oportunidade | Parceiros / Marketing | mensal |

Nota de leitura (venda enterprise, volume baixo): nos primeiros trimestres, priorizar métricas de progresso (movimentos de etapa, tempo parado, coverage) sobre métricas de resultado (win rate, ciclo), que só estabilizam com mais fechamentos.

---

## 5. Mapa de sessões da plataforma

| # | Sessão | Conteúdo | Módulo |
|---|---|---|---|
| 1 | Home / Cockpit | Resumo do dia, aprovações pendentes, deals parados, meta vs realizado | M1 (base) → M4/M5 enriquecem |
| 2 | Funil de Vendas | Board de oportunidades por etapa, critérios de saída, filtros | M1 |
| 3 | Prospecção | Board de contas por status de relacionamento | M2 |
| 4 | Contas | Lista + perfil da conta (dims, origem, contatos, timeline unificada) | M2 |
| 5 | Oportunidade (detalhe) | Deal + MEDDIC scorecard + mapa de stakeholders + atividades | M2/M3 |
| 6 | Inbox de Aprovações | Fila de propostas de atualização da IA + resumo diário por e-mail | M4 |
| 7 | Metas & Forecast | Funil reverso, commit/best case/pipeline, coverage | M5 |
| 8 | Performance | Dashboard executivo (visão vendedor vs visão CEO) | M6 |
| 9 | Parceiros | Gestão, tiers, pipeline por parceiro | M7 |
| 10 | Marketing & Demanda | Target list, cadências, eventos, CAC | M8 |
| 11 | Estratégia & Conhecimento | ICP, biblioteca de valor, objeções, playbooks | M9 |
| 12 | Configurações | Usuários/acessos, taxonomias, conectores | M1 base |
| — | Transversais | Busca global · header com contexto ativo (padrão Portal CS) · Copiloto comercial ao vivo (M9/M10) | — |

---

## 6. Blueprint de arquitetura (conceitual — stack: D9)

Camadas:
1. **App web responsivo em produção** — hospedado no time Vercel do André, domínio `salesbrain.doutor-ai.com` (D8); sidebar escura + conteúdo claro (design system D5); login Google restrito a @doutor-ai.com como primário, e-mail/senha + solicitação de acesso como fallback; capa estilo Portal CS.
2. **Banco relacional (PostgreSQL)** — modelo do §3; toda mutação auditada (quem/quando/o quê/fonte).
3. **Storage de arquivos** — transcrições, atas, anexos.
4. **Pipeline de ingestão assíncrono (M4)** — conectores (Drive watcher para atas Gemini e pasta Plaud/iPhone; Read AI API; Gmail em fase 2) → fila → transcrição (quando áudio) → extração estruturada por LLM (entidades, MEDDIC, próximos passos, riscos) → PROPOSTA_DE_ATUALIZACAO → Inbox de Aprovações + e-mail diário com deep links. Nenhuma escrita no CRM sem aprovação.
5. **API de integração** — webhooks/REST para sincronização bidirecional da Jornada de Cliente com o Portal CS (requisito D1). WhatsApp e Gmail bidirecional: M10.
6. **Copiloto comercial** — responde sobre pipeline/contas/métricas consultando o próprio banco (padrão do copiloto do Portal CS). Especificação no M9.

Requisitos não funcionais: rastreabilidade fim-a-fim (princípio 5), migração sem perda (princípio 7), LGPD (dados de contatos de clientes hospitalares), backups diários.

---

## 7. Pendências e próximos passos

1. **André aprova esta versão final** e confirma a stack (D9).
2. Blueprint aprovado → **anexar este arquivo ao knowledge do projeto Claude**.
3. **M1:** geração do prompt de construção (fundação + Funil de Vendas + script de migração), execução no Claude Code, deploy na Vercel, checklist de validação.
4. Pré-requisitos operacionais do M1 (preparar antes de rodar o Claude Code): conta Supabase criada (gratuita) · acesso ao painel Vercel · quem administra o DNS de doutor-ai.com criar o CNAME `salesbrain` quando o deploy existir · export dos dados do Supabase do 1.0 (o prompt M1 trará o passo a passo).
5. Pendência aberta (não trava): screenshots das telas internas do Portal CS para refinar componentes visuais, se divergirem do CSS do 1.0.

## Mapa de Construção
M0 ✅ aprovado (09/ago/2026) · M1 🔄 prompt gerado, execução no Claude Code · M2–M10 ⬜
Decisões: D1–D9 registradas (§1).
