// Tipos TypeScript espelhando as tabelas do banco (supabase/migrations/0002).
// Mantidos à mão no M1; se o schema crescer, considerar geração automática
// (supabase gen types) em módulos futuros.

import type {
  AtividadeFonte,
  AtividadeTipo,
  Estado,
  Etapa,
  ForecastCategoria,
  MotivoHold,
  MotivoPerda,
  Produto,
  Temperatura,
} from "./dominio";

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  papel: "admin" | "vendedor";
  status: "aprovado" | "pendente" | "bloqueado";
  created_at: string;
  updated_at: string;
}

export interface Parceiro {
  id: string;
  nome: string;
  tier: "finder" | "suporte" | "global" | null;
  comissao_pct: number | null;
  email: string | null;
  telefone: string | null;
  contexto: string | null;
  observacoes: string | null;
  legado_id_1_0: string | null;
  origem_1_0: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Conta {
  id: string;
  nome: string;
  nome_normalizado: string;
  cnpj: string | null;
  tipo: "hospital" | "operadora_verticalizada" | "plano" | "clinica" | "outro" | null;
  segmento: string | null;
  arquetipo: string | null;
  curva_abc: "A" | "B" | "C" | null;
  status_relacionamento: "na_mira" | "em_contato" | "qualificada" | "cliente" | "descartada";
  origem_tipo: "evento" | "parceiro" | "indicacao" | "busca_ativa" | "inbound" | "outro" | null;
  origem_detalhe: Record<string, unknown> | null;
  partner_id: string | null;
  regiao: string | null;
  uf: string | null;
  cidade: string | null;
  dim_leitos: number | null;
  dim_vidas: number | null;
  dim_atendimentos_mes: number | null;
  dim_hospitais: number | null;
  dim_clinicas: number | null;
  dim_cirurgias_exames: number | null;
  responsavel_id: string | null;
  contexto: string | null;
  observacoes: string | null;
  motivo_descarte: string | null;
  legado_id_1_0: string | null;
  origem_1_0: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Contato {
  id: string;
  conta_id: string | null;
  parceiro_id: string | null;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  linkedin: string | null;
  instagram: string | null;
  is_focal: boolean;
  contexto: string | null;
  legado_id_1_0: string | null;
  origem_1_0: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Oportunidade {
  id: string;
  conta_id: string;
  nome: string;
  etapa: Etapa;
  estado: Estado;
  etapa_congelada: Etapa | null;
  etapa_perda: Etapa | null;
  motivo_hold: MotivoHold | null;
  motivo_hold_detalhe: string | null;
  motivo_perda: MotivoPerda | null;
  motivo_perda_detalhe: string | null;
  precisa_recategorizar: boolean;
  mrr_contratado: number;
  mrr_esperado: number | null;
  setup_valor: number | null;
  contrato_meses: number | null;
  tcv: number;
  produtos: Produto[];
  volume_mensal: number | null;
  valor_por_atendimento: number | null;
  closing_date: string | null;
  forecast_categoria: ForecastCategoria;
  temperatura: Temperatura | null;
  responsavel_id: string | null;
  partner_id: string | null;
  comissao_mrr_pct: number | null;
  observacoes: string | null;
  legado_id_1_0: string | null;
  origem_1_0: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** Oportunidade com a conta embutida (join padrão do funil). */
export type OportunidadeComConta = Oportunidade & {
  conta: Pick<Conta, "id" | "nome"> | null;
};

export interface OportunidadeMovimento {
  id: string;
  oportunidade_id: string;
  de_etapa: Etapa | null;
  para_etapa: Etapa | null;
  de_estado: Estado | null;
  para_estado: Estado | null;
  ocorrido_em: string;
  registrado_por: string | null;
  fonte: "app" | "migracao";
  created_at: string;
}

export interface ClosingDateHistorico {
  id: string;
  oportunidade_id: string;
  data_anterior: string | null;
  data_nova: string;
  alterado_em: string;
  motivo: string | null;
  created_at: string;
}

export interface Atividade {
  id: string;
  conta_id: string | null;
  oportunidade_id: string | null;
  parceiro_id: string | null;
  tipo: AtividadeTipo;
  data: string;
  titulo: string;
  resumo: string | null;
  conteudo_ref: string | null;
  fonte: AtividadeFonte;
  participantes: string[];
  criado_por: string | null;
  legado_id_1_0: string | null;
  created_at: string;
}

export interface MeddicScorecard {
  id: string;
  oportunidade_id: string;
  metrics: string | null;
  metrics_status: "vazio" | "parcial" | "validado";
  economic_buyer: string | null;
  economic_buyer_status: "vazio" | "parcial" | "validado";
  decision_criteria: string | null;
  decision_criteria_status: "vazio" | "parcial" | "validado";
  decision_process: string | null;
  decision_process_status: "vazio" | "parcial" | "validado";
  identify_pain: string | null;
  identify_pain_status: "vazio" | "parcial" | "validado";
  champion: string | null;
  champion_status: "vazio" | "parcial" | "validado";
  challenger_teaching: string | null;
  challenger_tailoring: string | null;
  challenger_take_control: string | null;
  score: number;
}

export interface SolicitacaoAcesso {
  id: string;
  nome: string | null;
  email: string;
  status: "pendente" | "aprovada" | "negada";
  decidido_por: string | null;
  decidido_em: string | null;
  created_at: string;
}

export interface JornadaCliente {
  id: string;
  conta_id: string;
  oportunidade_id: string;
  etapa_cs: string | null;
  external_sync_id: string | null;
  sync_status: string | null;
  ultima_sync_em: string | null;
  created_at: string;
}
