// Callback do login (Google OAuth e magic links do Supabase).
// AQUI mora a restrição de domínio NO SERVIDOR (não só no cliente):
//   · e-mail @doutor-ai.com → entra (perfil aprovado automaticamente pelo trigger)
//   · qualquer outro e-mail → sessão encerrada + solicitação de acesso registrada,
//     a menos que um admin já tenha aprovado o perfil antes.

import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { DOMINIO_EMAIL_PERMITIDO } from "@/lib/dominio";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=auth`);
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?erro=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?erro=auth`);
  }

  const email = user.email.toLowerCase();
  const dominioOk = email.endsWith(DOMINIO_EMAIL_PERMITIDO);

  if (!dominioOk) {
    // Fora do domínio: só entra se um admin já aprovou o perfil.
    const { data: perfil } = await supabase
      .from("perfis")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    if (perfil?.status !== "aprovado") {
      // Garante a solicitação registrada (o trigger de novo usuário também faz
      // isso no primeiro login; o upsert cobre logins repetidos).
      const admin = criarClienteAdmin();
      if (admin) {
        await admin.from("solicitacoes_acesso").upsert(
          {
            nome:
              (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              email.split("@")[0],
            email,
          },
          { onConflict: "email", ignoreDuplicates: true }
        );
      }
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?aviso=pendente`);
    }
  }

  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/home"}`);
}
