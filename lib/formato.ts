// Formatação pt-BR centralizada (moeda, datas, prazos).

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const brlCentavos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

export function fmtBRL(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(Number(valor))) return "—";
  const n = Number(valor);
  return Number.isInteger(n) ? brl.format(n) : brlCentavos.format(n);
}

export function fmtData(data: string | Date | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function fmtDataHora(data: string | Date | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Datas "date-only" (ex.: closing date) sem deslocamento de fuso. */
export function fmtDataISO(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return "—";
  return `${dia}/${mes}/${ano}`;
}

export function diasDesde(data: string | Date | null | undefined): number | null {
  if (!data) return null;
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function fmtDias(dias: number | null | undefined): string {
  if (dias == null) return "—";
  return dias === 1 ? "1 dia" : `${dias} dias`;
}
