import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  ETAPA_LABEL,
  MOTIVO_HOLD_LABEL,
  MOTIVO_PERDA_LABEL,
} from "@/lib/dominio";
import { fmtBRL } from "@/lib/formato";
import { PillEstado } from "@/components/ui/Pills";
import { FormEditarOportunidade } from "@/components/oportunidade/FormEditarOportunidade";
import { TimelineAtividades } from "@/components/oportunidade/TimelineAtividades";
import { HistoricoMovimentos } from "@/components/oportunidade/HistoricoMovimentos";
import { HistoricoClosing } from "@/components/oportunidade/HistoricoClosing";
import { CartoesEmBreve } from "@/components/oportunidade/CartoesEmBreve";
import type {
  Atividade,
  ClosingDateHistorico,
  MeddicScorecard,
  Oportunidade,
  OportunidadeMovimento,
} from "@/lib/tipos";

export const metadata: Metadata = { title: "Oportunidade" };

export default async function PaginaOportunidade({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await criarClienteServidor();

  const { data: opp } = await supabase
    .from("oportunidades")
    .select("*, conta:contas(id, nome)")
    .eq("id", id)
    .maybeSingle<Oportunidade & { conta: { id: string; nome: string } | null }>();

  if (!opp) notFound();

  const [movsRes, closingRes, atividadesRes, contatosRes, perfisRes, parceirosRes, meddicRes, papeisRes] =
    await Promise.all([
      supabase
        .from("oportunidade_movimentos")
        .select("*")
        .eq("oportunidade_id", id)
        .order("ocorrido_em", { ascending: false }),
      supabase
        .from("closing_date_historico")
        .select("*")
        .eq("oportunidade_id", id)
        .order("alterado_em", { ascending: false }),
      supabase
        .from("atividades")
        .select("*")
        .or(`oportunidade_id.eq.${id},and(conta_id.eq.${opp.conta_id},oportunidade_id.is.null)`)
        .order("data", { ascending: false })
        .limit(300),
      supabase.from("contatos").select("id, nome, cargo").eq("conta_id", opp.conta_id),
      supabase.from("perfis").select("id, nome").eq("status", "aprovado").order("nome"),
      supabase.from("parceiros").select("id, nome").order("nome"),
      supabase.from("meddic_scorecards").select("*").eq("oportunidade_id", id).maybeSingle(),
      supabase
        .from("papeis_no_deal")
        .select("id", { count: "exact", head: true })
        .eq("oportunidade_id", id),
    ]);

  const movimentos = (movsRes.data ?? []) as OportunidadeMovimento[];
  const closing = (closingRes.data ?? []) as ClosingDateHistorico[];
  const atividades = (atividadesRes.data ?? []) as Atividade[];
  const meddic = (meddicRes.data ?? null) as MeddicScorecard | null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Cabeçalho */}
      <div>
        <Link
          href="/funil"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Funil de Vendas
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kicker">{opp.conta?.nome ?? "Sem conta"}</p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight">{opp.nome}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="pill bg-primary/10 text-primary">
                {ETAPA_LABEL[opp.estado === "on_hold" ? (opp.etapa_congelada ?? opp.etapa) : opp.estado === "perdida" ? (opp.etapa_perda ?? opp.etapa) : opp.etapa]}
              </span>
              <PillEstado estado={opp.estado} />
              {opp.precisa_recategorizar ? (
                <Link href="/migracao/pendencias" className="pill bg-warning/15 text-warning hover:underline">
                  recategorizar motivo
                </Link>
              ) : null}
            </div>
          </div>

          {/* Valores — números tabulares, TCV sempre calculado */}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="kpi-tile !p-3">
              <dt className="kicker !text-[10px]">MRR contratado</dt>
              <dd className="tnum mt-1 text-lg font-semibold">{fmtBRL(opp.mrr_contratado)}</dd>
            </div>
            <div className="kpi-tile !p-3">
              <dt className="kicker !text-[10px]">Setup</dt>
              <dd className="tnum mt-1 text-lg font-semibold">{fmtBRL(opp.setup_valor)}</dd>
            </div>
            <div className="kpi-tile !p-3">
              <dt className="kicker !text-[10px]">Contrato</dt>
              <dd className="tnum mt-1 text-lg font-semibold">
                {opp.contrato_meses != null ? `${opp.contrato_meses} meses` : "—"}
              </dd>
            </div>
            <div className="kpi-tile !p-3">
              <dt className="kicker !text-[10px]">TCV (calculado)</dt>
              <dd className="tnum mt-1 text-lg font-semibold text-accent">{fmtBRL(opp.tcv)}</dd>
            </div>
          </dl>
        </div>

        {/* Motivo de on-hold / perda */}
        {opp.estado === "on_hold" && opp.motivo_hold ? (
          <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
            <strong>On-hold:</strong>{" "}
            {MOTIVO_HOLD_LABEL[opp.motivo_hold].replace(" (detalhar)", "")}
            {opp.motivo_hold_detalhe ? ` — ${opp.motivo_hold_detalhe}` : ""}
          </p>
        ) : null}
        {opp.estado === "perdida" && opp.motivo_perda ? (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm">
            <strong>Perdida{opp.etapa_perda ? ` em ${ETAPA_LABEL[opp.etapa_perda]}` : ""}:</strong>{" "}
            {MOTIVO_PERDA_LABEL[opp.motivo_perda].replace(" (detalhar)", "")}
            {opp.motivo_perda_detalhe ? ` — ${opp.motivo_perda_detalhe}` : ""}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Coluna principal: edição + timeline */}
        <div className="space-y-6 lg:col-span-3">
          <FormEditarOportunidade
            opp={opp}
            perfis={perfisRes.data ?? []}
            parceiros={parceirosRes.data ?? []}
          />
          <TimelineAtividades
            oportunidadeId={opp.id}
            contaId={opp.conta_id}
            atividades={atividades}
            contatos={contatosRes.data ?? []}
          />
        </div>

        {/* Coluna lateral: placeholders M2/M3 + históricos */}
        <div className="space-y-6 lg:col-span-2">
          <CartoesEmBreve meddic={meddic} totalStakeholders={papeisRes.count ?? 0} />
          <HistoricoMovimentos movimentos={movimentos} criadoEm={opp.created_at} />
          <HistoricoClosing historico={closing} closingAtual={opp.closing_date} />
        </div>
      </div>
    </div>
  );
}
