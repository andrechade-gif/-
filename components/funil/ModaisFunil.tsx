"use client";

// Modais do funil: mover etapa (checklist de critérios de saída), on-hold,
// perda, ganho (confirmação de valores) e reabertura.

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  CRITERIOS_SAIDA,
  ETAPA_LABEL,
  MOTIVOS_HOLD,
  MOTIVO_HOLD_LABEL,
  MOTIVOS_PERDA,
  MOTIVO_PERDA_LABEL,
  indiceEtapa,
  type Etapa,
  type MotivoHold,
  type MotivoPerda,
} from "@/lib/dominio";
import { fmtBRL } from "@/lib/formato";
import {
  marcarGanha,
  marcarOnHold,
  marcarPerdida,
  moverEtapa,
  reabrir,
} from "@/lib/actions/oportunidades";
import { Modal } from "@/components/ui/Modal";
import type { OppDoFunil } from "./FunilBoard";

type Executor = (acao: () => Promise<{ ok: boolean; erro?: string }>) => void;

function CabecalhoDeal({ opp }: { opp: OppDoFunil }) {
  return (
    <div className="mb-4 rounded-md bg-muted/60 px-3 py-2">
      <p className="kicker !text-[10px]">{opp.conta?.nome ?? "Sem conta"}</p>
      <p className="text-sm font-medium">{opp.nome}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Mover etapa
export function ModalMover({
  opp,
  para,
  pendente,
  aoFechar,
  aoConfirmar,
}: {
  opp: OppDoFunil;
  para: Etapa;
  pendente: boolean;
  aoFechar: () => void;
  aoConfirmar: Executor;
}) {
  const de = opp.etapa;
  const avancando = indiceEtapa(para) > indiceEtapa(de);
  const criterios = CRITERIOS_SAIDA[de];
  const [marcados, setMarcados] = useState<boolean[]>(criterios.map(() => false));
  const todosMarcados = marcados.every(Boolean);
  const pulando = indiceEtapa(para) - indiceEtapa(de) > 1;

  return (
    <Modal titulo="Mover deal de etapa" aberto aoFechar={aoFechar}>
      <CabecalhoDeal opp={opp} />

      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="pill bg-muted text-foreground">{ETAPA_LABEL[de]}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="pill bg-primary/10 text-primary">{ETAPA_LABEL[para]}</span>
      </p>

      {avancando ? (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            Confirme os critérios de saída de <strong>{ETAPA_LABEL[de]}</strong> (blueprint
            §2.2) antes de avançar:
          </p>
          <ul className="mt-3 space-y-2">
            {criterios.map((criterio, i) => (
              <li key={criterio}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm hover:bg-muted/60">
                  <input
                    type="checkbox"
                    checked={marcados[i]}
                    onChange={(e) =>
                      setMarcados((m) => m.map((v, j) => (j === i ? e.target.checked : v)))
                    }
                    className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  <span>{criterio}</span>
                </label>
              </li>
            ))}
          </ul>
          {pulando ? (
            <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
              Você está pulando etapas intermediárias — o movimento será registrado direto
              para {ETAPA_LABEL[para]}.
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-4 rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Retorno de etapa: nenhum critério é exigido ao voltar. O movimento fica registrado
          no histórico do deal.
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="botao-secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || (avancando && !todosMarcados)}
          onClick={() => aoConfirmar(() => moverEtapa(opp.id, para))}
        >
          {pendente ? "Registrando…" : "Confirmar movimento"}
        </button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------- On-hold
export function ModalOnHold({
  opp,
  pendente,
  aoFechar,
  aoConfirmar,
}: {
  opp: OppDoFunil;
  pendente: boolean;
  aoFechar: () => void;
  aoConfirmar: Executor;
}) {
  const [motivo, setMotivo] = useState<MotivoHold | "">("");
  const [detalhe, setDetalhe] = useState("");
  const valido = motivo !== "" && (motivo !== "outro" || detalhe.trim().length > 0);

  return (
    <Modal titulo="Marcar deal como on-hold" aberto aoFechar={aoFechar}>
      <CabecalhoDeal opp={opp} />
      <p className="text-sm text-muted-foreground">
        O deal congela na etapa <strong>{ETAPA_LABEL[opp.etapa]}</strong> e sai do funil
        padrão (fica visível nos filtros “On-hold” e “Todas”).
      </p>

      <label className="rotulo mt-4">Motivo (obrigatório)</label>
      <select
        className="campo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value as MotivoHold)}
      >
        <option value="">Selecione o motivo…</option>
        {MOTIVOS_HOLD.map((m) => (
          <option key={m} value={m}>
            {MOTIVO_HOLD_LABEL[m]}
          </option>
        ))}
      </select>

      <label className="rotulo mt-3">
        Detalhe {motivo === "outro" ? "(obrigatório)" : "(opcional)"}
      </label>
      <textarea
        className="campo min-h-20"
        value={detalhe}
        onChange={(e) => setDetalhe(e.target.value)}
        placeholder="Contexto do congelamento…"
      />

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="botao-secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || !valido}
          onClick={() =>
            aoConfirmar(() => marcarOnHold(opp.id, motivo as MotivoHold, detalhe || undefined))
          }
        >
          {pendente ? "Registrando…" : "Confirmar on-hold"}
        </button>
      </div>
    </Modal>
  );
}

// --------------------------------------------------------------------- Perda
export function ModalPerda({
  opp,
  pendente,
  aoFechar,
  aoConfirmar,
}: {
  opp: OppDoFunil;
  pendente: boolean;
  aoFechar: () => void;
  aoConfirmar: Executor;
}) {
  const [motivo, setMotivo] = useState<MotivoPerda | "">("");
  const [detalhe, setDetalhe] = useState("");
  const valido = motivo !== "" && (motivo !== "outro" || detalhe.trim().length > 0);
  const etapaRegistro =
    opp.estado === "on_hold" ? (opp.etapa_congelada ?? opp.etapa) : opp.etapa;

  return (
    <Modal titulo="Marcar deal como perdida" aberto aoFechar={aoFechar}>
      <CabecalhoDeal opp={opp} />
      <p className="text-sm text-muted-foreground">
        A perda será registrada na etapa <strong>{ETAPA_LABEL[etapaRegistro]}</strong> — esse
        dado alimenta as métricas de conversão por etapa.
      </p>

      <label className="rotulo mt-4">Motivo (obrigatório)</label>
      <select
        className="campo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value as MotivoPerda)}
      >
        <option value="">Selecione o motivo…</option>
        {MOTIVOS_PERDA.map((m) => (
          <option key={m} value={m}>
            {MOTIVO_PERDA_LABEL[m]}
          </option>
        ))}
      </select>

      <label className="rotulo mt-3">
        Detalhe {motivo === "outro" ? "(obrigatório)" : "(opcional)"}
      </label>
      <textarea
        className="campo min-h-20"
        value={detalhe}
        onChange={(e) => setDetalhe(e.target.value)}
        placeholder="O que aconteceu?"
      />

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="botao-secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="botao-perigo"
          disabled={pendente || !valido}
          onClick={() =>
            aoConfirmar(() => marcarPerdida(opp.id, motivo as MotivoPerda, detalhe || undefined))
          }
        >
          {pendente ? "Registrando…" : "Confirmar perda"}
        </button>
      </div>
    </Modal>
  );
}

// --------------------------------------------------------------------- Ganha
export function ModalGanha({
  opp,
  pendente,
  aoFechar,
  aoConfirmar,
}: {
  opp: OppDoFunil;
  pendente: boolean;
  aoFechar: () => void;
  aoConfirmar: Executor;
}) {
  const [mrr, setMrr] = useState(String(opp.mrr_contratado ?? 0));
  const [setup, setSetup] = useState(opp.setup_valor != null ? String(opp.setup_valor) : "");
  const [meses, setMeses] = useState(
    opp.contrato_meses != null ? String(opp.contrato_meses) : "12"
  );

  const numeros = useMemo(() => {
    const m = Number(mrr.replace(",", "."));
    const s = setup.trim() === "" ? null : Number(setup.replace(",", "."));
    const c = meses.trim() === "" ? null : Number.parseInt(meses, 10);
    return { m, s, c };
  }, [mrr, setup, meses]);

  const tcv =
    (numeros.s ?? 0) + (Number.isFinite(numeros.m) ? numeros.m : 0) * (numeros.c ?? 12);
  const valido = Number.isFinite(numeros.m) && numeros.m >= 0;

  return (
    <Modal titulo="Marcar como ganha 🎉" aberto aoFechar={aoFechar}>
      <CabecalhoDeal opp={opp} />
      <p className="text-sm text-muted-foreground">
        Contrato assinado! Confirme os valores finais — eles alimentam meta, forecast e a
        Jornada de Cliente que será criada agora.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="rotulo">MRR contratado (R$)</label>
          <input
            className="campo tnum"
            inputMode="decimal"
            value={mrr}
            onChange={(e) => setMrr(e.target.value)}
          />
        </div>
        <div>
          <label className="rotulo">Setup (R$)</label>
          <input
            className="campo tnum"
            inputMode="decimal"
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="rotulo">Contrato (meses)</label>
          <input
            className="campo tnum"
            inputMode="numeric"
            value={meses}
            onChange={(e) => setMeses(e.target.value)}
            placeholder="12"
          />
        </div>
      </div>

      <p className="tnum mt-4 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm">
        TCV calculado: <strong>{fmtBRL(tcv)}</strong>{" "}
        <span className="text-muted-foreground">(setup + MRR × meses — nunca digitado)</span>
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="botao-secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="botao-primario !bg-success hover:!bg-success/90"
          disabled={pendente || !valido}
          onClick={() =>
            aoConfirmar(() =>
              marcarGanha(opp.id, {
                mrr_contratado: numeros.m,
                setup_valor: numeros.s,
                contrato_meses: numeros.c,
              })
            )
          }
        >
          {pendente ? "Registrando…" : "Confirmar ganho"}
        </button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------- Reabrir
export function ModalReabrir({
  opp,
  pendente,
  aoFechar,
  aoConfirmar,
}: {
  opp: OppDoFunil;
  pendente: boolean;
  aoFechar: () => void;
  aoConfirmar: Executor;
}) {
  const etapaDestino =
    (opp.estado === "on_hold" ? opp.etapa_congelada : opp.etapa_perda) ?? opp.etapa;

  return (
    <Modal titulo="Reabrir deal" aberto aoFechar={aoFechar}>
      <CabecalhoDeal opp={opp} />
      <p className="text-sm text-muted-foreground">
        O deal volta ao estado <strong>aberta</strong>, na etapa{" "}
        <strong>{ETAPA_LABEL[etapaDestino]}</strong> (onde parou). Os motivos de{" "}
        {opp.estado === "on_hold" ? "congelamento" : "perda"} serão limpos — o histórico
        permanece nos movimentos.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="botao-secundario" onClick={aoFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente}
          onClick={() => aoConfirmar(() => reabrir(opp.id))}
        >
          {pendente ? "Reabrindo…" : "Reabrir deal"}
        </button>
      </div>
    </Modal>
  );
}
