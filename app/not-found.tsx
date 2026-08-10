import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="kicker">Sales Brain</p>
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">
        O endereço não existe ou o registro foi removido.
      </p>
      <Link href="/home" className="botao-primario mt-2">
        Voltar para a Home
      </Link>
    </main>
  );
}
