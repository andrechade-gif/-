// Histórico de mudanças de closing date (migra o do 1.0 + novas mudanças).

import { ArrowRight, CalendarClock } from "lucide-react";
import { fmtDataHora, fmtDataISO } from "@/lib/formato";
import type { ClosingDateHistorico } from "@/lib/tipos";

export function HistoricoClosing({
  historico,
  closingAtual,
}: {
  historico: ClosingDateHistorico[];
  closingAtual: string | null;
}) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-card">
      <h2 className="kicker mb-4 flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5" /> Closing date
      </h2>
      <p className="text-sm">
        Previsão atual:{" "}
        <strong className="tnum">{closingAtual ? fmtDataISO(closingAtual) : "sem data"}</strong>
      </p>

      {historico.length > 0 ? (
        <ol className="mt-3 space-y-2.5 border-t pt-3">
          {historico.map((h) => (
            <li key={h.id} className="text-sm">
              <div className="tnum flex items-center gap-1.5">
                <span className="text-muted-foreground">
                  {h.data_anterior ? fmtDataISO(h.data_anterior) : "sem data"}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{fmtDataISO(h.data_nova)}</span>
              </div>
              <p className="tnum mt-0.5 text-xs text-muted-foreground">
                {fmtDataHora(h.alterado_em)}
                {h.motivo ? ` — ${h.motivo}` : ""}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
          Nenhuma mudança de data registrada.
        </p>
      )}
    </section>
  );
}
