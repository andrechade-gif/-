import clsx from "clsx";
import type { Estado, Temperatura } from "@/lib/dominio";
import { ESTADO_LABEL, TEMPERATURA_LABEL } from "@/lib/dominio";

/** Pill de estado do deal (aberta não exibe pill — é o estado "normal"). */
export function PillEstado({ estado }: { estado: Estado }) {
  if (estado === "aberta") return null;
  return (
    <span
      className={clsx("pill", {
        "bg-warning/15 text-warning": estado === "on_hold",
        "bg-success/15 text-success": estado === "ganha",
        "bg-destructive/15 text-destructive": estado === "perdida",
      })}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}

export function PillTemperatura({ temperatura }: { temperatura: Temperatura | null }) {
  if (!temperatura) return null;
  return (
    <span
      className={clsx("pill", {
        "bg-destructive/15 text-destructive": temperatura === "quente",
        "bg-warning/15 text-warning": temperatura === "morno",
        "bg-primary/15 text-primary": temperatura === "frio",
      })}
      title={`Temperatura: ${TEMPERATURA_LABEL[temperatura]}`}
    >
      {TEMPERATURA_LABEL[temperatura]}
    </span>
  );
}
