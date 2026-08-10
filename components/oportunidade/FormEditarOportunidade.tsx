"use client";

// Dados editáveis do deal. Mudança de closing date pede motivo e alimenta o
// histórico (insumo do forecast no M5). Etapa/estado NÃO mudam aqui — mudam
// pelo funil, com critérios e motivos.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FORECAST_CATEGORIAS,
  FORECAST_LABEL,
  PRODUTOS,
  PRODUTO_LABEL,
  TEMPERATURAS,
  TEMPERATURA_LABEL,
} from "@/lib/dominio";
import { atualizarOportunidade } from "@/lib/actions/oportunidades";
import type { Oportunidade } from "@/lib/tipos";

function numeroOuNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function FormEditarOportunidade({
  opp,
  perfis,
  parceiros,
}: {
  opp: Oportunidade;
  perfis: { id: string; nome: string }[];
  parceiros: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const [nome, setNome] = useState(opp.nome);
  const [mrr, setMrr] = useState(String(opp.mrr_contratado ?? 0));
  const [mrrEsperado, setMrrEsperado] = useState(
    opp.mrr_esperado != null ? String(opp.mrr_esperado) : ""
  );
  const [setup, setSetup] = useState(opp.setup_valor != null ? String(opp.setup_valor) : "");
  const [meses, setMeses] = useState(
    opp.contrato_meses != null ? String(opp.contrato_meses) : ""
  );
  const [produtos, setProdutos] = useState<string[]>(opp.produtos ?? []);
  const [volume, setVolume] = useState(
    opp.volume_mensal != null ? String(opp.volume_mensal) : ""
  );
  const [valorAtendimento, setValorAtendimento] = useState(
    opp.valor_por_atendimento != null ? String(opp.valor_por_atendimento) : ""
  );
  const [closing, setClosing] = useState(opp.closing_date ?? "");
  const [motivoClosing, setMotivoClosing] = useState("");
  const [forecast, setForecast] = useState(opp.forecast_categoria);
  const [temperatura, setTemperatura] = useState(opp.temperatura ?? "");
  const [responsavel, setResponsavel] = useState(opp.responsavel_id ?? "");
  const [parceiro, setParceiro] = useState(opp.partner_id ?? "");
  const [comissao, setComissao] = useState(
    opp.comissao_mrr_pct != null ? String(opp.comissao_mrr_pct) : ""
  );
  const [obs, setObs] = useState(opp.observacoes ?? "");

  const closingMudou = (closing || null) !== (opp.closing_date ?? null);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const r = await atualizarOportunidade(opp.id, {
        nome: nome.trim(),
        mrr_contratado: numeroOuNull(mrr) ?? 0,
        mrr_esperado: numeroOuNull(mrrEsperado),
        setup_valor: numeroOuNull(setup),
        contrato_meses: meses.trim() === "" ? null : Number.parseInt(meses, 10),
        produtos,
        volume_mensal: numeroOuNull(volume),
        valor_por_atendimento: numeroOuNull(valorAtendimento),
        closing_date: closing || null,
        motivo_closing: closingMudou ? motivoClosing : undefined,
        forecast_categoria: forecast,
        temperatura: temperatura || null,
        responsavel_id: responsavel || null,
        partner_id: parceiro || null,
        comissao_mrr_pct: numeroOuNull(comissao),
        observacoes: obs.trim() || null,
      });
      if (!r.ok) {
        setMsg({ tipo: "erro", texto: r.erro });
        return;
      }
      setMsg({ tipo: "ok", texto: "Alterações salvas." });
      setMotivoClosing("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={salvar} className="rounded-lg border bg-card p-5 shadow-card">
      <h2 className="kicker mb-4">Dados do deal</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="rotulo">Nome do deal</label>
          <input className="campo" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>

        <div>
          <label className="rotulo">MRR contratado (R$) — métrica-mestre</label>
          <input className="campo tnum" inputMode="decimal" value={mrr} onChange={(e) => setMrr(e.target.value)} />
        </div>
        <div>
          <label className="rotulo">MRR esperado (R$) — projeção, não forecast</label>
          <input className="campo tnum" inputMode="decimal" value={mrrEsperado} onChange={(e) => setMrrEsperado(e.target.value)} />
        </div>
        <div>
          <label className="rotulo">Setup (R$)</label>
          <input className="campo tnum" inputMode="decimal" value={setup} onChange={(e) => setSetup(e.target.value)} />
        </div>
        <div>
          <label className="rotulo">Contrato (meses)</label>
          <input className="campo tnum" inputMode="numeric" value={meses} onChange={(e) => setMeses(e.target.value)} placeholder="12" />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="rotulo">Produtos no escopo</legend>
          <div className="flex flex-wrap gap-2">
            {PRODUTOS.map((p) => {
              const ativo = produtos.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setProdutos((atual) =>
                      ativo ? atual.filter((x) => x !== p) : [...atual, p]
                    )
                  }
                  className={`pill border transition-colors ${
                    ativo
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                  aria-pressed={ativo}
                >
                  {PRODUTO_LABEL[p]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label className="rotulo">Volume mensal (atendimentos)</label>
          <input className="campo tnum" inputMode="numeric" value={volume} onChange={(e) => setVolume(e.target.value)} />
        </div>
        <div>
          <label className="rotulo">Valor por atendimento (R$)</label>
          <input className="campo tnum" inputMode="decimal" value={valorAtendimento} onChange={(e) => setValorAtendimento(e.target.value)} />
        </div>

        <div>
          <label className="rotulo">Closing date</label>
          <input type="date" className="campo tnum" value={closing} onChange={(e) => setClosing(e.target.value)} />
        </div>
        {closingMudou ? (
          <div>
            <label className="rotulo">Motivo da mudança de data (vai para o histórico)</label>
            <input
              className="campo"
              value={motivoClosing}
              onChange={(e) => setMotivoClosing(e.target.value)}
              placeholder="Ex.: comitê adiado para março"
            />
          </div>
        ) : (
          <div>
            <label className="rotulo">Forecast</label>
            <select className="campo" value={forecast} onChange={(e) => setForecast(e.target.value as typeof forecast)}>
              {FORECAST_CATEGORIAS.map((f) => (
                <option key={f} value={f}>
                  {FORECAST_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
        )}

        {closingMudou ? (
          <div>
            <label className="rotulo">Forecast</label>
            <select className="campo" value={forecast} onChange={(e) => setForecast(e.target.value as typeof forecast)}>
              {FORECAST_CATEGORIAS.map((f) => (
                <option key={f} value={f}>
                  {FORECAST_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="rotulo">Temperatura</label>
          <select className="campo" value={temperatura} onChange={(e) => setTemperatura(e.target.value)}>
            <option value="">—</option>
            {TEMPERATURAS.map((t) => (
              <option key={t} value={t}>
                {TEMPERATURA_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="rotulo">Responsável</label>
          <select className="campo" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">—</option>
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo">Parceiro</label>
          <select className="campo" value={parceiro} onChange={(e) => setParceiro(e.target.value)}>
            <option value="">Sem parceiro</option>
            {parceiros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="rotulo">Comissão sobre MRR (%)</label>
          <input className="campo tnum" inputMode="decimal" value={comissao} onChange={(e) => setComissao(e.target.value)} />
        </div>

        <div className="sm:col-span-2">
          <label className="rotulo">Observações</label>
          <textarea className="campo min-h-24" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {msg ? (
          <p className={`text-sm ${msg.tipo === "ok" ? "text-success" : "text-destructive"}`}>
            {msg.texto}
          </p>
        ) : (
          <span />
        )}
        <button type="submit" className="botao-primario" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
