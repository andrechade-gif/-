// Layout de tudo que exige login. Segunda camada da restrição de acesso
// (a primeira é o middleware; a terceira, RLS no banco): sem perfil APROVADO,
// nada além de /acesso-pendente é renderizado.

import { redirect } from "next/navigation";
import { criarClienteServidor, supabaseConfigurado } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import type { Perfil } from "@/lib/tipos";

export default async function LayoutAutenticado({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigurado()) redirect("/login?erro=config");

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Perfil>();

  if (!perfil || perfil.status !== "aprovado") redirect("/acesso-pendente");

  // Badges da sidebar: pendências de migração + solicitações de acesso (admin)
  const { count: pendenciasMigracao } = await supabase
    .from("oportunidades")
    .select("id", { count: "exact", head: true })
    .eq("precisa_recategorizar", true);

  let solicitacoesPendentes = 0;
  if (perfil.papel === "admin") {
    const { count } = await supabase
      .from("solicitacoes_acesso")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente");
    solicitacoesPendentes = count ?? 0;
  }

  return (
    <AppShell
      perfil={perfil}
      pendenciasMigracao={pendenciasMigracao ?? 0}
      solicitacoesPendentes={solicitacoesPendentes}
    >
      {children}
    </AppShell>
  );
}
