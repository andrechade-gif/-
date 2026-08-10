// Provisionamento do Supabase 2.0 em PASSOS CURTOS (máquina de estados sem
// memória local — o estado é sempre lido da própria Management API). Cada
// chamada avança o que der e retorna a fase atual; quem chama repete até
// "pronto". Usado pelo runner de setup na Vercel e reaproveitável em scripts.

import * as crypto from "node:crypto";

const API = "https://api.supabase.com";
export const NOME_PROJETO = "sales-brain";
const REGIAO = "sa-east-1";

export interface EstadoProvisao {
  fase: "erro" | "criando" | "aguardando" | "pronto";
  mensagem: string;
  ref?: string;
  url?: string;
  status_projeto?: string;
  schema_aplicado?: boolean;
  auth_configurado?: boolean;
  anon_key?: string;
  service_role_key?: string;
  senha_db_gerada?: string; // devolvida UMA vez, na criação — guardar e descartar
  detalhe?: unknown;
}

async function api<T = unknown>(
  token: string,
  metodo: string,
  rota: string,
  corpo?: unknown
): Promise<{ status: number; dados: T }> {
  const resposta = await fetch(`${API}${rota}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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

async function executarSql(token: string, ref: string, query: string): Promise<unknown> {
  const { status, dados } = await api(token, "POST", `/v1/projects/${ref}/database/query`, {
    query,
  });
  if (status >= 300) {
    throw new Error(`SQL falhou (HTTP ${status}): ${JSON.stringify(dados).slice(0, 400)}`);
  }
  return dados;
}

export interface OpcoesProvisao {
  token: string;
  /** SQLs das migrations, em ordem (nome → conteúdo). */
  migrations: { nome: string; sql: string }[];
  siteUrl?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  orgSlug?: string;
}

export async function avancarProvisao(opts: OpcoesProvisao): Promise<EstadoProvisao> {
  const { token } = opts;

  // ---------------------------------------------------------- organização --
  const orgs = await api<{ id: string; slug: string; name: string }[]>(
    token,
    "GET",
    "/v1/organizations"
  );
  if (orgs.status !== 200 || !Array.isArray(orgs.dados) || orgs.dados.length === 0) {
    return { fase: "erro", mensagem: "Token inválido ou sem organizações.", detalhe: orgs.dados };
  }
  const org =
    (opts.orgSlug && orgs.dados.find((o) => o.slug === opts.orgSlug || o.name === opts.orgSlug)) ??
    (orgs.dados.length === 1 ? orgs.dados[0] : undefined);
  if (!org) {
    return {
      fase: "erro",
      mensagem: `Há ${orgs.dados.length} organizações — informe orgSlug. Opções: ${orgs.dados.map((o) => o.slug).join(", ")}`,
    };
  }

  // -------------------------------------------------------------- projeto --
  const projetos = await api<{ id: string; name: string; status: string }[]>(
    token,
    "GET",
    "/v1/projects"
  );
  if (projetos.status !== 200 || !Array.isArray(projetos.dados)) {
    return { fase: "erro", mensagem: "Falha listando projetos.", detalhe: projetos.dados };
  }

  let projeto = projetos.dados.find((p) => p.name === NOME_PROJETO);
  if (!projeto) {
    const senhaDb = crypto.randomBytes(24).toString("base64url") + "!Aa1";
    const criado = await api<{ id: string }>(token, "POST", "/v1/projects", {
      organization_id: org.id,
      name: NOME_PROJETO,
      region: REGIAO,
      db_pass: senhaDb,
    });
    if (criado.status >= 300 || !criado.dados?.id) {
      return {
        fase: "erro",
        mensagem:
          "Não consegui criar o projeto (limite de projetos do plano gratuito? projetos pausados contam).",
        detalhe: criado.dados,
      };
    }
    return {
      fase: "criando",
      mensagem: `Projeto "${NOME_PROJETO}" criado em ${REGIAO} — aguardando provisionar.`,
      ref: criado.dados.id,
      senha_db_gerada: senhaDb,
    };
  }

  const ref = projeto.id;
  const url = `https://${ref}.supabase.co`;

  // ------------------------------------------------------------ saúde ------
  const info = await api<{ status: string }>(token, "GET", `/v1/projects/${ref}`);
  const statusProjeto = info.status === 200 ? info.dados.status : "desconhecido";
  if (statusProjeto !== "ACTIVE_HEALTHY") {
    return {
      fase: "aguardando",
      mensagem: `Projeto ainda não está saudável (${statusProjeto}). Chame de novo em ~15s.`,
      ref,
      url,
      status_projeto: statusProjeto,
    };
  }

  // ------------------------------------------------------------- schema ----
  const temPerfis = (await executarSql(
    token,
    ref,
    "select count(*)::int as n from information_schema.tables where table_schema='public' and table_name='perfis'"
  )) as { n: number }[];
  const schemaJaAplicado = Array.isArray(temPerfis) && (temPerfis[0]?.n ?? 0) > 0;

  if (!schemaJaAplicado) {
    for (const m of opts.migrations) {
      await executarSql(token, ref, m.sql);
    }
  }

  // ---------------------------------------------------------- config auth --
  const authConfig: Record<string, unknown> = {
    site_url: opts.siteUrl ?? "http://localhost:3000",
    uri_allow_list: [
      "http://localhost:3000/**",
      "https://*.vercel.app/**",
      "https://salesbrain.doutor-ai.com/**",
    ].join(","),
    mailer_autoconfirm: true,
  };
  if (opts.googleClientId && opts.googleClientSecret) {
    authConfig.external_google_enabled = true;
    authConfig.external_google_client_id = opts.googleClientId;
    authConfig.external_google_secret = opts.googleClientSecret;
  }
  const auth = await api(token, "PATCH", `/v1/projects/${ref}/config/auth`, authConfig);
  const authOk = auth.status < 300;

  // -------------------------------------------------------------- chaves ---
  const chaves = await api<{ name: string; api_key: string; type?: string }[]>(
    token,
    "GET",
    `/v1/projects/${ref}/api-keys?reveal=true`
  );
  const lista = Array.isArray(chaves.dados) ? chaves.dados : [];
  const anon =
    lista.find((c) => c.name === "anon")?.api_key ??
    lista.find((c) => c.type === "publishable")?.api_key;
  const service =
    lista.find((c) => c.name === "service_role")?.api_key ??
    lista.find((c) => c.type === "secret")?.api_key;

  if (!anon || !service) {
    return {
      fase: "erro",
      mensagem: "Projeto pronto, mas não encontrei as chaves anon/service_role.",
      ref,
      url,
      detalhe: lista.map((c) => c.name ?? c.type),
    };
  }

  return {
    fase: "pronto",
    mensagem: schemaJaAplicado
      ? "Projeto saudável; schema já estava aplicado; auth atualizado."
      : "Projeto saudável; schema aplicado agora; auth configurado.",
    ref,
    url,
    status_projeto: statusProjeto,
    schema_aplicado: true,
    auth_configurado: authOk,
    anon_key: anon,
    service_role_key: service,
  };
}
