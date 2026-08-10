import type { Metadata } from "next";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaPendencias } from "@/components/migracao/ListaPendencias";
import type { OportunidadeComConta } from "@/lib/tipos";

export const metadata: Metadata = { title: "Pendências de migração" };

export default async function PaginaPendencias() {
  const supabase = await criarClienteServidor();

  const { data } = await supabase
    .from("oportunidades")
    .select("*, conta:contas(id, nome)")
    .eq("precisa_recategorizar", true)
    .order("created_at", { ascending: true });

  const pendentes = (data ?? []) as unknown as OportunidadeComConta[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="kicker">Migração 1.0 → 2.0</p>
        <h1 className="mt-1 text-2xl font-semibold">Recategorização de on-hold</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Estes deals vieram do Sales Brain 1.0 congelados com motivo genérico. Reclassifique
          cada um na nova taxonomia (blueprint §2.4). O texto original do 1.0 está preservado
          — ao zerar a lista, esta página some do menu.
        </p>
      </div>

      <ListaPendencias pendentes={pendentes} />
    </div>
  );
}
