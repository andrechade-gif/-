"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ATIVIDADE_TIPOS, type AtividadeTipo } from "@/lib/dominio";

type Resultado = { ok: true } | { ok: false; erro: string };

/** Nota/atividade manual criada na timeline do deal. */
export async function criarAtividade(dados: {
  conta_id: string;
  oportunidade_id?: string | null;
  tipo: AtividadeTipo;
  titulo: string;
  resumo?: string;
  data?: string;
}): Promise<Resultado> {
  if (!ATIVIDADE_TIPOS.includes(dados.tipo)) return { ok: false, erro: "Tipo inválido." };
  if (!dados.titulo.trim()) return { ok: false, erro: "Título obrigatório." };

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada." };

  const { error } = await supabase.from("atividades").insert({
    conta_id: dados.conta_id,
    oportunidade_id: dados.oportunidade_id ?? null,
    tipo: dados.tipo,
    titulo: dados.titulo.trim(),
    resumo: dados.resumo?.trim() || null,
    data: dados.data ? new Date(dados.data).toISOString() : new Date().toISOString(),
    fonte: "manual",
    criado_por: user.id,
  });
  if (error) return { ok: false, erro: "Não foi possível registrar a atividade." };

  if (dados.oportunidade_id) revalidatePath(`/oportunidade/${dados.oportunidade_id}`);
  return { ok: true };
}
