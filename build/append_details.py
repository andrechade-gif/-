#!/usr/bin/env python3
"""Generate detail pages for each frente from the CSV timesheets and append to doc.html"""
import csv
from collections import defaultdict
from pathlib import Path

UP = Path("/root/.claude/uploads/9e67927e-bfc9-4ed7-b473-51b637cd28f7")
TRIAGEM = UP / "caf4ec04-Atividades_DoutorAI____TopMed__1__Triagem_Cli_nica_por_Voz.csv"
TRIAGEM_THIAGO = UP / "23a383f9-Atividades_DoutorAI____TopMed__Triagem_Cli_nica_por_Voz_Thiago.csv"
AUDITORIA = UP / "a7f893d8-Atividades_DoutorAI____TopMed__2__Auditoria_de_Atendimentos_Cli_nicos.csv"
COPILOTOS = UP / "989cb64c-Atividades_DoutorAI____TopMed__3__Copilotos_de_IA_para_Telemedicina.csv"

LOGO_SVG = '''<svg class="logo" viewBox="0 0 80 60" fill="#0071BC" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="18" width="10" height="10" rx="2.5"/>
        <rect x="4" y="32" width="10" height="10" rx="2.5"/>
        <rect x="18" y="25" width="10" height="10" rx="2.5"/>
        <path d="M34 10 L52 10 C 68 10 76 22 76 30 C 76 38 68 50 52 50 L34 50 Z"/>
      </svg>'''

def header(section_label):
    return f'''  <div class="ph">
    <div class="brand">{LOGO_SVG}Doutor-AI · TopMed</div>
    <div class="section">{section_label}</div>
  </div>'''

def footer(page_num):
    return f'''  <div class="pf">
    <div>v1.0 · 2026 · Orçamento Passado · Detalhamento</div>
    <div class="pg"><b>{page_num:02d}</b> / 35</div>
  </div>'''

def hm(minutes):
    h = minutes // 60
    m = minutes % 60
    if m == 0:
        return f"{h}h"
    return f"{h}h {m:02d}min"

def fmt_brl(value):
    s = f"{value:,.2f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")

def read_paulo_arthur():
    rows = []
    with open(TRIAGEM, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        header_row = next(reader)
        for r in reader:
            if not r or len(r) < 6: continue
            if r[0] == 'TOTAL': continue
            try:
                mins = int(r[5])
            except ValueError:
                continue
            rows.append({
                'date': r[0], 'who': r[1], 'project': r[3],
                'actv': r[4], 'min': mins
            })
    return rows

def read_thiago_triagem():
    rows = []
    with open(TRIAGEM_THIAGO, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        for r in reader:
            if len(r) < 5: continue
            # rows start with empty leading column
            if r[0] != '': continue
            if r[1].strip() in ('', '#', 'TOTAL'): continue
            try:
                idx = int(r[1])
            except ValueError:
                continue
            fase = r[2]
            actv = r[3]
            try:
                horas = float(r[4].replace(',', '.'))
            except ValueError:
                continue
            rows.append({'fase': fase, 'actv': actv, 'horas': horas})
    return rows

def read_grouped(path, project_filter=None):
    """Read CSV files with structure like the Thiago timesheets (Fase, Atividade, Horas)"""
    rows = []
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        for r in reader:
            if len(r) < 5: continue
            if r[0] != '': continue
            if r[1].strip() in ('', '#', 'TOTAL'): continue
            try:
                idx = int(r[1])
            except ValueError:
                continue
            fase = r[2]
            actv = r[3]
            try:
                horas = float(r[4].replace(',', '.'))
            except ValueError:
                continue
            rows.append({'fase': fase, 'actv': actv, 'horas': horas})
    return rows

def read_copiloto():
    rows = []
    with open(COPILOTOS, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        header_row = next(reader)
        for r in reader:
            if not r or len(r) < 6: continue
            if r[0] == 'TOTAL': continue
            try:
                mins = int(r[5])
            except ValueError:
                continue
            rows.append({'date': r[0], 'who': r[1], 'actv': r[4], 'min': mins})
    return rows

# ============================================================
# Generate detail pages
# ============================================================

pages_html = []
PAGE_NUM = 23  # starts after page 22

# ---- TRIAGEM POR VOZ ----
paulo_arthur = read_paulo_arthur()
thiago_triagem = read_grouped(TRIAGEM_THIAGO)

# Summary by collaborator
by_who_min = defaultdict(int)
for r in paulo_arthur:
    by_who_min[r['who']] += r['min']

# Thiago is in separate file, in hours
thiago_h = sum(x['horas'] for x in thiago_triagem)
thiago_min = round(thiago_h * 60)
by_who_min['Thiago'] = thiago_min

# Group Paulo+Arthur by activity category
by_actv = defaultdict(int)
for r in paulo_arthur:
    by_actv[r['actv']] += r['min']

# ============= TRIAGEM SUMMARY PAGE =============
sum_rows = "\n".join(
    f'      <tr><td><b>{who}</b></td><td class="num">{mins:,}</td><td class="num">{hm(mins)}</td><td class="num">R$ {fmt_brl(mins/60*250)}</td></tr>'
    for who, mins in sorted(by_who_min.items(), key=lambda x: -x[1])
)

# Phase grouping for Thiago
phase_groups = defaultdict(float)
for r in thiago_triagem:
    phase_groups[r['fase']] += r['horas']

phase_rows = "\n".join(
    f'      <tr><td><b>{fase}</b></td><td class="num">{horas:.1f}h</td><td class="num">R$ {fmt_brl(horas*250)}</td></tr>'
    for fase, horas in sorted(phase_groups.items())
)

pages_html.append(f'''
<!-- TRIAGEM · SUMMARY -->
<div class="page">
{header("VII · DETALHAMENTO · TRIAGEM POR VOZ")}
  <div class="kicker">VII · DETALHAMENTO · 01 · TRIAGEM POR VOZ</div>
  <h1>Triagem por Voz · <span class="italic-accent">resumo executado.</span></h1>
  <p class="lead" style="margin-top: 8px;">405h 10min consolidadas — 3 colaboradores · timesheet diário detalhado a seguir.</p>

  <div class="grid-3 mt-16">
    <div class="key-block">
      <div class="key-num">24.310</div>
      <div class="key-label">Minutos</div>
      <div class="key-sub">Janeiro a Maio 2026</div>
    </div>
    <div class="key-block">
      <div class="key-num">405h10</div>
      <div class="key-label">Horas trabalhadas</div>
      <div class="key-sub">Distribuídas entre 3 colaboradores</div>
    </div>
    <div class="key-block">
      <div class="key-num">R$ 101k</div>
      <div class="key-label">Total da frente</div>
      <div class="key-sub">R$ 101.291,67 a R$ 250/h</div>
    </div>
  </div>

  <h2 class="mt-24">Distribuição por colaborador</h2>
  <table class="data mt-8">
    <thead>
      <tr>
        <th>Colaborador</th>
        <th class="right">Minutos</th>
        <th class="right">Horas</th>
        <th class="right">Valor</th>
      </tr>
    </thead>
    <tbody>
{sum_rows}
      <tr class="total">
        <td><b>TOTAL TRIAGEM POR VOZ</b></td>
        <td class="num">{sum(by_who_min.values()):,}</td>
        <td class="num">{hm(sum(by_who_min.values()))}</td>
        <td class="num">R$ {fmt_brl(sum(by_who_min.values())/60*250)}</td>
      </tr>
    </tbody>
  </table>

  <h2 class="mt-24">Distribuição por fase · Thiago (consolidado por categoria)</h2>
  <table class="data mt-8">
    <thead>
      <tr>
        <th>Fase</th>
        <th class="right">Horas</th>
        <th class="right">Valor</th>
      </tr>
    </thead>
    <tbody>
{phase_rows}
      <tr class="subtotal">
        <td><b>SUBTOTAL THIAGO</b></td>
        <td class="num">{thiago_h:.1f}h</td>
        <td class="num">R$ {fmt_brl(thiago_h*250)}</td>
      </tr>
    </tbody>
  </table>

{footer(PAGE_NUM)}
</div>
''')
PAGE_NUM += 1

# ============= TRIAGEM THIAGO DETAIL =============
thiago_rows = ""
current_fase = ""
for r in thiago_triagem:
    if r['fase'] != current_fase:
        thiago_rows += f'      <tr class="fase"><td colspan="3">{r["fase"]}</td></tr>\n'
        current_fase = r['fase']
    thiago_rows += f'      <tr><td>{r["actv"]}</td><td class="num">{r["horas"]:.1f}h</td><td class="num">R$ {fmt_brl(r["horas"]*250)}</td></tr>\n'

pages_html.append(f'''
<!-- TRIAGEM · DETALHE THIAGO -->
<div class="page">
{header("VII · DETALHAMENTO · TRIAGEM · THIAGO")}
  <div class="kicker">VII · DETALHAMENTO · TRIAGEM · COLABORADOR THIAGO</div>
  <h1>Triagem · <span class="italic-accent">Thiago.</span></h1>
  <p class="lead" style="margin-top: 8px;">80,0 horas · 28 atividades agrupadas por fase.</p>

  <table class="data cron-table mt-16">
    <thead>
      <tr>
        <th>Atividade</th>
        <th class="right" style="width: 70px;">Horas</th>
        <th class="right" style="width: 110px;">Valor</th>
      </tr>
    </thead>
    <tbody>
{thiago_rows}      <tr class="total">
        <td><b>TOTAL THIAGO · TRIAGEM</b></td>
        <td class="num">{thiago_h:.1f}h</td>
        <td class="num">R$ {fmt_brl(thiago_h*250)}</td>
      </tr>
    </tbody>
  </table>

{footer(PAGE_NUM)}
</div>
''')
PAGE_NUM += 1

# ============= TRIAGEM PAULO + ARTHUR · DAILY DETAIL =============
# Split into multiple pages, ~28 rows per page
PER_PAGE = 20
def chunk(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i+n]

for idx, chunk_rows in enumerate(chunk(paulo_arthur, PER_PAGE), 1):
    rows_html = ""
    for r in chunk_rows:
        rows_html += f'      <tr><td class="date">{r["date"]}</td><td class="who">{r["who"]}</td><td>{r["actv"]}</td><td class="min">{r["min"]} min</td></tr>\n'

    last = "last" if idx == (len(paulo_arthur) + PER_PAGE - 1) // PER_PAGE else ""
    total_label = ""
    if idx == (len(paulo_arthur) + PER_PAGE - 1) // PER_PAGE:
        total_min = sum(r['min'] for r in paulo_arthur)
        total_label = f'      <tr class="total"><td colspan="3"><b>SUBTOTAL · PAULO + ARTHUR</b></td><td class="min" style="color: var(--white);">{total_min:,} min · {hm(total_min)}</td></tr>'

    pages_html.append(f'''
<!-- TRIAGEM · DETALHE PAULO+ARTHUR · {idx} -->
<div class="page">
{header(f"VII · DETALHAMENTO · TRIAGEM · TIMESHEET {idx}")}
  <div class="kicker">VII · DETALHAMENTO · TRIAGEM · TIMESHEET PAULO + ARTHUR · {idx}/{(len(paulo_arthur)+PER_PAGE-1)//PER_PAGE}</div>
  <h1>Timesheet · <span class="italic-accent">Triagem.</span></h1>
  <p class="lead" style="margin-top: 8px;">Detalhamento diário das atividades — Paulo &amp; Arthur · 325h 10min.</p>

  <table class="detail mt-16">
    <thead>
      <tr>
        <th style="width: 75px;">Data</th>
        <th style="width: 70px;">Quem</th>
        <th>Atividade</th>
        <th class="right" style="width: 80px;">Tempo</th>
      </tr>
    </thead>
    <tbody>
{rows_html}{total_label}
    </tbody>
  </table>

{footer(PAGE_NUM)}
</div>
''')
    PAGE_NUM += 1

# ============= AUDITORIA · THIAGO DETAIL =============
audit_rows = read_grouped(AUDITORIA)
audit_total_h = sum(r['horas'] for r in audit_rows)
phase_groups_a = defaultdict(float)
for r in audit_rows:
    phase_groups_a[r['fase']] += r['horas']

audit_html = ""
current_fase = ""
for r in audit_rows:
    if r['fase'] != current_fase:
        audit_html += f'      <tr class="fase"><td colspan="3">{r["fase"]}</td></tr>\n'
        current_fase = r['fase']
    audit_html += f'      <tr><td>{r["actv"]}</td><td class="num">{r["horas"]:.1f}h</td><td class="num">R$ {fmt_brl(r["horas"]*250)}</td></tr>\n'

phase_rows_a = "\n".join(
    f'      <tr><td><b>{fase}</b></td><td class="num">{horas:.1f}h</td><td class="num">R$ {fmt_brl(horas*250)}</td></tr>'
    for fase, horas in sorted(phase_groups_a.items())
)

pages_html.append(f'''
<!-- AUDITORIA · DETAIL -->
<div class="page">
{header("VII · DETALHAMENTO · AUDITORIA PACK")}
  <div class="kicker">VII · DETALHAMENTO · 02 · AUDITORIA PACK</div>
  <h1>Auditoria PACK · <span class="italic-accent">resumo executado.</span></h1>
  <p class="lead" style="margin-top: 8px;">90 horas consolidadas — discovery, configuração, validação e gestão.</p>

  <div class="grid-3 mt-16">
    <div class="key-block">
      <div class="key-num">5.400</div>
      <div class="key-label">Minutos</div>
      <div class="key-sub">Frente experimental — POC</div>
    </div>
    <div class="key-block">
      <div class="key-num">90h</div>
      <div class="key-label">Horas trabalhadas</div>
      <div class="key-sub">Colaborador: Thiago</div>
    </div>
    <div class="key-block">
      <div class="key-num">R$ 22,5k</div>
      <div class="key-label">Total da frente</div>
      <div class="key-sub">R$ 22.500,00 a R$ 250/h</div>
    </div>
  </div>

  <h2 class="mt-24">Distribuição por fase</h2>
  <table class="data mt-8">
    <thead><tr><th>Fase</th><th class="right">Horas</th><th class="right">Valor</th></tr></thead>
    <tbody>
{phase_rows_a}
      <tr class="total">
        <td><b>TOTAL AUDITORIA PACK</b></td>
        <td class="num">{audit_total_h:.1f}h</td>
        <td class="num">R$ {fmt_brl(audit_total_h*250)}</td>
      </tr>
    </tbody>
  </table>

{footer(PAGE_NUM)}
</div>
''')
PAGE_NUM += 1

pages_html.append(f'''
<!-- AUDITORIA · DETALHE ATIVIDADES -->
<div class="page">
{header("VII · DETALHAMENTO · AUDITORIA · ATIVIDADES")}
  <div class="kicker">VII · DETALHAMENTO · AUDITORIA · ATIVIDADES POR FASE</div>
  <h1>Auditoria · <span class="italic-accent">atividades.</span></h1>
  <p class="lead" style="margin-top: 8px;">20 atividades distribuídas em 6 fases.</p>

  <table class="data cron-table mt-16">
    <thead>
      <tr>
        <th>Atividade</th>
        <th class="right" style="width: 70px;">Horas</th>
        <th class="right" style="width: 110px;">Valor</th>
      </tr>
    </thead>
    <tbody>
{audit_html}      <tr class="total">
        <td><b>TOTAL · THIAGO · AUDITORIA</b></td>
        <td class="num">{audit_total_h:.1f}h</td>
        <td class="num">R$ {fmt_brl(audit_total_h*250)}</td>
      </tr>
    </tbody>
  </table>

{footer(PAGE_NUM)}
</div>
''')
PAGE_NUM += 1

# ============= COPILOTOS · DETAIL =============
copilot_rows = read_copiloto()
copilot_total_min = sum(r['min'] for r in copilot_rows)
by_who_c = defaultdict(int)
for r in copilot_rows:
    by_who_c[r['who']] += r['min']

cop_rows_html = ""
for r in copilot_rows:
    cop_rows_html += f'      <tr><td class="date">{r["date"]}</td><td class="who">{r["who"]}</td><td>{r["actv"]}</td><td class="min">{r["min"]} min</td></tr>\n'

who_rows_c = "\n".join(
    f'      <tr><td><b>{who}</b></td><td class="num">{mins:,}</td><td class="num">{hm(mins)}</td><td class="num">R$ {fmt_brl(mins/60*250)}</td></tr>'
    for who, mins in sorted(by_who_c.items(), key=lambda x: -x[1])
)

pages_html.append(f'''
<!-- COPILOTOS · DETAIL -->
<div class="page">
{header("VII · DETALHAMENTO · COPILOTOS")}
  <div class="kicker">VII · DETALHAMENTO · 03 · COPILOTOS DE IA</div>
  <h1>Copilotos · <span class="italic-accent">resumo executado.</span></h1>
  <p class="lead" style="margin-top: 8px;">26h 45min consolidadas — kick-off, documentação e análise.</p>

  <div class="grid-3 mt-16">
    <div class="key-block">
      <div class="key-num">1.605</div>
      <div class="key-label">Minutos</div>
      <div class="key-sub">Março a Maio 2026</div>
    </div>
    <div class="key-block">
      <div class="key-num">26h45</div>
      <div class="key-label">Horas trabalhadas</div>
      <div class="key-sub">2 colaboradores</div>
    </div>
    <div class="key-block">
      <div class="key-num">R$ 6,7k</div>
      <div class="key-label">Total da frente</div>
      <div class="key-sub">R$ 6.687,50 a R$ 250/h</div>
    </div>
  </div>

  <h2 class="mt-24">Distribuição por colaborador</h2>
  <table class="data mt-8">
    <thead>
      <tr>
        <th>Colaborador</th>
        <th class="right">Minutos</th>
        <th class="right">Horas</th>
        <th class="right">Valor</th>
      </tr>
    </thead>
    <tbody>
{who_rows_c}
      <tr class="total">
        <td><b>TOTAL COPILOTOS</b></td>
        <td class="num">{copilot_total_min:,}</td>
        <td class="num">{hm(copilot_total_min)}</td>
        <td class="num">R$ {fmt_brl(copilot_total_min/60*250)}</td>
      </tr>
    </tbody>
  </table>

  <h2 class="mt-24">Timesheet detalhado</h2>
  <table class="detail mt-8">
    <thead>
      <tr>
        <th style="width: 75px;">Data</th>
        <th style="width: 100px;">Quem</th>
        <th>Atividade</th>
        <th class="right" style="width: 80px;">Tempo</th>
      </tr>
    </thead>
    <tbody>
{cop_rows_html}
      <tr class="total"><td colspan="3"><b>TOTAL · COPILOTOS DE IA</b></td><td class="min" style="color: var(--white);">{copilot_total_min:,} min · {hm(copilot_total_min)}</td></tr>
    </tbody>
  </table>

{footer(PAGE_NUM)}
</div>
''')
PAGE_NUM += 1

# ============= ORÇAMENTO FUTURO · DETAIL =============
# Detailed table per cronograma
future_html = f'''
<!-- ORÇAMENTO FUTURO · DETAIL -->
<div class="page">
{header("VII · ORÇAMENTO FUTURO · DETALHAMENTO")}
  <div class="kicker">VII · ORÇAMENTO FUTURO · DETALHAMENTO</div>
  <h1>Futuro · <span class="italic-accent">planejado.</span></h1>
  <p class="lead" style="margin-top: 8px;">Cálculo direto: <b>horas dos cronogramas × R$ 250/h</b>.</p>

  <table class="data mt-24">
    <thead>
      <tr>
        <th>Frente</th>
        <th>Cronograma</th>
        <th class="right">Horas Doutor-AI</th>
        <th class="right">Valor/hora</th>
        <th class="right">Valor estimado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><b>01 · Triagem Clínica por Voz</b></td>
        <td>12 semanas · 7 fases · 38 tarefas</td>
        <td class="num">376h</td>
        <td class="num">R$ 250,00</td>
        <td class="num">R$ 94.000,00</td>
      </tr>
      <tr>
        <td><b>02 · Auditoria PACK (via SFTP)</b></td>
        <td>2 semanas · 6 fases · 5 tarefas</td>
        <td class="num">46h</td>
        <td class="num">R$ 250,00</td>
        <td class="num">R$ 11.500,00</td>
      </tr>
      <tr>
        <td><b>03 · Copilotos Telemedicina</b></td>
        <td>7 semanas · 7 fases · 11 tarefas</td>
        <td class="num">226h</td>
        <td class="num">R$ 250,00</td>
        <td class="num">R$ 56.500,00</td>
      </tr>
      <tr class="total">
        <td colspan="2"><b>TOTAL ORÇAMENTO FUTURO</b></td>
        <td class="num">648h</td>
        <td class="num">R$ 250,00</td>
        <td class="num">R$ 162.000,00</td>
      </tr>
    </tbody>
  </table>

  <h2 class="mt-24">Composição por frente · futuro</h2>
  <div class="grid-3 mt-16">
    <div class="key-block" style="border-left-color: var(--blue-mid);">
      <div class="key-num">58,0%</div>
      <div class="key-label">Triagem por Voz</div>
      <div class="key-sub">R$ 94.000,00 · 376h</div>
    </div>
    <div class="key-block" style="border-left-color: var(--blue-brand);">
      <div class="key-num">7,1%</div>
      <div class="key-label">Auditoria PACK</div>
      <div class="key-sub">R$ 11.500,00 · 46h</div>
    </div>
    <div class="key-block" style="border-left-color: var(--green);">
      <div class="key-num">34,9%</div>
      <div class="key-label">Copilotos</div>
      <div class="key-sub">R$ 56.500,00 · 226h</div>
    </div>
  </div>

  <div class="callout mt-24">
    <div class="mono-tag" style="color: var(--blue-brand); margin-bottom: 6px;">OBSERVAÇÕES</div>
    <p class="body-text"><b>Auditoria.</b> Esta frente avaliou dois modelos operacionais — <b>via API</b> e <b>via SFTP</b>. O orçamento futuro detalhado corresponde ao cenário <b>SFTP</b> (46h). Caso o modelo via API seja escolhido, a estimativa é equivalente (46h · R$ 11.500). Pode ainda haver componente variável por evento/auditoria processada, a ser definido em proposta complementar.</p>
    <p class="body-text" style="margin-top: 8px;"><b>Valores preliminares.</b> Podem ser ajustados conforme arquitetura final, responsabilidades entre times e ajustes identificados durante testes.</p>
  </div>

{footer(PAGE_NUM)}
</div>
'''
pages_html.append(future_html)
PAGE_NUM += 1

# ============= ENCERRAMENTO =============
pages_html.append(f'''
<!-- ENCERRAMENTO -->
<div class="closing">
  <div style="position: absolute; top: 24mm; left: 22mm; font-family: var(--font-mono); font-size: 11px; letter-spacing: .14em; color: var(--blue-light);">▸  ENCERRAMENTO</div>

  <div style="text-align: center;">
    <h1 class="hero-closing">Juntos, construindo<br>a <i class="accent">Saúde do Futuro.</i></h1>
    <div class="divider"></div>
    <div class="signature"><b>Doutor-AI</b>  ×  <b>TopMed</b></div>

    <div class="frentes-row">
      <div class="frente-pill">
        <h4>🔬  POC Auditoria PACK</h4>
        <p>EXECUÇÃO 12–13/03 · CRONOGRAMA SFTP</p>
      </div>
      <div class="frente-pill">
        <h4>🎤  POC Triagem por Voz</h4>
        <p>POC EM EXECUÇÃO · CRONOGRAMA N2</p>
      </div>
      <div class="frente-pill">
        <h4>🚀  Copilotos Telemedicina</h4>
        <p>KICK-OFF REALIZADO · CRONOGRAMA</p>
      </div>
    </div>
  </div>

  <div class="closing-footer">doutor-ai.com  ·  São Paulo · Maio 2026  ·  Andre Chade</div>
</div>
''')

# ============================================================
# Append to doc.html
# ============================================================
doc = Path("/home/user/-/build/doc.html").read_text()
insert_marker = "</body>"
new_content = "\n".join(pages_html) + "\n\n</body>"
doc = doc.replace(insert_marker, new_content, 1)
Path("/home/user/-/build/doc.html").write_text(doc)

# Print total page count info
print(f"Total pages appended: {len(pages_html)}")
print(f"Final page number: {PAGE_NUM - 1}")
print(f"Paulo+Arthur rows: {len(paulo_arthur)}")
print(f"Thiago triagem rows: {len(thiago_triagem)}")
print(f"Auditoria rows: {len(audit_rows)}")
print(f"Copiloto rows: {len(copilot_rows)}")
