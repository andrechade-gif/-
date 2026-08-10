import type { Metadata } from "next";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FunilBoard, type OppDoFunil } from "@/components/funil/FunilBoard";
import type { OportunidadeComConta } from "@/lib/tipos";

export const metadata: Metadata = { title: "Funil de Vendas" };

// Movimentos são a fonte do "dias na etapa/estado" de cada card.
type MovimentoResumo = {
  oportunidade_id: string;
  para_etapa: string | null;
  para_estado: string | null;
  ocorrido_em: string;
};

export default async function PaginaFunil({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca } = await searchParams;
  const supabase = await criarClienteServidor();

  const [oppsRes, movsRes, perfisRes, parceirosRes] = await Promise.all([
    supabase
      .from("oportunidades")
      .select("*, conta:contas(id, nome)")
      .order("mrr_contratado", { ascending: false }),
    supabase
      .from("oportunidade_movimentos")
      .select("oportunidade_id, para_etapa, para_estado, ocorrido_em")
      .order("ocorrido_em", { ascending: false })
      .limit(10000),
    supabase.from("perfis").select("id, nome").eq("status", "aprovado").order("nome"),
    supabase.from("parceiros").select("id, nome").order("nome"),
  ]);

  const opps = (oppsRes.data ?? []) as unknown as OportunidadeComConta[];
  const movimentos = (movsRes.data ?? []) as MovimentoResumo[];

  // Para cada deal: quando entrou na situação atual (etapa, para abertos;
  // estado, para on-hold/ganha/perdida). Movimentos vêm ordenados do mais recente.
  const entradaPorOpp = new Map<string, string>();
  for (const opp of opps) {
    const doDeal = movimentos.filter((m) => m.oportunidade_id === opp.id);
    let referencia: string | undefined;
    if (opp.estado === "aberta") {
      referencia = doDeal.find((m) => m.para_etapa === opp.etapa)?.ocorrido_em;
    } else {
      referencia = doDeal.find((m) => m.para_estado === opp.estado)?.ocorrido_em;
    }
    entradaPorOpp.set(opp.id, referencia ?? opp.created_at);
  }

  const cards: OppDoFunil[] = opps.map((opp) => ({
    ...opp,
    entrada_situacao_em: entradaPorOpp.get(opp.id) ?? opp.created_at,
  }));

  return (
    <FunilBoard
      opps={cards}
      perfis={perfisRes.data ?? []}
      parceiros={parceirosRes.data ?? []}
      buscaInicial={busca ?? ""}
    />
  );
}
