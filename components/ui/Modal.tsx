"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  titulo,
  aberto,
  aoFechar,
  children,
  largura = "max-w-lg",
}: {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className={`max-h-[92vh] w-full ${largura} overflow-y-auto rounded-t-lg border bg-card shadow-soft sm:rounded-lg`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b bg-card px-5 py-3.5">
          <h2 className="text-sm font-semibold">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
