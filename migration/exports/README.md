# Exports do Sales Brain 1.0

Coloque aqui os CSVs exportados do Supabase do 1.0 (Table Editor → Export data as
CSV), **um arquivo por tabela, com o nome da tabela**:

```
leads.csv
target_list.csv
opportunities.csv
lead_stakeholders.csv
stakeholders.csv
partners.csv
partner_contacts.csv        (se existir)
sales_goals.csv
funnel_movements.csv
closing_date_history.csv
lead_contact_logs.csv
opportunity_contact_logs.csv
partner_contact_logs.csv
copilot_knowledge.csv
copilot_documents.csv
```

Depois rode `npm run migrate` na raiz do projeto (passo a passo: docs/SETUP.md §5).

⚠ Estes arquivos contêm dados reais de clientes (LGPD) — o `.gitignore` já impede
que sejam commitados. Não os envie por canais inseguros.
