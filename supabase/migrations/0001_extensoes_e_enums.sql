-- =============================================================================
-- Sales Brain 2.0 — M1 · Migration 0001
-- Extensões e tipos enumerados (as "listas fixas" do domínio comercial)
-- Referência: docs/BLUEPRINT.md §2 (funis e taxonomias) e §3 (dicionário de dados)
-- =============================================================================

create extension if not exists "unaccent";

-- ---------- Perfis e acesso ----------
create type public.perfil_papel as enum ('admin', 'vendedor');
create type public.perfil_status as enum ('aprovado', 'pendente', 'bloqueado');
create type public.solicitacao_status as enum ('pendente', 'aprovada', 'negada');

-- ---------- Conta (organização) ----------
create type public.conta_tipo as enum (
  'hospital', 'operadora_verticalizada', 'plano', 'clinica', 'outro'
);
create type public.conta_status as enum (
  'na_mira', 'em_contato', 'qualificada', 'cliente', 'descartada'
);
create type public.curva_abc as enum ('A', 'B', 'C');
create type public.origem_tipo as enum (
  'evento', 'parceiro', 'indicacao', 'busca_ativa', 'inbound', 'outro'
);

-- ---------- Oportunidade (deal) ----------
create type public.opp_etapa as enum (
  'qualificacao_demo', 'validacao_comite', 'proposta',
  'negociacao', 'fechamento', 'assinatura'
);
create type public.opp_estado as enum ('aberta', 'ganha', 'perdida', 'on_hold');
create type public.motivo_hold as enum (
  'orcamento_congelado', 'aguardando_ciclo_orcamentario', 'troca_de_gestao',
  'prioridade_interna_do_cliente', 'sem_resposta_do_champion',
  'aguardando_projeto_tecnico', 'outro'
);
create type public.motivo_perda as enum (
  'preco', 'concorrente', 'sem_orcamento', 'timing', 'sem_fit_tecnico',
  'decisao_interna_do_cliente', 'sem_resposta_definitiva', 'outro'
);
create type public.produto as enum (
  'ps_inteligente', 'ambulatorio', 'ciclo_receita', 'medicina_inteligente'
);
create type public.forecast_categoria as enum ('pipeline', 'best_case', 'commit');
create type public.temperatura as enum ('quente', 'morno', 'frio');
create type public.movimento_fonte as enum ('app', 'migracao');

-- ---------- Stakeholders (mapa de poder MEDDIC) ----------
create type public.papel_stakeholder as enum (
  'economic_buyer', 'champion', 'influenciador', 'usuario', 'bloqueador'
);
create type public.posicao_stakeholder as enum ('promotor', 'neutro', 'detrator');
create type public.influencia_nivel as enum ('alta', 'media', 'baixa');
create type public.meddic_status as enum ('vazio', 'parcial', 'validado');

-- ---------- Atividades ----------
create type public.atividade_tipo as enum (
  'reuniao', 'email', 'ligacao', 'whatsapp', 'linkedin', 'nota', 'evento', 'tarefa'
);
create type public.atividade_fonte as enum (
  'manual', 'gemini_meet', 'read_ai', 'plaud_drive', 'gmail', 'whatsapp', 'importado_1_0'
);

-- ---------- Parceiros, metas, ingestão ----------
create type public.parceiro_tier as enum ('finder', 'suporte', 'global');
create type public.meta_tipo as enum ('empresa', 'vendedor', 'parceiro', 'canal');
create type public.proposta_status as enum ('pendente', 'aprovada', 'editada', 'rejeitada');
