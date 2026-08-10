// Guarda das rotas de setup (bootstrap do M1, comandadas pelo Claude via
// ferramenta de fetch da Vercel — a rede do ambiente de sessão é restrita).
//
// Segurança: as rotas SÓ existem se SETUP_SEGREDO estiver definido no deploy
// (o deploy final de produção não define — tudo aqui responde 404) e toda
// chamada precisa do mesmo segredo na query string.

import * as fs from "node:fs";
import * as path from "node:path";

export function validarSegredo(request: Request): Response | null {
  const esperado = process.env.SETUP_SEGREDO;
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
