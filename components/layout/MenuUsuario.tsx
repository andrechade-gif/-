"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import type { Perfil } from "@/lib/tipos";

export function MenuUsuario({ perfil }: { perfil: Perfil }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const iniciais = perfil.nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={aberto}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {iniciais || "?"}
        </span>
        <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
      </button>

      {aberto ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-md border bg-card shadow-soft">
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-medium">{perfil.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{perfil.email}</p>
            <span className="pill mt-2 bg-primary/10 text-primary">
              {perfil.papel === "admin" ? "Admin" : "Vendedor"}
            </span>
          </div>
          <form action="/auth/sair" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
