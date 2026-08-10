import type { Metadata } from "next";
import Link from "next/link";
import { FormSolicitarAcesso } from "@/components/auth/FormSolicitarAcesso";

export const metadata: Metadata = { title: "Solicitar acesso" };

export default function PaginaSolicitarAcesso() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="kicker mb-2">Sales Brain · Doutor-AI</p>
        <h1 className="text-2xl font-semibold">Solicitar acesso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie sua conta com e-mail e senha. E-mails <strong>@doutor-ai.com</strong> são
          liberados automaticamente; os demais aguardam aprovação de um administrador.
        </p>

        <FormSolicitarAcesso />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem acesso?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
