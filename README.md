# Sales Brain 2.0

Plataforma de inteligência comercial da **Doutor-AI**. Módulo 1: fundação técnica +
Funil de Vendas + migração do Sales Brain 1.0.

- **Manual do projeto (leia primeiro):** [`CLAUDE.md`](./CLAUDE.md)
- **Blueprint do produto (M0):** [`docs/BLUEPRINT.md`](./docs/BLUEPRINT.md)
- **Guia de configuração passo a passo:** [`docs/SETUP.md`](./docs/SETUP.md)

## Comandos

```bash
npm install       # instala dependências
npm run dev       # roda em http://localhost:3000
npm run build     # build de produção
npm run migrate   # migra os dados do 1.0 (CSVs em migration/exports/)
```

Stack: Next.js 15 (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres,
Auth, RLS) · Vercel.

> A pasta `apresentacao/` e os PDFs na raiz são material comercial de uma sessão
> anterior — não fazem parte do app.
