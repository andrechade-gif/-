// Cliente Supabase ADMIN (service_role — ignora RLS).
// USO EXCLUSIVO NO SERVIDOR: callback de auth (registrar solicitação de acesso
// de usuário ainda não aprovado). NUNCA importar em componente client.

import { createClient } from "@supabase/supabase-js";

export function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
