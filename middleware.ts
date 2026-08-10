// Porteiro global: mantém a sessão Supabase atualizada e exige login para
// qualquer rota que não seja pública. A checagem fina (perfil aprovado,
// domínio @doutor-ai.com) acontece no servidor em app/auth/callback e no
// layout autenticado app/(app)/layout.tsx.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTAS_PUBLICAS = ["/login", "/auth", "/acesso-pendente", "/solicitar-acesso"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ehPublica = ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Ambiente ainda sem Supabase configurado: só a tela de login abre (com aviso).
  if (!url || !anon) {
    if (pathname.startsWith("/login")) return NextResponse.next();
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "?erro=config";
    return NextResponse.redirect(destino);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANTE: getUser() revalida o token no servidor do Supabase (não confiar no cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !ehPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (user && pathname.startsWith("/login")) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/home";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  matcher: [
    // tudo, exceto estáticos do Next e arquivos públicos
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|pptx)$).*)",
  ],
};
