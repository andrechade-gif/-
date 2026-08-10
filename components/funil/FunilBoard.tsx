"use client";

// Board kanban do Funil de Vendas — a tela principal do M1.
// 6 colunas (etapas), cards arrastáveis (deals abertos), filtros persistentes,
// e modais de: critérios de saída (mover), on-hold, perda, ganho e reabertura.

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Search } from "lucide-react";
import {
  ETAPAS,
  ETAPA_LABEL,
  PRODUTOS,
  PRODUTO_LABEL,
  type Etapa,
} from "@/lib/dominio";
import { fmtBRL } from "@/lib/formato";
import type { OportunidadeComConta } from "@/lib/tipos";
import { FunilCard } from "./FunilCard";
import {
  ModalGanha,
  ModalMover,
  ModalOnHold,
  ModalPerda,
  ModalReabrir,
} from "./ModaisFunil";

export type OppDoFunil = OportunidadeComConta & {
  /** Quando o deal entrou na situação atual (etapa ou estado) — base do "dias". */
  entrada_situacao_em: string;
};

type FiltroEstado = "abertas" | "on_hold" | "ganhas" | "perdidas" | "todas";

type Filtros = {
  estado: FiltroEstado;
  produto: string; // "" = todos
  responsavel: string;
  parceiro: string;
};

const FILTROS_PADRAO: Filtros = { estado: "abertas", produto: "", responsavel: "", parceiro: "" };
const CHAVE_FILTROS = "sb-filtros-funil";

const ROTULO_ESTADO_FILTRO: Record<FiltroEstado, string> = {
  abertas: "Abertas",
  on_hold: "On-hold",
  ganhas: "Ganhas",
  perdidas: "Perdidas",
  todas: "Todas",
};

/** Em qual coluna o deal aparece: congelados/perdidos ficam na etapa em que pararam. */
function etapaExibicao(opp: OppDoFunil): Etapa {
  if (opp.estado === "on_hold") return opp.etapa_congelada ?? opp.etapa;
  if (opp.estado === "perdida") return opp.etapa_perda ?? opp.etapa;
  return opp.etapa;
}

export function FunilBoard({
  opps,
  perfis,
  parceiros,
  buscaInicial,
}: {
  opps: OppDoFunil[];
  perfis: { id: string; nome: string }[];
  parceiros: { id: string; nome: string }[];
  buscaInicial: string;
}) {
  const router = useRouter();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_PADRAO);
  const [busca, setBusca] = useState(buscaInicial);
  const [carregouFiltros, setCarregouFiltros] = useState(false);
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // Modais
  const [mover, setMover] = useState<{ opp: OppDoFunil; para: Etapa } | null>(null);
  const [onHold, setOnHold] = useState<OppDoFunil | null>(null);
  const [perda, setPerda] = useState<OppDoFunil | null>(null);
  const [ganha, setGanha] = useState<OppDoFunil | null>(null);
  const [reabrirOpp, setReabrirOpp] = useState<OppDoFunil | null>(null);

  // Filtros persistentes (a busca vinda da URL tem prioridade sobre o salvo)
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_FILTROS);
      if (salvo) setFiltros({ ...FILTROS_PADRAO, ...JSON.parse(salvo) });
    } catch {
      /* filtros padrão */
    }
    setCarregouFiltros(true);
  }, []);

  useEffect(() => {
    if (!carregouFiltros) return;
    try {
      localStorage.setItem(CHAVE_FILTROS, JSON.stringify(filtros));
    } catch {
      /* sem storage */
    }
  }, [filtros, carregouFiltros]);

  useEffect(() => {
    if (buscaInicial) setBusca(buscaInicial);
  }, [buscaInicial]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return opps.filter((opp) => {
      if (filtros.estado === "abertas" && opp.estado !== "aberta") return false;
      if (filtros.estado === "on_hold" && opp.estado !== "on_hold") return false;
      if (filtros.estado === "ganhas" && opp.estado !== "ganha") return false;
      if (filtros.estado === "perdidas" && opp.estado !== "perdida") return false;
      if (filtros.produto && !opp.produtos.includes(filtros.produto as never)) return false;
      if (filtros.responsavel && opp.responsavel_id !== filtros.responsavel) return false;
      if (filtros.parceiro && opp.partner_id !== filtros.parceiro) return false;
      if (termo) {
        const alvo = `${opp.nome} ${opp.conta?.nome ?? ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [opps, filtros, busca]);

  const porEtapa = useMemo(() => {
    const mapa = new Map<Etapa, OppDoFunil[]>(ETAPAS.map((e) => [e, []]));
    for (const opp of filtrados) mapa.get(etapaExibicao(opp))!.push(opp);
    return mapa;
  }, [filtrados]);

  const totalMrr = filtrados.reduce(
    (soma, o) => soma + (o.estado !== "perdida" ? Number(o.mrr_contratado) : 0),
    0
  );

  function aoSoltar(resultado: DropResult) {
    const { source, destination, draggableId } = resultado;
    if (!destination || source.droppableId === destination.droppableId) return;
    const opp = opps.find((o) => o.id === draggableId);
    if (!opp || opp.estado !== "aberta") return;
    setErro(null);
    setMover({ opp, para: destination.droppableId as Etapa });
  }

  function executar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    startTransition(async () => {
      const r = await acao();
      if (!r.ok) {
        setErro(r.erro ?? "Algo deu errado.");
        return;
      }
      setErro(null);
      setMover(null);
      setOnHold(null);
      setPerda(null);
      setGanha(null);
      setReabrirOpp(null);
      router.refresh();
    });
  }

  const filtrosAtivos =
    filtros.estado !== "abertas" ||
    filtros.produto !== "" ||
    filtros.responsavel !== "" ||
    filtros.parceiro !== "" ||
    busca.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Funil de Vendas</p>
          <h1 className="text-xl font-semibold">
            {filtrados.length} {filtrados.length === 1 ? "deal" : "deals"} ·{" "}
            <span className="tnum">{fmtBRL(totalMrr)}</span>{" "}
            <span className="text-sm font-normal text-muted-foreground">MRR</span>
          </h1>
        </div>

        {/* Filtros persistentes */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar deal ou conta"
              className="campo w-44 !py-1.5 pl-8 text-sm"
              aria-label="Buscar no funil"
            />
          </div>

          <select
            value={filtros.estado}
            onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value as FiltroEstado }))}
            className="campo w-auto !py-1.5"
            aria-label="Filtro de estado"
          >
            {(Object.keys(ROTULO_ESTADO_FILTRO) as FiltroEstado[]).map((v) => (
              <option key={v} value={v}>
                {ROTULO_ESTADO_FILTRO[v]}
              </option>
            ))}
          </select>

          <select
            value={filtros.produto}
            onChange={(e) => setFiltros((f) => ({ ...f, produto: e.target.value }))}
            className="campo w-auto !py-1.5"
            aria-label="Filtro de produto"
          >
            <option value="">Todos os produtos</option>
            {PRODUTOS.map((p) => (
              <option key={p} value={p}>
                {PRODUTO_LABEL[p]}
              </option>
            ))}
          </select>

          <select
            value={filtros.responsavel}
            onChange={(e) => setFiltros((f) => ({ ...f, responsavel: e.target.value }))}
            className="campo w-auto !py-1.5"
            aria-label="Filtro de responsável"
          >
            <option value="">Todos os responsáveis</option>
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          {parceiros.length > 0 ? (
            <select
              value={filtros.parceiro}
              onChange={(e) => setFiltros((f) => ({ ...f, parceiro: e.target.value }))}
              className="campo w-auto !py-1.5"
              aria-label="Filtro de parceiro"
            >
              <option value="">Todos os parceiros</option>
              {parceiros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          ) : null}

          {filtrosAtivos ? (
            <button
              type="button"
              className="botao-secundario !py-1.5 text-xs"
              onClick={() => {
                setFiltros(FILTROS_PADRAO);
                setBusca("");
              }}
            >
              Limpar
            </button>
          ) : null}
        </div>
      </div>

      {erro ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {/* Board — colunas roláveis horizontalmente (inclusive no celular) */}
      <DragDropContext onDragEnd={aoSoltar}>
        <div className="scroll-fino -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 lg:-mx-8 lg:px-8">
          {ETAPAS.map((etapa) => {
            const daColuna = porEtapa.get(etapa) ?? [];
            const mrrColuna = daColuna.reduce(
              (soma, o) => soma + (o.estado !== "perdida" ? Number(o.mrr_contratado) : 0),
              0
            );
            return (
              <section
                key={etapa}
                className="flex w-[280px] shrink-0 flex-col rounded-lg border bg-muted/40"
                aria-label={`Etapa ${ETAPA_LABEL[etapa]}`}
              >
                <header className="border-b px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="kicker !text-foreground/80">{ETAPA_LABEL[etapa]}</h2>
                    <span className="tnum rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {daColuna.length}
                    </span>
                  </div>
                  <p className="tnum mt-1 text-xs text-muted-foreground">{fmtBRL(mrrColuna)} MRR</p>
                </header>

                <Droppable droppableId={etapa}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 p-2 transition-colors ${
                        snapshot.isDraggingOver ? "bg-accent/10" : ""
                      }`}
                      style={{ minHeight: 120 }}
                    >
                      {daColuna.map((opp, indice) => (
                        <FunilCard
                          key={opp.id}
                          opp={opp}
                          indice={indice}
                          aoMarcarOnHold={() => setOnHold(opp)}
                          aoMarcarPerdida={() => setPerda(opp)}
                          aoMarcarGanha={() => setGanha(opp)}
                          aoReabrir={() => setReabrirOpp(opp)}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </section>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modais */}
      {mover ? (
        <ModalMover
          opp={mover.opp}
          para={mover.para}
          pendente={pendente}
          aoFechar={() => setMover(null)}
          aoConfirmar={executar}
        />
      ) : null}
      {onHold ? (
        <ModalOnHold
          opp={onHold}
          pendente={pendente}
          aoFechar={() => setOnHold(null)}
          aoConfirmar={executar}
        />
      ) : null}
      {perda ? (
        <ModalPerda
          opp={perda}
          pendente={pendente}
          aoFechar={() => setPerda(null)}
          aoConfirmar={executar}
        />
      ) : null}
      {ganha ? (
        <ModalGanha
          opp={ganha}
          pendente={pendente}
          aoFechar={() => setGanha(null)}
          aoConfirmar={executar}
        />
      ) : null}
      {reabrirOpp ? (
        <ModalReabrir
          opp={reabrirOpp}
          pendente={pendente}
          aoFechar={() => setReabrirOpp(null)}
          aoConfirmar={executar}
        />
      ) : null}
    </div>
  );
}
