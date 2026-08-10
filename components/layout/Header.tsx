"use client";

import { BuscaGlobal } from "./BuscaGlobal";
import { AlternadorTema } from "./AlternadorTema";
import { MenuUsuario } from "./MenuUsuario";
import type { Perfil } from "@/lib/tipos";

export function Header({
  perfil,
  aoAbrirMenu,
  botaoMenu,
}: {
  perfil: Perfil;
  aoAbrirMenu: () => void;
  botaoMenu: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur lg:px-8">
      <button
        type="button"
        onClick={aoAbrirMenu}
        className="botao-secundario !px-2 !py-2 lg:hidden"
        aria-label="Abrir menu"
      >
        {botaoMenu}
      </button>

      <div className="min-w-0 flex-1">
        <BuscaGlobal />
      </div>

      <AlternadorTema />
      <MenuUsuario perfil={perfil} />
    </header>
  );
}
