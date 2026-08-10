import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, PackageOpen } from "lucide-react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { fmtBRL } from "@/lib/formato";

export const metadata: Metadata = { title: "Home" };

export default async function PaginaHome() {
  const supabase = await criarClienteServidor();
  const inicioDoAno = `${new Date().getFullYear()}-01-01`;

  const [abertasRes, onHoldRes, ganhasRes, movsGanhoRes, pendenciasRes] = await Promise.all([
    supabase.from("oportunidades").select("id, mrr_contratado").eq("estado", "aberta"),
    supabase
      .from("oportunidades")
      .select("id", { count: "exact", head: true })
      .eq("estado", "on_hold"),
    supabase.from("oportunidades").select("id, mrr_contratado").eq("estado", "ganha"),
    supabase
      .from("oportunidade_movimentos")
      .select("oportunidade_id, ocorrido_em")
      .eq("para_estado", "ganha")
      .gte("ocorrido_em", inicioDoAno),
    supabase
      .from("oportunidades")
      .select("id", { count: "exact", head: true })
      .eq("precisa_recategorizar", true),
  ]);

  const abertas = abertasRes.data ?? [];
  const mrrPipeline = abertas.reduce((soma, o) => soma + Number(o.mrr_contratado ?? 0), 0);

  // Ganhos no ano: deals ganhos cujo movimento para "ganha" ocorreu este ano
  const ganhas = ganhasRes.data ?? [];
  const ganhouEsteAno = new Set((movsGanhoRes.data ?? []).map((m) => m.oportunidade_id));
  const ganhasAno = ganhas.filter((g) => ganhouEsteAno.has(g.id));
  const mrrGanhoAno = ganhasAno.reduce((soma, o) => soma + Number(o.mrr_contratado ?? 0), 0);

  const pendencias = pendenciasRes.count ?? 0;

  const kpis = [
    { rotulo: "Deals abertos", valor: String(abertas.length), sufixo: "" },
    { rotulo: "MRR em pipeline", valor: fmtBRL(mrrPipeline), sufixo: "" },
    { rotulo: "Deals on-hold", valor: String(onHoldRes.count ?? 0), sufixo: "" },
    {
      rotulo: `Ganhos em ${new Date().getFullYear()}`,
      valor: fmtBRL(mrrGanhoAno),
      sufixo: ganhasAno.length > 0 ? `${ganhasAno.length} ${ganhasAno.length === 1 ? "deal" : "deals"}` : "",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="kicker">Home · Cockpit</p>
        <h1 className="mt-1 text-2xl font-semibold">Resumo comercial</h1>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.rotulo} className="kpi-tile">
            <dt className="kicker !text-[10px]">{kpi.rotulo}</dt>
            <dd className="tnum mt-2 text-2xl font-semibold">{kpi.valor}</dd>
            {kpi.sufixo ? (
              <p className="tnum mt-0.5 text-xs text-muted-foreground">{kpi.sufixo}</p>
            ) : null}
          </div>
        ))}
      </dl>

      {pendencias > 0 ? (
        <Link
          href="/migracao/pendencias"
          className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-5 py-4 transition-colors hover:bg-warning/15"
        >
          <PackageOpen className="h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {pendencias} {pendencias === 1 ? "deal on-hold aguarda" : "deals on-hold aguardam"}{" "}
              recategorização da migração
            </p>
            <p className="text-xs text-muted-foreground">
              Motivos genéricos do 1.0 precisam da nova taxonomia (blueprint §2.4)
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      ) : null}

      <Link
        href="/funil"
        className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4 shadow-card transition-colors hover:bg-muted/60"
      >
        <div className="flex-1">
          <p className="text-sm font-medium">Abrir o Funil de Vendas</p>
          <p className="text-xs text-muted-foreground">
            Board por etapa com critérios de saída, on-hold e motivos estruturados
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
