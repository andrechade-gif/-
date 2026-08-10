"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Draggable } from "@hello-pangea/dnd";
import { Clock, MoreVertical, PauseCircle } from "lucide-react";
import clsx from "clsx";
import { PRODUTO_SIGLA, PRODUTO_LABEL, MOTIVO_HOLD_LABEL } from "@/lib/dominio";
import { diasDesde, fmtBRL } from "@/lib/formato";
import { PillEstado, PillTemperatura } from "@/components/ui/Pills";
import type { OppDoFunil } from "./FunilBoard";

export function FunilCard({
  opp,
  indice,
  aoMarcarOnHold,
  aoMarcarPerdida,
  aoMarcarGanha,
  aoReabrir,
}: {
  opp: OppDoFunil;
  indice: number;
  aoMarcarOnHold: () => void;
  aoMarcarPerdida: () => void;
  aoMarcarGanha: () => void;
  aoReabrir: () => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAberto) return;
    function fechar(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [menuAberto]);

  const dias = diasDesde(opp.entrada_situacao_em);
  const rotuloDias =
    opp.estado === "aberta"
      ? "na etapa"
      : opp.estado === "on_hold"
        ? "em espera"
        : opp.estado === "ganha"
          ? "desde o ganho"
          : "desde a perda";

  return (
    <Draggable draggableId={opp.id} index={indice} isDragDisabled={opp.estado !== "aberta"}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            "group rounded-md border bg-card p-3 shadow-card transition-shadow",
            snapshot.isDragging && "shadow-soft ring-2 ring-primary/40",
            opp.estado === "on_hold" && "border-warning/50",
            opp.estado === "ganha" && "border-success/50",
            opp.estado === "perdida" && "border-destructive/40 opacity-75"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="kicker truncate !text-[10px]" title={opp.conta?.nome ?? ""}>
                {opp.conta?.nome ?? "Sem conta"}
              </p>
              <Link
                href={`/oportunidade/${opp.id}`}
                className="mt-0.5 block truncate text-sm font-medium leading-snug hover:text-primary hover:underline"
                title={opp.nome}
              >
                {opp.nome}
              </Link>
            </div>

            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuAberto((v) => !v)}
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                aria-label={`Ações de ${opp.nome}`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuAberto ? (
                <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-md border bg-card text-sm shadow-soft">
                  <Link
                    href={`/oportunidade/${opp.id}`}
                    className="block px-3 py-2 hover:bg-muted"
                    onClick={() => setMenuAberto(false)}
                  >
                    Abrir detalhe
                  </Link>
                  {opp.estado === "aberta" ? (
                    <>
                      {opp.etapa === "assinatura" ? (
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left font-medium text-success hover:bg-muted"
                          onClick={() => {
                            setMenuAberto(false);
                            aoMarcarGanha();
                          }}
                        >
                          Marcar como ganha
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          setMenuAberto(false);
                          aoMarcarOnHold();
                        }}
                      >
                        Marcar on-hold
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-destructive hover:bg-muted"
                        onClick={() => {
                          setMenuAberto(false);
                          aoMarcarPerdida();
                        }}
                      >
                        Marcar perdida
                      </button>
                    </>
                  ) : null}
                  {opp.estado === "on_hold" ? (
                    <>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          setMenuAberto(false);
                          aoReabrir();
                        }}
                      >
                        Reabrir deal
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-destructive hover:bg-muted"
                        onClick={() => {
                          setMenuAberto(false);
                          aoMarcarPerdida();
                        }}
                      >
                        Marcar perdida
                      </button>
                    </>
                  ) : null}
                  {opp.estado === "perdida" ? (
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-muted"
                      onClick={() => {
                        setMenuAberto(false);
                        aoReabrir();
                      }}
                    >
                      Reabrir deal
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Badges de produto */}
          {opp.produtos.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {opp.produtos.map((p) => (
                <span
                  key={p}
                  className="pill bg-primary/10 font-mono text-[10px] uppercase tracking-wider text-primary"
                  title={PRODUTO_LABEL[p]}
                >
                  {PRODUTO_SIGLA[p]}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="tnum text-sm font-semibold">{fmtBRL(opp.mrr_contratado)}</span>
            {dias != null ? (
              <span
                className="tnum flex items-center gap-1 text-[11px] text-muted-foreground"
                title={`${dias} dias ${rotuloDias}`}
              >
                <Clock className="h-3 w-3" />
                {dias}d
              </span>
            ) : null}
          </div>

          {(opp.temperatura || opp.estado !== "aberta") && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <PillEstado estado={opp.estado} />
              <PillTemperatura temperatura={opp.temperatura} />
            </div>
          )}

          {/* Indicador de on-hold com o motivo */}
          {opp.estado === "on_hold" && opp.motivo_hold ? (
            <p
              className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-warning"
              title={opp.motivo_hold_detalhe ?? undefined}
            >
              <PauseCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {MOTIVO_HOLD_LABEL[opp.motivo_hold].replace(" (detalhar)", "")}
                {opp.precisa_recategorizar ? " · recategorizar" : ""}
              </span>
            </p>
          ) : null}
        </article>
      )}
    </Draggable>
  );
}
