"use client";

// Formulário da capa: Google primeiro (primário), e-mail/senha como fallback.
// A restrição de domínio de verdade é aplicada no SERVIDOR (auth/callback e
// layout autenticado); aqui só orientamos o usuário.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";

export function FormLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState<"google" | "senha" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const configurado = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function entrarComGoogle() {
    if (!configurado) return;
    setErro(null);
    setCarregando("google");
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/home`,
        queryParams: { hd: "doutor-ai.com", prompt: "select_account" },
      },
    });
    if (error) {
      setErro("Não foi possível iniciar o login com Google.");
      setCarregando(null);
    }
  }

  async function entrarComSenha(e: React.FormEvent) {
    e.preventDefault();
    if (!configurado) return;
    setErro(null);
    setCarregando("senha");
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro("E-mail ou senha inválidos.");
      setCarregando(null);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-4">
      <button
        type="button"
        onClick={entrarComGoogle}
        disabled={!configurado || carregando !== null}
        className="botao-primario w-full py-2.5"
      >
        <IconeGoogle />
        {carregando === "google" ? "Redirecionando…" : "Entrar com Google"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="kicker">ou</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {!mostrarSenha ? (
        <button
          type="button"
          onClick={() => setMostrarSenha(true)}
          className="botao-secundario w-full"
        >
          Entrar com e-mail e senha
        </button>
      ) : (
        <form onSubmit={entrarComSenha} className="space-y-3">
          <div>
            <label htmlFor="email" className="rotulo">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="campo"
              placeholder="voce@doutor-ai.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="senha" className="rotulo">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              autoComplete="current-password"
              className="campo"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={!configurado || carregando !== null}
            className="botao-secundario w-full"
          >
            {carregando === "senha" ? "Entrando…" : "Entrar"}
          </button>
        </form>
      )}

      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

      <p className="pt-2 text-center text-sm text-muted-foreground">
        Não tem acesso?{" "}
        <Link href="/solicitar-acesso" className="font-medium text-primary hover:underline">
          Solicitar acesso
        </Link>
      </p>
    </div>
  );
}

function IconeGoogle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 4.3-5.35 4.3a5.8 5.8 0 1 1 0-11.6c1.45 0 2.77.53 3.8 1.4l2.15-2.15A8.9 8.9 0 0 0 12 3.1a8.9 8.9 0 1 0 0 17.8c4.45 0 8.55-3.1 8.55-8.9 0-.3-.07-.6-.2-.9Z"
      />
    </svg>
  );
}
