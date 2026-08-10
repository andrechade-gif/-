"use client";

// Fluxo de recategorização assistida: para cada deal on-hold vindo do 1.0,
// mostra o motivo original e pede o novo motivo estruturado + etapa congelada.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  ETAPAS,
  ETAPA_LABEL,
  MOTIVOS_HOLD,
  MOTIVO_HOLD_LABEL,
  type Etapa,
  type MotivoHold,
} from "@/lib/dominio";
import { resolverPendencia } from "@/lib/actions/oportunidades";
import type { OportunidadeComConta } from "@/lib/tipos";

export function ListaPendencias({ pendentes }: { pendentes: OportunidadeComConta[] }) {
  const router = useRouter();

  if (pendentes.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center shadow-card">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <p className="mt-3 font-medium">Tudo recategorizado!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Nenhum deal migrado aguarda revisão. Esta página sai do menu automaticamente.
        </p>
        <Link href="/funil" className="botao-primario mt-5 inline-flex">
          Ir para o Funil
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="tnum text-sm text-muted-foreground">
        {pendentes.length} {pendentes.length === 1 ? "deal pendente" : "deals pendentes"}
      </p>
      {pendentes.map((opp) => (
        <CartaoPendencia key={opp.id} opp={opp} aoResolver={() => router.refresh()} />
      ))}
    </div>
  );
}

function CartaoPendencia({
  opp,
  aoResolver,
}: {
  opp: OportunidadeComConta;
  aoResolver: () => void;
}) {
  const [motivo, setMotivo] = useState<MotivoHold | "">("");
  const [detalhe, setDetalhe] = useState("");
  // Sugestão: a etapa congelada gravada na migração (última etapa dos movimentos do 1.0)
  const [etapa, setEtapa] = useState<Etapa>(opp.etapa_congelada ?? opp.etapa);
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const valido = motivo !== "" && (motivo !== "outro" || detalhe.trim().length > 0);

  function resolver(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      const r = await resolverPendencia(opp.id, motivo as MotivoHold, detalhe || undefined, etapa);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      aoResolver();
    });
  }

  return (
    <form onSubmit={resolver} className="rounded-lg border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="kicker !text-[10px]">{opp.conta?.nome ?? "Sem conta"}</p>
          <Link
            href={`/oportunidade/${opp.id}`}
            className="text-sm font-medium hover:text-primary hover:underline"
          >
            {opp.nome}
          </Link>
        </div>
        <span className="pill bg-warning/15 text-warning">on-hold desde o 1.0</span>
      </div>

      <div className="mt-3 rounded-md bg-muted/60 px-3 py-2">
        <p className="kicker !text-[10px]">Motivo original no 1.0</p>
        <p className="mt-1 text-sm">{opp.motivo_hold_detalhe?.trim() || "(sem texto registrado)"}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo">Novo motivo (taxonomia 2.0)</label>
          <select
            className="campo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoHold)}
            required
          >
            <option value="">Selecione…</option>
            {MOTIVOS_HOLD.map((m) => (
              <option key={m} value={m}>
                {MOTIVO_HOLD_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo">Etapa congelada (sugerida da migração)</label>
          <select
            className="campo"
            value={etapa}
            onChange={(e) => setEtapa(e.target.value as Etapa)}
          >
            {ETAPAS.map((et) => (
              <option key={et} value={et}>
                {ETAPA_LABEL[et]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="rotulo">
            Detalhe {motivo === "outro" ? "(obrigatório)" : "(opcional — o texto original já fica preservado no histórico)"}
          </label>
          <input
            className="campo"
            value={detalhe}
            onChange={(e) => setDetalhe(e.target.value)}
            placeholder="Contexto adicional…"
          />
        </div>
      </div>

      {erro ? <p className="mt-2 text-sm text-destructive">{erro}</p> : null}

      <div className="mt-4 flex justify-end">
        <button type="submit" className="botao-primario" disabled={pendente || !valido}>
          {pendente ? "Salvando…" : "Resolver"}
        </button>
      </div>
    </form>
  );
}
