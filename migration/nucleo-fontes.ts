// Fontes do Sales Brain 1.0 SEM arquivos: busca as tabelas direto da API
// pública do Supabase do 1.0 (policies de leitura pública) e converte para o
// formato que o núcleo da migração consome. Usado pelo runner de setup na
// Vercel — e por qualquer ambiente com rede liberada.
//
// SOMENTE LEITURA no 1.0, sempre.

import { TABELAS_1_0, type Fontes, type NomeTabela1_0 } from "./import";

const APP_1_0 = "https://doutorai-sales-brain.lovable.app";

/** Nomes reais no banco do 1.0 quando diferem do nome canônico da migração. */
const NOME_REAL_1_0: Partial<Record<NomeTabela1_0, string[]>> = {
  closing_date_history: ["opportunity_closing_date_history", "closing_date_history"],
};

/**
 * Extrai a URL e a chave pública (anon/publishable) do Supabase do 1.0 a
 * partir do bundle do app publicado — mesmos valores que qualquer visitante
 * do app recebe no navegador.
 */
export async function extrairCredenciais1_0(
  appUrl: string = APP_1_0
): Promise<{ url: string; chave: string }> {
  const html = await (await fetch(appUrl, { headers: { "User-Agent": "Mozilla/5.0" } })).text();

  const scripts = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)]
    .map((m) => m[1])
    .filter((s) => !s.startsWith("http") || s.startsWith(appUrl))
    .slice(0, 5);

  const corpos: string[] = [html];
  for (const src of scripts) {
    const absoluta = src.startsWith("http") ? src : `${appUrl.replace(/\/$/, "")}/${src.replace(/^\//, "")}`;
    try {
      corpos.push(await (await fetch(absoluta)).text());
    } catch {
      /* segue para o próximo bundle */
    }
  }

  for (const corpo of corpos) {
    const url = corpo.match(/https:\/\/[a-z0-9]{15,}\.supabase\.co/)?.[0];
    const chave =
      corpo.match(/sb_publishable_[A-Za-z0-9_-]{10,}/)?.[0] ??
      corpo.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/)?.[0];
    if (url && chave) return { url, chave };
  }
  throw new Error(
    "Não encontrei a URL/chave do Supabase do 1.0 no bundle publicado — o app mudou de estrutura?"
  );
}

async function baixarTabela(
  base: string,
  chave: string,
  tabela: string
): Promise<Record<string, unknown>[] | null> {
  const linhas: Record<string, unknown>[] = [];
  const PAGINA = 1000;
  for (let de = 0; ; de += PAGINA) {
    const resposta = await fetch(`${base}/rest/v1/${tabela}?select=*`, {
      headers: {
        apikey: chave,
        Authorization: `Bearer ${chave}`,
        Range: `${de}-${de + PAGINA - 1}`,
      },
    });
    if (resposta.status === 404) return null; // tabela não existe
    if (!resposta.ok && resposta.status !== 206) {
      throw new Error(`1.0/${tabela}: HTTP ${resposta.status}`);
    }
    const pagina = (await resposta.json()) as Record<string, unknown>[];
    linhas.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  return linhas;
}

/** JSON da API → linhas string-a-string, como o parser de CSV produziria. */
function paraLinhas(registros: Record<string, unknown>[]): { linhas: Record<string, string>[] } {
  return {
    linhas: registros.map((r) => {
      const linha: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        if (v == null) linha[k] = "";
        else if (typeof v === "object") linha[k] = JSON.stringify(v);
        else linha[k] = String(v);
      }
      return linha;
    }),
  };
}

/** Baixa todas as tabelas do 1.0 e devolve as fontes prontas para a migração. */
export async function baixarFontes1_0(
  url: string,
  chave: string
): Promise<{ fontes: Fontes; contagem: Record<string, number>; ausentes: string[] }> {
  const fontes: Fontes = {};
  const contagem: Record<string, number> = {};
  const ausentes: string[] = [];

  for (const nome of TABELAS_1_0) {
    const candidatos = NOME_REAL_1_0[nome] ?? [nome];
    let dados: Record<string, unknown>[] | null = null;
    for (const real of candidatos) {
      dados = await baixarTabela(url, chave, real);
      if (dados != null) break;
    }
    if (dados == null) {
      ausentes.push(nome);
      continue;
    }
    fontes[nome] = paraLinhas(dados);
    contagem[nome] = dados.length;
  }

  return { fontes, contagem, ausentes };
}
