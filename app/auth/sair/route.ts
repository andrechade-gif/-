// Encerra a sessão e volta para a capa.

import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor, supabaseConfigurado } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (supabaseConfigurado()) {
    const supabase = await criarClienteServidor();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
