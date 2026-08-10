// Histórico de movimentos de etapa/estado — inclui os migrados do 1.0.

import { ArrowRight } from "lucide-react";
import { ETAPA_LABEL, ESTADO_LABEL } from "@/lib/dominio";
import { fmtDataHora } from "@/lib/formato";
import type { OportunidadeMovimento } from "@/lib/tipos";

export function HistoricoMovimentos({
  movimentos,
  criadoEm,
}: {
  movimentos: OportunidadeMovimento[];
  criadoEm: string;
}) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-card">
      <h2 className="kicker mb-4">Movimentos de funil · {movimentos.length}</h2>
      {movimentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum movimento registrado — o deal está na etapa em que foi criado.
        </p>
      ) : (
        <ol className="space-y-3">
          {movimentos.map((m) => (
            <li key={m.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                {m.para_etapa ? (
                  <>
                    <span className="text-muted-foreground">
                      {m.de_etapa ? ETAPA_LABEL[m.de_etapa] : "—"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{ETAPA_LABEL[m.para_etapa]}</span>
                  </>
                ) : null}
                {m.para_estado ? (
                  <>
                    {m.para_etapa ? <span className="text-muted-foreground">·</span> : null}
                    <span className="text-muted-foreground">
                      {m.de_estado ? ESTADO_LABEL[m.de_estado] : "—"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{m.para_estado ? ESTADO_LABEL[m.para_estado] : "—"}</span>
                  </>
                ) : null}
                {m.fonte === "migracao" ? (
                  <span className="pill bg-accent/15 font-mono text-[9px] uppercase tracking-wider text-accent">
                    1.0
                  </span>
                ) : null}
              </div>
              <p className="tnum mt-0.5 text-xs text-muted-foreground">{fmtDataHora(m.ocorrido_em)}</p>
            </li>
          ))}
        </ol>
      )}
      <p className="tnum mt-4 border-t pt-3 text-xs text-muted-foreground">
        Deal criado em {fmtDataHora(criadoEm)}
      </p>
    </section>
  );
}
