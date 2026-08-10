// GET /api/setup/migrar?segredo=…
// Executa a migração 1.0 → 2.0 de ponta a ponta, DENTRO da Vercel:
//   1. garante o Supabase 2.0 provisionado (reaproveita o provisionador)
//   2. extrai as credenciais públicas do 1.0 e baixa todas as tabelas
//   3. roda o núcleo idempotente da migração (mesmo código do npm run migrate)
//   4. devolve contagens + os dois relatórios em markdown
// Reexecutar é seguro: nada é duplicado nem sobrescrito.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as crypto from "node:crypto";
import { executarMigracao, gerarRelatorios } from "@/migration/import";
import { baixarFontes1_0, extrairCredenciais1_0 } from "@/migration/nucleo-fontes";
import { avancarProvisao } from "@/migration/nucleo-provisao";
import { envSetup, lerMigrations, respostaJson, validarSegredo } from "../guarda";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const EMAIL_ANDRE = "andre.chade@doutor-ai.com";

/**
 * Garante o usuário do André ANTES da migração: o trigger do banco o torna
 * admin aprovado, e a migração passa a preencher responsavel_id nos registros.
 * Retorna a senha inicial UMA única vez (quando o usuário é criado agora).
 */
async function garantirUsuarioAndre(
  db: SupabaseClient
): Promise<{ criado: boolean; senha_inicial?: string; erro?: string }> {
  const senha = "SB2-" + crypto.randomBytes(9).toString("base64url");
  const { error } = await db.auth.admin.createUser({
    email: EMAIL_ANDRE,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: "André Chade" },
  });
  if (!error) return { criado: true, senha_inicial: senha };
  const mensagem = error.message.toLowerCase();
  if (mensagem.includes("already") || mensagem.includes("registered") || error.status === 422) {
    return { criado: false };
  }
  return { criado: false, erro: error.message };
}

export async function GET(request: Request) {
  const bloqueio = validarSegredo(request);
  if (bloqueio) return bloqueio;

  const token = envSetup("SUPABASE_ACCESS_TOKEN");
  if (!token) {
    return respostaJson({ ok: false, erro: "SUPABASE_ACCESS_TOKEN ausente no deploy." }, 500);
  }

  try {
    // 1 · Supabase 2.0 pronto?
    const provisao = await avancarProvisao({
      token,
      migrations: lerMigrations(),
      siteUrl: envSetup("SITE_URL") ?? undefined,
      googleClientId: envSetup("GOOGLE_CLIENT_ID"),
      googleClientSecret: envSetup("GOOGLE_CLIENT_SECRET"),
      orgSlug: envSetup("SUPABASE_ORG_SLUG"),
    });
    if (provisao.fase !== "pronto" || !provisao.url || !provisao.service_role_key) {
      return respostaJson(
        { ok: false, aguarde: provisao.fase !== "erro", provisao },
        provisao.fase === "erro" ? 500 : 200
      );
    }

    // 2 · fontes do 1.0 (somente leitura)
    const credenciais = await extrairCredenciais1_0();
    const { fontes, contagem, ausentes } = await baixarFontes1_0(
      credenciais.url,
      credenciais.chave
    );

    // 3 · usuário admin do André (antes da migração, para responsavel_id)
    const db = createClient(provisao.url, provisao.service_role_key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const usuarioAndre = await garantirUsuarioAndre(db);

    // 4 · migração idempotente
    const dados = await executarMigracao(db, fontes);

    // 5 · relatórios
    const relatorios = gerarRelatorios(dados);

    return respostaJson({
      ok: true,
      fonte_1_0: { url: credenciais.url, contagem, ausentes },
      supabase_2_0: { url: provisao.url, ref: provisao.ref },
      usuario_andre: usuarioAndre,
      dados,
      relatorio_md: relatorios.relatorio,
      duplicatas_md: relatorios.duplicatas,
    });
  } catch (erro) {
    return respostaJson({ ok: false, erro: (erro as Error).message }, 500);
  }
}
