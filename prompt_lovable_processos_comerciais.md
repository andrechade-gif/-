# PROMPT — LOVABLE: Aba "Processos Comerciais"

---

## CONTEXTO GERAL

Estou construindo um CRM para uma empresa de SaaS de saúde (Doutor-AI). Preciso de uma aba chamada **"Processos Comerciais"** que funciona como um checklist de acompanhamento da jornada de cada cliente ao longo do funil comercial, desde a prospecção até o handoff para a equipe de Onboarding/CS/Implantação.

---

## FEATURE: Aba "Processos Comerciais"

### OBJETIVO
Mostrar, para cada cliente selecionado, todas as etapas do processo comercial em ordem numerada. Cada etapa tem um input (o que precisa existir para iniciá-la) e um output (o que deve ser gerado ao concluí-la). O sistema bloqueia automaticamente etapas futuras enquanto as anteriores não forem concluídas. As etapas são preenchidas automaticamente conforme o estágio do cliente no funil.

---

### LAYOUT DA ABA

**Barra de filtros fixa no topo:**
- Seletor de Cliente (busca por nome ou CNPJ)
- Filtro por Responsável (AE / SDR)
- Filtro por Fase do Funil: `Target List` | `Lead` | `SQL` | `Oportunidade` | `Fechado-Ganho`
- Filtro por Status: `Com pendências` | `Em dia` | `Handoff pronto`

**Painel do cliente selecionado:**
- Nome, Hospital/Operadora, AE responsável, SDR, data de entrada no funil, fase atual
- Barra de progresso por fase (% concluído de: Prospecção · Pré-venda · Contratação · Onboarding)
- Alerta visual em vermelho se houver etapa obrigatória bloqueando avanço de fase

**Lista de processos (numerada, rolável):**
Cada item da lista exibe:
- Número e nome da etapa
- Badge de status: `🔒 Bloqueada` | `⬜ Pendente` | `🔄 Em andamento` | `✅ Concluída` | `⏭ N/A`
- Input exigido
- Output esperado
- Responsável
- Campo "Output realizado" (texto livre, preenchível pelo usuário)
- Campo "Data de conclusão" (date picker)
- Campo "Observações"
- Botão `Marcar como Concluída` (só habilitado se etapa anterior estiver ✅)
- Para etapas de HANDOFF: botão `Confirmar Handoff` (só habilitado se TODOS os itens do grupo anterior estiverem ✅)

---

### REGRAS DE NEGÓCIO (OBRIGATÓRIAS)

1. **Bloqueio sequencial obrigatório:** nenhuma etapa pode ser marcada como concluída sem que todas as anteriores estejam ✅. Exibir mensagem de erro: *"Complete a etapa [N] antes de avançar."*

2. **Desbloqueio automático por estágio do funil:**
   - Cliente em `Target List` → Etapas 1–6 desbloqueadas
   - Cliente em `Lead / SQL` → Etapas 1–15 desbloqueadas
   - Cliente em `Oportunidade` → Etapas 1–19 desbloqueadas
   - Cliente em `Fechado-Ganho` → Todas as etapas (1–32) desbloqueadas

3. **Handoffs como checkpoints:** etapas 7, 16, 20 e 32 são marcos de handoff. Para confirmá-los, 100% das etapas do grupo anterior devem estar ✅. Ao confirmar, o sistema atualiza automaticamente a fase do cliente no funil.

4. **Alerta de avanço sem conclusão:** se o usuário tentar mover o cliente para a próxima fase sem confirmar o handoff correspondente, exibir modal de aviso listando as pendências.

5. **Preenchimento automático de campos:** se o CRM já possui dados do cliente (nome do sponsor, data da discovery call, nome do AE), pré-preencher os campos de output correspondentes com essas informações.

6. **Histórico imutável:** uma vez que uma etapa é marcada como ✅, ela não pode ser desmarcada diretamente — apenas via ação de "Reabrir etapa" com campo de justificativa obrigatório.

---

### MODELO DE DADOS

Cada etapa concluída registra:
```
{
  client_id: string,
  stage_number: number,
  stage_name: string,
  status: "pending" | "in_progress" | "completed" | "na",
  input_confirmed: boolean,
  output_value: string,       // o que foi gerado / produzido
  completed_at: timestamp,
  completed_by: string,       // usuário do CRM
  notes: string
}
```

---

### LISTA COMPLETA DE ETAPAS (NUMERADAS)

> As etapas em negrito marcadas com 🔀 são marcos de HANDOFF. Todas as demais são etapas executáveis com input e output.

---

#### FASE 1 — PROSPECÇÃO & QUALIFICAÇÃO
*(Desbloqueada a partir de: Target List)*

**1. Determinar metas e métricas comerciais**
- Input: ICP definido (Hospitais 200+ leitos, Operadoras, B2P)
- Output: Account plan inicial com stakeholders mapeados
- Responsável: AE

**2. Pesquisar conta-alvo e mapear stakeholders (CEO, COO, CIO)**
- Input: CRM enterprise + LinkedIn Sales Nav atualizado
- Output: Resposta do prospect ou disqualify documentado
- Responsável: SDR

**3. Executar cadência outbound (e-mail + LinkedIn + telefone)**
- Input: MQLs de marketing · lista ABM
- Output: SQL qualificado (BANT · DC clínico preenchido)
- Responsável: SDR

**4. Agendar discovery call com CMO/sponsor**
- Input: SQL com champion identificado
- Output: Discovery call agendada + agenda enviada ao prospect
- Responsável: SDR · AE

**5. Registrar account plan e próximos passos no CRM**
- Input: Histórico da conta · sinais de intenção
- Output: Account plan estruturado e salvo no CRM
- Responsável: SDR

**6. Revisão de CRM e forecast preditivo de win rate (modelo ML)**
- Input: Volumetria histórica + modelo treinado
- Output: Score preditivo registrado no CRM por deal
- Responsável: AE

---

**🔀 7. HANDOFF — Prospecção → Pré-venda Clínica**
- Critério de confirmação: SQL qualificado ✅ · Account plan no CRM ✅ · Discovery agendada ✅
- Ação: sistema move cliente para estágio `Lead/SQL` e desbloqueia etapas 8–15

---

#### FASE 2 — PRÉ-VENDA CLÍNICA & DEMO
*(Desbloqueada a partir de: Lead / SQL)*

**8. Coletar brief técnico-clínico do prospect (durante discovery call)**
- Input: Sponsor cliente disponível para call
- Output: Brief documentado (módulos · volumetria · painel)
- Responsável: BDR

**9. Customizar deck clínico com cases do segmento**
- Input: Discovery realizada · sponsor disponível
- Output: Deck custom com KPIs do segmento do cliente
- Responsável: BDR

**10. Conduzir demo guiada (AE + Clinical Specialist)**
- Input: Brief clínico · biblioteca de cases
- Output: Demo realizada + perguntas do cliente mapeadas
- Responsável: BDR

**11. Responder DC clínico-regulatório**
- Input: Deck custom com KPIs · ambiente sandbox configurado
- Output: DC respondido + anexos enviados ao cliente
- Responsável: BDR

**12. Obter sign-off do CMO Doutor-AI no whitepaper aplicado**
- Input: DPO + Medical Director disponíveis
- Output: Whitepaper assinado pelo CMO
- Responsável: Medical Director

**13. Construir relatório de cliente 300d com dados anonimizados**
- Input: TI do prospect disponível + amostra de dados anonimizada
- Output: Relatório de pilot com KPIs reais do cliente
- Responsável: Medical Director

**14. Painel interativo de simulação de impacto financeiro**
- Input: Modelo de elasticidade + UI calculadora disponível
- Output: Simulador de ROI executivo apresentado ao prospect
- Responsável: Medical Director

**15. Montar proposta com módulos, volumetria e pricing**
- Input: Catálogo de pricing atualizado · escopo técnico-clínico validado
- Output: Proposta v1 com pricing por módulo enviada internamente
- Responsável: AE

---

**🔀 16. HANDOFF — Pré-venda → Contratação & Fechamento**
- Critério de confirmação: Proposta v1 montada ✅ · Brief clínico coletado ✅ · Sign-off CMO obtido ✅
- Ação: sistema move cliente para estágio `Oportunidade` e desbloqueia etapas 17–19

---

#### FASE 3 — CONTRATAÇÃO & FECHAMENTO
*(Desbloqueada a partir de: Oportunidade)*

**17. Apresentar e enviar proposta ao cliente**
- Input: Proposta v1 com pricing por módulo
- Output: Aprovação interna registrada · proposta enviada
- Responsável: AE

**18. Negociar contrato com cliente**
- Input: Comitê de pricing disponível · agenda CFO/CEO confirmada
- Output: MSA acordado entre as partes · aprovação interna registrada
- Responsável: AE

**19. Assinar Contrato + Order Form e lançar booking no CRM/ERP**
- Input: Jurídico do cliente disponível · versões finais do MSA e OF
- Output: Booking no CRM/ERP + anúncio interno disparado
- Responsável: AE

---

**🔀 20. HANDOFF COMERCIAL ⭐ — Contratação → Onboarding**
- Critério de confirmação: Contrato assinado ✅ · Order Form assinado ✅ · Booking registrado no CRM/ERP ✅
- Ação: sistema move cliente para `Fechado-Ganho`, notifica CS + Implantação + Med + Ops + Financeiro, desbloqueia etapas 21–31

---

#### FASE 4 — ONBOARDING: PÓS-FECHAMENTO & HANDOVER INTERNO
*(Desbloqueada a partir de: Fechado-Ganho)*

**21. AE cria linha na Planilha de Gestão de Contratos (1 linha por cliente)**
- Input: AE com sales notes atualizados · MSA e Order Form assinados
- Output: Checklist de fecha-porta concluído · dossiê base publicado
- Responsável: AE · CSM

**22. CS cria linha na Planilha de Planejamento de Recebimentos**
- Input: Template de Gestão de Contratos preenchido · resumo do contrato
- Output: Planilha de Planejamento de Recebimentos atualizada
- Responsável: AE · CSM

**23. AE envia e-mail de boas-vindas ao cliente (sponsor + champions)**
- Input: Template de boas-vindas · MSA/OF assinados · contatos do cliente
- Output: E-mail de boas-vindas disparado e registrado
- Responsável: AE · CSM

**24. Enviar e-mail interno de handover (AE → CS · Impl · Med · Ops · Fin)**
- Input: Sales notes atualizados · histórico do deal no CRM
- Output: E-mail interno de handover registrado e confirmado
- Responsável: AE · CSM

**25. Head Implantação preenche matriz de capacity e aloca squad**
- Input: Head Implantação disponível · matriz de capacity atual · Order Form
- Output: Ficha de alocação do squad publicada no dossiê do cliente
- Responsável: AE · CSM

**26. Agendar reunião interna de entrega (área de alocação de squads)**
- Input: Agenda CS · Impl · Med · Ops disponível · e-mail de dossiê enviado
- Output: Ata da reunião interna + dúvidas mapeadas por área
- Responsável: AE · CSM

**27. Abrir protocolo do cliente (pasta Drive + canal Slack #cli-[nome])**
- Input: Templates de protocolo · acesso Slack e Ops · cliente confirmado no CRM/ERP
- Output: Protocolo aberto · 4 canais ativos · estrutura padrão criada no Drive
- Responsável: AE · CSM

**28. Preparar questionário pré-Kickoff (Clínica / Técnica / Produto / CS)**
- Input: Reunião interna concluída · template padrão de perguntas · dúvidas da reunião
- Output: Questionário customizado pronto no Drive
- Responsável: AE · CSM

**29. Enviar questionário pré-kickoff ao cliente (sponsor + champions)**
- Input: Questionário preparado e aprovado internamente
- Output: E-mail enviado ao cliente com questionário e prazo combinado
- Responsável: AE · CSM

**30. Cliente responde + squad consolida e revisa respostas por área**
- Input: Cliente respondeu no prazo · respostas recebidas
- Output: Respostas consolidadas no dossiê · pendências mapeadas
- Responsável: AE · CSM

**31. Agendar Kickoff oficial com sponsor + diretoria do cliente (4h, presencial)**
- Input: Questionário respondido e revisado · agenda do sponsor confirmada
- Output: Kickoff agendado · convite com pre-reading enviado
- Responsável: AE · CSM

---

**🔀 32. HANDOFF FINAL ⭐ — Onboarding → CS + Implantação**
- Critério de confirmação: Kickoff agendado ✅ · Questionário revisado ✅ · Squad alocado ✅ · Canal Slack aberto ✅ · Protocolo Drive criado ✅
- Ação: sistema notifica CS + Implantação e encerra responsabilidade comercial

---

### COMPONENTES VISUAIS ESPERADOS

- **Status badge por etapa:** pill colorido (cinza = bloqueada, amarelo = pendente, azul = em andamento, verde = concluída)
- **Handoff cards:** destaque visual diferente (fundo verde escuro, ícone de seta) separando as fases
- **Contador de progresso por fase:** ex. "Prospecção: 5/6 ✅ · Pré-venda: 2/8 🔄"
- **Painel lateral (drawer):** ao clicar em uma etapa, abre painel com todos os campos editáveis sem sair da lista
- **Histórico de alterações:** log compacto no drawer mostrando quem alterou e quando
- **Exportar:** botão para exportar a lista de processos do cliente em PDF

---

### NOTIFICAÇÕES

- Quando uma etapa é marcada como concluída pelo AE, notificar o responsável da próxima etapa
- Quando um Handoff (etapas 7, 16, 20, 32) é confirmado, enviar notificação para os times envolvidos com resumo do cliente

---
