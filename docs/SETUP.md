# Guia de configuração — Sales Brain 2.0 (para o André)

Este é o passo a passo para colocar o app no ar. São 5 blocos, nesta ordem:
**1) Supabase → 2) Banco de dados → 3) Google OAuth → 4) Vercel → 5) Migração dos dados.**
Tempo estimado total: 40–60 minutos. Nada aqui exige programar — é clicar e copiar/colar.

> Dica: abra este arquivo no GitHub e vá marcando os checkboxes mentalmente.
> Se algo der errado, copie a mensagem de erro e cole na próxima sessão do Claude.

---

## 1. Criar o projeto Supabase (o banco de dados novo)

O Sales Brain 2.0 usa um Supabase **novo e dedicado** — o Supabase do 1.0 (Lovable)
não é tocado.

1. Acesse https://supabase.com/dashboard e entre (ou crie conta gratuita).
2. **New project**:
   - Organization: a sua (crie uma "Doutor-AI" se não houver).
   - Name: `sales-brain`
   - Database password: gere uma forte e **guarde no gerenciador de senhas**
     (não vamos usá-la no dia a dia, mas é a chave-mestra do banco).
   - Region: **South America (São Paulo)** — `sa-east-1`.
   - Plano Free está ok para começar.
3. Aguarde ~2 minutos até o projeto ficar verde ("Project is ready").
4. Vá em **Project Settings (engrenagem) → API** e copie 3 valores:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (em "Project API keys") → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (clique em "Reveal") → será `SUPABASE_SERVICE_ROLE_KEY`
     ⚠ A service_role é SECRETA: nunca colar em site, chat público ou commit.

## 2. Criar as tabelas (rodar as migrations)

As "plantas" do banco estão em `supabase/migrations/` neste repositório — 4 arquivos
numerados. Vamos executá-los **em ordem** no editor SQL do Supabase:

1. No painel do projeto: **SQL Editor → New query**.
2. Abra o arquivo `supabase/migrations/0001_extensoes_e_enums.sql` (no GitHub),
   copie TODO o conteúdo, cole no editor e clique **Run**. Deve terminar com "Success".
3. Repita, na ordem, com:
   - `0002_tabelas.sql`
   - `0003_funcoes_e_triggers.sql`
   - `0004_rls.sql`
4. Conferência rápida: em **Table Editor** devem aparecer 16 tabelas
   (perfis, contas, contatos, oportunidades, oportunidade_movimentos, …).

> Erro no meio de um arquivo? Rode de novo a partir do arquivo que falhou —
> me chame com a mensagem de erro se não for óbvio.

## 3. Login com Google (restrito a @doutor-ai.com)

Duas partes: criar a credencial no Google e ativar o provider no Supabase.

### 3a. Google Cloud Console

1. Acesse https://console.cloud.google.com com sua conta @doutor-ai.com.
2. Crie um projeto (topo da tela → New project) chamado `sales-brain` (ou use um existente da Doutor-AI).
3. Menu ☰ → **APIs & Services → OAuth consent screen**:
   - User type: **Internal** (só contas do Workspace doutor-ai.com — reforça a restrição).
   - App name: `Sales Brain` · e-mail de suporte: o seu. Salve.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application** · Name: `Sales Brain`
   - Em **Authorized redirect URIs**, adicione (troque `SEU-PROJETO` pelo subdomínio
     real que aparece na Project URL do Supabase, ex.: `abcdxyz.supabase.co`):
     ```
     https://SEU-PROJETO.supabase.co/auth/v1/callback
     ```
   - Create → copie **Client ID** e **Client secret**.

### 3b. Supabase

1. Painel do Supabase → **Authentication → Sign In / Providers → Google**:
   - Enable ON · cole Client ID e Client secret · Save.
2. **Authentication → URL Configuration**:
   - **Site URL**: a URL de produção da Vercel (passo 4; volte aqui depois) —
     por ora pode usar `http://localhost:3000`.
   - **Redirect URLs** — adicione as três:
     ```
     http://localhost:3000/**
     https://*.vercel.app/**
     https://salesbrain.doutor-ai.com/**
     ```

> Como a restrição funciona (defesa em 3 camadas): o consent screen "Internal"
> barra contas fora do Workspace; o servidor do app (`app/auth/callback`) encerra a
> sessão de qualquer e-mail fora de @doutor-ai.com e registra a solicitação de
> acesso; e o banco (trigger + RLS) só dá acesso a perfil aprovado. Seu e-mail
> (andre.chade@doutor-ai.com) entra como **admin** automaticamente no primeiro login.

## 4. Vercel (colocar no ar)

O repositório GitHub já contém todo o código. Na Vercel:

1. https://vercel.com → time **doutor-ai** → **Add New → Project**.
2. **Import** o repositório `andrechade-gif/-` (se pedir, instale o GitHub app da Vercel).
   - Branch de produção: aceite a padrão por enquanto (dá para mudar em Settings →
     Git depois que o código for mesclado à branch principal).
3. Framework: Next.js (detectado sozinho). Não mude build/output.
4. **Environment Variables** — adicione as 4 (Production e Preview):
   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do passo 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public do passo 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role do passo 1 (secreta) |
   | `NEXT_PUBLIC_SITE_URL` | a URL do deploy (ex.: `https://sales-brain.vercel.app`) |
5. **Deploy**. Ao terminar, abra a URL — deve aparecer a capa do Sales Brain.
6. Volte ao Supabase (passo 3b) e ajuste o **Site URL** para essa URL da Vercel.
7. Teste: **Entrar com Google** com seu e-mail @doutor-ai.com → deve cair na Home.
   Teste também com um Gmail pessoal → deve voltar com "solicitação pendente".

### Domínio definitivo (quando quiser)

- Na Vercel: Project → Settings → Domains → add `salesbrain.doutor-ai.com`.
- Quem administra o DNS de `doutor-ai.com` cria: **CNAME `salesbrain` → `cname.vercel-dns.com`**.
- Depois, atualize `NEXT_PUBLIC_SITE_URL` e o Site URL do Supabase para o domínio novo.
- Enquanto o DNS não sai, o app funciona normalmente na URL `.vercel.app`.

## 5. Migrar os dados do Sales Brain 1.0

### 5a. Exportar os CSVs do 1.0

No painel do **Supabase do 1.0** (o do Lovable — só leitura, não mude nada lá):
**Table Editor → (tabela) → Export → Export data as CSV**, para cada uma:

`leads` · `target_list` · `opportunities` · `lead_stakeholders` · `stakeholders` ·
`partners` · `partner_contacts` (se existir) · `sales_goals` · `funnel_movements` ·
`closing_date_history` · `lead_contact_logs` · `opportunity_contact_logs` ·
`partner_contact_logs` · `copilot_knowledge` · `copilot_documents`

Se alguma tabela não existir, siga sem ela — o script registra no relatório.

### 5b. Rodar a migração

No seu computador (precisa do Node.js 20+; https://nodejs.org):

```bash
git clone https://github.com/andrechade-gif/-.git sales-brain
cd sales-brain
npm install

# crie o arquivo de ambiente com as chaves do passo 1:
cp .env.example .env.local
# → abra .env.local num editor de texto e preencha os 3 valores do Supabase

# coloque os CSVs exportados na pasta:
#   migration/exports/leads.csv, migration/exports/opportunities.csv, etc.
#   (o nome do arquivo deve ser o nome da tabela + .csv)

npm run migrate
```

O script é **idempotente**: rodar duas vezes não duplica nada. Ao final ele imprime
o resumo e grava dois arquivos:

- `migration/relatorio.md` — contagem origem × destino, o que ficou de fora e por quê
  (critério: zero perda), conferência de TCV e nº de deals a recategorizar;
- `migration/relatorio-duplicatas.md` — contas com nomes parecidos para você revisar
  (nada é fundido automaticamente).

### 5c. Depois da migração

1. Abra o app → **Funil**: os deals devem estar nas colunas certas, com MRR por coluna.
2. Menu lateral → **Migração** (aparece só enquanto houver pendência): recategorize
   os deals on-hold que vieram com motivo genérico do 1.0, um a um.
3. Confira o `migration/relatorio.md` e me traga qualquer linha de "não importados"
   que pareça errada.

---

## Resumo das URLs importantes

| O quê | Onde |
|---|---|
| App em produção | `https://<projeto>.vercel.app` → depois `https://salesbrain.doutor-ai.com` |
| Painel Supabase 2.0 | https://supabase.com/dashboard |
| Google Cloud (OAuth) | https://console.cloud.google.com → APIs & Services → Credentials |
| Painel Vercel | https://vercel.com (time doutor-ai) |
| Supabase 1.0 (Lovable) | somente leitura — fonte da migração |
