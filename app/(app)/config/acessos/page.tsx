import type { Metadata } from "next";
import { criarClienteServidor } from "@/lib/supabase/server";
import { PainelAcessos } from "@/components/config/PainelAcessos";
import type { Perfil, SolicitacaoAcesso } from "@/lib/tipos";

export const metadata: Metadata = { title: "Configurações · Acessos" };

export default async function PaginaAcessos() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user!.id)
    .maybeSingle();

  const ehAdmin = perfil?.papel === "admin";

  if (!ehAdmin) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="kicker">Configurações</p>
        <h1 className="mt-1 text-2xl font-semibold">Acessos</h1>
        <p className="mt-4 rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-card">
          Apenas administradores gerenciam solicitações de acesso. Fale com o André se
          precisar aprovar alguém.
        </p>
      </div>
    );
  }

  const [solicitacoesRes, perfisRes] = await Promise.all([
    supabase
      .from("solicitacoes_acesso")
      .select("*")
      .order("status", { ascending: false }) // pendente > negada > aprovada (ordem alfabética reversa funciona: pendente/negada/aprovada)
      .order("created_at", { ascending: false }),
    supabase.from("perfis").select("*").order("created_at", { ascending: true }),
  ]);

  return (
    <PainelAcessos
      solicitacoes={(solicitacoesRes.data ?? []) as SolicitacaoAcesso[]}
      perfis={(perfisRes.data ?? []) as Perfil[]}
    />
  );
}
