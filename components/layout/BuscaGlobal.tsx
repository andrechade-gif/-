"use client";

// Busca global simples do header: contas + oportunidades por nome.
// Contas ainda não têm página própria (M2) — clicar leva ao funil filtrado.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, Columns3 } from "lucide-react";
import { criarClienteNavegador } from "@/lib/supabase/client";

type Resultado =
  | { tipo: "conta"; id: string; nome: string }
  | { tipo: "oportunidade"; id: string; nome: string; conta: string };

export function BuscaGlobal() {
  const router = useRouter();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      const supabase = criarClienteNavegador();
      const q = `%${termo.trim()}%`;
      const [contas, opps] = await Promise.all([
        supabase.from("contas").select("id, nome").ilike("nome", q).limit(5),
        supabase
          .from("oportunidades")
          .select("id, nome, conta:contas(nome)")
          .ilike("nome", q)
          .limit(5),
      ]);
      const lista: Resultado[] = [
        ...(contas.data ?? []).map((c) => ({ tipo: "conta" as const, id: c.id, nome: c.nome })),
        ...(opps.data ?? []).map((o) => ({
          tipo: "oportunidade" as const,
          id: o.id,
          nome: o.nome,
          conta: (o.conta as unknown as { nome: string } | null)?.nome ?? "",
        })),
      ];
      setResultados(lista);
      setAberto(true);
    }, 250);
    return () => clearTimeout(t);
  }, [termo]);

  function abrir(r: Resultado) {
    setAberto(false);
    setTermo("");
    if (r.tipo === "oportunidade") router.push(`/oportunidade/${r.id}`);
    else router.push(`/funil?busca=${encodeURIComponent(r.nome)}`);
  }

  return (
    <div ref={caixaRef} className="relative max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onFocus={() => resultados.length > 0 && setAberto(true)}
        placeholder="Buscar contas e oportunidades…"
        className="campo !py-1.5 pl-9"
        aria-label="Busca global"
      />

      {aberto && resultados.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-card shadow-soft">
          {resultados.map((r) => (
            <button
              key={`${r.tipo}-${r.id}`}
              type="button"
              onClick={() => abrir(r)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              {r.tipo === "conta" ? (
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <Columns3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{r.nome}</span>
              {r.tipo === "oportunidade" && r.conta ? (
                <span className="ml-auto truncate text-xs text-muted-foreground">{r.conta}</span>
              ) : (
                <span className="ml-auto text-xs text-muted-foreground">conta</span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
