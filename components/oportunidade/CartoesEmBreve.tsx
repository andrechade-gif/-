// Placeholders visuais de MEDDIC (M3) e Stakeholders (M2).
// Se a migração já trouxe dados do 1.0, o resumo aparece (somente leitura).

import { Users, Gauge } from "lucide-react";
import type { MeddicScorecard } from "@/lib/tipos";

const DIMENSOES: { chave: keyof MeddicScorecard; rotulo: string }[] = [
  { chave: "metrics_status", rotulo: "Metrics" },
  { chave: "economic_buyer_status", rotulo: "Economic buyer" },
  { chave: "decision_criteria_status", rotulo: "Decision criteria" },
  { chave: "decision_process_status", rotulo: "Decision process" },
  { chave: "identify_pain_status", rotulo: "Identify pain" },
  { chave: "champion_status", rotulo: "Champion" },
];

export function CartoesEmBreve({
  meddic,
  totalStakeholders,
}: {
  meddic: MeddicScorecard | null;
  totalStakeholders: number;
}) {
  return (
    <>
      <section className="rounded-lg border border-dashed bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="kicker flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5" /> MEDDIC Scorecard
          </h2>
          <span className="pill border bg-muted font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            em breve · M3
          </span>
        </div>

        {meddic ? (
          <>
            <div className="mt-4 flex items-center gap-3">
              <span className="tnum text-2xl font-semibold">{meddic.score}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${meddic.score}%` }}
                />
              </div>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-1.5">
              {DIMENSOES.map((d) => {
                const status = meddic[d.chave] as string;
                return (
                  <li key={d.chave} className="flex items-center gap-1.5 text-xs">
                    <span
                      className={
                        "h-2 w-2 shrink-0 rounded-full " +
                        (status === "validado"
                          ? "bg-success"
                          : status === "parcial"
                            ? "bg-warning"
                            : "bg-muted-foreground/30")
                      }
                    />
                    <span className="truncate text-muted-foreground">{d.rotulo}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Dados migrados do 1.0 — a edição completa chega no M3.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            O scorecard de qualificação (com score por dimensão) chega no módulo 3.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-dashed bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="kicker flex items-center gap-2">
            <Users className="h-3.5 w-3.5" /> Stakeholders
          </h2>
          <span className="pill border bg-muted font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            em breve · M2
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {totalStakeholders > 0
            ? `${totalStakeholders} ${totalStakeholders === 1 ? "papel migrado" : "papéis migrados"} do 1.0 — o mapa de poder do comitê chega no módulo 2.`
            : "O mapa de poder do comitê (papéis, posição e influência) chega no módulo 2."}
        </p>
      </section>
    </>
  );
}
