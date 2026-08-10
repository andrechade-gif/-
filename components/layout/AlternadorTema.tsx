"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function AlternadorTema() {
  const [escuro, setEscuro] = useState<boolean | null>(null);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const novo = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", novo);
    localStorage.setItem("sb-tema", novo ? "escuro" : "claro");
    setEscuro(novo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="botao-secundario !px-2.5 !py-2"
      aria-label={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
    >
      {escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
