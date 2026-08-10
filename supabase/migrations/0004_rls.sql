-- =============================================================================
-- Sales Brain 2.0 — M1 · Migration 0004
-- Row Level Security: TUDO fechado por padrão; acesso apenas para usuário
-- autenticado com perfil APROVADO. Administração restrita ao papel admin.
-- (O service_role — script de migração e ações de servidor — ignora RLS.)
-- =============================================================================

-- ---------- Funções auxiliares ----------
create or replace function public.perfil_aprovado()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and status = 'aprovado'
  );
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and status = 'aprovado' and papel = 'admin'
  );
$$;

-- ---------- Habilita RLS em todas as tabelas ----------
alter table public.perfis enable row level security;
alter table public.parceiros enable row level security;
alter table public.contas enable row level security;
alter table public.contatos enable row level security;
alter table public.oportunidades enable row level security;
alter table public.oportunidade_movimentos enable row level security;
alter table public.closing_date_historico enable row level security;
alter table public.atividades enable row level security;
alter table public.papeis_no_deal enable row level security;
alter table public.meddic_scorecards enable row level security;
alter table public.metas enable row level security;
alter table public.conhecimento enable row level security;
alter table public.jornadas_cliente enable row level security;
alter table public.propostas_de_atualizacao enable row level security;
alter table public.solicitacoes_acesso enable row level security;
alter table public.audit_log enable row level security;

-- ---------- perfis ----------
-- cada um vê o próprio perfil (mesmo pendente, para a tela de acesso-pendente);
-- aprovados veem todos (nomes de responsáveis); só admin altera papel/status.
create policy perfis_select on public.perfis
  for select to authenticated
  using (id = auth.uid() or public.perfil_aprovado());

create policy perfis_update_admin on public.perfis
  for update to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

-- ---------- tabelas de negócio: CRUD completo para perfil aprovado ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'parceiros','contas','contatos','oportunidades','oportunidade_movimentos',
    'closing_date_historico','atividades','papeis_no_deal','meddic_scorecards',
    'metas','conhecimento','jornadas_cliente','propostas_de_atualizacao'
  ]
  loop
    execute format(
      'create policy %I_aprovados on public.%I
         for all to authenticated
         using (public.perfil_aprovado())
         with check (public.perfil_aprovado())',
      t, t
    );
  end loop;
end;
$$;

-- ---------- solicitações de acesso: apenas admin (inserts vêm do servidor) ----------
create policy solicitacoes_admin on public.solicitacoes_acesso
  for all to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

-- ---------- audit log: leitura só para admin; escrita só via triggers ----------
create policy audit_select_admin on public.audit_log
  for select to authenticated
  using (public.eh_admin());
