/* =============================================================================
 * Sales Brain 1.0 → 2.0 — script de migração (M1)
 *
 * Uso:  npm run migrate
 * Pré-requisitos:
 *   · CSVs exportados do Supabase do 1.0 em migration/exports/ (Table Editor →
 *     Export CSV). Tabelas esperadas: leads, target_list, opportunities,
 *     lead_stakeholders, stakeholders, partners, partner_contacts?, sales_goals,
 *     funnel_movements, closing_date_history, lead_contact_logs,
 *     opportunity_contact_logs, partner_contact_logs, copilot_knowledge,
 *     copilot_documents. Arquivos ausentes são pulados e registrados no relatório.
 *   · .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 *
 * Princípios:
 *   · IDEMPOTENTE — re-execução não duplica (chave legado_id_1_0 em tudo;
 *     contas também deduplicam por nome normalizado). Nunca sobrescreve o que
 *     já existe no 2.0 (edições manuais ficam protegidas).
 *   · ZERO PERDA — todo registro de origem ou entra no destino ou aparece em
 *     migration/relatorio.md com justificativa. Campos sem equivalente vão
 *     para a coluna jsonb origem_1_0.
 *   · Os cabeçalhos reais dos CSVs são inspecionados em runtime; o mapeamento
 *     aceita variações de nome de coluna (pt/en) e loga o que não reconheceu.
 * ========================================================================== */

import * as fs from "node:fs";
import * as path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import { config as carregarEnv } from "dotenv";

// ---------------------------------------------------------------- ambiente --
const RAIZ = path.resolve(__dirname, "..");
carregarEnv({ path: path.join(RAIZ, ".env.local") });
carregarEnv({ path: path.join(RAIZ, ".env") });

// Cliente criado dentro de main() — importar este módulo (testes) não exige env.
let db: SupabaseClient;

function conectar(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    console.error(
      "\n✖ Faltam variáveis de ambiente.\n" +
        "  Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local\n" +
        "  (painel do Supabase → Project Settings → API).\n"
    );
    process.exit(1);
  }
  return createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const PASTA_EXPORTS = path.join(RAIZ, "migration", "exports");
const ARQ_RELATORIO = path.join(RAIZ, "migration", "relatorio.md");
const ARQ_DUPLICATAS = path.join(RAIZ, "migration", "relatorio-duplicatas.md");

// ------------------------------------------------------------------ helpers --
type Linha = Record<string, string>;

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Nomes alternativos de arquivo por tabela (o 1.0 real usa alguns nomes maiores). */
const ALIAS_ARQUIVO: Record<string, string[]> = {
  closing_date_history: ["opportunity_closing_date_history"],
};

/** Lê um CSV do export; null se o arquivo não existir. Aceita nome.csv exato. */
function lerCsv(tabela: string): { linhas: Linha[]; colunas: string[] } | null {
  const nomes = [tabela, ...(ALIAS_ARQUIVO[tabela] ?? [])];
  const candidatos = nomes.flatMap((n) => [
    path.join(PASTA_EXPORTS, `${n}.csv`),
    path.join(PASTA_EXPORTS, `${n}_rows.csv`), // padrão do botão Export do Supabase
  ]);
  const arquivo = candidatos.find((c) => fs.existsSync(c));
  if (!arquivo) return null;
  const conteudo = fs.readFileSync(arquivo, "utf8");
  const linhas = parse(conteudo, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: false,
  }) as Linha[];
  const colunas = linhas.length > 0 ? Object.keys(linhas[0]) : [];
  return { linhas, colunas };
}

/** Vazio do CSV: '', 'null', 'NULL', '[null]' etc. */
function vazio(v: string | undefined | null): boolean {
  if (v == null) return true;
  const t = String(v).trim();
  return t === "" || t.toLowerCase() === "null" || t.toLowerCase() === "undefined";
}

/** Primeiro valor não-vazio entre colunas candidatas (case-insensitive). */
export function pegar(linha: Linha, candidatos: string[]): string | undefined {
  const mapa = new Map(Object.keys(linha).map((k) => [k.toLowerCase(), k]));
  for (const c of candidatos) {
    const chave = mapa.get(c.toLowerCase());
    if (chave && !vazio(linha[chave])) return String(linha[chave]).trim();
  }
  return undefined;
}

export function num(v: string | undefined): number | null {
  if (vazio(v)) return null;
  let t = String(v).replace(/[R$\s]/g, "");
  // formato brasileiro 1.234,56 → 1234.56
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function inteiro(v: string | undefined): number | null {
  const n = num(v);
  return n == null ? null : Math.round(n);
}

export function dataIso(v: string | undefined): string | null {
  if (vazio(v)) return null;
  const t = String(v).trim();
  // dd/mm/aaaa → iso
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  const d = br ? new Date(`${br[3]}-${br[2]}-${br[1]}T12:00:00Z`) : new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function somenteData(v: string | undefined): string | null {
  const iso = dataIso(v);
  return iso ? iso.slice(0, 10) : null;
}

/** Hash estável (djb2) para linhas sem id próprio — garante idempotência. */
function hashLinha(obj: unknown): string {
  const s = JSON.stringify(obj);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Arrays do Postgres/JSON no CSV: {a,b} · ["a","b"] · "a, b" */
export function listaDe(v: string | undefined): string[] {
  if (vazio(v)) return [];
  const t = String(v).trim();
  try {
    const j = JSON.parse(t);
    if (Array.isArray(j)) return j.map(String);
  } catch {
    /* não é JSON */
  }
  const semChaves = t.replace(/^\{|\}$/g, "").replace(/^\[|\]$/g, "");
  return semChaves
    .split(/[,;]/)
    .map((p) => p.replace(/^"|"$/g, "").trim())
    .filter((p) => p !== "");
}

function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let anterior = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const atual = [i];
    for (let j = 1; j <= n; j++) {
      atual[j] = Math.min(
        anterior[j] + 1,
        atual[j - 1] + 1,
        anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    anterior = atual;
  }
  return anterior[n];
}

// ------------------------------------------------------- dicionários de mapa --
const ETAPAS_NOVAS = [
  "qualificacao_demo",
  "validacao_comite",
  "proposta",
  "negociacao",
  "fechamento",
  "assinatura",
] as const;
type EtapaNova = (typeof ETAPAS_NOVAS)[number];

/** Etapas do 1.0 (e variantes) → etapa 2.0. Marcadores viram transição de estado. */
const MAPA_ETAPA: Record<string, EtapaNova | "GANHA" | "PERDIDA" | "HOLD"> = {
  qualificacao: "qualificacao_demo",
  qualificacao_demo: "qualificacao_demo",
  qualification: "qualificacao_demo",
  demo: "qualificacao_demo",
  descoberta: "qualificacao_demo",
  discovery: "qualificacao_demo",
  validacao: "validacao_comite",
  validacao_comite: "validacao_comite",
  comite: "validacao_comite",
  validation: "validacao_comite",
  proposta: "proposta",
  proposal: "proposta",
  negociacao: "negociacao",
  negotiation: "negociacao",
  fechamento: "fechamento",
  closing: "fechamento",
  assinatura: "assinatura",
  signature: "assinatura",
  contrato: "assinatura",
  implementacao: "GANHA",
  implantacao: "GANHA",
  implementation: "GANHA",
  producao: "GANHA",
  production: "GANHA",
  fechada: "GANHA",
  ganha: "GANHA",
  ganho: "GANHA",
  won: "GANHA",
  closed_won: "GANHA",
  cliente: "GANHA",
  perdida: "PERDIDA",
  perdido: "PERDIDA",
  lost: "PERDIDA",
  closed_lost: "PERDIDA",
  on_hold: "HOLD",
  onhold: "HOLD",
  hold: "HOLD",
  standby: "HOLD",
  stand_by: "HOLD",
  congelado: "HOLD",
  pausado: "HOLD",
};

export function mapearEtapa(valor: string | undefined): EtapaNova | "GANHA" | "PERDIDA" | "HOLD" | null {
  if (vazio(valor)) return null;
  const chave = normalizar(String(valor)).replace(/[\s-]+/g, "_");
  return MAPA_ETAPA[chave] ?? null;
}

const MAPA_QUALIFICACAO_CONTA: Record<string, string> = {
  nao_contactado: "na_mira",
  nao_contatado: "na_mira",
  not_contacted: "na_mira",
  novo: "na_mira",
  new: "na_mira",
  na_mira: "na_mira",
  target: "na_mira",
  em_contato: "em_contato",
  contactado: "em_contato",
  contatado: "em_contato",
  contacted: "em_contato",
  in_contact: "em_contato",
  // conta não tem "não responde"/"on-hold" no 2.0 — segue em contato,
  // com o valor original preservado em origem_1_0 (aviso no relatório)
  nao_responde: "em_contato",
  on_hold: "em_contato",
  qualificado: "qualificada",
  qualified: "qualificada",
  oportunidade: "qualificada",
  opportunity: "qualificada",
  qualificada: "qualificada",
  desqualificado: "descartada",
  disqualified: "descartada",
  descartada: "descartada",
  descartado: "descartada",
  perdido: "descartada",
  cliente: "cliente",
  client: "cliente",
  customer: "cliente",
};

const MAPA_MOTIVO_HOLD: Record<string, string> = {
  orcamento_congelado: "orcamento_congelado",
  budget_frozen: "orcamento_congelado",
  sem_orcamento: "orcamento_congelado",
  aguardando_ciclo_orcamentario: "aguardando_ciclo_orcamentario",
  ciclo_orcamentario: "aguardando_ciclo_orcamentario",
  budget_cycle: "aguardando_ciclo_orcamentario",
  troca_de_gestao: "troca_de_gestao",
  troca_gestao: "troca_de_gestao",
  management_change: "troca_de_gestao",
  prioridade_interna_do_cliente: "prioridade_interna_do_cliente",
  prioridade_interna: "prioridade_interna_do_cliente",
  internal_priority: "prioridade_interna_do_cliente",
  sem_resposta_do_champion: "sem_resposta_do_champion",
  sem_resposta: "sem_resposta_do_champion",
  no_response: "sem_resposta_do_champion",
  aguardando_projeto_tecnico: "aguardando_projeto_tecnico",
  projeto_tecnico: "aguardando_projeto_tecnico",
};

const MAPA_MOTIVO_PERDA: Record<string, string> = {
  preco: "preco",
  price: "preco",
  concorrente: "concorrente",
  competitor: "concorrente",
  sem_orcamento: "sem_orcamento",
  no_budget: "sem_orcamento",
  orcamento: "sem_orcamento",
  falta_de_verba: "sem_orcamento",
  timing: "timing",
  sem_fit_tecnico: "sem_fit_tecnico",
  sem_fit: "sem_fit_tecnico",
  no_fit: "sem_fit_tecnico",
  fit_tecnico: "sem_fit_tecnico",
  decisao_interna_do_cliente: "decisao_interna_do_cliente",
  decisao_interna: "decisao_interna_do_cliente",
  internal_decision: "decisao_interna_do_cliente",
  sem_resposta_definitiva: "sem_resposta_definitiva",
  sem_resposta: "sem_resposta_definitiva",
  no_response: "sem_resposta_definitiva",
  ghosting: "sem_resposta_definitiva",
};

// O 1.0 usava MÓDULOS como produto (triagem, navegacao, agendamento).
// De-para proposto ao André (original sempre preservado em origem_1_0):
//   triagem → PS Inteligente · navegacao/agendamento → Ambulatório
const MAPA_PRODUTO: Record<string, string> = {
  ps_inteligente: "ps_inteligente",
  ps: "ps_inteligente",
  pronto_socorro: "ps_inteligente",
  triagem: "ps_inteligente",
  ambulatorio: "ambulatorio",
  amb: "ambulatorio",
  navegacao: "ambulatorio",
  agendamento: "ambulatorio",
  ciclo_receita: "ciclo_receita",
  ciclo_da_receita: "ciclo_receita",
  cr: "ciclo_receita",
  revenue_cycle: "ciclo_receita",
  medicina_inteligente: "medicina_inteligente",
  mi: "medicina_inteligente",
};

const NOME_PRODUTO: Record<string, string> = {
  ps_inteligente: "PS Inteligente",
  ambulatorio: "Ambulatório",
  ciclo_receita: "Ciclo da Receita",
  medicina_inteligente: "Medicina Inteligente",
};

const MAPA_TEMPERATURA: Record<string, string> = {
  quente: "quente",
  hot: "quente",
  morno: "morno",
  morna: "morno",
  warm: "morno",
  frio: "frio",
  fria: "frio",
  cold: "frio",
};

const MAPA_TIPO_CONTA: Record<string, string> = {
  hospital: "hospital",
  operadora_verticalizada: "operadora_verticalizada",
  operadora: "operadora_verticalizada",
  plano: "plano",
  plano_de_saude: "plano",
  health_plan: "plano",
  clinica: "clinica",
  clinic: "clinica",
};

const MAPA_ORIGEM: Record<string, string> = {
  evento: "evento",
  event: "evento",
  parceiro: "parceiro",
  partner: "parceiro",
  indicacao: "indicacao",
  referral: "indicacao",
  recomendacao: "indicacao",
  relacionamento: "outro", // sem equivalente direto — detalhe fica em origem_detalhe
  busca_ativa: "busca_ativa",
  outbound: "busca_ativa",
  prospeccao: "busca_ativa",
  inbound: "inbound",
};

// target_list.channel (1.0): direto | parceiro | nao_informado
const MAPA_CANAL_ORIGEM: Record<string, string> = {
  direto: "busca_ativa",
  parceiro: "parceiro",
};

const MAPA_TIPO_ATIVIDADE: Record<string, string> = {
  reuniao: "reuniao",
  meeting: "reuniao",
  call: "ligacao",
  ligacao: "ligacao",
  phone: "ligacao",
  telefone: "ligacao",
  email: "email",
  "e-mail": "email",
  whatsapp: "whatsapp",
  wpp: "whatsapp",
  zap: "whatsapp",
  linkedin: "linkedin",
  nota: "nota",
  note: "nota",
  evento: "evento",
  event: "evento",
  tarefa: "tarefa",
  task: "tarefa",
};

export function deDicionario(dic: Record<string, string>, valor: string | undefined): string | null {
  if (vazio(valor)) return null;
  const chave = normalizar(String(valor)).replace(/[\s-]+/g, "_");
  return dic[chave] ?? null;
}

// --------------------------------------------------------------- relatório --
type ContagemEntidade = {
  origem: string;
  destino: string;
  lidas: number;
  importadas: number;
  jaExistiam: number;
  naoImportadas: number;
};

const contagens: ContagemEntidade[] = [];
const naoImportados: { origem: string; chave: string; motivo: string }[] = [];
const avisos: string[] = [];
const arquivosAusentes: string[] = [];
const conferenciasTcv: { deal: string; valor1_0: number; tcvCalculado: number }[] = [];

function registrarPulo(origem: string, chave: string, motivo: string) {
  naoImportados.push({ origem, chave, motivo });
}

// ------------------------------------------------------- acesso idempotente --
/** Carrega TODOS os legado_id_1_0 já migrados (para pular em re-execução). */
async function carregarLegados(tabela: string): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  const passo = 1000;
  for (let de = 0; ; de += passo) {
    const { data, error } = await db
      .from(tabela)
      .select("id, legado_id_1_0")
      .not("legado_id_1_0", "is", null)
      .range(de, de + passo - 1);
    if (error) throw new Error(`Falha lendo ${tabela}: ${error.message}`);
    for (const r of data ?? []) mapa.set(r.legado_id_1_0 as string, r.id as string);
    if (!data || data.length < passo) break;
  }
  return mapa;
}

/** Insere em lotes; em erro de lote, tenta linha a linha para não perder o resto. */
type LinhaInsercao = Record<string, unknown>;

async function inserirLote(
  tabela: string,
  linhas: LinhaInsercao[],
  aoInserir?: (linha: LinhaInsercao, id: string) => void
): Promise<{ inseridas: number; falhas: number }> {
  let inseridas = 0;
  let falhas = 0;
  const TAM = 200;
  for (let i = 0; i < linhas.length; i += TAM) {
    const lote = linhas.slice(i, i + TAM);
    const { data, error } = await db.from(tabela).insert(lote).select("id, legado_id_1_0");
    if (!error) {
      inseridas += lote.length;
      if (aoInserir && data) {
        const porLegado = new Map(data.map((d) => [d.legado_id_1_0 as string, d.id as string]));
        for (const l of lote) {
          const legado = typeof l.legado_id_1_0 === "string" ? l.legado_id_1_0 : undefined;
          const id = legado ? porLegado.get(legado) : undefined;
          if (id) aoInserir(l, id);
        }
      }
      continue;
    }
    // fallback linha a linha
    for (const l of lote) {
      const { data: d1, error: e1 } = await db.from(tabela).insert(l).select("id").single();
      if (e1) {
        falhas++;
        registrarPulo(tabela, String(l.legado_id_1_0 ?? "?"), `erro do banco: ${e1.message}`);
      } else {
        inseridas++;
        if (aoInserir && d1) aoInserir(l, d1.id as string);
      }
    }
  }
  return { inseridas, falhas };
}

/** Guarda todas as colunas originais da linha (zero perda). */
function origemJson(tabela: string, linha: Linha): Record<string, unknown> {
  const limpo: Record<string, string> = {};
  for (const [k, v] of Object.entries(linha)) {
    if (!vazio(v)) limpo[k] = v;
  }
  return { tabela_1_0: tabela, dados: limpo };
}

// ============================================================== EXECUÇÃO ====
async function main() {
  console.log("\n🧠 Sales Brain — migração 1.0 → 2.0\n");

  db = conectar();

  if (!fs.existsSync(PASTA_EXPORTS)) {
    fs.mkdirSync(PASTA_EXPORTS, { recursive: true });
  }

  // ------------------------------------------------ 0 · carregar os CSVs ----
  const NOMES = [
    "leads",
    "target_list",
    "opportunities",
    "lead_stakeholders",
    "stakeholders",
    "partners",
    "partner_contacts",
    "sales_goals",
    "funnel_movements",
    "closing_date_history",
    "lead_contact_logs",
    "opportunity_contact_logs",
    "partner_contact_logs",
    "copilot_knowledge",
    "copilot_documents",
    // tabelas-satélite do 1.0 (dims e origem viviam separadas dos leads)
    "lead_org_details",
    "lead_origins",
  ] as const;

  const csv: Partial<Record<(typeof NOMES)[number], { linhas: Linha[]; colunas: string[] }>> = {};
  let algumArquivo = false;
  for (const nome of NOMES) {
    const lido = lerCsv(nome);
    if (lido) {
      csv[nome] = lido;
      algumArquivo = true;
      console.log(`  · ${nome}.csv — ${lido.linhas.length} linhas · colunas: ${lido.colunas.join(", ")}`);
    } else {
      arquivosAusentes.push(nome);
    }
  }
  if (!algumArquivo) {
    console.error(
      `\n✖ Nenhum CSV encontrado em migration/exports/.\n` +
        `  Exporte as tabelas do Supabase do 1.0 (Table Editor → Export data → CSV)\n` +
        `  e salve os arquivos como <tabela>.csv nessa pasta. Depois rode npm run migrate de novo.\n`
    );
    process.exit(1);
  }
  if (arquivosAusentes.length > 0) {
    console.log(`  ⚠ ausentes (seguem fora da migração): ${arquivosAusentes.join(", ")}`);
  }

  // ------------------------------------- 1 · estado atual (idempotência) ----
  console.log("\n→ Lendo o que já existe no 2.0 (idempotência)…");
  const legadoParceiros = await carregarLegados("parceiros");
  const legadoContas = await carregarLegados("contas");
  const legadoContatos = await carregarLegados("contatos");
  const legadoOpps = await carregarLegados("oportunidades");
  const legadoMovs = await carregarLegados("oportunidade_movimentos");
  const legadoClosing = await carregarLegados("closing_date_historico");
  const legadoAtividades = await carregarLegados("atividades");
  const legadoMetas = await carregarLegados("metas");
  const legadoConhecimento = await carregarLegados("conhecimento");
  const legadoMeddic = await carregarLegados("meddic_scorecards");
  const legadoPapeis = await carregarLegados("papeis_no_deal");
  const legadoJornadas = await carregarLegados("jornadas_cliente");

  const contasExistentes = new Map<string, string>(); // nome_normalizado → id
  {
    const { data, error } = await db.from("contas").select("id, nome_normalizado");
    if (error) throw new Error(`Falha lendo contas: ${error.message}`);
    for (const c of data ?? []) contasExistentes.set(c.nome_normalizado as string, c.id as string);
  }

  // Responsável: o 1.0 usa slugs (chade, andre, roberto…). Hoje só o André tem
  // perfil — slugs dele mapeiam para o perfil; os demais ficam preservados em
  // origem_1_0 (novos vendedores ganham perfil quando o time crescer).
  let perfilAndreId: string | null = null;
  {
    const { data } = await db
      .from("perfis")
      .select("id")
      .eq("email", "andre.chade@doutor-ai.com")
      .maybeSingle();
    perfilAndreId = (data?.id as string | undefined) ?? null;
    if (!perfilAndreId) {
      avisos.push(
        "Perfil do André ainda não existe (primeiro login pendente) — responsavel_id ficará vazio; rode a migração de novo após o login para preencher."
      );
    }
  }
  function resolverResponsavel(linha: Linha): string | null {
    const bruto = pegar(linha, ["responsible", "responsavel"]);
    if (!bruto) return null;
    const v = normalizar(bruto);
    return v === "chade" || v === "andre" || v === "andre chade" ? perfilAndreId : null;
  }

  // Satélites do 1.0, indexados por lead_id (enriquecem as contas)
  const orgDetailsPorLead = new Map<string, Linha>();
  for (const linha of csv.lead_org_details?.linhas ?? []) {
    const ref = pegar(linha, ["lead_id"]);
    if (ref) orgDetailsPorLead.set(ref, linha);
  }
  const origemPorLead = new Map<string, Linha>();
  for (const linha of csv.lead_origins?.linhas ?? []) {
    const ref = pegar(linha, ["lead_id"]);
    if (ref) origemPorLead.set(ref, linha);
  }
  const parceirosPorNome = new Map<string, string>();
  {
    const { data } = await db.from("parceiros").select("id, nome");
    for (const p of data ?? []) parceirosPorNome.set(normalizar(p.nome as string), p.id as string);
  }

  // Mapas origem → destino (preenchidos ao longo da execução)
  const parceiroIdPorLegado = new Map<string, string>(legadoParceiros);
  const contaIdPorLead = new Map<string, string>(); // lead_id 1.0 → conta_id 2.0
  const contaIdPorNome = new Map<string, string>(contasExistentes);
  const contatoIdPorLegado = new Map<string, string>(legadoContatos);
  const oppIdPorLegado = new Map<string, string>(legadoOpps);
  const contaIdPorOppLegado = new Map<string, string>(); // opp 1.0 → conta 2.0

  // Reconstruir vínculos em RE-EXECUÇÃO (linhas já migradas antes)
  for (const [legado, id] of legadoContas) {
    const m = legado.match(/^leads:(.+)$/);
    if (m) contaIdPorLead.set(m[1], id);
  }

  // ---------------------------------------------------- 2 · PARCEIROS -------
  if (csv.partners) {
    const { linhas } = csv.partners;
    const novos: Record<string, unknown>[] = [];
    let jaExistiam = 0;
    for (const linha of linhas) {
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      const legado = `partners:${id1}`;
      if (parceiroIdPorLegado.has(legado)) {
        jaExistiam++;
        continue;
      }
      const nome = pegar(linha, ["name", "nome", "partner_name", "company", "empresa"]);
      if (!nome) {
        registrarPulo("partners", legado, "linha sem nome de parceiro");
        continue;
      }
      const tierBruto = pegar(linha, ["tier", "nivel", "categoria"]);
      const tier = deDicionario(
        { finder: "finder", suporte: "suporte", support: "suporte", global: "global" },
        tierBruto
      );
      novos.push({
        nome,
        tier,
        comissao_pct: num(pegar(linha, ["comissao_pct", "commission", "comissao", "commission_pct"])),
        email: pegar(linha, ["email", "e-mail"]) ?? null,
        telefone: pegar(linha, ["phone", "telefone", "celular", "whatsapp"]) ?? null,
        contexto: pegar(linha, ["context", "contexto", "description", "descricao"]) ?? null,
        observacoes: pegar(linha, ["notes", "observacoes", "obs", "notas"]) ?? null,
        legado_id_1_0: legado,
        origem_1_0: origemJson("partners", linha),
      });
    }
    const r = await inserirLote("parceiros", novos, (l, id) => {
      parceiroIdPorLegado.set(l.legado_id_1_0 as string, id);
      parceirosPorNome.set(normalizar(l["nome"] as string), id);
    });
    contagens.push({
      origem: "partners",
      destino: "parceiros",
      lidas: linhas.length,
      importadas: r.inseridas,
      jaExistiam,
      naoImportadas: linhas.length - r.inseridas - jaExistiam,
    });
  }

  /** Resolve parceiro citado num registro (por id do 1.0 ou por nome). */
  function acharParceiro(linha: Linha): string | null {
    const ref = pegar(linha, ["partner_id", "parceiro_id"]);
    if (ref) {
      const porLegado = parceiroIdPorLegado.get(`partners:${ref}`);
      if (porLegado) return porLegado;
    }
    const nome = pegar(linha, ["partner", "parceiro", "partner_name"]);
    if (nome) return parceirosPorNome.get(normalizar(nome)) ?? null;
    return null;
  }

  // ------------------------------------------------------- 3 · CONTAS -------
  // Unifica target_list + leads + empresas citadas em opportunities,
  // deduplicando por nome normalizado. Nunca funde nomes apenas parecidos —
  // esses vão para relatorio-duplicatas.md (revisão humana).
  type ContaNova = Record<string, unknown> & { nome: string };
  const contasNovas = new Map<string, ContaNova>(); // nome_normalizado → linha a inserir
  const fontesPorConta = new Map<string, string[]>();

  function prepararConta(
    nomeBruto: string,
    fonte: string,
    dados: Partial<ContaNova>
  ): { chave: string; nova: boolean } {
    const chave = normalizar(nomeBruto);
    if (contaIdPorNome.has(chave)) return { chave, nova: false };
    const existente = contasNovas.get(chave);
    if (existente) {
      // fusão de fontes: campos vazios são complementados; nada é sobrescrito
      for (const [k, v] of Object.entries(dados)) {
        if (v != null && (existente[k] == null || existente[k] === "")) existente[k] = v;
      }
      fontesPorConta.get(chave)!.push(fonte);
      return { chave, nova: false };
    }
    contasNovas.set(chave, { nome: nomeBruto.trim(), ...dados });
    fontesPorConta.set(chave, [fonte]);
    return { chave, nova: true };
  }

  let contasTarget = 0;
  let contasTargetJa = 0;
  if (csv.target_list) {
    for (const linha of csv.target_list.linhas) {
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      const legado = `target_list:${id1}`;
      const nome = pegar(linha, ["name", "nome", "company", "empresa", "company_name", "hospital"]);
      if (!nome) {
        registrarPulo("target_list", legado, "linha sem nome de empresa");
        continue;
      }
      if (legadoContas.has(legado) || contaIdPorNome.has(normalizar(nome))) {
        contasTargetJa++;
        continue;
      }
      contasTarget++;
      prepararConta(nome, "target_list", {
        status_relacionamento: "na_mira",
        tipo: deDicionario(MAPA_TIPO_CONTA, pegar(linha, ["type", "tipo", "segment", "segmento"])),
        segmento: pegar(linha, ["segment", "segmento"]) ?? null,
        // channel do 1.0 (direto|parceiro) indica a origem da abordagem
        origem_tipo: deDicionario(MAPA_CANAL_ORIGEM, pegar(linha, ["channel", "canal"])),
        uf: pegar(linha, ["uf", "estado", "state"]) ?? null,
        cidade: pegar(linha, ["city", "cidade"]) ?? null,
        regiao: pegar(linha, ["region", "regiao"]) ?? null,
        contexto: pegar(linha, ["context", "contexto", "description", "descricao"]) ?? null,
        observacoes: pegar(linha, ["notes", "observacoes", "obs"]) ?? null,
        partner_id: acharParceiro(linha),
        responsavel_id: resolverResponsavel(linha),
        legado_id_1_0: legado,
        origem_1_0: origemJson("target_list", linha),
      });
    }
  }

  let contasLeads = 0;
  let contasLeadsJa = 0;
  const leadLegadoPorChave = new Map<string, string>(); // nome_normalizado → lead_id
  if (csv.leads) {
    for (const linha of csv.leads.linhas) {
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      const legado = `leads:${id1}`;
      const nome = pegar(linha, ["company", "empresa", "name", "nome", "company_name", "hospital"]);
      if (!nome) {
        registrarPulo("leads", legado, "linha sem nome de empresa");
        continue;
      }
      const chave = normalizar(nome);
      leadLegadoPorChave.set(chave, id1);
      if (legadoContas.has(legado)) {
        contasLeadsJa++;
        const idExistente = legadoContas.get(legado)!;
        contaIdPorLead.set(id1, idExistente);
        continue;
      }
      if (contaIdPorNome.has(chave)) {
        contasLeadsJa++;
        contaIdPorLead.set(id1, contaIdPorNome.get(chave)!);
        continue;
      }
      contasLeads++;
      const qualificacao = pegar(linha, ["qualification", "qualificacao", "status", "stage"]);
      const statusConta = deDicionario(MAPA_QUALIFICACAO_CONTA, qualificacao) ?? "na_mira";
      if (qualificacao && !deDicionario(MAPA_QUALIFICACAO_CONTA, qualificacao)) {
        avisos.push(`leads:${id1} — qualificação "${qualificacao}" desconhecida → status na_mira`);
      } else if (qualificacao && ["nao_responde", "on_hold"].includes(normalizar(qualificacao))) {
        avisos.push(
          `leads:${id1} (${nome}) — qualificação "${qualificacao}" não existe para conta no 2.0 → em_contato (original preservado)`
        );
      }

      // Satélites: dimensionamento (lead_org_details) e origem (lead_origins)
      const orgDetails = orgDetailsPorLead.get(id1);
      const origemLinha = origemPorLead.get(id1);
      const origemBruta =
        pegar(origemLinha ?? {}, ["origin_type"]) ??
        pegar(linha, ["origin", "origem", "source", "lead_origin", "canal"]);
      const origemDetalhe: Record<string, unknown> = {};
      if (origemLinha) {
        for (const [k, v] of Object.entries(origemLinha)) {
          if (!vazio(v) && !["id", "lead_id", "created_at", "updated_at"].includes(k)) {
            origemDetalhe[k] = v;
          }
        }
      }

      const motivoPerdaLead = [
        pegar(linha, ["loss_reason", "disqualification_reason", "motivo_desqualificacao", "lost_reason"]),
        pegar(linha, ["loss_reason_detail", "motivo_detalhe"]),
      ]
        .filter(Boolean)
        .join(" — ");

      prepararConta(nome, "leads", {
        status_relacionamento: statusConta,
        motivo_descarte:
          statusConta === "descartada" ? motivoPerdaLead || qualificacao || null : null,
        cnpj: pegar(linha, ["cnpj"]) ?? null,
        tipo:
          deDicionario(MAPA_TIPO_CONTA, pegar(linha, ["type", "tipo", "segment"])) ??
          deDicionario(MAPA_TIPO_CONTA, pegar(orgDetails ?? {}, ["org_type"])),
        segmento: pegar(linha, ["segment", "segmento"]) ?? null,
        arquetipo: pegar(linha, ["archetype", "arquetipo"]) ?? null,
        origem_tipo: deDicionario(MAPA_ORIGEM, origemBruta),
        origem_detalhe:
          Object.keys(origemDetalhe).length > 0
            ? origemDetalhe
            : origemBruta
              ? { texto_1_0: origemBruta }
              : null,
        partner_id:
          acharParceiro(linha) ?? (origemLinha ? acharParceiro(origemLinha) : null),
        uf: pegar(linha, ["uf", "estado", "state"]) ?? null,
        cidade: pegar(linha, ["city", "cidade"]) ?? null,
        regiao: pegar(linha, ["region", "regiao"]) ?? null,
        dim_leitos: num(pegar(orgDetails ?? {}, ["num_beds"]) ?? pegar(linha, ["beds", "leitos", "num_beds"])),
        dim_vidas: num(
          pegar(orgDetails ?? {}, ["num_beneficiaries"]) ?? pegar(linha, ["lives", "vidas", "num_lives"])
        ),
        dim_atendimentos_mes: num(
          pegar(linha, ["average_appointments_per_month", "monthly_attendances", "atendimentos_mes"])
        ),
        dim_hospitais: num(pegar(orgDetails ?? {}, ["num_hospitals"]) ?? pegar(linha, ["hospitals", "num_hospitals"])),
        dim_clinicas: num(pegar(orgDetails ?? {}, ["num_clinics"]) ?? pegar(linha, ["clinics", "num_clinics"])),
        dim_cirurgias_exames: num(
          pegar(orgDetails ?? {}, ["num_surgeries_exams"]) ?? pegar(linha, ["surgeries_exams", "cirurgias_exames"])
        ),
        contexto: [
          pegar(linha, ["context", "contexto", "description", "descricao"]),
          pegar(orgDetails ?? {}, ["observations"]),
        ]
          .filter(Boolean)
          .join("\n\n") || null,
        observacoes: pegar(linha, ["notes", "observacoes", "obs"]) ?? null,
        responsavel_id: resolverResponsavel(linha),
        legado_id_1_0: legado,
        origem_1_0: {
          ...origemJson("leads", linha),
          ...(orgDetails ? { lead_org_details: origemJson("lead_org_details", orgDetails).dados } : {}),
          ...(origemLinha ? { lead_origins: origemJson("lead_origins", origemLinha).dados } : {}),
        },
      });
    }
  }

  // Empresas citadas nas oportunidades que não são lead nem target
  let contasDeOpps = 0;
  if (csv.opportunities) {
    for (const linha of csv.opportunities.linhas) {
      const nome = pegar(linha, ["company", "empresa", "company_name", "account", "conta", "client", "cliente", "hospital"]);
      if (!nome) continue;
      const chave = normalizar(nome);
      if (contaIdPorNome.has(chave) || contasNovas.has(chave)) continue;
      contasDeOpps++;
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      prepararConta(nome, "opportunities", {
        status_relacionamento: "qualificada", // tem deal ⇒ no mínimo qualificada
        legado_id_1_0: `opportunities_company:${id1}`,
        origem_1_0: { tabela_1_0: "opportunities (campo company)", dados: { company: nome } },
      });
    }
  }

  {
    const aInserir = Array.from(contasNovas.values());
    const r = await inserirLote("contas", aInserir, (l, id) => {
      const chave = normalizar(String(l.nome));
      contaIdPorNome.set(chave, id);
      const legado = String(l.legado_id_1_0 ?? "");
      const m = legado.match(/^leads:(.+)$/);
      if (m) contaIdPorLead.set(m[1], id);
    });
    contagens.push({
      origem: "target_list",
      destino: "contas",
      lidas: csv.target_list?.linhas.length ?? 0,
      importadas: contasTarget,
      jaExistiam: contasTargetJa,
      naoImportadas: (csv.target_list?.linhas.length ?? 0) - contasTarget - contasTargetJa,
    });
    contagens.push({
      origem: "leads",
      destino: "contas",
      lidas: csv.leads?.linhas.length ?? 0,
      importadas: contasLeads,
      jaExistiam: contasLeadsJa,
      naoImportadas: (csv.leads?.linhas.length ?? 0) - contasLeads - contasLeadsJa,
    });
    if (contasDeOpps > 0) {
      contagens.push({
        origem: "opportunities (empresas citadas)",
        destino: "contas",
        lidas: contasDeOpps,
        importadas: contasDeOpps,
        jaExistiam: 0,
        naoImportadas: 0,
      });
    }
    if (r.falhas > 0) avisos.push(`contas: ${r.falhas} linhas falharam na inserção (ver lista).`);
    // leads que deduplicaram em conta existente ainda precisam do vínculo
    for (const [chave, leadId] of leadLegadoPorChave) {
      if (!contaIdPorLead.has(leadId) && contaIdPorNome.has(chave)) {
        contaIdPorLead.set(leadId, contaIdPorNome.get(chave)!);
      }
    }
  }

  // --------------------------------------------- 4 · OPORTUNIDADES ----------
  // Antes: última etapa real por deal, extraída dos movimentos do 1.0 (para
  // etapa_congelada / etapa_perda quando o deal não guarda a etapa).
  // No 1.0 os movimentos são polimórficos: entity_type = lead | opportunity.
  const ehMovimentoDeOpp = (linha: Linha): boolean => {
    const tipo = pegar(linha, ["entity_type"]);
    if (tipo) return normalizar(tipo) === "opportunity";
    return Boolean(pegar(linha, ["opportunity_id", "oportunidade_id", "opp_id"]));
  };
  const refDaOpp = (linha: Linha): string | undefined =>
    pegar(linha, ["entity_id", "opportunity_id", "oportunidade_id", "opp_id", "deal_id"]);
  const refDoLead = (linha: Linha): string | undefined =>
    pegar(linha, ["entity_id", "lead_id"]);

  const ultimaEtapaPorOpp = new Map<string, EtapaNova>();
  if (csv.funnel_movements) {
    const ordenados = [...csv.funnel_movements.linhas].sort((a, b) => {
      const da = dataIso(pegar(a, ["moved_at", "created_at", "date", "data", "occurred_at"])) ?? "";
      const dbb = dataIso(pegar(b, ["moved_at", "created_at", "date", "data", "occurred_at"])) ?? "";
      return da.localeCompare(dbb);
    });
    for (const linha of ordenados) {
      if (!ehMovimentoDeOpp(linha)) continue;
      const oppRef = refDaOpp(linha);
      if (!oppRef) continue;
      const destino = mapearEtapa(pegar(linha, ["to_stage", "para_etapa", "stage", "etapa", "new_stage"]));
      if (destino && destino !== "GANHA" && destino !== "PERDIDA" && destino !== "HOLD") {
        ultimaEtapaPorOpp.set(oppRef, destino);
      }
    }
  }

  const jornadasNovas: Record<string, unknown>[] = [];
  const meddicNovos: Record<string, unknown>[] = [];
  let pendentesRecategorizar = 0;

  if (csv.opportunities) {
    const { linhas } = csv.opportunities;
    const novas: Record<string, unknown>[] = [];
    let jaExistiam = 0;

    for (const linha of linhas) {
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      const legado = `opportunities:${id1}`;
      if (oppIdPorLegado.has(legado)) {
        jaExistiam++;
        continue;
      }

      // Conta: primeiro pelo vínculo forte (lead_id), depois pelo nome da empresa
      const empresa = pegar(linha, ["company", "empresa", "company_name", "account", "conta", "client", "cliente", "hospital"]);
      const leadRef = pegar(linha, ["lead_id"]);
      const contaId =
        (leadRef ? contaIdPorLead.get(leadRef) : undefined) ??
        (empresa ? contaIdPorNome.get(normalizar(empresa)) : undefined);
      if (!contaId) {
        registrarPulo("opportunities", legado, `sem empresa reconhecível (company="${empresa ?? ""}")`);
        continue;
      }

      const statusBruto = pegar(linha, ["status", "stage", "etapa", "fase"]);
      const mapeado = mapearEtapa(statusBruto);
      let etapa: EtapaNova = "qualificacao_demo";
      let estado: "aberta" | "ganha" | "perdida" | "on_hold" = "aberta";
      let etapaCongelada: EtapaNova | null = null;
      let etapaPerda: EtapaNova | null = null;

      if (mapeado === "GANHA") {
        etapa = "assinatura";
        estado = "ganha";
      } else if (mapeado === "PERDIDA") {
        estado = "perdida";
        const lost = mapearEtapa(pegar(linha, ["lost_at_stage", "etapa_perda", "lost_stage"]));
        etapaPerda =
          lost && lost !== "GANHA" && lost !== "PERDIDA" && lost !== "HOLD"
            ? lost
            : (ultimaEtapaPorOpp.get(id1) ?? "qualificacao_demo");
        etapa = etapaPerda;
      } else if (mapeado === "HOLD") {
        estado = "on_hold";
        etapaCongelada = ultimaEtapaPorOpp.get(id1) ?? "qualificacao_demo";
        etapa = etapaCongelada;
      } else if (mapeado) {
        etapa = mapeado;
      } else {
        avisos.push(`opportunities:${id1} — status "${statusBruto ?? ""}" desconhecido → Qualificação & demo (aberta)`);
      }

      // Motivos estruturados
      let motivoHold: string | null = null;
      let motivoHoldDetalhe: string | null = null;
      let precisaRecategorizar = false;
      if (estado === "on_hold") {
        const bruto = pegar(linha, ["hold_reason", "on_hold_reason", "motivo_hold", "motivo", "reason"]);
        const casado = deDicionario(MAPA_MOTIVO_HOLD, bruto);
        if (casado) {
          motivoHold = casado;
          motivoHoldDetalhe = bruto && normalizar(bruto).replace(/[\s-]+/g, "_") !== casado ? bruto : null;
        } else {
          motivoHold = "outro";
          motivoHoldDetalhe = bruto ?? null;
          precisaRecategorizar = true;
          pendentesRecategorizar++;
        }
      }
      let motivoPerda: string | null = null;
      let motivoPerdaDetalhe: string | null = null;
      if (estado === "perdida") {
        const bruto = pegar(linha, ["lost_reason", "loss_reason", "motivo_perda", "motivo", "reason"]);
        const casado = deDicionario(MAPA_MOTIVO_PERDA, bruto);
        motivoPerda = casado ?? "outro";
        motivoPerdaDetalhe = casado && bruto && normalizar(bruto).replace(/[\s-]+/g, "_") === casado ? null : (bruto ?? "motivo não registrado no 1.0");
      }

      const produtosBrutos = listaDe(pegar(linha, ["scope_products", "products", "produtos", "escopo"]));
      const produtos = [
        ...new Set(
          produtosBrutos
            .map((p) => deDicionario(MAPA_PRODUTO, p))
            .filter((p): p is string => p != null)
        ),
      ];
      for (const bruto of produtosBrutos) {
        if (!deDicionario(MAPA_PRODUTO, bruto)) {
          avisos.push(`opportunities:${id1} — produto "${bruto}" sem mapeamento → fora do array (preservado em origem_1_0)`);
        }
      }

      const mrr = num(pegar(linha, ["mrr", "mrr_contratado", "monthly_value", "mrr_value"])) ?? 0;
      // O 1.0 não tem campo de setup — fica null (scope_service_value/benefits_value
      // são conceitos distintos e permanecem preservados em origem_1_0)
      const setup = num(pegar(linha, ["setup", "setup_valor", "setup_value", "setup_fee"]));
      const meses = inteiro(pegar(linha, ["contract_months", "contrato_meses", "months", "meses", "vigencia"]));
      const valor1 = num(pegar(linha, ["value", "valor", "total_value", "tcv"]));

      // Nome: o 1.0 não tinha nome de deal — gera "Produto — Empresa"
      const nomeDeal =
        pegar(linha, ["name", "nome", "title", "deal_name"]) ??
        `${produtos.length > 0 ? NOME_PRODUTO[produtos[0]] : "Deal"} — ${empresa ?? "conta"}`;

      if (valor1 != null) {
        const tcvCalc = (setup ?? 0) + mrr * (meses ?? 12);
        if (Math.abs(tcvCalc - valor1) > 1) {
          conferenciasTcv.push({ deal: nomeDeal, valor1_0: valor1, tcvCalculado: tcvCalc });
        }
      }

      novas.push({
        conta_id: contaId,
        nome: nomeDeal,
        etapa,
        estado,
        etapa_congelada: etapaCongelada,
        etapa_perda: etapaPerda,
        motivo_hold: motivoHold,
        motivo_hold_detalhe: motivoHoldDetalhe,
        motivo_perda: motivoPerda,
        motivo_perda_detalhe: motivoPerdaDetalhe,
        precisa_recategorizar: precisaRecategorizar,
        mrr_contratado: mrr,
        mrr_esperado: num(pegar(linha, ["expected_mrr", "mrr_esperado", "mrr_expected"])),
        setup_valor: setup,
        contrato_meses: meses,
        produtos,
        volume_mensal: num(pegar(linha, ["monthly_volume", "volume_mensal", "volume"])),
        valor_por_atendimento: num(
          pegar(linha, ["value_per_attendance", "valor_por_atendimento", "price_per_attendance"])
        ),
        closing_date: somenteData(pegar(linha, ["closing_date", "close_date", "expected_close"])),
        forecast_categoria: "pipeline",
        temperatura: deDicionario(MAPA_TEMPERATURA, pegar(linha, ["manual_temperature", "temperature", "temperatura"])),
        responsavel_id: resolverResponsavel(linha),
        partner_id: acharParceiro(linha),
        comissao_mrr_pct: num(pegar(linha, ["commission_mrr_pct", "comissao_mrr_pct", "commission"])),
        observacoes: pegar(linha, ["notes", "observacoes", "obs", "description", "descricao"]) ?? null,
        legado_id_1_0: legado,
        origem_1_0: origemJson("opportunities", linha),
        created_at: dataIso(pegar(linha, ["created_at", "criado_em"])) ?? new Date().toISOString(),
      });

      // MEDDIC / Challenger — status 'parcial' onde houver texto (blueprint §3)
      const meddicCampos = {
        metrics: pegar(linha, ["metrics", "meddic_metrics"]) ?? null,
        economic_buyer: pegar(linha, ["economic_buyer", "meddic_economic_buyer"]) ?? null,
        decision_criteria: pegar(linha, ["decision_criteria", "meddic_decision_criteria"]) ?? null,
        decision_process: pegar(linha, ["decision_process", "meddic_decision_process"]) ?? null,
        identify_pain: pegar(linha, ["identify_pain", "meddic_identify_pain", "implicate_pain", "meddic_pain"]) ?? null,
        champion: pegar(linha, ["champion", "meddic_champion"]) ?? null,
        challenger_teaching: pegar(linha, ["challenger_teaching", "teaching"]) ?? null,
        challenger_tailoring: pegar(linha, ["challenger_tailoring", "tailoring"]) ?? null,
        challenger_take_control: pegar(linha, ["challenger_take_control", "take_control"]) ?? null,
      };
      const temMeddic = Object.values(meddicCampos).some((v) => v != null);
      if (temMeddic && !legadoMeddic.has(`opportunities_meddic:${id1}`)) {
        meddicNovos.push({
          __legado_opp: legado,
          legado_id_1_0: `opportunities_meddic:${id1}`,
          ...meddicCampos,
          metrics_status: meddicCampos.metrics ? "parcial" : "vazio",
          economic_buyer_status: meddicCampos.economic_buyer ? "parcial" : "vazio",
          decision_criteria_status: meddicCampos.decision_criteria ? "parcial" : "vazio",
          decision_process_status: meddicCampos.decision_process ? "parcial" : "vazio",
          identify_pain_status: meddicCampos.identify_pain ? "parcial" : "vazio",
          champion_status: meddicCampos.champion ? "parcial" : "vazio",
        });
      }

      // Deal ganho ⇒ jornada de cliente (etapa CS preserva o status original)
      if (estado === "ganha" && !legadoJornadas.has(`opportunities_jornada:${id1}`)) {
        jornadasNovas.push({
          __legado_opp: legado,
          conta_id: contaId,
          etapa_cs: statusBruto ? normalizar(statusBruto).replace(/\s+/g, "_") : "implementacao",
          sync_status: "pendente",
          legado_id_1_0: `opportunities_jornada:${id1}`,
        });
      }
    }

    const r = await inserirLote("oportunidades", novas, (l, id) => {
      oppIdPorLegado.set(l.legado_id_1_0 as string, id);
      contaIdPorOppLegado.set(l.legado_id_1_0 as string, l["conta_id"] as string);
    });
    contagens.push({
      origem: "opportunities",
      destino: "oportunidades",
      lidas: linhas.length,
      importadas: r.inseridas,
      jaExistiam,
      naoImportadas: linhas.length - r.inseridas - jaExistiam,
    });

    // Conta com deal ganho vira cliente
    const contasClientes = new Set(
      novas
        .filter((n) => n["estado"] === "ganha")
        .map((n) => n["conta_id"] as string)
    );
    for (const contaId of contasClientes) {
      await db.from("contas").update({ status_relacionamento: "cliente" }).eq("id", contaId);
    }
  }

  // Reconstruir vínculo opp→conta para re-execuções (necessário nos logs)
  {
    const { data } = await db
      .from("oportunidades")
      .select("id, conta_id, legado_id_1_0")
      .not("legado_id_1_0", "is", null);
    for (const o of data ?? []) {
      oppIdPorLegado.set(o.legado_id_1_0 as string, o.id as string);
      contaIdPorOppLegado.set(o.legado_id_1_0 as string, o.conta_id as string);
    }
  }

  // MEDDIC e jornadas (dependem do id novo da oportunidade)
  if (meddicNovos.length > 0) {
    const linhas: LinhaInsercao[] = [];
    for (const m of meddicNovos) {
      const oppId = oppIdPorLegado.get(m.__legado_opp as string);
      if (!oppId) {
        registrarPulo("opportunities (meddic)", String(m.legado_id_1_0), "oportunidade não migrada");
        continue;
      }
      const { __legado_opp, ...resto } = m;
      linhas.push({ ...resto, oportunidade_id: oppId });
    }
    const r = await inserirLote("meddic_scorecards", linhas);
    contagens.push({
      origem: "opportunities (campos MEDDIC)",
      destino: "meddic_scorecards",
      lidas: meddicNovos.length,
      importadas: r.inseridas,
      jaExistiam: 0,
      naoImportadas: meddicNovos.length - r.inseridas,
    });
  }
  if (jornadasNovas.length > 0) {
    const linhas: LinhaInsercao[] = [];
    for (const j of jornadasNovas) {
      const oppId = oppIdPorLegado.get(j.__legado_opp as string);
      if (!oppId) {
        registrarPulo("opportunities (jornada)", String(j.legado_id_1_0), "oportunidade não migrada");
        continue;
      }
      const { __legado_opp, ...resto } = j;
      linhas.push({ ...resto, oportunidade_id: oppId });
    }
    const r = await inserirLote("jornadas_cliente", linhas);
    contagens.push({
      origem: "opportunities (deals ganhos)",
      destino: "jornadas_cliente",
      lidas: jornadasNovas.length,
      importadas: r.inseridas,
      jaExistiam: 0,
      naoImportadas: jornadasNovas.length - r.inseridas,
    });
  }

  // ------------------------------------------------------ 5 · CONTATOS ------
  // lead_stakeholders + stakeholders + partner_contacts → contatos
  // (dedup por vínculo + nome). Papéis ligados a oportunidade → papeis_no_deal.
  const contatoPorVinculoNome = new Map<string, string>(); // `${conta|parceiro}:${nome}` → contato_id
  {
    const { data } = await db.from("contatos").select("id, conta_id, parceiro_id, nome");
    for (const c of data ?? []) {
      const vinculo = (c.conta_id as string | null) ?? (c.parceiro_id as string | null) ?? "";
      contatoPorVinculoNome.set(`${vinculo}:${normalizar(c.nome as string)}`, c.id as string);
    }
  }

  const papeisNovos: Record<string, unknown>[] = [];

  // lead → oportunidades do lead (para promover papéis de lead_stakeholders)
  const oppsLegadoPorLead = new Map<string, string[]>();
  for (const linha of csv.opportunities?.linhas ?? []) {
    const leadRef = pegar(linha, ["lead_id"]);
    const id1 = pegar(linha, ["id", "uuid"]);
    if (!leadRef || !id1) continue;
    const lista = oppsLegadoPorLead.get(leadRef) ?? [];
    lista.push(id1);
    oppsLegadoPorLead.set(leadRef, lista);
  }

  /** email/telefone às vezes vêm num campo único "contact"/"contact_info". */
  function extrairContatoInfo(linha: Linha): { email: string | null; telefone: string | null } {
    let email = pegar(linha, ["email", "e-mail"]) ?? null;
    let telefone = pegar(linha, ["phone", "telefone", "celular", "whatsapp"]) ?? null;
    const generico = pegar(linha, ["contact", "contact_info", "contato"]);
    if (generico) {
      if (!email && generico.includes("@")) email = generico;
      else if (!telefone) telefone = generico;
    }
    return { email, telefone };
  }

  function traduzirPapel(bruto: string | undefined): {
    papel: string;
    posicao: string | null;
    nota: string | null;
  } | null {
    if (vazio(bruto)) return null;
    const v = normalizar(String(bruto)).replace(/[\s-]+/g, "_");
    if (v === "champion") return { papel: "champion", posicao: "promotor", nota: null };
    if (v === "promotor" || v === "promoter")
      return { papel: "influenciador", posicao: "promotor", nota: "papel herdado da migração — revisar no M2" };
    if (v === "detrator" || v === "detractor")
      return { papel: "influenciador", posicao: "detrator", nota: "papel a definir no M2 (1.0 só registrava posição)" };
    if (v === "economic_buyer" || v === "comprador")
      return { papel: "economic_buyer", posicao: null, nota: null };
    if (v === "influenciador" || v === "influencer")
      return { papel: "influenciador", posicao: null, nota: null };
    if (v === "usuario" || v === "user") return { papel: "usuario", posicao: null, nota: null };
    if (v === "bloqueador" || v === "blocker") return { papel: "bloqueador", posicao: null, nota: null };
    return { papel: "influenciador", posicao: null, nota: `papel do 1.0: "${bruto}" — revisar no M2` };
  }

  async function migrarContatos(
    tabela: "lead_stakeholders" | "stakeholders" | "partner_contacts"
  ) {
    const fonte = csv[tabela];
    if (!fonte) return;
    const novas: Record<string, unknown>[] = [];
    let jaExistiam = 0;
    let semVinculo = 0;

    for (const linha of fonte.linhas) {
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      const legado = `${tabela}:${id1}`;
      const nome = pegar(linha, ["name", "nome", "contact_name", "stakeholder_name"]);
      if (!nome) {
        registrarPulo(tabela, legado, "linha sem nome de pessoa");
        continue;
      }

      // vínculo: conta (via lead/opp/empresa) ou parceiro
      let contaId: string | null = null;
      let parceiroId: string | null = null;
      const leadRef = pegar(linha, ["lead_id"]);
      if (leadRef) contaId = contaIdPorLead.get(leadRef) ?? null;
      const oppRef = pegar(linha, ["opportunity_id", "oportunidade_id", "opp_id"]);
      if (!contaId && oppRef) contaId = contaIdPorOppLegado.get(`opportunities:${oppRef}`) ?? null;
      const empresaRef = pegar(linha, ["company", "empresa", "company_name"]);
      if (!contaId && empresaRef) contaId = contaIdPorNome.get(normalizar(empresaRef)) ?? null;
      if (tabela === "partner_contacts") {
        const pRef = pegar(linha, ["partner_id", "parceiro_id"]);
        if (pRef) parceiroId = parceiroIdPorLegado.get(`partners:${pRef}`) ?? null;
        if (!parceiroId) {
          const pNome = pegar(linha, ["partner", "parceiro", "partner_name"]);
          if (pNome) parceiroId = parceirosPorNome.get(normalizar(pNome)) ?? null;
        }
      }
      if (!contaId && !parceiroId) {
        semVinculo++;
        registrarPulo(tabela, `${legado} (${nome})`, "não foi possível vincular a conta nem parceiro");
        continue;
      }

      const chaveDedup = `${contaId ?? parceiroId}:${normalizar(nome)}`;
      let contatoId = contatoPorVinculoNome.get(chaveDedup);

      if (legadoContatos.has(legado)) {
        jaExistiam++;
        contatoId = legadoContatos.get(legado);
      } else if (contatoId) {
        jaExistiam++; // pessoa já existe por (vínculo, nome) — não duplica
      } else {
        const info = extrairContatoInfo(linha);
        novas.push({
          conta_id: contaId,
          parceiro_id: parceiroId,
          nome,
          // no 1.0, "role" é o cargo; "position" é a classificação política
          cargo: pegar(linha, ["role", "cargo", "title", "job_title"]) ?? null,
          email: info.email,
          telefone: info.telefone,
          linkedin: pegar(linha, ["linkedin", "linkedin_url"]) ?? null,
          instagram: pegar(linha, ["instagram", "instagram_url"]) ?? null,
          is_focal: ["true", "t", "1", "sim", "yes"].includes(
            (pegar(linha, ["is_focal", "focal", "is_primary", "principal"]) ?? "").toLowerCase()
          ),
          contexto: pegar(linha, ["context", "contexto", "notes", "observacoes", "obs"]) ?? null,
          legado_id_1_0: legado,
          origem_1_0: origemJson(tabela, linha),
        });
      }

      // papel/posição → papeis_no_deal (aplicado após inserção dos contatos):
      //   · stakeholders: ligados diretamente à oportunidade
      //   · lead_stakeholders: promovidos para TODAS as oportunidades do lead
      const papelBruto = pegar(linha, ["position", "stakeholder_type", "papel", "role_type", "classification"]);
      if (papelBruto) {
        const oppsAlvo = oppRef
          ? [oppRef]
          : leadRef
            ? (oppsLegadoPorLead.get(leadRef) ?? [])
            : [];
        for (const alvo of oppsAlvo) {
          papeisNovos.push({
            __legado_opp: `opportunities:${alvo}`,
            __chave_contato: chaveDedup,
            __legado_contato: legado,
            __herdado_do_lead: !oppRef,
            legado_id_1_0: `${tabela}_papel:${id1}:${alvo}`,
            bruto: papelBruto,
          });
        }
      }
    }

    const r = await inserirLote("contatos", novas, (l, id) => {
      const vinculo = (l["conta_id"] as string | null) ?? (l["parceiro_id"] as string | null) ?? "";
      contatoPorVinculoNome.set(`${vinculo}:${normalizar(l["nome"] as string)}`, id);
      contatoIdPorLegado.set(l.legado_id_1_0 as string, id);
    });
    contagens.push({
      origem: tabela,
      destino: "contatos",
      lidas: fonte.linhas.length,
      importadas: r.inseridas,
      jaExistiam,
      naoImportadas: fonte.linhas.length - r.inseridas - jaExistiam,
    });
    if (semVinculo > 0) {
      avisos.push(`${tabela}: ${semVinculo} pessoas sem vínculo identificável (listadas em não-importados).`);
    }
  }

  await migrarContatos("lead_stakeholders");
  await migrarContatos("stakeholders");
  await migrarContatos("partner_contacts");

  // papeis_no_deal
  if (papeisNovos.length > 0) {
    const linhas: Record<string, unknown>[] = [];
    for (const p of papeisNovos) {
      if (legadoPapeis.has(p.legado_id_1_0 as string)) continue;
      const oppId = oppIdPorLegado.get(p.__legado_opp as string);
      const contatoId =
        contatoIdPorLegado.get(p.__legado_contato as string) ??
        contatoPorVinculoNome.get(p.__chave_contato as string);
      if (!oppId || !contatoId) {
        registrarPulo("stakeholders (papel no deal)", String(p.legado_id_1_0), "deal ou contato não migrado");
        continue;
      }
      const traduzido = traduzirPapel(p.bruto as string);
      if (!traduzido) continue;
      linhas.push({
        oportunidade_id: oppId,
        contato_id: contatoId,
        papel: traduzido.papel,
        posicao: traduzido.posicao,
        notas: p.__herdado_do_lead
          ? [traduzido.nota, "herdado do lead no 1.0 (posição valia para a conta)"]
              .filter(Boolean)
              .join(" · ")
          : traduzido.nota,
        legado_id_1_0: p.legado_id_1_0,
      });
    }
    // o unique (oportunidade, contato) pode derrubar duplicados — fallback trata
    const r = await inserirLote("papeis_no_deal", linhas);
    contagens.push({
      origem: "lead_stakeholders + stakeholders (papéis)",
      destino: "papeis_no_deal",
      lidas: papeisNovos.length,
      importadas: r.inseridas,
      jaExistiam: papeisNovos.length - linhas.length,
      naoImportadas: linhas.length - r.inseridas,
    });
  }

  // --------------------------------------------- 6 · MOVIMENTOS (CRÍTICO) ---
  // Movimentos de OPORTUNIDADE → oportunidade_movimentos (integral).
  // Movimentos de LEAD (funil de prospecção — sem tabela própria no M1) são
  // preservados no jsonb origem_1_0 da conta correspondente (zero perda);
  // o M2 promove esse histórico quando o board de Prospecção nascer.
  const movimentosDeLeadPorConta = new Map<string, Record<string, string>[]>();
  let movimentosDeLeadTotal = 0;
  let movimentosDeLeadSemConta = 0;

  if (csv.funnel_movements) {
    const { linhas } = csv.funnel_movements;
    const novas: Record<string, unknown>[] = [];
    let jaExistiam = 0;

    for (const linha of linhas) {
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      const legado = `funnel_movements:${id1}`;

      if (!ehMovimentoDeOpp(linha)) {
        // movimento de LEAD → stash na conta
        movimentosDeLeadTotal++;
        const leadRef = refDoLead(linha);
        const contaId = leadRef ? contaIdPorLead.get(leadRef) : undefined;
        if (!contaId) {
          movimentosDeLeadSemConta++;
          registrarPulo(
            "funnel_movements",
            legado,
            `movimento de lead ${leadRef ?? "?"} sem conta correspondente no 2.0`
          );
          continue;
        }
        const registro: Record<string, string> = { legado_id_1_0: legado };
        for (const [k, v] of Object.entries(linha)) {
          if (!vazio(v)) registro[k] = v;
        }
        const lista = movimentosDeLeadPorConta.get(contaId) ?? [];
        lista.push(registro);
        movimentosDeLeadPorConta.set(contaId, lista);
        continue;
      }

      if (legadoMovs.has(legado)) {
        jaExistiam++;
        continue;
      }
      const oppRef = refDaOpp(linha);
      const oppId = oppRef ? oppIdPorLegado.get(`opportunities:${oppRef}`) : undefined;
      if (!oppId) {
        registrarPulo("funnel_movements", legado, `oportunidade ${oppRef ?? "?"} não encontrada no 2.0`);
        continue;
      }

      const deBruto = mapearEtapa(pegar(linha, ["from_stage", "de_etapa", "old_stage", "previous_stage"]));
      const paraBruto = mapearEtapa(pegar(linha, ["to_stage", "para_etapa", "stage", "new_stage", "etapa"]));

      const ehEtapa = (v: typeof deBruto): v is EtapaNova =>
        v != null && v !== "GANHA" && v !== "PERDIDA" && v !== "HOLD";

      let deEtapa: EtapaNova | null = ehEtapa(deBruto) ? deBruto : null;
      let paraEtapa: EtapaNova | null = ehEtapa(paraBruto) ? paraBruto : null;
      let deEstado: string | null = null;
      let paraEstado: string | null = null;

      // Movimentos para implementação/produção viram transição para GANHA;
      // idem perdida/on-hold (o 1.0 tratava estado como etapa).
      if (paraBruto === "GANHA") {
        deEstado = "aberta";
        paraEstado = "ganha";
        if (!paraEtapa) paraEtapa = "assinatura";
      } else if (paraBruto === "PERDIDA") {
        deEstado = "aberta";
        paraEstado = "perdida";
      } else if (paraBruto === "HOLD") {
        deEstado = "aberta";
        paraEstado = "on_hold";
      }
      if (deBruto === "GANHA") deEstado = "ganha";
      if (deBruto === "PERDIDA") {
        deEstado = "perdida";
        if (paraEtapa) paraEstado = "aberta"; // reabertura registrada no 1.0
      }
      if (deBruto === "HOLD") {
        deEstado = "on_hold";
        if (paraEtapa) paraEstado = "aberta";
      }

      if (!paraEtapa && !paraEstado) {
        registrarPulo(
          "funnel_movements",
          legado,
          `etapa de destino não reconhecida ("${pegar(linha, ["to_stage", "stage", "new_stage"]) ?? ""}") — revisar manualmente e reexecutar`
        );
        continue;
      }

      novas.push({
        oportunidade_id: oppId,
        de_etapa: deEtapa,
        para_etapa: paraEtapa,
        de_estado: deEstado,
        para_estado: paraEstado,
        ocorrido_em:
          dataIso(pegar(linha, ["moved_at", "created_at", "date", "data", "occurred_at"])) ??
          new Date().toISOString(),
        fonte: "migracao",
        legado_id_1_0: legado,
        origem_1_0: origemJson("funnel_movements", linha),
      });
    }

    const r = await inserirLote("oportunidade_movimentos", novas);
    const lidasOpp = linhas.length - movimentosDeLeadTotal;
    contagens.push({
      origem: "funnel_movements (entity_type=opportunity)",
      destino: "oportunidade_movimentos",
      lidas: lidasOpp,
      importadas: r.inseridas,
      jaExistiam,
      naoImportadas: lidasOpp - r.inseridas - jaExistiam,
    });

    // Grava o histórico de prospecção no jsonb da conta (idempotente: a chave
    // é sempre recalculada por inteiro a partir da origem)
    let contasComHistorico = 0;
    for (const [contaId, lista] of movimentosDeLeadPorConta) {
      const { data: atual } = await db
        .from("contas")
        .select("origem_1_0")
        .eq("id", contaId)
        .single();
      const origemAtual = (atual?.origem_1_0 as Record<string, unknown> | null) ?? {};
      const { error } = await db
        .from("contas")
        .update({
          origem_1_0: {
            ...origemAtual,
            movimentos_prospeccao_1_0: lista.sort((a, b) =>
              String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""))
            ),
          },
        })
        .eq("id", contaId);
      if (!error) contasComHistorico++;
    }
    contagens.push({
      origem: "funnel_movements (entity_type=lead)",
      destino: "contas.origem_1_0 (histórico de prospecção)",
      lidas: movimentosDeLeadTotal,
      importadas: movimentosDeLeadTotal - movimentosDeLeadSemConta,
      jaExistiam: 0,
      naoImportadas: movimentosDeLeadSemConta,
    });
    if (movimentosDeLeadTotal > 0) {
      avisos.push(
        `Movimentos de PROSPECÇÃO (lead) não têm tabela própria no M1 — ${movimentosDeLeadTotal - movimentosDeLeadSemConta} registros preservados em contas.origem_1_0 (${contasComHistorico} contas); o M2 promove esse histórico.`
      );
    }
  }

  // -------------------------------------------- 7 · CLOSING DATE HISTORY ----
  if (csv.closing_date_history) {
    const { linhas } = csv.closing_date_history;
    const novas: Record<string, unknown>[] = [];
    let jaExistiam = 0;
    for (const linha of linhas) {
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      const legado = `closing_date_history:${id1}`;
      if (legadoClosing.has(legado)) {
        jaExistiam++;
        continue;
      }
      const oppRef = pegar(linha, ["opportunity_id", "oportunidade_id", "opp_id"]);
      const oppId = oppRef ? oppIdPorLegado.get(`opportunities:${oppRef}`) : undefined;
      if (!oppId) {
        registrarPulo("closing_date_history", legado, `oportunidade ${oppRef ?? "?"} não encontrada`);
        continue;
      }
      const dataNova = somenteData(pegar(linha, ["new_date", "data_nova", "new_closing_date", "date"]));
      if (!dataNova) {
        registrarPulo("closing_date_history", legado, "linha sem data nova");
        continue;
      }
      novas.push({
        oportunidade_id: oppId,
        data_anterior: somenteData(pegar(linha, ["old_date", "data_anterior", "previous_date", "old_closing_date"])),
        data_nova: dataNova,
        alterado_em:
          dataIso(pegar(linha, ["changed_at", "created_at", "alterado_em", "date"])) ??
          new Date().toISOString(),
        motivo: pegar(linha, ["reason", "motivo", "notes"]) ?? null,
        legado_id_1_0: legado,
        origem_1_0: origemJson("closing_date_history", linha),
      });
    }
    const r = await inserirLote("closing_date_historico", novas);
    contagens.push({
      origem: "closing_date_history",
      destino: "closing_date_historico",
      lidas: linhas.length,
      importadas: r.inseridas,
      jaExistiam,
      naoImportadas: linhas.length - r.inseridas - jaExistiam,
    });
  }

  // ------------------------------------------------- 8 · ATIVIDADES ---------
  async function migrarLogs(
    tabela: "lead_contact_logs" | "opportunity_contact_logs" | "partner_contact_logs"
  ) {
    const fonte = csv[tabela];
    if (!fonte) return;
    const novas: Record<string, unknown>[] = [];
    let jaExistiam = 0;

    for (const linha of fonte.linhas) {
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      const legado = `${tabela}:${id1}`;
      if (legadoAtividades.has(legado)) {
        jaExistiam++;
        continue;
      }

      let contaId: string | null = null;
      let oppId: string | null = null;
      let parceiroId: string | null = null;

      if (tabela === "lead_contact_logs") {
        const leadRef = pegar(linha, ["lead_id"]);
        contaId = leadRef ? (contaIdPorLead.get(leadRef) ?? null) : null;
      } else if (tabela === "opportunity_contact_logs") {
        const oppRef = pegar(linha, ["opportunity_id", "oportunidade_id", "opp_id"]);
        if (oppRef) {
          oppId = oppIdPorLegado.get(`opportunities:${oppRef}`) ?? null;
          contaId = contaIdPorOppLegado.get(`opportunities:${oppRef}`) ?? null;
        }
      } else {
        const pRef = pegar(linha, ["partner_id", "parceiro_id"]);
        parceiroId = pRef ? (parceiroIdPorLegado.get(`partners:${pRef}`) ?? null) : null;
      }

      if (!contaId && !parceiroId) {
        registrarPulo(tabela, legado, "sem vínculo com conta/parceiro no 2.0");
        continue;
      }

      const tipoBruto = pegar(linha, ["type", "tipo", "contact_type", "channel", "canal"]);
      const resumo = pegar(linha, ["notes", "summary", "resumo", "description", "descricao", "content", "conteudo", "log"]);
      const titulo =
        pegar(linha, ["title", "titulo", "subject", "assunto"]) ??
        (resumo ? resumo.slice(0, 80) : `Contato registrado no 1.0`);

      novas.push({
        conta_id: contaId,
        oportunidade_id: oppId,
        parceiro_id: parceiroId,
        tipo: deDicionario(MAPA_TIPO_ATIVIDADE, tipoBruto) ?? "nota",
        data:
          dataIso(pegar(linha, ["date", "data", "contact_date", "created_at", "logged_at"])) ??
          new Date().toISOString(),
        titulo,
        resumo: resumo ?? null,
        fonte: "importado_1_0",
        legado_id_1_0: legado,
        origem_1_0: origemJson(tabela, linha),
      });
    }

    const r = await inserirLote("atividades", novas);
    contagens.push({
      origem: tabela,
      destino: "atividades",
      lidas: fonte.linhas.length,
      importadas: r.inseridas,
      jaExistiam,
      naoImportadas: fonte.linhas.length - r.inseridas - jaExistiam,
    });
  }

  await migrarLogs("lead_contact_logs");
  await migrarLogs("opportunity_contact_logs");
  await migrarLogs("partner_contact_logs");

  // ------------------------------------------------------ 9 · METAS ---------
  if (csv.sales_goals) {
    const { linhas } = csv.sales_goals;
    const novas: Record<string, unknown>[] = [];
    let jaExistiam = 0;
    for (const linha of linhas) {
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      const legado = `sales_goals:${id1}`;
      if (legadoMetas.has(legado)) {
        jaExistiam++;
        continue;
      }
      const ano =
        inteiro(pegar(linha, ["year", "ano"])) ??
        inteiro((pegar(linha, ["period", "periodo"]) ?? "").slice(0, 4)) ??
        null;
      if (!ano) {
        registrarPulo("sales_goals", legado, "não foi possível identificar o ano da meta");
        continue;
      }

      // No 1.0: type = direct | partner; reference_id = slug de vendedor OU uuid de parceiro
      const referencia = pegar(linha, ["reference_id", "referencia_id", "reference"]);
      const refEhUuid = referencia ? /^[0-9a-f-]{36}$/i.test(referencia) : false;
      const parceiroRef = refEhUuid ? parceiroIdPorLegado.get(`partners:${referencia}`) : undefined;
      const vendedorRef =
        referencia && ["chade", "andre"].includes(normalizar(referencia)) ? perfilAndreId : null;

      const tipoBruto = pegar(linha, ["type", "tipo", "goal_type"]);
      const tipo =
        deDicionario(
          {
            empresa: "empresa",
            company: "empresa",
            vendedor: "vendedor",
            seller: "vendedor",
            direct: "vendedor", // metas "direct" do 1.0 referenciam vendedor
            parceiro: "parceiro",
            partner: "parceiro",
            canal: "canal",
            channel: "canal",
          },
          tipoBruto
        ) ?? "empresa";

      novas.push({
        ano,
        trimestre: inteiro(pegar(linha, ["quarter", "trimestre", "q"])),
        tipo,
        referencia_id: parceiroRef ?? vendedorRef ?? null,
        valor_mrr:
          num(
            pegar(linha, ["annual_goal", "mrr", "valor_mrr", "mrr_target", "target", "goal", "value", "valor", "amount"])
          ) ?? 0,
        legado_id_1_0: legado,
        origem_1_0: origemJson("sales_goals", linha),
      });
    }
    const r = await inserirLote("metas", novas);
    contagens.push({
      origem: "sales_goals",
      destino: "metas",
      lidas: linhas.length,
      importadas: r.inseridas,
      jaExistiam,
      naoImportadas: linhas.length - r.inseridas - jaExistiam,
    });
  }

  // ------------------------------------------- 10 · CONHECIMENTO ------------
  for (const tabela of ["copilot_knowledge", "copilot_documents"] as const) {
    const fonte = csv[tabela];
    if (!fonte) continue;
    const novas: Record<string, unknown>[] = [];
    let jaExistiam = 0;
    for (const linha of fonte.linhas) {
      const id1 = pegar(linha, ["id", "uuid"]) ?? hashLinha(linha);
      const legado = `${tabela}:${id1}`;
      if (legadoConhecimento.has(legado)) {
        jaExistiam++;
        continue;
      }
      const titulo =
        pegar(linha, ["title", "titulo", "name", "nome", "filename", "file_name"]) ??
        `Registro ${tabela} ${id1.slice(0, 8)}`;
      novas.push({
        titulo,
        conteudo: pegar(linha, ["content", "conteudo", "extracted_text", "text", "texto", "body", "knowledge"]) ?? null,
        categoria:
          pegar(linha, ["category", "categoria", "type", "tipo"]) ??
          (tabela === "copilot_documents" ? "documento_1_0" : null),
        legado_id_1_0: legado,
        origem_1_0: origemJson(tabela, linha), // preserva url/storage path/metadata
      });
    }
    const r = await inserirLote("conhecimento", novas);
    contagens.push({
      origem: tabela,
      destino: "conhecimento",
      lidas: fonte.linhas.length,
      importadas: r.inseridas,
      jaExistiam,
      naoImportadas: fonte.linhas.length - r.inseridas - jaExistiam,
    });
  }

  // -------------------------------------- 11 · DUPLICATAS PROVÁVEIS ---------
  // Nomes de conta parecidos (mas não idênticos) — NUNCA fundidos
  // automaticamente; listados para revisão humana.
  const suspeitas: { a: string; b: string; criterio: string }[] = [];
  {
    const { data } = await db.from("contas").select("nome, nome_normalizado");
    const todas = (data ?? []).map((c) => ({
      nome: c.nome as string,
      norm: c.nome_normalizado as string,
    }));
    for (let i = 0; i < todas.length; i++) {
      for (let j = i + 1; j < todas.length; j++) {
        const a = todas[i];
        const b = todas[j];
        if (a.norm === b.norm) continue;
        const menor = Math.min(a.norm.length, b.norm.length);
        if (menor < 5) continue;
        if (a.norm.includes(b.norm) || b.norm.includes(a.norm)) {
          suspeitas.push({ a: a.nome, b: b.nome, criterio: "um nome contém o outro" });
        } else if (distanciaLevenshtein(a.norm, b.norm) <= 2) {
          suspeitas.push({ a: a.nome, b: b.nome, criterio: "diferença de até 2 caracteres" });
        }
      }
    }
  }

  // ------------------------------------------------- 12 · RELATÓRIOS --------
  const agora = new Date().toISOString();

  const duplicatasMd = [
    "# Duplicatas prováveis de contas — revisão humana",
    "",
    `Gerado em ${agora} pelo \`npm run migrate\`.`,
    "",
    "Regra da migração: na dúvida, **não fundir automaticamente**. As contas abaixo têm",
    "nomes parecidos e podem ser a mesma organização. Revise e, se forem duplicatas,",
    "funda manualmente (mova oportunidades/contatos e apague a sobra) — ou peça isso",
    "ao Claude no próximo módulo.",
    "",
    suspeitas.length === 0
      ? "_Nenhuma suspeita encontrada._"
      : ["| Conta A | Conta B | Critério |", "|---|---|---|"]
          .concat(suspeitas.map((s) => `| ${s.a} | ${s.b} | ${s.criterio} |`))
          .join("\n"),
    "",
  ].join("\n");
  fs.writeFileSync(ARQ_DUPLICATAS, duplicatasMd, "utf8");

  const totalNaoImportadas = contagens.reduce((s, c) => s + Math.max(0, c.naoImportadas), 0);
  const relatorioMd = [
    "# Relatório de migração — Sales Brain 1.0 → 2.0",
    "",
    `Execução: ${agora} · Script: \`migration/import.ts\` (idempotente — re-execução não duplica)`,
    "",
    "## Contagem origem × destino",
    "",
    "| Origem (1.0) | Destino (2.0) | Linhas lidas | Importadas | Já existiam | Não importadas |",
    "|---|---|---:|---:|---:|---:|",
    ...contagens.map(
      (c) =>
        `| ${c.origem} | ${c.destino} | ${c.lidas} | ${c.importadas} | ${c.jaExistiam} | ${Math.max(0, c.naoImportadas)} |`
    ),
    "",
    "“Já existiam” = pulados por idempotência (mesma chave legado) ou deduplicação legítima",
    "(mesma empresa em leads+target_list; mesma pessoa no mesmo vínculo).",
    "",
    "## Arquivos ausentes no export",
    "",
    arquivosAusentes.length === 0
      ? "_Todos os CSVs esperados estavam presentes._"
      : arquivosAusentes.map((a) => `- \`${a}.csv\` — não encontrado em migration/exports/ (seguiu sem ele)`).join("\n"),
    "",
    "## Registros NÃO importados e por quê",
    "",
    naoImportados.length === 0
      ? "_Nenhum registro ficou de fora._"
      : ["| Origem | Registro | Motivo |", "|---|---|---|"]
          .concat(naoImportados.map((n) => `| ${n.origem} | ${n.chave} | ${n.motivo} |`))
          .join("\n"),
    "",
    "## Conferência de TCV (campo `value` do 1.0 × TCV calculado)",
    "",
    "O `value` do 1.0 NÃO é importado como campo (decisão D3: TCV é sempre calculado =",
    "setup + MRR × meses, com 12 meses como padrão). Diferenças acima de R$ 1:",
    "",
    conferenciasTcv.length === 0
      ? "_Todos os valores conferem (ou o 1.0 não tinha `value`)._"
      : ["| Deal | value (1.0) | TCV calculado (2.0) |", "|---|---:|---:|"]
          .concat(
            conferenciasTcv.map(
              (c) => `| ${c.deal} | ${c.valor1_0.toLocaleString("pt-BR")} | ${c.tcvCalculado.toLocaleString("pt-BR")} |`
            )
          )
          .join("\n"),
    "",
    "## Recategorização pendente",
    "",
    `**${pendentesRecategorizar} deals on-hold** vieram com motivo genérico e aguardam`,
    "recategorização assistida em **/migracao/pendencias** (taxonomia do blueprint §2.4).",
    "",
    "## Avisos do mapeamento",
    "",
    avisos.length === 0 ? "_Nenhum aviso._" : avisos.map((a) => `- ${a}`).join("\n"),
    "",
    "## Duplicatas prováveis",
    "",
    `${suspeitas.length} suspeitas — ver \`migration/relatorio-duplicatas.md\` (nada foi fundido automaticamente).`,
    "",
    "## Declaração de zero perda",
    "",
    totalNaoImportadas === 0
      ? "✅ Todo registro de origem foi importado ou deduplicado conscientemente. Além disso, TODAS as colunas originais de cada linha estão preservadas no campo `origem_1_0` (jsonb) do registro de destino."
      : `⚠ ${totalNaoImportadas} registros não importados — todos listados acima com justificativa. As colunas originais dos importados estão preservadas em \`origem_1_0\` (jsonb).`,
    "",
  ].join("\n");
  fs.writeFileSync(ARQ_RELATORIO, relatorioMd, "utf8");

  console.log("\n──────────────────────────────────────────────");
  for (const c of contagens) {
    console.log(
      `  ${c.origem} → ${c.destino}: ${c.importadas} importadas · ${c.jaExistiam} já existiam · ${Math.max(0, c.naoImportadas)} fora`
    );
  }
  console.log(`\n  Deals aguardando recategorização: ${pendentesRecategorizar}`);
  console.log(`  Duplicatas prováveis de conta: ${suspeitas.length}`);
  console.log(`\n✔ Relatórios: migration/relatorio.md · migration/relatorio-duplicatas.md\n`);
}

// Só executa quando chamado diretamente (npm run migrate) — os helpers acima
// podem ser importados em testes sem disparar a migração.
if (require.main === module) {
  main().catch((erro) => {
    console.error("\n✖ Migração interrompida:", erro);
    process.exit(1);
  });
}
