"use server";

// Aprovação/negação de solicitações de acesso — apenas admin (RLS garante).

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

type Resultado = { ok: true } | { ok: false; erro: string };

async function decidir(
  solicitacaoId: string,
  decisao: "aprovada" | "negada"
): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada." };

  const { data: solicitacao, error } = await supabase
    .from("solicitacoes_acesso")
    .update({ status: decisao, decidido_por: user.id, decidido_em: new Date().toISOString() })
    .eq("id", solicitacaoId)
    .select("email")
    .single();
  if (error || !solicitacao) {
    return { ok: false, erro: "Não foi possível registrar a decisão (você é admin?)." };
  }

  // Se a pessoa já criou conta (perfil pendente), reflete a decisão no perfil.
  await supabase
    .from("perfis")
    .update({ status: decisao === "aprovada" ? "aprovado" : "bloqueado" })
    .eq("email", solicitacao.email);

  revalidatePath("/config/acessos");
  return { ok: true };
}

export async function aprovarSolicitacao(id: string): Promise<Resultado> {
  return decidir(id, "aprovada");
}

export async function negarSolicitacao(id: string): Promise<Resultado> {
  return decidir(id, "negada");
}
