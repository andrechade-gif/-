// GET /api/setup/migrar?segredo=…
// Executa a migração 1.0 → 2.0 de ponta a ponta, DENTRO da Vercel:
//   1. garante o Supabase 2.0 provisionado (reaproveita o provisionador)
//   2. extrai as credenciais públicas do 1.0 e baixa todas as tabelas
//   3. roda o núcleo idempotente da migração (mesmo código do npm run migrate)
//   4. devolve contagens + os dois relatórios em markdown
// Reexecutar é seguro: nada é duplicado nem sobrescrito.

import { createClient } from "@supabase/supabase-js";
import { executarMigracao, gerarRelatorios } from "@/migration/import";
import { baixarFontes1_0, extrairCredenciais1_0 } from "@/migration/nucleo-fontes";
import { avancarProvisao } from "@/migration/nucleo-provisao";
import { lerMigrations, respostaJson, validarSegredo } from "../guarda";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const bloqueio = validarSegredo(request);
  if (bloqueio) return bloqueio;

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    return respostaJson({ ok: false, erro: "SUPABASE_ACCESS_TOKEN ausente no deploy." }, 500);
  }

  try {
    // 1 · Supabase 2.0 pronto?
    const provisao = await avancarProvisao({
      token,
      migrations: lerMigrations(),
      siteUrl: process.env.SITE_URL ?? undefined,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      orgSlug: process.env.SUPABASE_ORG_SLUG,
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

    // 3 · migração idempotente
    const db = createClient(provisao.url, provisao.service_role_key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const dados = await executarMigracao(db, fontes);

    // 4 · relatórios
    const relatorios = gerarRelatorios(dados);

    return respostaJson({
      ok: true,
      fonte_1_0: { url: credenciais.url, contagem, ausentes },
      supabase_2_0: { url: provisao.url, ref: provisao.ref },
      dados,
      relatorio_md: relatorios.relatorio,
      duplicatas_md: relatorios.duplicatas,
    });
  } catch (erro) {
    return respostaJson({ ok: false, erro: (erro as Error).message }, 500);
  }
}
