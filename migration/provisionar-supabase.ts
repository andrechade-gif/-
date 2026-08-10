/* =============================================================================
 * Provisiona o Supabase NOVO do Sales Brain 2.0 pela Management API:
 *   1. encontra (ou cria) o projeto "sales-brain" na organização do André
 *      — região sa-east-1 (São Paulo)
 *   2. espera ficar saudável e captura as chaves (anon + service_role)
 *   3. aplica as migrations SQL (supabase/migrations/*.sql, em ordem)
 *   4. configura o Auth (Site URL, redirects, auto-confirmação de e-mail e,
 *      se fornecido, o provider Google)
 *   5. grava .env.local com as chaves
 *
 * Uso:  npx tsx migration/provisionar-supabase.ts
 * Env (em .env.local ou no ambiente):
 *   SUPABASE_ACCESS_TOKEN=sbp_...     (obrigatório — Personal Access Token)
 *   SUPABASE_ORG_SLUG=...             (opcional; obrigatório se houver 2+ orgs)
 *   SITE_URL=https://...              (opcional; padrão http://localhost:3000)
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (opcionais — ativam login Google)
 *
 * Idempotente: reexecutar reaproveita o projeto e pula migrations já aplicadas.
 * ========================================================================== */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { config as carregarEnv } from "dotenv";

const RAIZ = path.resolve(__dirname, "..");
carregarEnv({ path: path.join(RAIZ, ".env.local") });
carregarEnv({ path: path.join(RAIZ, ".env") });

const API = "https://api.supabase.com";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const NOME_PROJETO = "sales-brain";
const REGIAO = "sa-east-1";

if (!TOKEN) {
  console.error(
    "\n✖ Falta SUPABASE_ACCESS_TOKEN.\n" +
      "  Crie um Personal Access Token em https://supabase.com/dashboard/account/tokens\n" +
      "  e coloque em .env.local:  SUPABASE_ACCESS_TOKEN=sbp_...\n"
  );
  process.exit(1);
}

async function api<T = unknown>(
  metodo: string,
  rota: string,
  corpo?: unknown
): Promise<{ status: number; dados: T }> {
  const resposta = await fetch(`${API}${rota}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  let dados: T;
  try {
    dados = JSON.parse(texto) as T;
  } catch {
    dados = texto as unknown as T;
  }
  return { status: resposta.status, dados };
}

function falhar(mensagem: string, detalhe?: unknown): never {
  console.error(`\n✖ ${mensagem}`);
  if (detalhe) console.error("  detalhe:", typeof detalhe === "string" ? detalhe.slice(0, 500) : JSON.stringify(detalhe).slice(0, 500));
  process.exit(1);
}

async function executarSql(ref: string, query: string): Promise<unknown> {
  const { status, dados } = await api("POST", `/v1/projects/${ref}/database/query`, { query });
  if (status >= 300) throw new Error(`SQL falhou (HTTP ${status}): ${JSON.stringify(dados).slice(0, 400)}`);
  return dados;
}

async function main() {
  console.log("\n🏗  Provisionando o Supabase do Sales Brain 2.0\n");

  // ---------------------------------------------------------- organização --
  const orgs = await api<{ id: string; slug: string; name: string }[]>("GET", "/v1/organizations");
  if (orgs.status !== 200 || !Array.isArray(orgs.dados) || orgs.dados.length === 0) {
    falhar("Não consegui listar organizações — o token está correto?", orgs.dados);
  }
  const desejada = process.env.SUPABASE_ORG_SLUG;
  const org =
    (desejada && orgs.dados.find((o) => o.slug === desejada || o.name === desejada)) ??
    (orgs.dados.length === 1 ? orgs.dados[0] : undefined);
  if (!org) {
    falhar(
      `Há ${orgs.dados.length} organizações — defina SUPABASE_ORG_SLUG. Opções: ${orgs.dados
        .map((o) => o.slug)
        .join(", ")}`
    );
  }
  console.log(`  · Organização: ${org.name} (${org.slug})`);

  // -------------------------------------------------- projeto (find/create) --
  const projetos = await api<{ id: string; name: string; region: string; status: string }[]>(
    "GET",
    "/v1/projects"
  );
  if (projetos.status !== 200) falhar("Falha listando projetos", projetos.dados);

  let ref: string | undefined = (projetos.dados as { id: string; name: string }[]).find(
    (p) => p.name === NOME_PROJETO
  )?.id;

  if (ref) {
    console.log(`  · Projeto "${NOME_PROJETO}" já existe (${ref}) — reaproveitando`);
  } else {
    const senhaDb = crypto.randomBytes(24).toString("base64url") + "!Aa1";
    console.log(`  · Criando projeto "${NOME_PROJETO}" em ${REGIAO}…`);
    const criado = await api<{ id: string }>("POST", "/v1/projects", {
      organization_id: org.id,
      name: NOME_PROJETO,
      region: REGIAO,
      db_pass: senhaDb,
    });
    if (criado.status >= 300 || !criado.dados?.id) {
      falhar(
        "Não consegui criar o projeto (limite do plano gratuito? projetos pausados contam).",
        criado.dados
      );
    }
    ref = criado.dados.id;
    // guarda a senha do banco para o André (não é usada pelo app, mas é a chave-mestra)
    fs.appendFileSync(
      path.join(RAIZ, ".env.local"),
      `\n# senha master do banco (guarde num gerenciador de senhas e apague daqui)\n# SUPABASE_DB_PASSWORD=${senhaDb}\n`
    );
    console.log(`  · Projeto criado: ${ref} (senha do banco anotada em .env.local — guarde e apague)`);
  }

  // --------------------------------------------------------- aguardar ativo --
  process.stdout.write("  · Aguardando o projeto ficar saudável");
  let ativo = false;
  for (let i = 0; i < 60; i++) {
    const info = await api<{ status: string }>("GET", `/v1/projects/${ref}`);
    if (info.status === 200 && info.dados.status === "ACTIVE_HEALTHY") {
      ativo = true;
      break;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 6000));
  }
  console.log("");
  if (!ativo) falhar("Projeto não ficou saudável em ~6 min — tente reexecutar em instantes.");

  const urlProjeto = `https://${ref}.supabase.co`;

  // ---------------------------------------------------------------- chaves --
  const chaves = await api<{ name: string; api_key: string; type?: string }[]>(
    "GET",
    `/v1/projects/${ref}/api-keys?reveal=true`
  );
  if (chaves.status !== 200 || !Array.isArray(chaves.dados)) falhar("Falha lendo as chaves", chaves.dados);
  const anon =
    chaves.dados.find((c) => c.name === "anon")?.api_key ??
    chaves.dados.find((c) => c.type === "publishable")?.api_key;
  const service =
    chaves.dados.find((c) => c.name === "service_role")?.api_key ??
    chaves.dados.find((c) => c.type === "secret")?.api_key;
  if (!anon || !service) falhar("Não encontrei as chaves anon/service_role", chaves.dados);
  console.log("  · Chaves capturadas (anon + service_role)");

  // ------------------------------------------------------------- migrations --
  const jaTemSchema = (await executarSql(
    ref,
    "select count(*)::int as n from information_schema.tables where table_schema='public' and table_name='perfis'"
  )) as { n: number }[] | { result?: unknown };
  const n = Array.isArray(jaTemSchema) ? (jaTemSchema[0]?.n ?? 0) : 0;

  if (n > 0) {
    console.log("  · Schema já aplicado (tabela perfis existe) — pulando migrations");
  } else {
    const pasta = path.join(RAIZ, "supabase", "migrations");
    const arquivos = fs
      .readdirSync(pasta)
      .filter((a) => a.endsWith(".sql"))
      .sort();
    for (const arquivo of arquivos) {
      process.stdout.write(`  · Aplicando ${arquivo}… `);
      const sql = fs.readFileSync(path.join(pasta, arquivo), "utf8");
      await executarSql(ref, sql);
      console.log("ok");
    }
  }

  // ------------------------------------------------------------ config auth --
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const redirects = [
    "http://localhost:3000/**",
    "https://*.vercel.app/**",
    "https://salesbrain.doutor-ai.com/**",
  ].join(",");

  const authConfig: Record<string, unknown> = {
    site_url: siteUrl,
    uri_allow_list: redirects,
    // e-mail/senha sem depender de SMTP: confirma automaticamente; a segurança
    // real está na regra @doutor-ai.com + aprovação do admin (servidor + banco)
    mailer_autoconfirm: true,
  };
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    authConfig.external_google_enabled = true;
    authConfig.external_google_client_id = process.env.GOOGLE_CLIENT_ID;
    authConfig.external_google_secret = process.env.GOOGLE_CLIENT_SECRET;
    console.log("  · Provider Google será ativado");
  } else {
    console.log("  · Provider Google ainda sem credenciais (login por e-mail/senha funciona)");
  }
  const auth = await api("PATCH", `/v1/projects/${ref}/config/auth`, authConfig);
  if (auth.status >= 300) falhar("Falha configurando o Auth", auth.dados);
  console.log(`  · Auth configurado (Site URL: ${siteUrl})`);

  // -------------------------------------------------------------- .env.local --
  const envPath = path.join(RAIZ, ".env.local");
  const atual = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const semChavesAntigas = atual
    .split("\n")
    .filter(
      (l) =>
        !l.startsWith("NEXT_PUBLIC_SUPABASE_URL=") &&
        !l.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=") &&
        !l.startsWith("SUPABASE_SERVICE_ROLE_KEY=") &&
        !l.startsWith("NEXT_PUBLIC_SITE_URL=")
    )
    .join("\n");
  fs.writeFileSync(
    envPath,
    `${semChavesAntigas.trim()}\n\nNEXT_PUBLIC_SUPABASE_URL=${urlProjeto}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}\nSUPABASE_SERVICE_ROLE_KEY=${service}\nNEXT_PUBLIC_SITE_URL=${siteUrl}\n`,
    "utf8"
  );

  console.log(
    `\n✔ Supabase pronto!\n` +
      `  URL: ${urlProjeto}\n` +
      `  .env.local atualizado (anon + service_role + site url)\n` +
      `  Painel: https://supabase.com/dashboard/project/${ref}\n`
  );
}

main().catch((erro) => {
  console.error("\n✖ Provisionamento interrompido:", erro);
  process.exit(1);
});
