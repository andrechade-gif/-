"use client";

// Timeline unificada de atividades do deal (inclui notas soltas da conta).
// Atividades migradas exibem a proveniência "Importado do 1.0".

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  StickyNote,
  Users,
  Linkedin,
  ClipboardList,
} from "lucide-react";
import {
  ATIVIDADE_TIPOS,
  ATIVIDADE_TIPO_LABEL,
  ATIVIDADE_FONTE_LABEL,
  type AtividadeTipo,
} from "@/lib/dominio";
import { fmtDataHora } from "@/lib/formato";
import { criarAtividade } from "@/lib/actions/atividades";
import { Modal } from "@/components/ui/Modal";
import type { Atividade } from "@/lib/tipos";

const ICONE_TIPO: Record<AtividadeTipo, React.ComponentType<{ className?: string }>> = {
  reuniao: Users,
  email: Mail,
  ligacao: Phone,
  whatsapp: MessageCircle,
  linkedin: Linkedin,
  nota: StickyNote,
  evento: CalendarDays,
  tarefa: ClipboardList,
};

export function TimelineAtividades({
  oportunidadeId,
  contaId,
  atividades,
  contatos,
}: {
  oportunidadeId: string;
  contaId: string;
  atividades: Atividade[];
  contatos: { id: string; nome: string; cargo: string | null }[];
}) {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [tipo, setTipo] = useState<AtividadeTipo>("nota");
  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 16));

  const nomeContato = new Map(contatos.map((c) => [c.id, c.nome]));

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      const r = await criarAtividade({
        conta_id: contaId,
        oportunidade_id: oportunidadeId,
        tipo,
        titulo,
        resumo,
        data,
      });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setModalAberto(false);
      setTitulo("");
      setResumo("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="kicker">Timeline · {atividades.length} atividades</h2>
        <button type="button" className="botao-secundario !py-1.5 text-xs" onClick={() => setModalAberto(true)}>
          <Plus className="h-3.5 w-3.5" /> Atividade
        </button>
      </div>

      {atividades.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <ol className="relative space-y-4 border-l pl-5">
          {atividades.map((a) => {
            const Icone = ICONE_TIPO[a.tipo] ?? StickyNote;
            const participantes = (a.participantes ?? [])
              .map((id) => nomeContato.get(id))
              .filter(Boolean);
            return (
              <li key={a.id} className="relative">
                <span className="absolute -left-[27px] flex h-4 w-4 items-center justify-center rounded-full border bg-card">
                  <Icone className="h-2.5 w-2.5 text-muted-foreground" />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{a.titulo}</span>
                  <span className="pill bg-muted text-muted-foreground">
                    {ATIVIDADE_TIPO_LABEL[a.tipo]}
                  </span>
                  {a.fonte === "importado_1_0" ? (
                    <span className="pill bg-accent/15 font-mono text-[10px] uppercase tracking-wider text-accent">
                      {ATIVIDADE_FONTE_LABEL.importado_1_0}
                    </span>
                  ) : null}
                </div>
                <p className="tnum mt-0.5 text-xs text-muted-foreground">{fmtDataHora(a.data)}</p>
                {a.resumo ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/90">{a.resumo}</p>
                ) : null}
                {participantes.length > 0 ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Participantes: {participantes.join(", ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <Modal titulo="Nova atividade" aberto={modalAberto} aoFechar={() => setModalAberto(false)}>
        <form onSubmit={salvar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Tipo</label>
              <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value as AtividadeTipo)}>
                {ATIVIDADE_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {ATIVIDADE_TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo">Data e hora</label>
              <input
                type="datetime-local"
                className="campo tnum"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="rotulo">Título</label>
            <input
              className="campo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              placeholder="Ex.: Alinhamento com diretoria clínica"
            />
          </div>
          <div>
            <label className="rotulo">Resumo (opcional)</label>
            <textarea
              className="campo min-h-24"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder="O que aconteceu, próximos passos…"
            />
          </div>
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="botao-secundario" onClick={() => setModalAberto(false)}>
              Cancelar
            </button>
            <button type="submit" className="botao-primario" disabled={pendente}>
              {pendente ? "Salvando…" : "Registrar atividade"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
