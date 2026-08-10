// Guarda das rotas de setup (bootstrap do M1, comandadas pelo Claude via
// ferramenta de fetch da Vercel — a rede do ambiente de sessão é restrita).
//
// Segurança: as rotas SÓ existem se SETUP_SEGREDO estiver definido no deploy
// (o deploy final de produção não define — tudo aqui responde 404) e toda
// chamada precisa do mesmo segredo na query string.

import * as fs from "node:fs";
import * as path from "node:path";

// Config do setup: variável de ambiente OU config-setup.json na raiz do deploy
// (fallback para o caso de o runtime da Vercel não carregar o .env.production).
// O json NUNCA vai para o git — só existe nos arquivos do deploy de bootstrap.
let configArquivo: Record<string, string> | null | undefined;

function lerConfigArquivo(): Record<string, string> | null {
  if (configArquivo !== undefined) return configArquivo;
  try {
    const caminho = path.join(process.cwd(), "config-setup.json");
    configArquivo = fs.existsSync(caminho)
      ? (JSON.parse(fs.readFileSync(caminho, "utf8")) as Record<string, string>)
      : null;
  } catch {
    configArquivo = null;
  }
  return configArquivo;
}

export function envSetup(chave: string): string | undefined {
  return process.env[chave] ?? lerConfigArquivo()?.[chave] ?? undefined;
}

export function validarSegredo(request: Request): Response | null {
  const esperado = envSetup("SETUP_SEGREDO");
  if (!esperado) {
    return new Response("Não encontrado", { status: 404 });
  }
  const recebido = new URL(request.url).searchParams.get("segredo");
  if (recebido !== esperado) {
    return Response.json({ erro: "segredo inválido" }, { status: 401 });
  }
  return null;
}

/** Lê as migrations SQL empacotadas no deploy (outputFileTracingIncludes). */
export function lerMigrations(): { nome: string; sql: string }[] {
  const pasta = path.join(process.cwd(), "supabase", "migrations");
  if (!fs.existsSync(pasta)) {
    throw new Error(
      `Pasta de migrations não encontrada em ${pasta} — conferir outputFileTracingIncludes no next.config.mjs`
    );
  }
  return fs
    .readdirSync(pasta)
    .filter((a) => a.endsWith(".sql"))
    .sort()
    .map((nome) => ({ nome, sql: fs.readFileSync(path.join(pasta, nome), "utf8") }));
}

export function respostaJson(dados: unknown, status = 200): Response {
  return Response.json(dados, { status });
}
