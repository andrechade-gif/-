// GET /api/setup/status?segredo=… — checagem passiva do runner de setup:
// o que está configurado neste deploy, sem criar nem alterar nada.

import { lerMigrations, respostaJson, validarSegredo } from "../guarda";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const bloqueio = validarSegredo(request);
  if (bloqueio) return bloqueio;

  let migrations: string[] = [];
  let erroMigrations: string | null = null;
  try {
    migrations = lerMigrations().map((m) => m.nome);
  } catch (erro) {
    erroMigrations = (erro as Error).message;
  }

  return respostaJson({
    ok: true,
    tem_token_supabase: Boolean(process.env.SUPABASE_ACCESS_TOKEN),
    tem_google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    site_url: process.env.SITE_URL ?? null,
    migrations_empacotadas: migrations,
    erro_migrations: erroMigrations,
  });
}
