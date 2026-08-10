import type { Metadata } from "next";
import { FormLogin } from "@/components/auth/FormLogin";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, { tipo: "aviso" | "erro"; texto: string }> = {
  pendente: {
    tipo: "aviso",
    texto:
      "Seu e-mail não pertence ao domínio @doutor-ai.com. Registramos sua solicitação de acesso — você poderá entrar assim que um administrador aprovar.",
  },
  config: {
    tipo: "erro",
    texto:
      "O app ainda não está conectado ao Supabase (variáveis de ambiente pendentes). Siga o docs/SETUP.md para concluir a configuração.",
  },
  auth: {
    tipo: "erro",
    texto: "Não foi possível concluir o login. Tente novamente.",
  },
};

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const chave = params.aviso ?? params.erro;
  const mensagem = chave ? AVISOS[chave] : undefined;

  return (
    <main className="flex min-h-screen">
      {/* Painel de marca — azul-médico profundo, estilo Portal CS */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(60rem 60rem at 120% -20%, hsl(175 60% 40% / 0.9), transparent 55%), radial-gradient(50rem 50rem at -30% 120%, hsl(210 70% 45% / 0.8), transparent 55%)",
          }}
        />
        <header className="relative flex items-center gap-3">
          <LogoMarca />
          <div>
            <p className="font-semibold leading-tight">Doutor-AI</p>
            <p className="kicker !text-sidebar-muted">Orquestração clínica</p>
          </div>
        </header>

        <div className="relative max-w-md">
          <p className="kicker mb-4 !text-[hsl(175_60%_55%)]">Plataforma comercial interna</p>
          <h1 className="text-4xl font-semibold leading-tight">Sales Brain</h1>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-muted">
            A centralizadora da inteligência comercial da Doutor-AI: funil de vendas,
            contas, oportunidades e — em breve — preenchimento automático a partir das
            suas reuniões reais.
          </p>
        </div>

        <footer className="relative kicker !text-sidebar-muted">
          © {new Date().getFullYear()} Doutor-AI · uso interno
        </footer>
      </section>

      {/* Cartão de login */}
      <section className="flex w-full items-center justify-center bg-background px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMarca />
            <div>
              <p className="font-semibold leading-tight">Sales Brain</p>
              <p className="kicker">Doutor-AI</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold">Entrar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso restrito ao time Doutor-AI (@doutor-ai.com).
          </p>

          {mensagem ? (
            <div
              className={
                "mt-5 rounded-md border px-4 py-3 text-sm " +
                (mensagem.tipo === "erro"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-warning/40 bg-warning/10 text-foreground")
              }
              role="status"
            >
              {mensagem.texto}
            </div>
          ) : null}

          <FormLogin />
        </div>
      </section>
    </main>
  );
}

function LogoMarca() {
  return (
    <span
      className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground shadow-soft"
      aria-hidden
    >
      SB
    </span>
  );
}
