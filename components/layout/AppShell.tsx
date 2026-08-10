"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { Perfil } from "@/lib/tipos";

export function AppShell({
  perfil,
  pendenciasMigracao,
  solicitacoesPendentes,
  children,
}: {
  perfil: Perfil;
  pendenciasMigracao: number;
  solicitacoesPendentes: number;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar fixa no desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">
        <Sidebar
          perfil={perfil}
          pendenciasMigracao={pendenciasMigracao}
          solicitacoesPendentes={solicitacoesPendentes}
        />
      </aside>

      {/* Drawer no celular */}
      {menuAberto ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="h-full w-64">
            <Sidebar
              perfil={perfil}
              pendenciasMigracao={pendenciasMigracao}
              solicitacoesPendentes={solicitacoesPendentes}
              aoNavegar={() => setMenuAberto(false)}
            />
          </div>
          <button
            aria-label="Fechar menu"
            className="flex-1 bg-black/50"
            onClick={() => setMenuAberto(false)}
          >
            <X className="m-4 h-6 w-6 text-white" />
          </button>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header perfil={perfil} aoAbrirMenu={() => setMenuAberto(true)} botaoMenu={<Menu className="h-5 w-5" />} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
