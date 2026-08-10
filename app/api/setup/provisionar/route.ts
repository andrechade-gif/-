// GET /api/setup/provisionar?segredo=…[&site_url=…]
// Avança o provisionamento do Supabase 2.0 (criar projeto → aguardar →
// aplicar schema → configurar auth → devolver chaves). Idempotente: chamar
// de novo só avança o que falta. Rodar repetidamente até fase="pronto".

import { avancarProvisao } from "@/migration/nucleo-provisao";
import { lerMigrations, respostaJson, validarSegredo } from "../guarda";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const bloqueio = validarSegredo(request);
  if (bloqueio) return bloqueio;

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    return respostaJson({ fase: "erro", mensagem: "SUPABASE_ACCESS_TOKEN ausente no deploy." }, 500);
  }

  const url = new URL(request.url);
  try {
    const estado = await avancarProvisao({
      token,
      migrations: lerMigrations(),
      siteUrl: url.searchParams.get("site_url") ?? process.env.SITE_URL ?? undefined,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      orgSlug: process.env.SUPABASE_ORG_SLUG,
    });
    return respostaJson(estado, estado.fase === "erro" ? 500 : 200);
  } catch (erro) {
    return respostaJson({ fase: "erro", mensagem: (erro as Error).message }, 500);
  }
}
