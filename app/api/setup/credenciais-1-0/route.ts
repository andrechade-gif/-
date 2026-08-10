// GET /api/setup/credenciais-1-0?segredo=…
// Extrai a URL e a chave PÚBLICA (anon) do Supabase do Sales Brain 1.0 a
// partir do bundle do app publicado no Lovable — leitura apenas.

import { extrairCredenciais1_0 } from "@/migration/nucleo-fontes";
import { respostaJson, validarSegredo } from "../guarda";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const bloqueio = validarSegredo(request);
  if (bloqueio) return bloqueio;
  try {
    const credenciais = await extrairCredenciais1_0();
    return respostaJson({ ok: true, ...credenciais });
  } catch (erro) {
    return respostaJson({ ok: false, erro: (erro as Error).message }, 500);
  }
}
