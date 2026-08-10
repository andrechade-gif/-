import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { criarClienteServidor, supabaseConfigurado } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Acesso pendente" };

export default async function PaginaAcessoPendente() {
  if (!supabaseConfigurado()) redirect("/login?erro=config");

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("status, nome")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.status === "aprovado") redirect("/home");

  const bloqueado = perfil?.status === "bloqueado";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-card">
        <p className="kicker mb-3">Sales Brain · Doutor-AI</p>
        <h1 className="text-xl font-semibold">
          {bloqueado ? "Acesso bloqueado" : "Acesso aguardando aprovação"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {bloqueado
            ? "Seu acesso ao Sales Brain foi bloqueado. Fale com um administrador se acreditar que isso é um engano."
            : `Olá${perfil?.nome ? `, ${perfil.nome}` : ""}! Sua conta foi criada, mas o acesso ao Sales Brain depende da aprovação de um administrador. Você será liberado assim que a solicitação for aprovada.`}
        </p>
        <form action="/auth/sair" method="post" className="mt-6">
          <button type="submit" className="botao-secundario">
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
