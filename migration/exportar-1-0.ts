/* =============================================================================
 * Exporta as tabelas do Sales Brain 1.0 direto pela API pública do Supabase
 * dele (as policies do 1.0 permitem leitura com a chave anon) e grava os CSVs
 * em migration/exports/ — o mesmo formato do export manual do painel.
 *
 * Uso:  npx tsx migration/exportar-1-0.ts
 * Env (em .env.local):
 *   SUPABASE_1_0_URL=https://<ref>.supabase.co
 *   SUPABASE_1_0_ANON_KEY=<chave anon/publishable do 1.0>
 *
 * SOMENTE LEITURA — nada é alterado no 1.0.
 * ========================================================================== */

import * as fs from "node:fs";
import * as path from "node:path";
import { config as carregarEnv } from "dotenv";

const RAIZ = path.resolve(__dirname, "..");
carregarEnv({ path: path.join(RAIZ, ".env.local") });
carregarEnv({ path: path.join(RAIZ, ".env") });

const URL_1_0 = process.env.SUPABASE_1_0_URL?.replace(/\/$/, "");
const ANON_1_0 = process.env.SUPABASE_1_0_ANON_KEY;

if (!URL_1_0 || !ANON_1_0) {
  console.error(
    "\n✖ Configure SUPABASE_1_0_URL e SUPABASE_1_0_ANON_KEY em .env.local (chaves do Supabase do 1.0).\n"
  );
  process.exit(1);
}

const TABELAS = [
  "leads",
  "target_list",
  "opportunities",
  "lead_stakeholders",
  "stakeholders",
  "partners",
  "partner_contacts",
  "sales_goals",
  "funnel_movements",
  "opportunity_closing_date_history",
  "lead_contact_logs",
  "opportunity_contact_logs",
  "partner_contact_logs",
  "copilot_knowledge",
  "copilot_documents",
  "lead_org_details",
  "lead_origins",
];

const PASTA = path.join(RAIZ, "migration", "exports");

function celula(v: unknown): string {
  if (v == null) return "";
  let s: string;
  if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function baixarTabela(tabela: string): Promise<Record<string, unknown>[]> {
  const linhas: Record<string, unknown>[] = [];
  const PAGINA = 1000;
  for (let de = 0; ; de += PAGINA) {
    const resposta = await fetch(`${URL_1_0}/rest/v1/${tabela}?select=*`, {
      headers: {
        apikey: ANON_1_0!,
        Authorization: `Bearer ${ANON_1_0}`,
        Range: `${de}-${de + PAGINA - 1}`,
        Prefer: "count=exact",
      },
    });
    if (resposta.status === 404) throw new Error("tabela não existe");
    if (!resposta.ok && resposta.status !== 206) {
      throw new Error(`HTTP ${resposta.status}: ${(await resposta.text()).slice(0, 200)}`);
    }
    const pagina = (await resposta.json()) as Record<string, unknown>[];
    linhas.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  return linhas;
}

async function main() {
  console.log(`\n📦 Exportando o Sales Brain 1.0 (${URL_1_0}) — somente leitura\n`);
  fs.mkdirSync(PASTA, { recursive: true });

  let total = 0;
  const ausentes: string[] = [];

  for (const tabela of TABELAS) {
    try {
      const linhas = await baixarTabela(tabela);
      // Colunas: ordem da primeira linha + extras que aparecerem depois
      const colunas: string[] = [];
      for (const l of linhas) {
        for (const k of Object.keys(l)) if (!colunas.includes(k)) colunas.push(k);
      }
      const csv = [
        colunas.join(","),
        ...linhas.map((l) => colunas.map((c) => celula(l[c])).join(",")),
      ].join("\n");
      fs.writeFileSync(path.join(PASTA, `${tabela}.csv`), csv + "\n", "utf8");
      console.log(`  ✔ ${tabela}: ${linhas.length} linhas`);
      total += linhas.length;
    } catch (erro) {
      ausentes.push(tabela);
      console.log(`  ⚠ ${tabela}: ${(erro as Error).message} — seguindo sem ela`);
    }
  }

  console.log(
    `\n✔ ${total} linhas exportadas para migration/exports/` +
      (ausentes.length > 0 ? ` (ausentes: ${ausentes.join(", ")})` : "") +
      `\n  Próximo passo: npm run migrate\n`
  );
}

main().catch((erro) => {
  console.error("\n✖ Export interrompido:", erro);
  process.exit(1);
});
