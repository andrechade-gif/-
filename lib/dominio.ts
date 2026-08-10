// =============================================================================
// Dicionário do domínio comercial — fonte única de labels, ordens e taxonomias.
// Referência: docs/BLUEPRINT.md §2 (funis, critérios de saída, motivos).
// Nunca duplicar essas strings na UI: importar daqui.
// =============================================================================

export const ETAPAS = [
  "qualificacao_demo",
  "validacao_comite",
  "proposta",
  "negociacao",
  "fechamento",
  "assinatura",
] as const;
export type Etapa = (typeof ETAPAS)[number];

export const ETAPA_LABEL: Record<Etapa, string> = {
  qualificacao_demo: "Qualificação & demo",
  validacao_comite: "Validação com comitê",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechamento: "Fechamento",
  assinatura: "Assinatura",
};

// Critérios de saída de cada etapa (blueprint §2.2) — exibidos como checklist
// de confirmação quando um deal avança a partir dessa etapa.
export const CRITERIOS_SAIDA: Record<Etapa, string[]> = {
  qualificacao_demo: [
    "Primeira reunião feita com dor mapeada",
    "Demo da plataforma mostrada",
    "Fit confirmado (dor + perfil + orçamento plausível)",
    "Próximo passo agendado",
  ],
  validacao_comite: [
    "Solução apresentada aos stakeholders-chave (diretor clínico em especial)",
    "Escopo técnico mapeado",
    "Critérios de decisão conhecidos (MEDDIC: decision criteria)",
    "Processo de decisão conhecido (MEDDIC: decision process)",
  ],
  proposta: ["Proposta comercial apresentada ao economic buyer (não só enviada)"],
  negociacao: ["Termos comerciais acordados verbalmente (escopo, preço, prazo)"],
  fechamento: ["Contrato emitido e enviado para assinatura"],
  assinatura: ["Contrato assinado"],
};

export const ESTADOS = ["aberta", "ganha", "perdida", "on_hold"] as const;
export type Estado = (typeof ESTADOS)[number];

export const ESTADO_LABEL: Record<Estado, string> = {
  aberta: "Aberta",
  ganha: "Ganha",
  perdida: "Perdida",
  on_hold: "On-hold",
};

export const MOTIVOS_HOLD = [
  "orcamento_congelado",
  "aguardando_ciclo_orcamentario",
  "troca_de_gestao",
  "prioridade_interna_do_cliente",
  "sem_resposta_do_champion",
  "aguardando_projeto_tecnico",
  "outro",
] as const;
export type MotivoHold = (typeof MOTIVOS_HOLD)[number];

export const MOTIVO_HOLD_LABEL: Record<MotivoHold, string> = {
  orcamento_congelado: "Orçamento congelado",
  aguardando_ciclo_orcamentario: "Aguardando ciclo orçamentário",
  troca_de_gestao: "Troca de gestão",
  prioridade_interna_do_cliente: "Prioridade interna do cliente",
  sem_resposta_do_champion: "Sem resposta do champion",
  aguardando_projeto_tecnico: "Aguardando projeto técnico",
  outro: "Outro (detalhar)",
};

export const MOTIVOS_PERDA = [
  "preco",
  "concorrente",
  "sem_orcamento",
  "timing",
  "sem_fit_tecnico",
  "decisao_interna_do_cliente",
  "sem_resposta_definitiva",
  "outro",
] as const;
export type MotivoPerda = (typeof MOTIVOS_PERDA)[number];

export const MOTIVO_PERDA_LABEL: Record<MotivoPerda, string> = {
  preco: "Preço",
  concorrente: "Concorrente",
  sem_orcamento: "Sem orçamento",
  timing: "Timing",
  sem_fit_tecnico: "Sem fit técnico",
  decisao_interna_do_cliente: "Decisão interna do cliente",
  sem_resposta_definitiva: "Sem resposta definitiva",
  outro: "Outro (detalhar)",
};

export const PRODUTOS = [
  "ps_inteligente",
  "ambulatorio",
  "ciclo_receita",
  "medicina_inteligente",
] as const;
export type Produto = (typeof PRODUTOS)[number];

export const PRODUTO_LABEL: Record<Produto, string> = {
  ps_inteligente: "PS Inteligente",
  ambulatorio: "Ambulatório",
  ciclo_receita: "Ciclo da Receita",
  medicina_inteligente: "Medicina Inteligente",
};

// Sigla curta para o badge do card do funil
export const PRODUTO_SIGLA: Record<Produto, string> = {
  ps_inteligente: "PS",
  ambulatorio: "AMB",
  ciclo_receita: "CR",
  medicina_inteligente: "MI",
};

export const TEMPERATURAS = ["quente", "morno", "frio"] as const;
export type Temperatura = (typeof TEMPERATURAS)[number];

export const TEMPERATURA_LABEL: Record<Temperatura, string> = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
};

export const FORECAST_CATEGORIAS = ["pipeline", "best_case", "commit"] as const;
export type ForecastCategoria = (typeof FORECAST_CATEGORIAS)[number];

export const FORECAST_LABEL: Record<ForecastCategoria, string> = {
  pipeline: "Pipeline",
  best_case: "Best case",
  commit: "Commit",
};

export const ATIVIDADE_TIPOS = [
  "reuniao",
  "email",
  "ligacao",
  "whatsapp",
  "linkedin",
  "nota",
  "evento",
  "tarefa",
] as const;
export type AtividadeTipo = (typeof ATIVIDADE_TIPOS)[number];

export const ATIVIDADE_TIPO_LABEL: Record<AtividadeTipo, string> = {
  reuniao: "Reunião",
  email: "E-mail",
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  nota: "Nota",
  evento: "Evento",
  tarefa: "Tarefa",
};

export type AtividadeFonte =
  | "manual"
  | "gemini_meet"
  | "read_ai"
  | "plaud_drive"
  | "gmail"
  | "whatsapp"
  | "importado_1_0";

export const ATIVIDADE_FONTE_LABEL: Record<AtividadeFonte, string> = {
  manual: "Manual",
  gemini_meet: "Gemini Meet",
  read_ai: "Read AI",
  plaud_drive: "Plaud",
  gmail: "Gmail",
  whatsapp: "WhatsApp",
  importado_1_0: "Importado do 1.0",
};

export const DOMINIO_EMAIL_PERMITIDO = "@doutor-ai.com";

/** Índice da etapa na ordem do funil (para saber se um movimento é avanço ou recuo). */
export function indiceEtapa(etapa: Etapa): number {
  return ETAPAS.indexOf(etapa);
}
