# Sales Brain 2.0 — Doutor-AI

> Este arquivo é o manual de bordo do projeto. Os módulos seguintes (M2–M10) DEVEM lê-lo
> antes de qualquer alteração e atualizá-lo ao final (estado dos módulos + mapa do projeto).
> Documento de referência do produto: `docs/BLUEPRINT.md` (blueprint M0 aprovado, decisões D1–D9).

## Visão do produto

O Sales Brain 2.0 é a plataforma de inteligência comercial da Doutor-AI — healthtech de
orquestração clínica (produtos: PS Inteligente, Ambulatório, Ciclo da Receita, Medicina
Inteligente) que vende para hospitais, operadoras verticalizadas e planos de saúde. A venda é
B2B complexa: ciclo de ~6 meses, decisão por comitê, MEDDIC + Challenger como método. O usuário
principal é André Chade, Diretor Comercial e único vendedor hoje — a plataforma nasce para uso
solo, com blueprint para o time futuro.

Mais que um CRM, é a centralizadora da inteligência comercial. O diferencial (módulos futuros)
é o preenchimento automático a partir de conversas reais: transcrições de reuniões entram, a IA
extrai entidades e campos de qualificação, e o André aprova cada atualização antes de qualquer
escrita no banco (humano no loop, sempre). Dois eixos estruturais: Conta (organização, funil de
prospecção) e Oportunidade (deal, funil de vendas em 6 etapas com estados ortogonais
aberta/ganha/perdida/on-hold). Métrica-mestre: novo MRR contratado (D3/D4). TCV é sempre
calculado, nunca digitado.

## Stack (decisão D9)

- **Next.js 15** (App Router, TypeScript, React 19) + **Tailwind CSS 3**
- **Supabase** novo e dedicado: PostgreSQL + Auth (Google OAuth restrito a @doutor-ai.com,
  e-mail/senha como fallback) + Storage. O Supabase do Sales Brain 1.0 (Lovable) NÃO é tocado —
  é apenas fonte de migração.
- **Deploy:** Vercel, time `doutor-ai` (team_id `team_QaQY1mMErKIGd0d5SBJnTBa4`).
  Domínio futuro: `salesbrain.doutor-ai.com` (CNAME → `cname.vercel-dns.com`).
- Drag-and-drop do funil: `@hello-pangea/dnd`. Ícones: `lucide-react`.
- Migração de dados: `migration/import.ts` (rodar com `npm run migrate`; usa `tsx` + service role).

## Convenções de código e nomenclatura

- **Idioma:** interface 100% em português brasileiro. Tabelas, colunas e enums do banco em
  português (dicionário: `docs/BLUEPRINT.md` §3). Código (variáveis/funções) em português quando
  espelha domínio (`oportunidade`, `etapa`), inglês só para termos técnicos consagrados.
- **Banco:** todos os objetos têm `id uuid pk default gen_random_uuid()`, `created_at`,
  `updated_at` (trigger). RLS habilitado em TUDO — acesso só para usuário autenticado com perfil
  `aprovado` (funções `perfil_aprovado()` / `eh_admin()`). Migrations SQL versionadas em
  `supabase/migrations/` (numeradas, nunca editar migration já aplicada — criar nova).
- **Auditoria:** toda mutação nas tabelas de negócio gera linha em `audit_log` via trigger.
- **Preservação:** dados migrados do 1.0 carregam `legado_id_1_0` (idempotência) e
  `origem_1_0 jsonb` (campos sem equivalente — nada é descartado).
- **Next.js:** App Router com rotas em `app/`; páginas autenticadas vivem no grupo
  `app/(app)/`; mutações via Server Actions em `lib/actions/`; cliente Supabase:
  `lib/supabase/client.ts` (navegador), `server.ts` (RSC/actions), `admin.ts` (service role,
  só servidor). Componentes em `components/<área>/`.
- **Domínio:** taxonomias, labels e critérios de saída das etapas centralizados em
  `lib/dominio.ts` — nunca duplicar strings de enum na UI.
- **Datas** em `timestamptz`; moeda em `numeric` (reais, sem centavos na UI). Formatação:
  `lib/formato.ts` (`fmtBRL`, `fmtData`, …).

## Design tokens (design system Doutor-AI, extraído do 1.0 — D5)

Definidos como variáveis CSS em `app/globals.css` e mapeados em `tailwind.config.ts`:

- **Primária** (azul-médico profundo): `hsl(210 70% 35%)` → `--primary`
- **Accent** (teal): `hsl(175 60% 40%)` → `--accent`
- **Sidebar escura** em azul profundo (`hsl(213 55% 12%)`) com conteúdo claro; app com dark mode
  completo (toggle, classe `dark` no `<html>`, persistido em `localStorage("sb-tema")`)
- **Radius:** `0.75rem` (`--radius`); sombras suaves (`shadow-soft`, `shadow-card`)
- **Camada editorial:** labels/kickers em monospace uppercase com tracking largo (classe
  `.kicker`); números SEMPRE tabulares (`font-variant-numeric: tabular-nums`, classe `.tnum`)
- **KPI tiles** com borda de accent à esquerda (classe `.kpi-tile`); **pills** de status
  (classe `.pill`)
- Estética sóbria e profissional de healthtech; sem gradientes chamativos.

## Estado dos módulos

| Módulo | Escopo (blueprint §5) | Estado |
|---|---|---|
| M1 | Fundação técnica + Funil de Vendas + migração 1.0 + auth + deploy | 🔄 **em construção** (esta sessão) |
| M2 | Prospecção (board de contas) + perfil completo de Conta + UI de stakeholders | ⬜ pendente |
| M3 | UI de MEDDIC scorecard + cobertura do comitê + briefing pré-reunião | ⬜ pendente |
| M4 | Ingestão automática (Drive/Read AI/Plaud) + extração LLM + Inbox de Aprovações | ⬜ pendente |
| M5 | Metas & Forecast (funil reverso, commit/best case/pipeline, coverage) | ⬜ pendente |
| M6 | Performance (dashboard executivo) | ⬜ pendente |
| M7 | Parceiros (gestão, tiers, pipeline por parceiro) | ⬜ pendente |
| M8 | Marketing & Demanda (target list, cadências, eventos, CAC) | ⬜ pendente |
| M9 | Estratégia & Conhecimento + copiloto comercial | ⬜ pendente |
| M10 | WhatsApp / Gmail bidirecional + copiloto ao vivo | ⬜ pendente |

Schemas que já nasceram no M1 mas só ganham UI depois: `papeis_no_deal` (M2),
`meddic_scorecards` (M3), `propostas_de_atualizacao` (M4), `jornadas_cliente` (integração
Portal CS), `metas` (M5), `parceiros` (M7), `conhecimento` (M9).

## Deploy

1. **Env vars** (ver `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only),
   `NEXT_PUBLIC_SITE_URL`. Segredos NUNCA commitados.
2. **Banco:** aplicar `supabase/migrations/*.sql` em ordem (SQL Editor do Supabase ou
   `supabase db push` com projeto linkado).
3. **Vercel:** projeto no time `doutor-ai` conectado a este repositório; build padrão Next.js;
   configurar as env vars acima (Production + Preview); domínio `salesbrain.doutor-ai.com`
   (CNAME `salesbrain` → `cname.vercel-dns.com` no DNS de doutor-ai.com).
4. **Auth:** no Supabase, habilitar provider Google (credenciais do Google Cloud Console com
   redirect `https://<projeto>.supabase.co/auth/v1/callback`); em Auth → URL Configuration,
   Site URL = URL de produção e Redirect URLs incluindo `https://*.vercel.app/**` e
   `http://localhost:3000/**`. A restrição de domínio @doutor-ai.com é aplicada **no servidor**
   (`app/auth/callback/route.ts` + layout autenticado) e no banco (trigger de novo usuário).
5. **Migração de dados:** exports CSV do 1.0 em `migration/exports/` → `npm run migrate` →
   conferir `migration/relatorio.md` (zero perda) e `migration/relatorio-duplicatas.md`.

Passo a passo completo para não-desenvolvedores: `docs/SETUP.md`.

## Mapa do projeto para não-desenvolvedores

```
sales-brain/
├── CLAUDE.md                ← este manual (os próximos módulos leem e atualizam)
├── docs/
│   ├── BLUEPRINT.md         ← o blueprint do produto (M0): decisões, dicionário, métricas
│   └── SETUP.md             ← passo a passo do André: Supabase, Google, Vercel, migração
├── app/                     ← as TELAS. Cada pasta = um endereço no navegador
│   ├── login/               ← /login (capa com "Entrar com Google")
│   ├── auth/callback/       ← bastidor do login (troca o código do Google por sessão
│   │                          e aplica a regra do @doutor-ai.com no servidor)
│   ├── acesso-pendente/     ← página de quem entrou mas ainda não foi aprovado
│   └── (app)/               ← tudo que exige login (o parêntese só agrupa, não vira URL)
│       ├── home/            ← /home (KPIs do dia)
│       ├── funil/           ← /funil (o kanban de 6 etapas — a tela principal do M1)
│       ├── oportunidade/[id]/ ← /oportunidade/<id> (detalhe do deal, timeline, históricos)
│       ├── migracao/pendencias/ ← recategorização dos on-hold vindos do 1.0
│       └── config/acessos/  ← admin aprova/nega solicitações de acesso
├── components/              ← as PEÇAS visuais reutilizadas pelas telas
│   ├── layout/              ← sidebar escura, header, busca global, menu do usuário, tema
│   ├── funil/               ← board, cards, filtros e os modais (mover/on-hold/perda/ganha)
│   ├── oportunidade/        ← timeline, históricos, formulário de edição
│   └── ui/                  ← peças pequenas (botão, modal, pill, KPI tile…)
├── lib/                     ← a LÓGICA que não é tela
│   ├── dominio.ts           ← dicionário do negócio: etapas, critérios de saída, motivos, labels
│   ├── formato.ts           ← formatação de moeda/data/dias em pt-BR
│   ├── tipos.ts             ← "formulários" TypeScript de cada tabela do banco
│   ├── actions/             ← ações do servidor (mover etapa, marcar ganha, aprovar acesso…)
│   └── supabase/            ← as 3 formas de falar com o banco (navegador/servidor/admin)
├── middleware.ts            ← porteiro global: sem sessão → /login
├── supabase/migrations/     ← as "plantas" do banco de dados, em ordem numerada:
│   │                          cada arquivo é uma mudança de estrutura que roda uma vez
│   ├── 0001_…extensoes_enums.sql   ← tipos/listas fixas (etapas, motivos, produtos…)
│   ├── 0002_…tabelas.sql           ← as 16 tabelas do M1
│   ├── 0003_…funcoes_triggers.sql  ← automações (updated_at, auditoria, novo usuário)
│   └── 0004_…rls.sql               ← regras de segurança linha a linha (quem vê o quê)
├── migration/               ← a MUDANÇA do 1.0 para cá
│   ├── exports/             ← onde o André deposita os CSVs exportados do 1.0 (não commitados)
│   ├── import.ts            ← o script (npm run migrate) — idempotente, zero perda
│   ├── relatorio.md         ← gerado pelo script: contagens origem × destino, justificativas
│   └── relatorio-duplicatas.md ← gerado: possíveis contas duplicadas para revisão humana
├── apresentacao/ + *.pdf/pptx  ← material comercial de sessão anterior (não faz parte do app)
└── package.json             ← lista de bibliotecas e comandos (dev/build/migrate)
```
