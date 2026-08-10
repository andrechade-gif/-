"use client";

// Cliente Supabase do NAVEGADOR (chave anon, protegida por RLS).
// Usado por componentes client (busca global, login, board).

import { createBrowserClient } from "@supabase/ssr";

export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
