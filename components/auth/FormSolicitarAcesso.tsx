"use client";

import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { DOMINIO_EMAIL_PERMITIDO } from "@/lib/dominio";

export function FormSolicitarAcesso() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [estado, setEstado] = useState<"inicial" | "enviando" | "ok">("inicial");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEstado("enviando");

    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { full_name: nome },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    });

    if (error) {
      setErro(
        error.message.includes("already registered")
          ? "Este e-mail já tem cadastro. Tente entrar pela tela de login."
          : "Não foi possível registrar a solicitação. Tente novamente."
      );
      setEstado("inicial");
      return;
    }
    setEstado("ok");
  }

  if (estado === "ok") {
    const interno = email.toLowerCase().endsWith(DOMINIO_EMAIL_PERMITIDO);
    return (
      <div className="mt-6 rounded-lg border bg-card p-4 text-sm leading-relaxed shadow-card">
        <p className="font-medium">Solicitação registrada ✔</p>
        <p className="mt-2 text-muted-foreground">
          Enviamos um e-mail de confirmação para <strong>{email}</strong>.{" "}
          {interno
            ? "Confirme e entre normalmente — seu e-mail é do domínio Doutor-AI e o acesso é automático."
            : "Após confirmar, seu acesso ainda dependerá da aprovação de um administrador."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-6 space-y-3">
      <div>
        <label htmlFor="nome" className="rotulo">
          Nome completo
        </label>
        <input
          id="nome"
          required
          className="campo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="email" className="rotulo">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          className="campo"
          placeholder="voce@doutor-ai.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="senha" className="rotulo">
          Senha (mínimo 8 caracteres)
        </label>
        <input
          id="senha"
          type="password"
          required
          minLength={8}
          className="campo"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>

      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

      <button type="submit" disabled={estado === "enviando"} className="botao-primario w-full">
        {estado === "enviando" ? "Enviando…" : "Solicitar acesso"}
      </button>
    </form>
  );
}
