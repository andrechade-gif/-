"use server";

// Ações de servidor do funil. Todas rodam com a sessão do usuário logado
// (RLS + auditoria com usuario_id correto) e revalidam as telas afetadas.

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  ETAPAS,
  MOTIVOS_HOLD,
  MOTIVOS_PERDA,
  type Etapa,
  type MotivoHold,
  type MotivoPerda,
} from "@/lib/dominio";

type Resultado = { ok: true } | { ok: false; erro: string };

function falha(erro: string): Resultado {
  return { ok: false, erro };
}

async function contexto() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

function revalidarFunil(oportunidadeId?: string) {
  revalidatePath("/funil");
  revalidatePath("/home");
  if (oportunidadeId) revalidatePath(`/oportunidade/${oportunidadeId}`);
}

/** Move um deal ABERTO para outra etapa (drag do board, após o checklist). */
export async function moverEtapa(oportunidadeId: string, paraEtapa: Etapa): Promise<Resultado> {
  if (!ETAPAS.includes(paraEtapa)) return falha("Etapa inválida.");
  const ctx = await contexto();
  if (!ctx) return falha("Sessão expirada.");
  const { supabase, userId } = ctx;

  const { data: opp, error } = await supabase
    .from("oportunidades")
    .select("id, etapa, estado")
    .eq("id", oportunidadeId)
    .single();
  if (error || !opp) return falha("Oportunidade não encontrada.");
  if (opp.estado !== "aberta") return falha("Apenas deals abertos mudam de etapa.");
  if (opp.etapa === paraEtapa) return { ok: true };

  const { error: e1 } = await supabase
    .from("oportunidades")
    .update({ etapa: paraEtapa })
    .eq("id", oportunidadeId);
  if (e1) return falha("Não foi possível mover o deal.");

  const { error: e2 } = await supabase.from("oportunidade_movimentos").insert({
    oportunidade_id: oportunidadeId,
    de_etapa: opp.etapa,
    para_etapa: paraEtapa,
    registrado_por: userId,
    fonte: "app",
  });
  if (e2) return falha("Deal movido, mas o movimento não foi registrado. Recarregue.");

  revalidarFunil(oportunidadeId);
  return { ok: true };
}

/** Congela um deal aberto (on-hold) com motivo estruturado da taxonomia. */
export async function marcarOnHold(
  oportunidadeId: string,
  motivo: MotivoHold,
  detalhe?: string
): Promise<Resultado> {
  if (!MOTIVOS_HOLD.includes(motivo)) return falha("Motivo inválido.");
  if (motivo === "outro" && !detalhe?.trim())
    return falha("Detalhe obrigatório quando o motivo é 'outro'.");
  const ctx = await contexto();
  if (!ctx) return falha("Sessão expirada.");
  const { supabase, userId } = ctx;

  const { data: opp, error } = await supabase
    .from("oportunidades")
    .select("id, etapa, estado")
    .eq("id", oportunidadeId)
    .single();
  if (error || !opp) return falha("Oportunidade não encontrada.");
  if (opp.estado !== "aberta") return falha("Apenas deals abertos entram em on-hold.");

  const { error: e1 } = await supabase
    .from("oportunidades")
    .update({
      estado: "on_hold",
      etapa_congelada: opp.etapa,
      motivo_hold: motivo,
      motivo_hold_detalhe: detalhe?.trim() || null,
    })
    .eq("id", oportunidadeId);
  if (e1) return falha("Não foi possível marcar on-hold.");

  await supabase.from("oportunidade_movimentos").insert({
    oportunidade_id: oportunidadeId,
    de_estado: "aberta",
    para_estado: "on_hold",
    registrado_por: userId,
    fonte: "app",
  });

  revalidarFunil(oportunidadeId);
  return { ok: true };
}

/** Marca um deal como perdido, registrando a etapa em que morreu. */
export async function marcarPerdida(
  oportunidadeId: string,
  motivo: MotivoPerda,
  detalhe?: string
): Promise<Resultado> {
  if (!MOTIVOS_PERDA.includes(motivo)) return falha("Motivo inválido.");
  if (motivo === "outro" && !detalhe?.trim())
    return falha("Detalhe obrigatório quando o motivo é 'outro'.");
  const ctx = await contexto();
  if (!ctx) return falha("Sessão expirada.");
  const { supabase, userId } = ctx;

  const { data: opp, error } = await supabase
    .from("oportunidades")
    .select("id, etapa, estado, etapa_congelada")
    .eq("id", oportunidadeId)
    .single();
  if (error || !opp) return falha("Oportunidade não encontrada.");
  if (opp.estado === "ganha" || opp.estado === "perdida")
    return falha("Este deal já foi encerrado.");

  // Se estava on-hold, a etapa "real" é a congelada.
  const etapaPerda = (opp.estado === "on_hold" ? opp.etapa_congelada : opp.etapa) ?? opp.etapa;

  const { error: e1 } = await supabase
    .from("oportunidades")
    .update({
      estado: "perdida",
      etapa_perda: etapaPerda,
      motivo_perda: motivo,
      motivo_perda_detalhe: detalhe?.trim() || null,
      precisa_recategorizar: false,
    })
    .eq("id", oportunidadeId);
  if (e1) return falha("Não foi possível marcar como perdida.");

  await supabase.from("oportunidade_movimentos").insert({
    oportunidade_id: oportunidadeId,
    de_estado: opp.estado,
    para_estado: "perdida",
    registrado_por: userId,
    fonte: "app",
  });

  revalidarFunil(oportunidadeId);
  return { ok: true };
}

/**
 * Marca como GANHA (apenas na etapa Assinatura): confirma os valores finais,
 * registra o movimento e cria a Jornada de Cliente (decisão D1).
 */
export async function marcarGanha(
  oportunidadeId: string,
  valores: { mrr_contratado: number; setup_valor: number | null; contrato_meses: number | null }
): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return falha("Sessão expirada.");
  const { supabase, userId } = ctx;

  if (!(valores.mrr_contratado >= 0)) return falha("MRR contratado inválido.");

  const { data: opp, error } = await supabase
    .from("oportunidades")
    .select("id, conta_id, etapa, estado")
    .eq("id", oportunidadeId)
    .single();
  if (error || !opp) return falha("Oportunidade não encontrada.");
  if (opp.estado !== "aberta") return falha("Apenas deals abertos podem ser ganhos.");
  if (opp.etapa !== "assinatura")
    return falha("Ganho só é registrado na etapa Assinatura (contrato assinado).");

  const { error: e1 } = await supabase
    .from("oportunidades")
    .update({
      estado: "ganha",
      mrr_contratado: valores.mrr_contratado,
      setup_valor: valores.setup_valor,
      contrato_meses: valores.contrato_meses,
    })
    .eq("id", oportunidadeId);
  if (e1) return falha("Não foi possível registrar o ganho.");

  await supabase.from("oportunidade_movimentos").insert({
    oportunidade_id: oportunidadeId,
    de_estado: "aberta",
    para_estado: "ganha",
    registrado_por: userId,
    fonte: "app",
  });

  // Dispara a Jornada de Cliente (upsert: re-ganhar um deal reaberto não duplica)
  const { error: e3 } = await supabase.from("jornadas_cliente").upsert(
    {
      conta_id: opp.conta_id,
      oportunidade_id: oportunidadeId,
      etapa_cs: "implementacao",
      sync_status: "pendente",
    },
    { onConflict: "oportunidade_id" }
  );
  if (e3) return falha("Ganho registrado, mas a jornada de cliente falhou. Recarregue.");

  // Conta vira cliente
  await supabase
    .from("contas")
    .update({ status_relacionamento: "cliente" })
    .eq("id", opp.conta_id);

  revalidarFunil(oportunidadeId);
  return { ok: true };
}

/** Reabre um deal on-hold ou perdido, devolvendo-o à etapa em que parou. */
export async function reabrir(oportunidadeId: string): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return falha("Sessão expirada.");
  const { supabase, userId } = ctx;

  const { data: opp, error } = await supabase
    .from("oportunidades")
    .select("id, etapa, estado, etapa_congelada, etapa_perda")
    .eq("id", oportunidadeId)
    .single();
  if (error || !opp) return falha("Oportunidade não encontrada.");
  if (opp.estado === "aberta") return { ok: true };
  if (opp.estado === "ganha")
    return falha("Deal ganho não se reabre pelo funil — fale com o admin.");

  const etapaDestino =
    (opp.estado === "on_hold" ? opp.etapa_congelada : opp.etapa_perda) ?? opp.etapa;

  const { error: e1 } = await supabase
    .from("oportunidades")
    .update({
      estado: "aberta",
      etapa: etapaDestino,
      etapa_congelada: null,
      motivo_hold: null,
      motivo_hold_detalhe: null,
      etapa_perda: null,
      motivo_perda: null,
      motivo_perda_detalhe: null,
      precisa_recategorizar: false,
    })
    .eq("id", oportunidadeId);
  if (e1) return falha("Não foi possível reabrir.");

  await supabase.from("oportunidade_movimentos").insert({
    oportunidade_id: oportunidadeId,
    de_estado: opp.estado,
    para_estado: "aberta",
    registrado_por: userId,
    fonte: "app",
  });

  revalidarFunil(oportunidadeId);
  return { ok: true };
}

/** Edição de dados do deal (tela de detalhe). Closing date alimenta o histórico. */
export async function atualizarOportunidade(
  oportunidadeId: string,
  campos: {
    nome?: string;
    mrr_contratado?: number;
    mrr_esperado?: number | null;
    setup_valor?: number | null;
    contrato_meses?: number | null;
    produtos?: string[];
    volume_mensal?: number | null;
    valor_por_atendimento?: number | null;
    closing_date?: string | null;
    motivo_closing?: string;
    forecast_categoria?: string;
    temperatura?: string | null;
    responsavel_id?: string | null;
    partner_id?: string | null;
    comissao_mrr_pct?: number | null;
    observacoes?: string | null;
  }
): Promise<Resultado> {
  const ctx = await contexto();
  if (!ctx) return falha("Sessão expirada.");
  const { supabase } = ctx;

  const { data: atual, error } = await supabase
    .from("oportunidades")
    .select("id, closing_date")
    .eq("id", oportunidadeId)
    .single();
  if (error || !atual) return falha("Oportunidade não encontrada.");

  const { motivo_closing, ...resto } = campos;
  const atualizacao: Record<string, unknown> = { ...resto };
  if (atualizacao.nome !== undefined && !String(atualizacao.nome).trim())
    return falha("O nome do deal não pode ficar vazio.");

  const { error: e1 } = await supabase
    .from("oportunidades")
    .update(atualizacao)
    .eq("id", oportunidadeId);
  if (e1) return falha("Não foi possível salvar as alterações.");

  // Mudança de closing date → linha no histórico (insumo de forecast, M5)
  if (
    campos.closing_date !== undefined &&
    campos.closing_date !== null &&
    campos.closing_date !== atual.closing_date
  ) {
    await supabase.from("closing_date_historico").insert({
      oportunidade_id: oportunidadeId,
      data_anterior: atual.closing_date,
      data_nova: campos.closing_date,
      motivo: motivo_closing?.trim() || null,
    });
  }

  revalidarFunil(oportunidadeId);
  return { ok: true };
}

/** Resolve uma pendência de recategorização (on-hold vindo do 1.0). */
export async function resolverPendencia(
  oportunidadeId: string,
  motivo: MotivoHold,
  detalhe: string | undefined,
  etapaCongelada: Etapa
): Promise<Resultado> {
  if (!MOTIVOS_HOLD.includes(motivo)) return falha("Motivo inválido.");
  if (!ETAPAS.includes(etapaCongelada)) return falha("Etapa inválida.");
  if (motivo === "outro" && !detalhe?.trim())
    return falha("Detalhe obrigatório quando o motivo é 'outro'.");
  const ctx = await contexto();
  if (!ctx) return falha("Sessão expirada.");
  const { supabase } = ctx;

  const { error } = await supabase
    .from("oportunidades")
    .update({
      motivo_hold: motivo,
      motivo_hold_detalhe: detalhe?.trim() || null,
      etapa_congelada: etapaCongelada,
      precisa_recategorizar: false,
    })
    .eq("id", oportunidadeId)
    .eq("precisa_recategorizar", true);
  if (error) return falha("Não foi possível salvar a recategorização.");

  revalidatePath("/migracao/pendencias");
  revalidarFunil(oportunidadeId);
  return { ok: true };
}
