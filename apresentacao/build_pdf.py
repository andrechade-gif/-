# -*- coding: utf-8 -*-
"""
Evidia · Detalhamento da Plataforma
Material gerado seguindo o Sistema de Identidade Visual Doutor-AI (Branding Book v1.0).
"""
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image

FROOT = "/tmp/fonts"
IMG   = "/tmp/imgopt"       # optimized screenshots e-000..e-052
MARKB = "/tmp/mark_blue.png"
MARKW = "/tmp/mark_white.png"
OUT   = "/home/user/-/apresentacao/Evidia_Detalhamento_da_Plataforma.pdf"

# ---------- fonts ----------
F = {
 "black":"Inter-Black","xbold":"Inter-ExtraBold","bold":"Inter-Bold",
 "semi":"Inter-SemiBold","med":"Inter-Medium","reg":"Inter-Regular",
 "it":"Inter-Italic","bit":"Inter-BoldItalic","xbit":"Inter-ExtraBoldItalic",
 "mono":"JBMono","monomed":"JBMono-Med",
}
pdfmetrics.registerFont(TTFont("Inter-Black",   f"{FROOT}/Inter-Black.ttf"))
pdfmetrics.registerFont(TTFont("Inter-ExtraBold",f"{FROOT}/Inter-ExtraBold.ttf"))
pdfmetrics.registerFont(TTFont("Inter-Bold",    f"{FROOT}/Inter-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Inter-SemiBold",f"{FROOT}/Inter-SemiBold.ttf"))
pdfmetrics.registerFont(TTFont("Inter-Medium",  f"{FROOT}/Inter-Medium.ttf"))
pdfmetrics.registerFont(TTFont("Inter-Regular", f"{FROOT}/Inter-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Inter-Italic",  f"{FROOT}/Inter-Italic.ttf"))
pdfmetrics.registerFont(TTFont("Inter-BoldItalic",f"{FROOT}/Inter-BoldItalic.ttf"))
pdfmetrics.registerFont(TTFont("Inter-ExtraBoldItalic",f"{FROOT}/Inter-ExtraBoldItalic.ttf"))
pdfmetrics.registerFont(TTFont("JBMono",        f"{FROOT}/JetBrainsMono-Regular.ttf"))
pdfmetrics.registerFont(TTFont("JBMono-Med",    f"{FROOT}/JetBrainsMono-Medium.ttf"))

# ---------- palette ----------
def hx(h):
    h=h.lstrip("#"); return (int(h[0:2],16)/255,int(h[2:4],16)/255,int(h[4:6],16)/255)
BLUE_DEEP=hx("0B3D6B"); BLUE=hx("0071BC"); BLUE_MID=hx("3A8FE0")
BLUE_LIGHT=hx("8FC0EA"); BLUE_PALE=hx("E0F1FB")
WHITE=hx("FFFFFF"); PAPER=hx("FAFAFA"); G100=hx("F1F2F4"); G300=hx("D1D5DB")
G500=hx("9CA3AF"); CHUMBO=hx("1A1F2E"); G700=hx("4B5563")
PURPLE=hx("6366F1"); GREEN=hx("10B981"); AMBER=hx("F59E0B"); RED=hx("EF4444")

PAGE_W,PAGE_H=A4
ML=48; MR=48; CW=PAGE_W-ML-MR
c=canvas.Canvas(OUT,pagesize=A4)
c.setTitle("Evidia · Detalhamento da Plataforma")
c.setAuthor("Doutor-AI")

# ---------- helpers ----------
def sw(t,f,s): return pdfmetrics.stringWidth(t,f,s)

def text(x,y,t,f,s,col,tracking=0,align="l"):
    if tracking:
        if align=="r": x-= (sw(t,f,s)+tracking*(len(t)-1))
        elif align=="c": x-=(sw(t,f,s)+tracking*(len(t)-1))/2
        c.setFont(f,s); c.setFillColorRGB(*col)
        cx=x
        for ch in t:
            c.drawString(cx,y,ch); cx+=sw(ch,f,s)+tracking
        return
    c.setFont(f,s); c.setFillColorRGB(*col)
    if align=="r": c.drawRightString(x,y,t)
    elif align=="c": c.drawCentredString(x,y,t)
    else: c.drawString(x,y,t)

def kicker(x,y,t,col=BLUE,size=7.6,prefix="▸  "):
    text(x,y,(prefix+t).upper(),F["monomed"],size,col,tracking=1.6)

def wrap(t,f,s,maxw):
    words=t.split(); lines=[]; cur=""
    for w in words:
        test=(cur+" "+w).strip()
        if sw(test,f,s)<=maxw: cur=test
        else:
            if cur: lines.append(cur)
            cur=w
    if cur: lines.append(cur)
    return lines

def para(x,y,t,f,s,col,maxw,leading):
    for ln in wrap(t,f,s,maxw):
        text(x,y,ln,f,s,col); y-=leading
    return y

# rich paragraph: supports **bold** and *italic* and `mono` inline spans
import re
def rich(x,y,t,maxw,base=("Inter-Regular",9.4),col=G700,leading=14.5,bold="Inter-SemiBold",
         boldcol=CHUMBO,ital="Inter-Italic",italcol=BLUE,mono="JBMono",monocol=BLUE_DEEP):
    bf,bs=base
    toks=re.split(r'(\*\*.+?\*\*|\*.+?\*|`.+?`)',t)
    # build word list with style
    items=[]
    for tk in toks:
        if not tk: continue
        if tk.startswith("**"): f,fc,word=bold,boldcol,tk[2:-2]
        elif tk.startswith("*"): f,fc,word=ital,italcol,tk[1:-1]
        elif tk.startswith("`"): f,fc,word=mono,monocol,tk[1:-1]
        else: f,fc,word=bf,col,tk
        for i,w in enumerate(word.split(" ")):
            if w=="" : continue
            items.append((w,f,fc))
    sp=sw(" ",bf,bs)
    cx,line=x,[]
    def flush(line,yy):
        xx=x
        for (w,f,fc) in line:
            fs=bs if f!=mono else bs-0.6
            c.setFont(f,fs); c.setFillColorRGB(*fc); c.drawString(xx,yy,w)
            xx+=sw(w,f,fs)+sp
        return
    curw=0
    for (w,f,fc) in items:
        fs=bs if f!=mono else bs-0.6
        ww=sw(w,f,fs)
        if curw+ww> maxw and line:
            flush(line,y); y-=leading; line=[]; curw=0
        line.append((w,f,fc)); curw+=ww+sp
    if line: flush(line,y); y-=leading
    return y

def bullet(x,y,t,maxw,leading=14.0,size=9.2,col=G700,marker=BLUE):
    # square pixel marker echoing the logo
    c.setFillColorRGB(*marker); c.rect(x,y+1.4,3.4,3.4,fill=1,stroke=0)
    tx=x+11
    yy=rich(tx,y,t,maxw-11,base=("Inter-Regular",size),col=col,leading=leading)
    return yy

def rrect(x,y,w,h,r,fill=None,stroke=None,sw_=1):
    if fill: c.setFillColorRGB(*fill)
    if stroke: c.setStrokeColorRGB(*stroke); c.setLineWidth(sw_)
    c.roundRect(x,y,w,h,r,stroke=1 if stroke else 0,fill=1 if fill else 0)

def img_dims(p):
    im=Image.open(p); return im.size

# ---------- chrome (header/footer) ----------
SECTION=""  # current section label for header
def chrome(pageno,total):
    # header
    if os.path.exists(MARKB):
        iw,ih=img_dims(MARKB); h=11; w=h*iw/ih
        c.drawImage(MARKB,ML,PAGE_H-40-h,width=w,height=h,mask='auto')
        text(ML+w+7,PAGE_H-40-h+2,"Doutor-AI",F["bold"],9,CHUMBO)
        text(ML+w+7+sw("Doutor-AI",F["bold"],9)+5,PAGE_H-40-h+2,"· Evidia",F["med"],9,G500)
    text(PAGE_W-MR,PAGE_H-40-9+2,SECTION.upper(),F["mono"],6.8,G500,tracking=1.3,align="r")
    c.setStrokeColorRGB(*G300); c.setLineWidth(0.6); c.line(ML,PAGE_H-58,PAGE_W-MR,PAGE_H-58)
    # footer
    c.setStrokeColorRGB(*G300); c.setLineWidth(0.6); c.line(ML,46,PAGE_W-MR,46)
    text(ML,36,"EVIDIA · DETALHAMENTO DA PLATAFORMA",F["mono"],6.5,G500,tracking=1.2)
    text(PAGE_W-MR,36,f"{pageno:02d} / {total:02d}",F["monomed"],7,CHUMBO,tracking=1.0,align="r")

# ---------- screenshot card ----------
def screen_card(x,top,w,imgpath):
    iw,ih=img_dims(imgpath)
    inner=w-12
    h_img=inner*ih/iw
    card_h=h_img+12
    y=top-card_h
    # shadow
    c.setFillColorRGB(*G300)
    c.roundRect(x+2,y-2.5,w,card_h,7,stroke=0,fill=1)
    # card
    rrect(x,y,w,card_h,7,fill=WHITE,stroke=G300,sw_=0.8)
    # clipped rounded image
    c.saveState()
    p=c.beginPath(); p.roundRect(x+6,y+6,inner,h_img,4); c.clipPath(p,stroke=0,fill=0)
    c.drawImage(imgpath,x+6,y+6,width=inner,height=h_img,mask='auto')
    c.restoreState()
    c.setStrokeColorRGB(*G300); c.setLineWidth(0.6); c.roundRect(x+6,y+6,inner,h_img,4,stroke=1,fill=0)
    return y  # bottom y of card

# ---------- agents callout ----------
def agents_box(x,y,w,agents,title="AGENTES EM AÇÃO"):
    # measure
    line_h=12.0
    lines=[]
    for a,role in agents:
        lines.append((a,role))
    box_h=20+len(lines)*line_h+8
    yb=y-box_h
    rrect(x,yb,w,box_h,5,fill=BLUE_PALE,stroke=None)
    c.setFillColorRGB(*BLUE); c.rect(x,yb,2.6,box_h,fill=1,stroke=0)
    text(x+12,y-13,title,F["monomed"],6.8,BLUE,tracking=1.4)
    yy=y-26
    for a,role in lines:
        text(x+12,yy,a,F["monomed"],7.6,BLUE_DEEP)
        aw=sw(a,F["monomed"],7.6)
        text(x+12+aw+8,yy,"· "+role,F["reg"],8.2,G700)
        yy-=line_h
    return yb

# =====================================================================
# CONTENT
# =====================================================================
def E(idx): return f"{IMG}/e-{idx:03d}.jpg"

# Each screen: dict(img, kicker, title, key(italic word in title), sub, crumb, body[list], bullets[list], agents[list of (id,role)] or None)
PART1=[]
PART2=[]
PART3=[]

# ---- PART I — A JORNADA OPERACIONAL ----
PART1=[
 dict(img=E(0), n="01", title="Agenda", key="Agenda",
   sub="Agendamento ambulatorial com visões de calendário, lista e painel.",
   crumb="doutor-ai.com / Operações / Agenda",
   body=["A porta de entrada da jornada. A **Agenda** organiza toda a operação ambulatorial em um calendário único, com indicadores de *consultas de hoje*, *próximas consultas* e *consultas realizadas* sempre à vista. As marcações podem ser visualizadas em grade, lista ou calendário, por profissional, especialidade e unidade."],
   bullets=["Cartões de produtividade em tempo real no topo da tela.",
            "Criação de marcação em um clique com `Nova Consulta`, já vinculada ao convênio do paciente.",
            "Base de tudo o que vem depois: cada agendamento alimenta check-in, autorização e prontuário."],
   agents=None),

 dict(img=E(1), n="02", title="Check-in", key="Check-in",
   sub="Recepção e cadastro de chegada com leitura automática da carteirinha.",
   crumb="doutor-ai.com / Operações / Check-in",
   body=["No **Check-in** a recepção confirma a chegada do paciente e a fila se organiza sozinha: *previstos hoje*, *check-in concluído*, *em fila* e *não compareceram* (com previsão de no-show). O botão `Ler Carteirinha (OCR)` captura os dados do convênio por imagem, eliminando digitação."],
   bullets=["Leitura por OCR da carteirinha — número, plano e validade preenchidos automaticamente.",
            "Status de cada paciente (previsto, em check-in, concluído) e passagem direta para a Recepção.",
            "Previsão de não comparecimento para a equipe agir antes do horário."],
   agents=[("ocr-carteirinha","extrai dados do convênio a partir da foto do cartão")]),

 dict(img=E(2), n="03", title="Recepção · Autorização", key="Autorização",
   sub="Elegibilidade e autorização junto à operadora, decididas por IA.",
   crumb="doutor-ai.com / Operações / Recepção",
   body=["É aqui que a plataforma conversa com a **operadora**. O agente de elegibilidade lê as regras do contrato e decide, em segundos, o que pode ser liberado — no exemplo apresentado, **82,4% das autorizações saem sem intervenção humana**, com tempo médio de poucos minutos entre a chegada e a liberação.",
         "Os pedidos fluem por colunas — *aguardando*, *em autorização*, *liberados* e *negados*. Quando há uma negativa (ex.: carência não cumprida), o sistema explica o motivo e oferece os caminhos: solicitar exceção, cobrança particular ou reagendar."],
   bullets=["Validação de elegibilidade e cobertura contra as regras de cada operadora.",
            "Justificativa clara em cada decisão (carência, cobertura, pagamento direto).",
            "Fluxo de exceção com registro de justificativa clínica para casos limítrofes."],
   agents=[("validador-elegibilidade-convenio","cruza o atendimento com as regras contratuais e decide a autorização")]),

 dict(img=E(3), n="04", title="Consulta", key="Consulta",
   sub="A lista de atendimentos do profissional, do agendamento ao encerramento.",
   crumb="doutor-ai.com / Operações / Consulta",
   body=["A **Consulta** reúne os atendimentos do profissional com paciente, especialidade, fluxo, data/hora e status (*agendada*, *encerrada*). Cada linha abre o atendimento e dá acesso ao prontuário e ao copiloto clínico."],
   bullets=["Visão única de todos os atendimentos, com filtro por médico e especialidade.",
            "Status do atendimento (agendada, encerrada) sempre visível.",
            "Um clique em `Abrir` leva ao prontuário e ao copiloto da consulta."],
   agents=None),

 dict(img=E(5), n="05", title="Prontuário · Portal do Paciente", key="Prontuário",
   sub="A visão 360° do paciente — clínica, documentos, exames e convênio.",
   crumb="doutor-ai.com / Operações / Pacientes · 360°",
   body=["O **Prontuário** consolida tudo sobre o paciente em uma única tela 360°: *problem list* com CID, alergias e contraindicações, vacinas em dia, medicações ativas e adesão medicamentosa. No topo, indicadores de consultas, tarefas pendentes, alertas ativos e adesão.",
         "As abas organizam *resumo clínico*, *documentos*, *exames*, *prescrições ativas*, *tarefas*, *histórico*, *discussões* e *convênio* — a memória clínica completa que abastece o copiloto e a auditoria."],
   bullets=["Lista de problemas codificada (CID-10) com data de início e status.",
            "Alergias, contraindicações e interações sempre visíveis para o médico.",
            "Medicações ativas com posologia e adesão dos últimos 30 dias."],
   agents=None),

 dict(img=E(4), n="06", title="Copiloto do Médico · Check-Out", key="Copiloto",
   sub="O coração clínico: sugestões de conduta e protocolos a cada atendimento.",
   crumb="doutor-ai.com / Operações / Checkout",
   body=["Esta é a tela que diferencia a plataforma. Ao encerrar o atendimento, o **Copiloto** lê o contexto clínico e propõe a conduta — exames, prescrições e encaminhamentos — sempre **ancorada em protocolo** e com *justificativa* e *evidência* rastreáveis. No exemplo, 6 sugestões de conduta, todas com origem em protocolo clínico (ex.: `Protocolo_vascular_002`).",
         "O médico aceita, ajusta ou recusa cada item — inclusive por chat em linguagem natural (\"Receita de Dipirona 500mg 6/6h\"). Alertas de **interação medicamentosa** e de **pertinência** aparecem em tempo real, e tudo é assinado digitalmente com validade **ICP-Brasil**."],
   bullets=["Sugestões de exames, prescrições e encaminhamentos a partir do prontuário e do protocolo.",
            "Cada sugestão traz *justificativa* + *evidência* (protocolo-fonte) — nada é caixa-preta.",
            "Alertas de interação medicamentosa e de pertinência antes de fechar a conduta.",
            "Assinatura digital ICP-Brasil de todos os documentos do encerramento."],
   agents=[("sugestor-condutas","gera exames, prescrições e encaminhamentos a partir do prontuário"),
           ("validador-pertinencia","confere se cada item tem respaldo no protocolo aplicado"),
           ("validador-interacao-medicamentosa","cruza prescrições novas com medicações em uso (DDI)")]),

 dict(img=E(7), n="07", title="Codificação", key="Codificação",
   sub="CID, TUSS e CBHPM sugeridos por IA, com confiança e auto-aprovação.",
   crumb="doutor-ai.com / Operações / Codificação",
   body=["A **Codificação** transforma o prontuário em códigos prontos para faturar. Os agentes propõem CID, TUSS e CBHPM com **nível de confiança** (no exemplo, média de 85%); os códigos de alta confiança e sem conflito são **auto-aprovados**, e os demais vão para revisão. Conflitos (ex.: CID × TUSS incompatíveis) são sinalizados.",
         "Quando o codificador humano altera um código, a justificativa é registrada e **retroalimenta o re-treino dos agentes** — o sistema fica mais preciso a cada mês."],
   bullets=["Sugestão de CID, TUSS e CBHPM com score de confiança por linha.",
            "Auto-aprovação dos códigos de alta confiança; revisão humana só onde importa.",
            "Detecção de conflitos de codificação antes do envio.",
            "Cada correção humana vira aprendizado para os agentes."],
   agents=[("codificador-cid","propõe o CID a partir do prontuário"),
           ("codificador-tuss","propõe procedimentos TUSS"),
           ("validador-cbhpm","valida a compatibilidade CBHPM × CID × TUSS")]),

 dict(img=E(8), n="08", title="Auditoria Operacional", key="Auditoria",
   sub="Glosa preventiva: a conta é revisada antes de sair para o convênio.",
   crumb="doutor-ai.com / Operações / Auditoria · Glosa preventiva",
   body=["Antes de qualquer envio, a **Auditoria Operacional** calcula o **risco de glosa** de cada atendimento com um score preditivo de IA e verifica a completude da documentação. Atendimentos *OK* seguem; casos de *atenção* e *crítico* são retidos com o motivo potencial explícito (falta de laudo, hipótese que não justifica o procedimento, etc.)."],
   bullets=["Score preditivo de glosa por atendimento, com risco médio do dia.",
            "Checagem de documentação (laudos, questionários) antes do faturamento.",
            "Bloqueio de envio com motivo claro — reduz glosa na origem."],
   agents=[("auditor-glosa-preventiva","estima o risco de glosa e identifica o que falta antes do envio")]),

 dict(img=E(9), n="09", title="Auditoria Operacional · Bloqueio", key="Bloqueio",
   sub="O detalhe acionável de cada caso retido, com as opções de correção.",
   crumb="doutor-ai.com / Operações / Auditoria · Detalhe",
   body=["Ao abrir um caso crítico, a plataforma mostra exatamente **por que** o envio foi bloqueado e **o que fazer**. No exemplo, espirometria com risco de 71%: o agente aponta que o CID registrado não justifica o exame isolado, que a documentação está em 50% e que o convênio exige autorização prévia.",
         "As ações ficam a um clique: *corrigir e revalidar*, *voltar para o médico* ou *cancelar envio* — sempre com decisão humana no comando."],
   bullets=["Diagnóstico do bloqueio em linguagem clara, item a item.",
            "Recomendações objetivas de correção (revisar CID, anexar laudo, pedir guia).",
            "Ações de correção, devolução ao médico ou cancelamento com trilha de auditoria."],
   agents=[("auditor-glosa-preventiva","detalha o motivo do bloqueio e sugere a correção")]),

 dict(img=E(10), n="10", title="Faturamento → TOTVS", key="TOTVS",
   sub="Consolidação de guias e lotes — os dados seguem ao TOTVS para faturar.",
   crumb="doutor-ai.com / Operações / Faturamento",
   body=["Consolida **guias, lotes, glosas e recursos** por convênio e período, com a foto financeira do mês (faturado, glosa estimada, recebido, em recurso). A partir daqui, os **dados estruturados são enviados ao TOTVS**, responsável pela integração com as operadoras e pela **emissão do faturamento**.",
         "Ou seja: a conta chega **limpa, codificada e auditada** ao TOTVS — que executa o faturamento junto às operadoras."],
   bullets=["Organização de lotes por convênio, período e status (enviado, processado, pago).",
            "Visão de glosa estimada e de casos em recurso.",
            "Entrega dos dados clínicos e de cobrança, já auditados, ao **TOTVS** para o faturamento."],
   agents=[("exportador-tiss-totvs","estrutura e envia guias/lotes ao TOTVS no padrão TISS")]),

 dict(img=E(6), n="11", title="Navegação Inteligente", key="Navegação",
   sub="A régua de relacionamento que acompanha o paciente após a consulta.",
   crumb="doutor-ai.com / Operações / Navegação",
   body=["A **Navegação** é a continuidade do cuidado: tarefas geradas automaticamente após o atendimento — exames a realizar, encaminhamentos, orientações — com prazo, prioridade e responsável. O painel mostra *hoje*, *atrasadas*, *pendentes*, *em andamento* e a *taxa de conclusão*."],
   bullets=["Tarefas criadas pelas réguas de relacionamento a partir da conduta.",
            "Priorização e atribuição por responsável, com prazos visíveis.",
            "Taxa de conclusão como indicador de adesão e fechamento do ciclo de cuidado."],
   agents=[("motor-reguas","dispara tarefas de acompanhamento conforme a conduta registrada")]),

 dict(img=E(11), n="12", title="Discussões Clínicas", key="Discussões",
   sub="Discussão de casos entre a equipe, vinculada ao prontuário.",
   crumb="doutor-ai.com / Operações / Discussões",
   body=["As **Discussões Clínicas** trazem a deliberação da equipe para dentro da plataforma: casos organizados em colunas, com thread de mensagens vinculado ao paciente e ao contexto clínico. Segundas opiniões, condutas e dúvidas ficam registradas no histórico do paciente."],
   bullets=["Discussão de caso colaborativa, ancorada no prontuário.",
            "Organização por status do caso, estilo quadro.",
            "Registro permanente das decisões no histórico clínico."],
   agents=None),
]

# ---- PART II — INTELIGÊNCIA CLÍNICA & GOVERNANÇA ----
PART2=[
 dict(img=E(12), n="13", title="Visão Executiva · Insights", key="Insights",
   sub="As 6 dimensões de governança em uma única tela executiva.",
   crumb="doutor-ai.com / Analytics / Visão Executiva",
   body=["A **Visão Executiva** reúne, em um só painel, as seis dimensões que importam para a operadora e o gestor: *auditoria*, *pertinência*, *governança*, *engajamento*, *produção* e *financeiro*. É o ponto de partida para mergulhar em qualquer indicador e exportar relatórios em PDF."],
   bullets=["KPIs consolidados de todas as dimensões em uma tela.",
            "Volume de auditorias por médico e por dia.",
            "Exportação executiva em PDF para diretoria e operadora."],
   agents=None),

 dict(img=E(13), n="14", title="Visão Executiva · Erros & Rankings", key="Erros",
   sub="Tipos e categorias de erros clínicos e rankings de pontuação.",
   crumb="doutor-ai.com / Analytics / Visão Executiva",
   body=["O mesmo painel detalha **tipos e categorias de erros médicos** detectados pela IA e os rankings de pontuação — pontuações mais baixas e mais altas por profissional — base para reconhecimento e para planos de capacitação."],
   bullets=["Distribuição de erros por tipo e por categoria.",
            "Rankings de melhores e piores pontuações por médico.",
            "Insumo direto para coaching clínico individualizado."],
   agents=None),

 dict(img=E(14), n="15", title="Visão Executiva · Evolução", key="Evolução",
   sub="Pontuação média diária e atalhos para aprofundar a análise.",
   crumb="doutor-ai.com / Analytics / Visão Executiva",
   body=["A evolução da **pontuação média diária** das auditorias mostra a tendência de qualidade no tempo. Os atalhos *aprofundar análise* levam direto a Governança Clínica, Auditoria detalhada, Pertinência e Erros Clínicos."],
   bullets=["Série temporal da qualidade clínica auditada.",
            "Navegação guiada para as análises de detalhe.",
            "Leitura rápida de tendência para a gestão."],
   agents=None),

 dict(img=E(15), n="16", title="Governança Clínica", key="Governança",
   sub="Qualidade, adesão a protocolos, desfecho e custo de servir.",
   crumb="doutor-ai.com / Analytics / Governança Clínica",
   body=["O **Score de Governança** (71,4% no exemplo) combina *pertinência + qualidade + desfecho*. Ao lado, médicos aderentes, gaps ativos, **custo médio por consulta** e desfecho favorável. A evolução de 12 meses acompanha as quatro dimensões de governança lado a lado.",
         "É exatamente o relatório de **governança clínica** que a operadora quer ver: o quanto o cuidado é pertinente, de qualidade, resolutivo e a que custo."],
   bullets=["Score composto de governança com variação no período.",
            "Custo-to-serve médio por consulta e taxa de desfecho favorável.",
            "Filtros por sede, especialidade, convênio e contrato."],
   agents=None),

 dict(img=E(16), n="17", title="Governança · Médicos & Gaps", key="Gaps",
   sub="Quem mais adere aos protocolos e onde estão os gaps de aderência.",
   crumb="doutor-ai.com / Analytics / Governança Clínica",
   body=["A governança desce ao nível do profissional: ranking dos **médicos com maior adesão a protocolos** e dos médicos com **gaps de aderência** — exatamente onde priorizar coaching clínico."],
   bullets=["Ranking de aderência a protocolos por médico.",
            "Identificação de gaps que pedem capacitação.",
            "Priorização objetiva de ações de melhoria."],
   agents=None),

 dict(img=E(17), n="18", title="Governança · Adesão × Custo", key="Custo",
   sub="A correlação que prova a tese: mais aderência, menos custo.",
   crumb="doutor-ai.com / Analytics / Governança Clínica",
   body=["O gráfico de correlação mostra a tendência central da plataforma: **quanto maior a aderência ao protocolo, menor o custo médio da consulta** — consultas mais resolutivas, menos retornos e menos exames desnecessários. Cada bolha é um médico, dimensionada pelo volume."],
   bullets=["Eixo X: aderência ao protocolo (%) · Eixo Y: custo médio (R$).",
            "Evidência visual do ROI da governança clínica.",
            "Bolhas por médico, tamanho proporcional ao volume."],
   agents=None),

 dict(img=E(18), n="19", title="Governança · Adesão por CID-10", key="CID-10",
   sub="Aderência ao protocolo por diagnóstico, com classificação de gap.",
   crumb="doutor-ai.com / Analytics / Governança Clínica",
   body=["A adesão é destrinchada **por CID-10**, com número de casos, percentual de aderência e classificação do gap (*bom*, *médio*, *atenção*, *crítico*)."],
   bullets=["Aderência por diagnóstico, ordenada por criticidade.",
            "Destaque automático dos CIDs de pior adesão.",
            "Base para atualizar protocolos e direcionar treinamento."],
   agents=None),

 dict(img=E(19), n="20", title="Governança · Convênio × Especialidade", key="Convênio",
   sub="Heatmap de adesão por convênio e as 4 dimensões por especialidade.",
   crumb="doutor-ai.com / Analytics / Governança Clínica",
   body=["O heatmap cruza **adesão por convênio e especialidade**, revelando gaps transversais. Logo abaixo, cada especialidade é avaliada nas quatro dimensões de governança: *aderência*, *qualidade*, *custo (glosa)* e *desfecho*."],
   bullets=["Matriz convênio × especialidade para enxergar padrões.",
            "Quatro dimensões de governança por especialidade.",
            "Comparabilidade direta entre carteiras e áreas."],
   agents=None),

 dict(img=E(20), n="21", title="Governança · Top 5 Gaps", key="Gaps",
   sub="Os gaps prioritários, prontos para ação imediata.",
   crumb="doutor-ai.com / Analytics / Governança Clínica",
   body=["A plataforma fecha a governança com os **Top 5 gaps prioritários** — médico, CID, especialidade, criticidade e o problema concreto (ex.: \"não aplica escala GAD-7 antes de prescrever ansiolítico\"), com o número de casos no período. Da análise à ação, sem planilha."],
   bullets=["Gaps ranqueados por impacto e criticidade.",
            "Descrição acionável de cada desvio de protocolo.",
            "Contagem de casos para dimensionar o esforço."],
   agents=None),

 dict(img=E(21), n="22", title="Auditoria Clínica IA", key="Clínica",
   sub="Auditoria automatizada de 100% das consultas contra protocolos.",
   crumb="doutor-ai.com / Analytics / Análise Clínica",
   body=["Enquanto a auditoria tradicional vê uma amostra, a **Auditoria Clínica IA** revisa **todas as consultas** contra os protocolos clínicos — 799 auditadas no exemplo — com classificação média, nota média e percentual de conformidade. Abas para *consultas*, *N2*, *histórico*, *base de conhecimento*, *prontuários*, *convênios* e *REMUME*."],
   bullets=["Auditoria de 100% dos atendimentos, não por amostragem.",
            "Classificação, nota média e conformidade por período.",
            "Conhecimento clínico organizado (protocolos, REMUME, convênios)."],
   agents=[("auditor-protocolo","audita cada consulta contra o protocolo aplicável")]),

 dict(img=E(22), n="23", title="Auditoria Clínica · Veredictos", key="Veredictos",
   sub="Distribuição de veredictos e score por especialidade.",
   crumb="doutor-ai.com / Analytics / Análise Clínica",
   body=["Os resultados se distribuem em *favoráveis*, *inconclusivos* e *desfavoráveis*, e o **score por especialidade** mostra onde a conformidade é maior ou menor — com a pontuação média diária evoluindo ao lado."],
   bullets=["Distribuição de veredictos da auditoria automatizada.",
            "Score e conformidade por especialidade.",
            "Tendência diária da pontuação."],
   agents=None),

 dict(img=E(23), n="24", title="Auditoria Clínica · Rankings", key="Rankings",
   sub="Pontuações mais baixas e mais altas por profissional.",
   crumb="doutor-ai.com / Analytics / Análise Clínica",
   body=["Os rankings de **pontuações mais baixas e mais altas** por médico tornam a auditoria justa e transparente: reconhecimento para quem adere e suporte para quem precisa, sempre com base em 100% dos atendimentos."],
   bullets=["Ranking objetivo por profissional.",
            "Base para reconhecimento e para capacitação dirigida.",
            "Transparência sobre 100% da base auditada."],
   agents=None),

 dict(img=E(24), n="25", title="Auditoria Clínica · Volume", key="Volume",
   sub="Heatmap de auditorias por médico e por dia.",
   crumb="doutor-ai.com / Analytics / Análise Clínica",
   body=["O heatmap **médico × dia** mostra o volume de auditorias realizadas, evidenciando a capacidade de processamento contínuo da IA e a cobertura por profissional ao longo do tempo."],
   bullets=["Cobertura de auditoria por médico e por dia.",
            "Capacidade de auditar em escala, todo dia.",
            "Identificação de lacunas de cobertura."],
   agents=None),

 dict(img=E(25), n="26", title="Auditoria Clínica · Erros", key="Erros",
   sub="Tipos e categorias de erro com a lista de auditorias detalhada.",
   crumb="doutor-ai.com / Analytics / Análise Clínica",
   body=["A análise de erros classifica os achados por **tipo** e **categoria** e lista cada auditoria com prontuário, classificação, veredicto, score e validação humana — o elo entre o número agregado e o caso concreto."],
   bullets=["Erros por tipo (omissão, não pertinente, dosagem) e categoria.",
            "Lista detalhada com veredicto e score por prontuário.",
            "Validação humana registrada em cada auditoria."],
   agents=None),

 dict(img=E(26), n="27", title="Resultado da Auditoria", key="Resultado",
   sub="O laudo de uma auditoria: pontuação, protocolo-fonte e evidência.",
   crumb="doutor-ai.com / Analytics / Auditoria · Resultado",
   body=["O detalhe de uma auditoria é totalmente **rastreável**: classificação (CID), especialidade, pontuação (7/10 no exemplo) e o **protocolo-fonte indexado**. Cada critério avaliado mostra peso, resultado, a *referência do protocolo* e o *trecho da transcrição* que sustenta a avaliação.",
         "Nada é opaco: a operadora vê **em qual protocolo e em qual frase** a IA se baseou — e pode regular o resultado."],
   bullets=["Pontuação por critério, com peso e resultado.",
            "Referência ao protocolo e ao trecho da transcrição.",
            "Auditoria explicável e regulável, ponta a ponta."],
   agents=[("auditor-protocolo","gera o laudo com critério, peso e evidência"),
           ("transcricao-stt","transcreve o atendimento que sustenta a auditoria")]),

 dict(img=E(27), n="28", title="Pertinência Médica", key="Pertinência",
   sub="Aceitas, rejeitadas e pendentes — a aderência à recomendação.",
   crumb="doutor-ai.com / Analytics / Pertinência",
   body=["A **Pertinência** mede a aderência dos médicos às recomendações da IA: total de ocorrências, aceitas, rejeitadas e pendentes, com a evolução no tempo. É o relatório de **pertinência** que comprova à operadora que exames e condutas têm respaldo em protocolo."],
   bullets=["Aceitas × rejeitadas × pendentes ao longo do tempo.",
            "Indicador-chave de conduta baseada em evidência.",
            "Relatório de pertinência pronto para a operadora."],
   agents=[("validador-pertinencia","avalia a aderência de cada recomendação ao protocolo")]),

 dict(img=E(28), n="29", title="Pertinência · Por Tipo", key="Tipo",
   sub="Distribuição e aceitação por tipo de recomendação.",
   crumb="doutor-ai.com / Analytics / Pertinência",
   body=["A pertinência é aberta **por tipo de recomendação** — exame laboratorial, exame de imagem, medicação, encaminhamento, interconsulta — mostrando onde a aceitação é alta e onde há atrito."],
   bullets=["Aceitação por tipo de recomendação.",
            "Identificação de atritos específicos (ex.: imagem).",
            "Distribuição visual de aceitas/rejeitadas/pendentes."],
   agents=None),

 dict(img=E(29), n="30", title="Pertinência · Por Médico", key="Médico",
   sub="Taxa de aceitação por profissional, com cross-analytics.",
   crumb="doutor-ai.com / Analytics / Pertinência",
   body=["A **taxa de aceitação por médico** ordena os profissionais pela aderência às recomendações, com acesso a cross-analytics. Aderência alta indica conduta alinhada ao protocolo; baixa, oportunidade de diálogo clínico."],
   bullets=["Ranking de aceitação por profissional.",
            "Cross-analytics para entender o porquê.",
            "Base equilibrada entre cobrança e suporte clínico."],
   agents=None),

 dict(img=E(30), n="31", title="Pertinência · CIDs Críticos", key="CIDs",
   sub="Diagnósticos com menor adesão — onde priorizar capacitação.",
   crumb="doutor-ai.com / Analytics / Pertinência",
   body=["Os **CIDs com menor adesão** à recomendação sinalizam protocolo desatualizado, falta de evidência local ou perfil de paciente que pede customização. Ao lado, as variações das últimas 4 semanas (aceitação, rejeição, pendência, tempo médio até aceite)."],
   bullets=["Diagnósticos de menor aceitação, priorizados.",
            "Leitura de causa (protocolo, evidência, perfil).",
            "Tendência de curto prazo da pertinência."],
   agents=None),

 dict(img=E(31), n="32", title="Erros Clínicos", key="Erros",
   sub="Matriz médico × dia, tipos, categorias e evolução temporal.",
   crumb="doutor-ai.com / Analytics / Erros Clínicos",
   body=["Os **Erros Clínicos** detectados pela IA (1.234 no exemplo) são cruzados por médico, dia, tipo e categoria. O painel traz médicos, dias e consultas auditadas, com filtros por sede, especialidade, convênio e contrato."],
   bullets=["Volume de erros detectados por IA no período.",
            "Cruzamento por médico, dia, tipo e categoria.",
            "Filtros executivos para recortar a análise."],
   agents=None),

 dict(img=E(32), n="33", title="Erros Clínicos · Evolução", key="Evolução",
   sub="Erros em queda com auditorias estáveis — ganho real de qualidade.",
   crumb="doutor-ai.com / Analytics / Erros Clínicos",
   body=["A curva mostra **erros em queda enquanto as auditorias permanecem estáveis** — ganho real de qualidade, não menos fiscalização. A matriz médico × dia detalha onde os erros se concentram."],
   bullets=["Erros/dia × auditorias/dia na mesma série.",
            "Evidência de melhoria sustentada da qualidade.",
            "Matriz médico × dia para ação dirigida."],
   agents=None),

 dict(img=E(33), n="34", title="Erros Clínicos · Tipos", key="Tipos",
   sub="Composição dos erros por tipo e por categoria.",
   crumb="doutor-ai.com / Analytics / Erros Clínicos",
   body=["A composição dos erros — *omissão*, *não pertinente*, *dosagem incorreta* — e as categorias (*teste diagnóstico*, *medicação*, *encaminhamento*…) revelam onde focar protocolos e capacitação."],
   bullets=["Ranking de tipos de erro mais comuns.",
            "Ranking de categorias de erro.",
            "Direcionamento de protocolos e treinamento."],
   agents=None),

 dict(img=E(34), n="35", title="Engajamento", key="Engajamento",
   sub="Comparecimento, adesão à medicação, conclusão de tarefas e NPS.",
   crumb="doutor-ai.com / Analytics / Engajamento",
   body=["O **Engajamento** acompanha a relação com o paciente: *taxa de comparecimento*, *adesão à medicação*, *conclusão de tarefas* pós-consulta e *NPS*. A evolução semanal das três métricas-chave mostra a tração do cuidado continuado."],
   bullets=["Comparecimento e no-show sob controle.",
            "Adesão à medicação e conclusão de tarefas.",
            "NPS (promotores − detratores) da experiência."],
   agents=None),

 dict(img=E(35), n="36", title="Engajamento · Detalhe", key="Detalhe",
   sub="Conclusão por tipo de tarefa e os pacientes mais engajados.",
   crumb="doutor-ai.com / Analytics / Engajamento",
   body=["O detalhe abre a **conclusão por tipo de tarefa** (exame, encaminhamento, orientação, vacinação, adesão, retorno) e lista os **pacientes mais engajados** — insumo para a navegação priorizar quem precisa de empurrão."],
   bullets=["Conclusão por tipo de tarefa.",
            "Top pacientes engajados.",
            "Direcionamento para a navegação ativa."],
   agents=None),

 dict(img=E(36), n="37", title="Produção", key="Produção",
   sub="Volumes operacionais: consultas, tempo, utilização e no-show.",
   crumb="doutor-ai.com / Analytics / Produção",
   body=["A **Produção** mostra os volumes operacionais: consultas no mês, tempo médio por consulta, **utilização de slots** e no-show, com o volume por dia da semana. A leitura de capacidade e ocupação para o planejamento da agenda."],
   bullets=["Consultas no mês e tempo médio por atendimento.",
            "Utilização de slots (ocupação) e no-show.",
            "Volume por dia da semana para dimensionar a agenda."],
   agents=None),

 dict(img=E(37), n="38", title="Produção · Mix & Médicos", key="Mix",
   sub="Mix por especialidade e os médicos por volume.",
   crumb="doutor-ai.com / Analytics / Produção",
   body=["O **mix por especialidade** e o ranking de **médicos por volume** mostram a composição da produção — onde está o volume e como ele se distribui pela equipe."],
   bullets=["Mix de consultas por especialidade.",
            "Top médicos por volume de atendimento.",
            "Base para alocação e contratação."],
   agents=None),

 dict(img=E(38), n="39", title="Produção · Ranking", key="Ranking",
   sub="Volume por especialidade, ranqueado.",
   crumb="doutor-ai.com / Analytics / Produção",
   body=["O **ranking de volume por especialidade** consolida a produção em uma leitura única — clínica médica, cardiologia, ortopedia, pediatria, ginecologia e demais — para priorização de capacidade."],
   bullets=["Volume absoluto por especialidade.",
            "Comparabilidade direta entre áreas.",
            "Apoio ao planejamento de capacidade."],
   agents=None),

 dict(img=E(39), n="40", title="Análise Financeira", key="Financeira",
   sub="Receita, margem, glosa e mix de convênios.",
   crumb="doutor-ai.com / Analytics / Análise Financeira",
   body=["A **Análise Financeira** traz receita bruta e líquida, **margem (EBITDA / receita líquida)** e **taxa de glosa**, com a evolução mensal de bruta vs. líquida. A foto econômica que conecta governança clínica a resultado financeiro."],
   bullets=["Receita bruta, líquida e margem.",
            "Taxa de glosa do mês corrente.",
            "Evolução mensal bruta × líquida."],
   agents=None),

 dict(img=E(40), n="41", title="Financeira · Convênios", key="Convênios",
   sub="Mix por convênio, ranking e top procedimentos por receita.",
   crumb="doutor-ai.com / Analytics / Análise Financeira",
   body=["O detalhe financeiro abre o **mix por convênio**, o ranking de convênios e os **top procedimentos por receita** — visão essencial para a negociação com cada operadora."],
   bullets=["Participação de cada convênio na receita.",
            "Ranking de convênios.",
            "Procedimentos que mais geram receita."],
   agents=None),

 dict(img=E(41), n="42", title="Relatórios Customizados", key="Customizados",
   sub="Builder self-service: cruze dimensões e métricas e agende envios.",
   crumb="doutor-ai.com / Analytics / Relatórios",
   body=["O **Builder** permite compor relatórios próprios arrastando dimensões (médico, especialidade, sede, convênio, procedimento) e métricas (volume, receita, glosa, pertinência, comparecimento). Salve, agende e compartilhe com a equipe — relatórios recorrentes sem depender de TI."],
   bullets=["Construção self-service por arrastar-e-soltar.",
            "Relatórios salvos, agendados e compartilhados.",
            "Autonomia total da operação sobre os dados."],
   agents=None),
]

# ---- PART III — A ARQUITETURA DA PLATAFORMA ----
PART3=[
 dict(img=E(42), n="43", title="Agentes IA · Especialistas Clínicos", key="Especialistas",
   sub="Prompt Builder: agentes por especialidade, versionados e auditáveis.",
   crumb="doutor-ai.com / Configurações / Agentes IA",
   body=["O **Prompt Builder** é a fábrica de inteligência da plataforma. Os **agentes especialistas** — neurologia, cardiologia, psiquiatria, pediatria, ginecologia e outros — encapsulam o conhecimento de cada área e podem ser testados em *playground* e editados, com versionamento e publicação controlados."],
   bullets=["Agentes especialistas por área clínica.",
            "Playground para testar antes de publicar.",
            "Versionamento e publicação governados."],
   agents=None),

 dict(img=E(43), n="44", title="Agentes IA · Checkout", key="Checkout",
   sub="Os agentes que atuam no encerramento da consulta.",
   crumb="doutor-ai.com / Configurações / Agentes IA",
   body=["No grupo **Checkout** ficam os agentes que sustentam o copiloto: o *Sugestor de Condutas* (motor principal — gera exames, prescrições e encaminhamentos a partir do prontuário), o *Validador de Pertinência* (confere respaldo no protocolo e dispara justificativa) e o *Validador de Interação Medicamentosa* (cross-check de DDI). Cada um com prioridade, versão e status."],
   bullets=["Sugestor de Condutas — o motor de conduta do checkout.",
            "Validador de Pertinência — respaldo em protocolo, com fluxo de justificativa.",
            "Validador de Interação Medicamentosa — detecção de DDI clinicamente relevante."],
   agents=[("sugestor-condutas","v5 · prioridade 1 · ativo"),
           ("validador-pertinencia","v3 · prioridade 2 · ativo"),
           ("validador-interacao-medicamentosa","v2 · prioridade 3 · ativo")]),

 dict(img=E(44), n="45", title="Agentes IA · Análise de Exames", key="Exames",
   sub="Agentes que interpretam exames laboratoriais e de imagem.",
   crumb="doutor-ai.com / Configurações / Agentes IA",
   body=["Os agentes de **Análise de Exames** interpretam resultados laboratoriais e de imagem cruzando com o histórico do paciente para identificar **tendências e desvios** — alimentando o copiloto e a auditoria com leitura clínica dos exames."],
   bullets=["Interpretação de exames laboratoriais e de imagem.",
            "Cruzamento com o histórico do paciente.",
            "Detecção de tendências e desvios relevantes."],
   agents=[("analise-exames-laboratoriais","interpreta exames e cruza com o histórico")]),

 dict(img=E(45), n="46", title="Protocolos · Diretrizes", key="Protocolos",
   sub="A base de protocolos que governa todas as sugestões e auditorias.",
   crumb="doutor-ai.com / Configurações / Protocolos",
   body=["Os **Protocolos** são a fonte da verdade clínica. Cada um (ex.: *Síndrome Gripal — Ficha Técnica e PACK*) reúne **fontes** (PDFs, manuais e diretrizes), **critérios de auditoria com peso** e um **algoritmo decisório** editável em árvore. É contra esta base que o copiloto sugere e a auditoria avalia.",
         "Protocolos indexados garantem que toda sugestão e todo laudo tenham origem rastreável — o alicerce da explicabilidade da plataforma."],
   bullets=["Fontes, critérios ponderados e algoritmo de decisão por protocolo.",
            "Editor de árvore de decisão para a equipe clínica.",
            "Indexação que torna sugestões e auditorias rastreáveis."],
   agents=[("indexador-protocolo","ingere e indexa diretrizes para uso por copiloto e auditoria")]),

 dict(img=E(46), n="47", title="Contratos & Convênios", key="Contratos",
   sub="Regras de cobertura e carência de cada operadora, lidas por IA.",
   crumb="doutor-ai.com / Configurações / Contratos",
   body=["Em **Contratos & Convênios**, o PDF de cada operadora é processado por um *pipeline de ingestão* de agentes que extraem **procedimentos cobertos, tabela de medicamentos, TUSS/CBHPM, pacotes e regras de carência** — com auditor humano validando antes de entrar em produção. É o que faz a autorização (tela 03) decidir sozinha e com segurança."],
   bullets=["Procedimentos e medicamentos cobertos, mapeados por contrato.",
            "Regras de carência por tipo de atendimento.",
            "Ingestão por IA com validação humana antes da produção."],
   agents=[("ingestor-contrato-pdf","lê o contrato em PDF"),
           ("parser-tabela-medicamentos","extrai a tabela de medicamentos"),
           ("parser-tuss-cbhpm","mapeia procedimentos TUSS/CBHPM"),
           ("parser-carencias-elegibilidade","extrai regras de carência e elegibilidade")]),

 dict(img=E(47), n="48", title="Réguas de Relacionamento", key="Réguas",
   sub="Automação trigger → condição → ação, versionável.",
   crumb="doutor-ai.com / Configurações / Réguas",
   body=["As **Réguas** automatizam o acompanhamento com a lógica *gatilho → condição → ação*. No exemplo, *pós-consulta · exame solicitado*: quando um pedido de exame é assinado, se o paciente tem mais de 50 anos e urgência média/alta, cria-se a tarefa com prazo e notificação por WhatsApp. Editor visual e YAML sincronizados (YAML como fonte de versionamento)."],
   bullets=["Automação declarativa: gatilho, condição e ação.",
            "Editor visual + YAML versionável (CI-friendly).",
            "Simulação contra eventos passados antes de ativar."],
   agents=[("motor-reguas","executa as réguas e dispara tarefas/notificações")]),

 dict(img=E(48), n="49", title="Governança & Papéis (RBAC)", key="Papéis",
   sub="Controle de acesso granular por papel e recurso.",
   crumb="doutor-ai.com / Configurações / Governança",
   body=["O **RBAC** define, por papel (médico, recepcionista, codificador, auditor, faturista, administrador, agent author), o que cada um pode *ver, criar, editar, excluir, aprovar, assinar e exportar* — recurso a recurso. Segurança e conformidade por desenho."],
   bullets=["Papéis pré-definidos para toda a operação.",
            "Matriz de permissões granular por recurso.",
            "Escopo por tenant e trilha de quem pode o quê."],
   agents=None),

 dict(img=E(49), n="50", title="Auditoria de IA", key="IA",
   sub="Log imutável de toda execução de IA — conformidade LGPD/CFM.",
   crumb="doutor-ai.com / Configurações / Auditoria de IA",
   body=["Cada execução de agente fica registrada em um **log imutável**: agente, paciente, evento, **ação humana** (aceito/justificado/rejeitado), latência, tokens e custo. Indicadores de execuções, taxa de aceitação, latência e custo do dia, com **conformidade LGPD/CFM** (prompts sem PII no export, versão e justificativa registradas) e **detecção de comportamento anômalo**.",
         "É a prova de governança da IA que uma operadora exige: tudo auditável, exportável e supervisionado por humano."],
   bullets=["Trilha imutável de toda decisão de IA, com ação humana.",
            "Custo, latência e aceitação por agente.",
            "Conformidade LGPD/CFM e detecção de anomalias; export LGPD/CFM."],
   agents=None),

 dict(img=E(50), n="51", title="Templates de Documentos", key="Templates",
   sub="Modelos clínicos versionados com placeholders e assinatura digital.",
   crumb="doutor-ai.com / Configurações / Templates",
   body=["Os **Templates** padronizam receitas, atestados, pedidos de exame, encaminhamentos e laudos, com *placeholders* (paciente, médico, itens, data) e versionamento. Os documentos saem assinados digitalmente com validade **ICP-Brasil** — consistência e conformidade em cada papel emitido."],
   bullets=["Modelos para todos os documentos clínicos.",
            "Placeholders dinâmicos e versionamento.",
            "Assinatura digital ICP-Brasil."],
   agents=None),

 dict(img=E(51), n="52", title="Integrações", key="Integrações",
   sub="Conectores clínicos, de compliance e de convênios.",
   crumb="doutor-ai.com / Configurações / Integrações",
   body=["As **Integrações** conectam a plataforma ao ecossistema: **HL7/FHIR** (interoperabilidade clínica), **e-vidas (ICP-Brasil)** (assinatura qualificada), **TISS/TUSS** e os *webservices* das operadoras (Unimed, Bradesco, Amil) para elegibilidade e autorização — com volume, latência e erros monitorados por conector. É também por aqui que trafegam os dados para o **TOTVS**."],
   bullets=["Padrões clínicos (HL7/FHIR) e de assinatura (ICP-Brasil).",
            "TISS/TUSS e webservices das operadoras monitorados.",
            "Conector de dados para o faturamento no TOTVS."],
   agents=None),
]

SECTIONS=[
 ("I","A Jornada Operacional",
  "Do agendamento ao envio da conta: o caminho que o paciente e o atendimento percorrem na plataforma, com os agentes de IA atuando em cada etapa.",
  PART1, [("11","TELAS"),("8","AGENTES"),("8","ETAPAS DA JORNADA")]),
 ("II","Inteligência Clínica & Governança",
  "Auditoria de 100% das consultas, pertinência, governança clínica, produção e financeiro — os relatórios que a operadora recebe.",
  PART2, [("30","TELAS"),("6","DIMENSÕES"),("100%","AUDITADO")]),
 ("III","A Arquitetura da Plataforma",
  "A engenharia que sustenta tudo: agentes configuráveis, protocolos, contratos lidos por IA, automações, RBAC e a trilha de auditoria da própria IA.",
  PART3, [("11","TELAS"),("LGPD","/ CFM"),("ICP","BRASIL")]),
]
NCTX = 0   # context pages removed
TOTAL = 1 + 1 + NCTX + sum(1+len(s[3]) for s in SECTIONS) + 1   # cover + intro + contexto + (divider+screens) + closing

# =====================================================================
# PAGE RENDERERS
# =====================================================================
pageno=0
def newpage():
    global pageno; pageno+=1

# ---- COVER ----
def cover():
    global pageno; pageno+=1
    c.setFillColorRGB(*BLUE); c.rect(0,0,PAGE_W,PAGE_H,fill=1,stroke=0)
    # faint mosaic mark bottom-right (watermark)
    if os.path.exists(MARKW):
        iw,ih=img_dims(MARKW); w=340; h=w*ih/iw
        c.saveState(); c.setFillAlpha(0.06)
        c.drawImage(MARKW,PAGE_W-w+60,-40,width=w,height=h,mask='auto')
        c.restoreState()
    # logo top-left
    if os.path.exists(MARKW):
        iw,ih=img_dims(MARKW); h=20; w=h*iw/ih
        c.drawImage(MARKW,ML,PAGE_H-72,width=w,height=h,mask='auto')
        text(ML+w+10,PAGE_H-72+4,"Doutor-AI",F["bold"],14,WHITE)
    # kicker
    text(ML,PAGE_H-300,"▸  EVIDIA · PLATAFORMA DE INTELIGÊNCIA CLÍNICA",F["monomed"],9,BLUE_LIGHT,tracking=2.2)
    # title
    text(ML,PAGE_H-360,"Detalhamento",F["xbold"],52,WHITE,tracking=-1.5)
    c.setFont(F["xbit"],52); c.setFillColorRGB(*BLUE_LIGHT)
    text(ML,PAGE_H-416,"da Jornada.",F["xbit"],52,BLUE_LIGHT,tracking=-1.5)
    # rule
    c.setStrokeColorRGB(*BLUE_LIGHT); c.setLineWidth(1); c.setStrokeAlpha(0.5)
    c.line(ML,PAGE_H-440,ML+460,PAGE_H-440); c.setStrokeAlpha(1)
    # subtitle
    y=PAGE_H-470
    sub=("A plataforma de inteligência clínica ambulatorial: agenda, prontuário e "
         "copiloto clínico com IA, governança clínica em tempo real e faturamento "
         "integrado ao TOTVS. Cada tela, cada agente, descrito.")
    c.setFillColorRGB(1,1,1)
    for ln in wrap(sub,F["reg"],11.5,470):
        text(ML,y,ln,F["med"],11.5,(0.86,0.92,0.98)); y-=18
    # footer stats
    fy=96
    c.setStrokeColorRGB(1,1,1); c.setStrokeAlpha(0.25); c.line(ML,fy+34,PAGE_W-MR,fy+34); c.setStrokeAlpha(1)
    cols=[("VERSÃO","v1.0"),("DOCUMENTO","Telas da Plataforma"),("TELAS DESCRITAS","50"),("DATA","Maio · 2026")]
    cx=ML
    for lab,val in cols:
        text(cx,fy+14,lab,F["mono"],7,BLUE_LIGHT,tracking=1.6)
        text(cx,fy-2,val,F["bold"],11,WHITE)
        cx+=CW/4
    c.showPage()

# ---- pill chips (deliverables) ----
def chips(x,y,items,maxw,h=17,padx=10,gap=6,vgap=7,fs=8.4):
    cx=x; cy=y
    for t in items:
        w=sw(t,F["semi"],fs)+2*padx
        if cx+w>x+maxw and cx>x:
            cx=x; cy-=h+vgap
        rrect(cx,cy-h,w,h,h/2,fill=BLUE_PALE,stroke=None)
        text(cx+padx,cy-h+5.2,t,F["semi"],fs,BLUE)
        cx+=w+gap
    return cy-h

# ---- INTRO (journey) ----
def intro():
    global pageno; pageno+=1
    global SECTION; SECTION="Visão Geral"
    chrome(pageno,TOTAL)
    y=PAGE_H-92
    kicker(ML,y,"Visão Geral · A Camada de Inteligência Clínica")
    y-=30
    text(ML,y,"O que é",F["xbold"],27,CHUMBO,tracking=-0.6)
    y-=31
    c.setFont(F["xbit"],27)
    text(ML,y,"entregue.",F["xbit"],27,BLUE,tracking=-0.6)
    y-=30
    intro_txt=("**Camada de inteligência** que organiza a "
      "operação ambulatorial de ponta a ponta — **agenda, prontuário e um copiloto clínico** "
      "que sugere condutas ancoradas em protocolo — e devolve à operadora **governança clínica** "
      "mensurável: pertinência, qualidade, desfecho e custo. O **faturamento é executado pelo "
      "TOTVS**, que recebe a conta já codificada.")
    y=rich(ML,y,intro_txt,CW,base=("Inter-Regular",10.5),col=G700,leading=16.5)
    y-=8
    # journey flow
    kicker(ML,y,"A jornada em 8 passos")
    y-=22
    steps=[("01","Agenda","Marcação ambulatorial"),
           ("02","Check-in","Chegada + carteirinha (OCR)"),
           ("03","Autorização","Elegibilidade com a operadora"),
           ("04","Prontuário","Visão 360° do paciente"),
           ("05","Copiloto","Conduta ancorada em protocolo"),
           ("06","Codificação","CID · TUSS · CBHPM"),
           ("07","Faturamento → TOTVS","Conta codificada vai ao TOTVS"),
           ("08","Governança","Relatórios para a operadora")]
    cols=4; gap=8; bw=(CW-(cols-1)*gap)/cols; bh=66
    for i,(nn,tt,dd) in enumerate(steps):
        r=i//cols; cc=i%cols
        bx=ML+cc*(bw+gap); by=y-r*(bh+12)
        rrect(bx,by-bh,bw,bh,6,fill=PAPER,stroke=G300,sw_=0.7)
        c.setFillColorRGB(*BLUE); c.rect(bx,by-bh,2.4,bh,fill=1,stroke=0)
        text(bx+9,by-16,nn,F["mono"],8,BLUE_MID,tracking=1)
        ty=by-29
        for ln in wrap(tt,F["bold"],9,bw-15):
            text(bx+9,ty,ln,F["bold"],9,CHUMBO); ty-=10.5
        for ln in wrap(dd,F["reg"],7.2,bw-15):
            text(bx+9,ty,ln,F["reg"],7.2,G700); ty-=9
        if cc<cols-1:
            text(bx+bw+1.2,by-bh/2-3,"›",F["bold"],11,BLUE_LIGHT)
    y-=2*bh+12+22
    # TOTVS / billing note (height fits all text inside)
    nt=("Codifica (CID/TUSS/CBHPM), garantindo que a conta chegue limpa. O **TOTVS** "
        "faz a integração com as operadoras e a **emissão do faturamento**.")
    nlines=len(wrap(nt.replace("**",""),"Inter-Regular",9,CW-28))
    boxh=20+nlines*13.5+12
    rrect(ML,y-boxh,CW,boxh,6,fill=BLUE_PALE,stroke=None)
    c.setFillColorRGB(*BLUE); c.rect(ML,y-boxh,3,boxh,fill=1,stroke=0)
    text(ML+14,y-15,"FATURAMENTO · INTEGRAÇÃO TOTVS",F["monomed"],7.2,BLUE,tracking=1.6)
    rich(ML+14,y-31,nt,CW-28,base=("Inter-Regular",9),col=G700,leading=13.5)
    y-=boxh+22
    # how to read
    kicker(ML,y,"Como ler este material")
    y-=20
    hr=("Cada página apresenta **uma tela real da plataforma** e, logo abaixo, a descrição do que ela "
        "faz e dos **agentes de IA** que atuam ali. O material segue em três partes: a jornada operacional, "
        "a inteligência & governança, e a plataforma por dentro.")
    rich(ML,y,hr,CW,base=("Inter-Regular",9.6),col=G700,leading=14.5)
    c.showPage()

# ---- SECTION DIVIDER ----
def divider(roman,title,desc,stats):
    global pageno; pageno+=1
    c.setFillColorRGB(*BLUE_DEEP); c.rect(0,0,PAGE_W,PAGE_H,fill=1,stroke=0)
    if os.path.exists(MARKW):
        iw,ih=img_dims(MARKW); w=420; h=w*ih/iw
        c.saveState(); c.setFillAlpha(0.05)
        c.drawImage(MARKW,PAGE_W-w+80,PAGE_H-h+40,width=w,height=h,mask='auto')
        c.restoreState()
    text(ML,PAGE_H-150,"▸  PARTE "+roman,F["monomed"],10,BLUE_LIGHT,tracking=3)
    text(ML,PAGE_H-300,roman,F["black"],150,WHITE,tracking=-4)
    y=PAGE_H-360
    for ln in wrap(title,F["xbold"],34,CW-40):
        text(ML,y,ln,F["xbold"],34,WHITE,tracking=-0.8); y-=40
    y-=6
    c.setStrokeColorRGB(*BLUE_LIGHT); c.setStrokeAlpha(0.5); c.line(ML,y,ML+420,y); c.setStrokeAlpha(1)
    y-=24
    for ln in wrap(desc,F["med"],12,470):
        text(ML,y,ln,F["med"],12,(0.82,0.90,0.98)); y-=18
    # stats
    sy=120
    c.setStrokeColorRGB(1,1,1); c.setStrokeAlpha(0.2); c.line(ML,sy+30,PAGE_W-MR,sy+30); c.setStrokeAlpha(1)
    cx=ML
    for val,lab in stats:
        text(cx,sy+2,val,F["xbold"],26,WHITE,tracking=-0.5)
        text(cx,sy-16,lab,F["mono"],7.5,BLUE_LIGHT,tracking=1.6)
        cx+=CW/3
    c.showPage()

# ---- SCREEN PAGE ----
def screen_page(d,section_label):
    global pageno; pageno+=1
    global SECTION; SECTION=section_label
    chrome(pageno,TOTAL)
    y=PAGE_H-92
    kicker(ML,y,f"{section_label} · {d['title']}  —  {d['n']}")
    y-=27
    # title with italic key word
    title=d["title"]; key=d.get("key")
    c.setFont(F["xbold"],19)
    tx=ML
    if key and key in title:
        before=title.split(key)[0]
        after=title.split(key,1)[1]
        text(tx,y,before,F["xbold"],19,CHUMBO,tracking=-0.3); tx+=sw(before,F["xbold"],19)
        text(tx,y,key,F["xbit"],19,BLUE,tracking=-0.3); tx+=sw(key,F["xbit"],19)
        text(tx,y,after,F["xbold"],19,CHUMBO,tracking=-0.3)
    else:
        text(tx,y,title,F["xbold"],19,CHUMBO,tracking=-0.3)
    # crumb right
    text(PAGE_W-MR,y+2,d["crumb"],F["mono"],7,G500,align="r")
    y-=18
    text(ML,y,d["sub"],F["med"],10,G700)
    y-=14
    # image card
    bottom=screen_card(ML,y,CW,d["img"])
    y=bottom-22
    # description kicker
    kicker(ML,y,"O que esta tela entrega",col=BLUE,size=7.2)
    y-=17
    for p in d["body"]:
        y=rich(ML,y,p,CW,base=("Inter-Regular",9.4),col=G700,leading=14.3)
        y-=6
    y-=2
    for b in d["bullets"]:
        y=bullet(ML,y,b,CW,leading=13.4,size=9.0)
        y-=4.5
    if d.get("agents"):
        y-=6
        agents_box(ML,y,CW,d["agents"])
    c.showPage()

# ---- CLOSING ----
def closing():
    global pageno; pageno+=1
    global SECTION; SECTION="Encerramento"
    chrome(pageno,TOTAL)
    y=PAGE_H-110
    kicker(ML,y,"Em resumo")
    y-=34
    text(ML,y,"A plataforma, em",F["xbold"],28,CHUMBO,tracking=-0.6); y-=33
    c.setFont(F["xbit"],28); text(ML,y,"uma frase.",F["xbit"],28,BLUE,tracking=-0.6)
    y-=34
    txt=("Agenda, prontuário e copiloto clínico com IA, governança clínica que a operadora "
         "enxerga em tempo real, e a conta entregue pronta ao TOTVS para faturar. "
         "Tudo **explicável, auditável e supervisionado por humano**.")
    y=rich(ML,y,txt,CW,base=("Inter-Regular",11.5),col=G700,leading=17.5)
    y-=14
    # number strip
    nums=[("50","TELAS DESCRITAS"),("3","DOMÍNIOS DA JORNADA"),("14+","AGENTES DE IA"),("100%","CONSULTAS AUDITADAS")]
    c.setStrokeColorRGB(*G300); c.line(ML,y,PAGE_W-MR,y); y-=26
    cx=ML
    for val,lab in nums:
        text(cx,y,val,F["xbold"],24,BLUE,tracking=-0.5)
        text(cx,y-16,lab,F["mono"],7,G500,tracking=1.2)
        cx+=CW/4
    y-=58
    # contact card (blue)
    ch=92
    rrect(ML,y-ch,CW,ch,8,fill=BLUE,stroke=None)
    if os.path.exists(MARKW):
        iw,ih=img_dims(MARKW); h=18; w=h*iw/ih
        c.drawImage(MARKW,ML+22,y-34,width=w,height=h,mask='auto')
        text(ML+22+w+10,y-30,"Doutor-AI",F["bold"],14,WHITE)
        text(ML+22+w+10,y-44,"A CAMADA DE INTELIGÊNCIA CLÍNICA",F["mono"],7,BLUE_LIGHT,tracking=1.6)
    cy=y-72; cx=ML+22
    for lab,val in [("SITE","doutor-ai.com"),("E-MAIL","andre.chade@doutor-ai.com"),("INSTAGRAM","@doutor.ai")]:
        text(cx,cy+10,lab,F["mono"],6.8,BLUE_LIGHT,tracking=1.4)
        text(cx,cy-4,val,F["semi"],10.5,WHITE)
        cx+=CW/3
    y-=ch+34
    # centered mixed line
    a="Qual sua "; b="próxima jogada?"
    total=sw(a,F["it"],14)+sw(b,F["bit"],14)
    sx=PAGE_W/2-total/2
    text(sx,y,a,F["it"],14,G500); text(sx+sw(a,F["it"],14),y,b,F["bit"],14,BLUE)
    c.showPage()

# ---- title helper (italic blue keyword) ----
def head(x,y,full,key,size=21):
    if key and key in full:
        b=full.split(key); before=b[0]; after=key.join(b[1:])
        text(x,y,before,F["xbold"],size,CHUMBO); x+=sw(before,F["xbold"],size)
        text(x,y,key,F["xbit"],size,BLUE); x+=sw(key,F["xbit"],size)
        text(x,y,after,F["xbold"],size,CHUMBO)
    else:
        text(x,y,full,F["xbold"],size,CHUMBO)

def note_box(y,label,txt,w=CW,x=ML):
    nl=len(wrap(txt.replace("**",""),"Inter-Regular",9,w-28)); bh=20+nl*13.5+10
    rrect(x,y-bh,w,bh,6,fill=BLUE_PALE,stroke=None)
    c.setFillColorRGB(*BLUE); c.rect(x,y-bh,3,bh,fill=1,stroke=0)
    text(x+14,y-15,label,F["monomed"],7,BLUE,tracking=1.6)
    rich(x+14,y-31,txt,w-28,base=("Inter-Regular",9),col=G700,leading=13.5)
    return y-bh

# ---- CONTEXT · O PROBLEMA + ANTES/DEPOIS ----
def prob_page():
    global pageno,SECTION; pageno+=1; SECTION="Contexto"
    chrome(pageno,TOTAL)
    y=PAGE_H-92
    kicker(ML,y,"Contexto · O Problema"); y-=28
    head(ML,y,"O preço da variabilidade clínica.","variabilidade"); y-=18
    text(ML,y,"Sem uma camada de inteligência, qualidade não escala — e a operadora paga a conta.",F["med"],10,G700); y-=20
    dores=[("01","Variabilidade","Condutas e exames variam entre médicos para o mesmo quadro."),
           ("02","Glosa evitável","Documentação incompleta e baixa pertinência geram perda."),
           ("03","Auditoria amostral","Revisão reativa, por amostra, sem visão de aderência."),
           ("04","Custo sem controle","Exames e retornos desnecessários elevam o custo por consulta."),
           ("05","Dados desconectados","Clínico, contrato e cobrança não conversam entre si."),
           ("06","Decisão sem apoio","Médico sem copiloto de protocolo no momento certo.")]
    cols=3; gap=8; bw=(CW-(cols-1)*gap)/cols; bh=62
    for i,(nn,tt,dd) in enumerate(dores):
        r=i//cols; cc=i%cols; bx=ML+cc*(bw+gap); by=y-r*(bh+gap)
        rrect(bx,by-bh,bw,bh,6,fill=PAPER,stroke=G300,sw_=0.7)
        c.setFillColorRGB(*RED); c.rect(bx,by-bh,2.4,bh,fill=1,stroke=0)
        text(bx+9,by-15,nn,F["mono"],7.5,G500,tracking=1)
        text(bx+9,by-28,tt,F["bold"],9.5,CHUMBO)
        ty=by-40
        for ln in wrap(dd,F["reg"],7.4,bw-16): text(bx+9,ty,ln,F["reg"],7.4,G700); ty-=9.2
    y-=2*bh+gap+24
    kicker(ML,y,"Antes → Depois"); y-=18
    rows=[("Conduta varia de médico a médico","Conduta ancorada em protocolo"),
          ("Auditoria amostral e reativa","Auditoria de 100%, preventiva"),
          ("Glosa descoberta após o envio","Glosa barrada antes do envio"),
          ("Governança em planilhas","Governança clínica em tempo real"),
          ("Conta enviada “crua”","Conta limpa e auditada → TOTVS")]
    ph=30+len(rows)*17+8; halfw=(CW-12)/2
    rrect(ML,y-ph,halfw,ph,6,fill=G100,stroke=None)
    text(ML+12,y-16,"▸  ANTES",F["monomed"],7.4,G500,tracking=1.6)
    bx2=ML+halfw+12
    rrect(bx2,y-ph,halfw,ph,6,fill=BLUE_PALE,stroke=None)
    c.setFillColorRGB(*BLUE); c.rect(bx2,y-ph,2.6,ph,fill=1,stroke=0)
    text(bx2+12,y-16,"▸  DEPOIS",F["monomed"],7.4,BLUE,tracking=1.6)
    ry=y-34
    for a,b in rows:
        text(ML+12,ry,"·  "+a,F["reg"],8.8,G700)
        text(bx2+12,ry,b,F["semi"],8.8,CHUMBO)
        ry-=17
    y-=ph+18
    note_box(y,"NOTA","Os dados e números exibidos neste material são **apenas demonstrativos** — ilustram o funcionamento da plataforma e não representam dados reais de operação.")
    c.showPage()

# ---- CONTEXT · DORES → SOLUÇÕES ----
def dores_page():
    global pageno,SECTION; pageno+=1; SECTION="Contexto"
    chrome(pageno,TOTAL)
    y=PAGE_H-92
    kicker(ML,y,"Contexto · Dores & Soluções"); y-=28
    head(ML,y,"Cada dor, uma resposta.","resposta"); y-=18
    text(ML,y,"As dores recorrentes da operadora e como a plataforma responde a cada uma.",F["med"],10,G700); y-=22
    pairs=[("Variabilidade de conduta","Copiloto sugere a conduta ancorada em protocolo, com justificativa e evidência rastreáveis.","sugestor-condutas"),
           ("Glosa por documentação / pertinência","Glosa preventiva e validação de pertinência barram o que não tem respaldo, antes do envio.","auditor-glosa-preventiva"),
           ("Auditoria amostral e reativa","Auditoria Clínica IA revisa 100% das consultas contra o protocolo, com laudo explicável.","auditor-protocolo"),
           ("Autorização lenta e com retrabalho","Validador de elegibilidade decide em segundos (no exemplo, 82,4% sem intervenção humana).","validador-elegibilidade-convenio"),
           ("Falta de visibilidade gerencial","Governança clínica em tempo real: aderência, qualidade, desfecho e custo por consulta.","—")]
    rowh=54; gap=9
    dw=CW*0.40; sw_w=CW-dw-26
    for i,(d,s,ag) in enumerate(pairs):
        ry=y-i*(rowh+gap)
        rrect(ML,ry-rowh,dw,rowh,6,fill=WHITE,stroke=G300,sw_=0.8)
        c.setFillColorRGB(*RED); c.rect(ML,ry-rowh,2.6,rowh,fill=1,stroke=0)
        text(ML+11,ry-15,f"DOR · {i+1:02d}",F["monomed"],6.8,RED,tracking=1.2)
        ty=ry-30
        for ln in wrap(d,F["semi"],9.5,dw-22): text(ML+11,ty,ln,F["semi"],9.5,CHUMBO); ty-=11.5
        text(ML+dw+6,ry-rowh/2-4,"→",F["bold"],13,BLUE_LIGHT)
        sx=ML+dw+26
        rrect(sx,ry-rowh,sw_w,rowh,6,fill=BLUE_PALE,stroke=None)
        c.setFillColorRGB(*BLUE); c.rect(sx,ry-rowh,2.6,rowh,fill=1,stroke=0)
        text(sx+11,ry-15,"SOLUÇÃO",F["monomed"],6.8,BLUE,tracking=1.4)
        if ag!="—": text(sx+sw_w-11,ry-15,ag,F["mono"],6.4,BLUE_MID,align="r")
        ty=ry-30
        for ln in wrap(s,F["reg"],9,sw_w-22): text(sx+11,ty,ln,F["reg"],9,G700); ty-=11.5
    c.showPage()

# ---- CONTEXT · ARQUITETURA ----
def arch_page():
    global pageno,SECTION; pageno+=1; SECTION="Contexto"
    chrome(pageno,TOTAL)
    y=PAGE_H-92
    kicker(ML,y,"Contexto · Arquitetura"); y-=28
    head(ML,y,"Integra. Não substitui.","Não substitui."); y-=18
    text(ML,y,"Conexão com o stack atual, orquestração dos dados e devolução de ações — o faturamento sai pelo TOTVS.",F["med"],10,G700); y-=24
    colsd=[("01 · ENTRADA",BLUE_DEEP,["Sistemas existentes","EHR / Prontuário","Sistemas da operadora","TISS / TUSS","Contratos & protocolos"]),
           ("02 · ORQUESTRAÇÃO",BLUE,["Camada de inteligência","Modelagem de regras","Cruzamento de dados","Governança & auditoria","Segurança & rastreio"]),
           ("03 · EXECUÇÃO",BLUE_MID,["Agentes de IA","Autorização","Copiloto & condutas","Codificação","Auditoria & glosa"]),
           ("04 · SAÍDA",GREEN,["Dashboards & ações","Governança clínica","Revisão humana","Documentos assinados","Dados → TOTVS (fatura)"])]
    gap=8; cw=(CW-3*gap)/4; ch=152; top=y
    for i,(hd,col,items) in enumerate(colsd):
        bx=ML+i*(cw+gap)
        rrect(bx,top-ch,cw,ch,7,fill=PAPER,stroke=G300,sw_=0.7)
        c.saveState(); p=c.beginPath(); p.roundRect(bx,top-ch,cw,ch,7); c.clipPath(p,stroke=0,fill=0)
        c.setFillColorRGB(*col); c.rect(bx,top-22,cw,22,fill=1,stroke=0); c.restoreState()
        text(bx+10,top-15,hd,F["monomed"],7.2,WHITE,tracking=0.8)
        text(bx+10,top-38,items[0],F["bold"],8.6,CHUMBO)
        iy=top-54
        for it in items[1:]:
            c.setFillColorRGB(*col); c.rect(bx+10,iy+1.4,3,3,fill=1,stroke=0)
            for ln in wrap(it,F["reg"],8,cw-26): text(bx+18,iy,ln,F["reg"],8,G700); iy-=10.5
            iy-=4
        if i<3: text(bx+cw+0.6,top-ch/2-4,"›",F["bold"],12,BLUE_LIGHT)
    y=top-ch-22
    note_box(y,"COMO SE CONECTA","Bases clínicas, protocolos, contratos e tabelas alimentam o motor de regras — sempre respeitando o sistema hospitalar atual, com validação humana nos pontos críticos.")
    c.showPage()

# ---- CONTEXT · MAPA DE AGENTES ----
def agents_map_page():
    global pageno,SECTION; pageno+=1; SECTION="Contexto"
    chrome(pageno,TOTAL)
    y=PAGE_H-92
    kicker(ML,y,"Contexto · Agentes de IA"); y-=28
    head(ML,y,"Um ecossistema de agentes.","ecossistema"); y-=18
    text(ML,y,"Cada etapa da jornada tem agentes dedicados — auditáveis e com validação humana nos pontos críticos.",F["med"],10,G700); y-=22
    groups=[("RECEPÇÃO & AUTORIZAÇÃO",["validador-elegibilidade-convenio","ocr-carteirinha"]),
            ("CONSULTA & CONDUTA · COPILOTO",["sugestor-condutas","validador-pertinencia","validador-interacao-medicamentosa","analise-exames-laboratoriais","transcricao-stt"]),
            ("CODIFICAÇÃO",["codificador-cid","codificador-tuss","validador-cbhpm"]),
            ("AUDITORIA & GLOSA",["auditor-protocolo","auditor-glosa-preventiva"]),
            ("CONTRATOS & PROTOCOLOS",["ingestor-contrato-pdf","parser-tuss-cbhpm","parser-carencias-elegibilidade","indexador-protocolo"]),
            ("RELACIONAMENTO & GOVERNANÇA",["motor-reguas","hipoteses-diagnosticas-probabilisticas"])]
    gap=10; cw=(CW-gap)/2
    def gh(items): return 22+len(items)*13+10
    left=[0,2,4]; right=[1,3,5]; colx=[ML,ML+cw+gap]
    bottoms=[]
    for ci,idxs in enumerate([left,right]):
        cx=colx[ci]; cyy=y
        for gi in idxs:
            hd,items=groups[gi]; h=gh(items)
            rrect(cx,cyy-h,cw,h,6,fill=PAPER,stroke=G300,sw_=0.7)
            c.setFillColorRGB(*BLUE); c.rect(cx,cyy-h,2.6,h,fill=1,stroke=0)
            text(cx+11,cyy-15,hd,F["monomed"],7,BLUE,tracking=1.2)
            iy=cyy-30
            for aid in items:
                text(cx+11,iy,"›",F["bold"],8,BLUE_LIGHT)
                text(cx+20,iy,aid,F["monomed"],7.8,BLUE_DEEP); iy-=13
            cyy-=h
            bottoms.append(cyy)
            cyy-=gap
    yb=min(bottoms)-22
    note_box(yb,"GOVERNANÇA DOS AGENTES","Toda execução fica registrada em log imutável (ver Auditoria de IA), com conformidade LGPD/CFM e detecção de comportamento anômalo.")
    c.showPage()

# =====================================================================
# BUILD
# =====================================================================
cover()
intro()
for roman,title,desc,screens,stats in SECTIONS:
    divider(roman,title,desc,stats)
    label=f"Parte {roman}"
    for d in screens:
        screen_page(d,label)
closing()
c.save()
print("PAGES expected:",TOTAL,"-> generated pages:",pageno)
print("OK ->",OUT, os.path.getsize(OUT)//1024,"KB")
