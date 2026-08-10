"use client";

// Sidebar escura com TODAS as sessões do mapa do produto (blueprint §5).
// As que ainda não existem ficam visíveis porém desabilitadas ("em breve") —
// o mapa completo mostra a visão do produto desde o M1.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Columns3,
  Target,
  Building2,
  Inbox,
  Flag,
  BarChart3,
  Handshake,
  Megaphone,
  BookOpen,
  Settings,
  PackageOpen,
} from "lucide-react";
import clsx from "clsx";
import type { Perfil } from "@/lib/tipos";

type Item = {
  rotulo: string;
  href?: string;
  icone: React.ComponentType<{ className?: string }>;
  badge?: number;
  emBreve?: string; // módulo futuro
};

export function Sidebar({
  perfil,
  pendenciasMigracao,
  solicitacoesPendentes,
  aoNavegar,
}: {
  perfil: Perfil;
  pendenciasMigracao: number;
  solicitacoesPendentes: number;
  aoNavegar?: () => void;
}) {
  const pathname = usePathname();

  const itens: Item[] = [
    { rotulo: "Home", href: "/home", icone: Home },
    { rotulo: "Funil de Vendas", href: "/funil", icone: Columns3 },
    { rotulo: "Prospecção", icone: Target, emBreve: "M2" },
    { rotulo: "Contas", icone: Building2, emBreve: "M2" },
    { rotulo: "Inbox de Aprovações", icone: Inbox, emBreve: "M4" },
    { rotulo: "Metas & Forecast", icone: Flag, emBreve: "M5" },
    { rotulo: "Performance", icone: BarChart3, emBreve: "M6" },
    { rotulo: "Parceiros", icone: Handshake, emBreve: "M7" },
    { rotulo: "Marketing", icone: Megaphone, emBreve: "M8" },
    { rotulo: "Estratégia", icone: BookOpen, emBreve: "M9" },
  ];

  // Pendências de migração: só aparece enquanto houver deals a recategorizar
  if (pendenciasMigracao > 0) {
    itens.push({
      rotulo: "Migração",
      href: "/migracao/pendencias",
      icone: PackageOpen,
      badge: pendenciasMigracao,
    });
  }

  itens.push({
    rotulo: "Configurações",
    href: "/config/acessos",
    icone: Settings,
    badge: perfil.papel === "admin" && solicitacoesPendentes > 0 ? solicitacoesPendentes : undefined,
  });

  return (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-mono text-xs font-bold text-primary-foreground">
          SB
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Sales Brain</p>
          <p className="kicker !text-sidebar-muted">Doutor-AI</p>
        </div>
      </div>

      <ul className="scroll-fino flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {itens.map((item) => {
          const ativo = item.href ? pathname.startsWith(item.href) : false;
          const Icone = item.icone;

          if (!item.href) {
            return (
              <li key={item.rotulo}>
                <span
                  className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-muted"
                  title={`Disponível no módulo ${item.emBreve}`}
                >
                  <Icone className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.rotulo}</span>
                  <span className="rounded-full border border-sidebar-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                    em breve
                  </span>
                </span>
              </li>
            );
          }

          return (
            <li key={item.rotulo}>
              <Link
                href={item.href}
                onClick={aoNavegar}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  ativo
                    ? "bg-sidebar-active font-medium text-sidebar-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground"
                )}
              >
                <Icone className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.rotulo}</span>
                {item.badge ? (
                  <span className="tnum rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="kicker !text-sidebar-muted">Módulo 1 · Funil</p>
      </div>
    </nav>
  );
}
