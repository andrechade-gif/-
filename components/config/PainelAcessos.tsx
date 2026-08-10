"use client";

// Painel do admin: aprova/nega solicitações e enxerga os perfis existentes.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { aprovarSolicitacao, negarSolicitacao } from "@/lib/actions/acessos";
import { fmtDataHora } from "@/lib/formato";
import type { Perfil, SolicitacaoAcesso } from "@/lib/tipos";

export function PainelAcessos({
  solicitacoes,
  perfis,
}: {
  solicitacoes: SolicitacaoAcesso[];
  perfis: Perfil[];
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const pendentes = solicitacoes.filter((s) => s.status === "pendente");
  const decididas = solicitacoes.filter((s) => s.status !== "pendente");

  function decidir(acao: (id: string) => Promise<{ ok: boolean; erro?: string }>, id: string) {
    setErro(null);
    startTransition(async () => {
      const r = await acao(id);
      if (!r.ok) {
        setErro(r.erro ?? "Algo deu errado.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="kicker">Configurações</p>
        <h1 className="mt-1 text-2xl font-semibold">Solicitações de acesso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          E-mails <strong>@doutor-ai.com</strong> entram automaticamente. Os demais aguardam
          sua aprovação aqui.
        </p>
      </div>

      {erro ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      <section>
        <h2 className="kicker mb-3">Pendentes · {pendentes.length}</h2>
        {pendentes.length === 0 ? (
          <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-card">
            Nenhuma solicitação pendente.
          </p>
        ) : (
          <ul className="space-y-3">
            {pendentes.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-5 py-4 shadow-card"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.nome ?? "Sem nome"}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                  <p className="tnum mt-0.5 text-xs text-muted-foreground">
                    Solicitado em {fmtDataHora(s.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="botao-primario !py-1.5 text-xs"
                    disabled={pendente}
                    onClick={() => decidir(aprovarSolicitacao, s.id)}
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className="botao-perigo !py-1.5 text-xs"
                    disabled={pendente}
                    onClick={() => decidir(negarSolicitacao, s.id)}
                  >
                    Negar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="kicker mb-3">Usuários da plataforma · {perfis.length}</h2>
        <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="kicker px-4 py-2.5 !text-[10px]">Nome</th>
                <th className="kicker px-4 py-2.5 !text-[10px]">E-mail</th>
                <th className="kicker px-4 py-2.5 !text-[10px]">Papel</th>
                <th className="kicker px-4 py-2.5 !text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {perfis.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">{p.nome}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="pill bg-primary/10 text-primary">
                      {p.papel === "admin" ? "Admin" : "Vendedor"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={clsx("pill", {
                        "bg-success/15 text-success": p.status === "aprovado",
                        "bg-warning/15 text-warning": p.status === "pendente",
                        "bg-destructive/15 text-destructive": p.status === "bloqueado",
                      })}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {decididas.length > 0 ? (
        <section>
          <h2 className="kicker mb-3">Histórico de decisões</h2>
          <ul className="space-y-2">
            {decididas.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-2.5 text-sm"
              >
                <span className="truncate text-muted-foreground">{s.email}</span>
                <span
                  className={clsx("pill shrink-0", {
                    "bg-success/15 text-success": s.status === "aprovada",
                    "bg-destructive/15 text-destructive": s.status === "negada",
                  })}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
