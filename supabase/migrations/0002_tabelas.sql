-- =============================================================================
-- Sales Brain 2.0 — M1 · Migration 0002
-- Tabelas do Módulo 1 (dicionário completo: docs/BLUEPRINT.md §3)
-- Convenções: id uuid pk · created_at/updated_at · RLS habilitado na migration 0004.
-- Preservação da migração 1.0: `legado_id_1_0` (idempotência) + `origem_1_0` jsonb
-- (campos de origem sem equivalente — nada é descartado).
-- =============================================================================

-- ---------- PERFIS — espelho de auth.users ----------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel public.perfil_papel not null default 'vendedor',
  status public.perfil_status not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PARCEIROS (antes de contas, que referenciam parceiro) ----------
create table public.parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tier public.parceiro_tier,
  comissao_pct numeric,
  email text,
  telefone text,
  contexto text,
  observacoes text,
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CONTAS — a organização (dissolve leads + target_list do 1.0) ----------
create table public.contas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- preenchido por trigger (normalizar_nome): chave canônica anti-duplicata
  nome_normalizado text not null unique,
  cnpj text,
  tipo public.conta_tipo,
  segmento text,
  arquetipo text,
  curva_abc public.curva_abc,
  status_relacionamento public.conta_status not null default 'na_mira',
  origem_tipo public.origem_tipo,
  origem_detalhe jsonb,
  partner_id uuid references public.parceiros (id) on delete set null,
  regiao text,
  uf text,
  cidade text,
  dim_leitos numeric,
  dim_vidas numeric,
  dim_atendimentos_mes numeric,
  dim_hospitais numeric,
  dim_clinicas numeric,
  dim_cirurgias_exames numeric,
  responsavel_id uuid references public.perfis (id) on delete set null,
  contexto text,
  observacoes text,
  motivo_descarte text,
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CONTATOS — a pessoa (unifica lead_stakeholders + stakeholders) ----------
-- Nota de migração: contatos de PARCEIRO no 1.0 não têm conta — por isso a
-- pessoa vive numa conta OU num parceiro (check abaixo garante ao menos um).
create table public.contatos (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid references public.contas (id) on delete cascade,
  parceiro_id uuid references public.parceiros (id) on delete cascade,
  nome text not null,
  cargo text,
  email text,
  telefone text,
  linkedin text,
  instagram text,
  is_focal boolean not null default false,
  contexto text,
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contatos_vinculo check (conta_id is not null or parceiro_id is not null)
);

-- ---------- OPORTUNIDADES — o deal ----------
create table public.oportunidades (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas (id) on delete restrict,
  nome text not null,
  etapa public.opp_etapa not null default 'qualificacao_demo',
  estado public.opp_estado not null default 'aberta',
  etapa_congelada public.opp_etapa,
  etapa_perda public.opp_etapa,
  motivo_hold public.motivo_hold,
  motivo_hold_detalhe text,
  motivo_perda public.motivo_perda,
  motivo_perda_detalhe text,
  precisa_recategorizar boolean not null default false,
  mrr_contratado numeric not null default 0,
  mrr_esperado numeric,
  setup_valor numeric,
  contrato_meses integer,
  -- TCV é SEMPRE calculado, nunca digitado (decisão D3)
  tcv numeric generated always as (
    coalesce(setup_valor, 0) + mrr_contratado * coalesce(contrato_meses, 12)
  ) stored,
  produtos public.produto[] not null default '{}',
  volume_mensal numeric,
  valor_por_atendimento numeric,
  closing_date date,
  forecast_categoria public.forecast_categoria not null default 'pipeline',
  temperatura public.temperatura,
  responsavel_id uuid references public.perfis (id) on delete set null,
  partner_id uuid references public.parceiros (id) on delete set null,
  comissao_mrr_pct numeric,
  observacoes text,
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- MOVIMENTOS DE FUNIL — histórico de etapa/estado (insumo das métricas) ----------
create table public.oportunidade_movimentos (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references public.oportunidades (id) on delete cascade,
  de_etapa public.opp_etapa,
  para_etapa public.opp_etapa,
  de_estado public.opp_estado,
  para_estado public.opp_estado,
  ocorrido_em timestamptz not null default now(),
  registrado_por uuid references public.perfis (id) on delete set null,
  fonte public.movimento_fonte not null default 'app',
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- HISTÓRICO DE CLOSING DATE — insumo de forecast (M5) ----------
create table public.closing_date_historico (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references public.oportunidades (id) on delete cascade,
  data_anterior date,
  data_nova date not null,
  alterado_em timestamptz not null default now(),
  motivo text,
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ATIVIDADES — o registro atômico (timeline unificada) ----------
-- Nota de migração: logs de PARCEIRO do 1.0 não referenciam conta — a atividade
-- exige conta OU parceiro (check abaixo).
create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid references public.contas (id) on delete cascade,
  oportunidade_id uuid references public.oportunidades (id) on delete set null,
  parceiro_id uuid references public.parceiros (id) on delete set null,
  tipo public.atividade_tipo not null default 'nota',
  data timestamptz not null default now(),
  titulo text not null,
  resumo text,
  conteudo_ref text,
  fonte public.atividade_fonte not null default 'manual',
  participantes uuid[] not null default '{}', -- contato_ids
  criado_por uuid references public.perfis (id) on delete set null,
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atividades_vinculo check (conta_id is not null or parceiro_id is not null)
);

-- ---------- PAPÉIS NO DEAL — stakeholder de oportunidade (UI no M2) ----------
create table public.papeis_no_deal (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references public.oportunidades (id) on delete cascade,
  contato_id uuid not null references public.contatos (id) on delete cascade,
  papel public.papel_stakeholder not null,
  posicao public.posicao_stakeholder,
  influencia public.influencia_nivel,
  notas text,
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (oportunidade_id, contato_id)
);

-- ---------- MEDDIC SCORECARD — 1:1 com oportunidade (UI no M3) ----------
create table public.meddic_scorecards (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null unique references public.oportunidades (id) on delete cascade,
  metrics text,
  metrics_status public.meddic_status not null default 'vazio',
  economic_buyer text,
  economic_buyer_status public.meddic_status not null default 'vazio',
  decision_criteria text,
  decision_criteria_status public.meddic_status not null default 'vazio',
  decision_process text,
  decision_process_status public.meddic_status not null default 'vazio',
  identify_pain text,
  identify_pain_status public.meddic_status not null default 'vazio',
  champion text,
  champion_status public.meddic_status not null default 'vazio',
  challenger_teaching text,
  challenger_tailoring text,
  challenger_take_control text,
  -- score 0–100: cada dimensão validada vale 100, parcial 50, vazia 0 (média das 6)
  score integer generated always as ((
    (case when metrics_status = 'validado' then 100 when metrics_status = 'parcial' then 50 else 0 end) +
    (case when economic_buyer_status = 'validado' then 100 when economic_buyer_status = 'parcial' then 50 else 0 end) +
    (case when decision_criteria_status = 'validado' then 100 when decision_criteria_status = 'parcial' then 50 else 0 end) +
    (case when decision_process_status = 'validado' then 100 when decision_process_status = 'parcial' then 50 else 0 end) +
    (case when identify_pain_status = 'validado' then 100 when identify_pain_status = 'parcial' then 50 else 0 end) +
    (case when champion_status = 'validado' then 100 when champion_status = 'parcial' then 50 else 0 end)
  ) / 6) stored,
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- METAS — evolui sales_goals (UI no M5) ----------
create table public.metas (
  id uuid primary key default gen_random_uuid(),
  ano integer not null,
  trimestre integer check (trimestre between 1 and 4),
  tipo public.meta_tipo not null default 'empresa',
  referencia_id uuid,
  valor_mrr numeric not null default 0,
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CONHECIMENTO — migra copilot_knowledge + copilot_documents (UI no M9) ----------
create table public.conhecimento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text,
  categoria text,
  origem_1_0 jsonb,
  legado_id_1_0 text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- JORNADAS DE CLIENTE — pós-ganho (requisito D1; sync Portal CS futura) ----------
create table public.jornadas_cliente (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas (id) on delete cascade,
  oportunidade_id uuid not null unique references public.oportunidades (id) on delete cascade,
  etapa_cs text,
  external_sync_id text,
  sync_status text,
  ultima_sync_em timestamptz,
  legado_id_1_0 text unique,
  origem_1_0 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- PROPOSTAS DE ATUALIZAÇÃO — fila de aprovação da IA (M4 constrói a UI) ----------
create table public.propostas_de_atualizacao (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid references public.atividades (id) on delete set null,
  alvo jsonb not null,
  payload jsonb not null,
  status public.proposta_status not null default 'pendente',
  decidido_em timestamptz,
  aplicado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- SOLICITAÇÕES DE ACESSO ----------
create table public.solicitacoes_acesso (
  id uuid primary key default gen_random_uuid(),
  nome text,
  email text not null unique,
  status public.solicitacao_status not null default 'pendente',
  decidido_por uuid references public.perfis (id) on delete set null,
  decidido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- AUDIT LOG — preenchido por triggers nas tabelas de negócio ----------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid,
  acao text not null, -- INSERT | UPDATE | DELETE
  dados_antes jsonb,
  dados_depois jsonb,
  usuario_id uuid, -- null quando a mutação vem de serviço (ex.: migração)
  ocorrido_em timestamptz not null default now()
);

-- ---------- Índices ----------
create index idx_contas_status on public.contas (status_relacionamento);
create index idx_contas_responsavel on public.contas (responsavel_id);
create index idx_contatos_conta on public.contatos (conta_id);
create index idx_contatos_parceiro on public.contatos (parceiro_id);
create index idx_opps_conta on public.oportunidades (conta_id);
create index idx_opps_etapa on public.oportunidades (etapa);
create index idx_opps_estado on public.oportunidades (estado);
create index idx_opps_recategorizar on public.oportunidades (precisa_recategorizar)
  where precisa_recategorizar;
create index idx_movs_opp on public.oportunidade_movimentos (oportunidade_id, ocorrido_em desc);
create index idx_closing_opp on public.closing_date_historico (oportunidade_id, alterado_em desc);
create index idx_ativ_conta_data on public.atividades (conta_id, data desc);
create index idx_ativ_opp on public.atividades (oportunidade_id, data desc);
create index idx_papeis_opp on public.papeis_no_deal (oportunidade_id);
create index idx_audit_tabela_registro on public.audit_log (tabela, registro_id);
