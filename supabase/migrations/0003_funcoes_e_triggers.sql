-- =============================================================================
-- Sales Brain 2.0 — M1 · Migration 0003
-- Funções e triggers: updated_at, normalização de nomes, auditoria,
-- criação automática de perfil no primeiro login (com regra @doutor-ai.com).
-- =============================================================================

-- ---------- updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'perfis','parceiros','contas','contatos','oportunidades',
    'oportunidade_movimentos','closing_date_historico','atividades',
    'papeis_no_deal','meddic_scorecards','metas','conhecimento',
    'jornadas_cliente','propostas_de_atualizacao','solicitacoes_acesso'
  ]
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ---------- Normalização de nome de conta (chave canônica anti-duplicata) ----------
-- lower + trim + sem acentos + espaços colapsados
create or replace function public.normalizar_nome(entrada text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(trim(public.unaccent('public.unaccent'::regdictionary, coalesce(entrada, '')))),
    '\s+', ' ', 'g'
  );
$$;

create or replace function public.contas_normalizar_nome()
returns trigger
language plpgsql
as $$
begin
  new.nome_normalizado := public.normalizar_nome(new.nome);
  return new;
end;
$$;

create trigger trg_contas_normalizar_nome
  before insert or update of nome on public.contas
  for each row execute function public.contas_normalizar_nome();

-- ---------- Auditoria genérica (toda mutação de negócio vira linha em audit_log) ----------
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registro_id uuid;
begin
  if tg_op = 'DELETE' then
    v_registro_id := old.id;
    insert into public.audit_log (tabela, registro_id, acao, dados_antes, dados_depois, usuario_id)
    values (tg_table_name, v_registro_id, tg_op, to_jsonb(old), null, auth.uid());
    return old;
  elsif tg_op = 'UPDATE' then
    v_registro_id := new.id;
    insert into public.audit_log (tabela, registro_id, acao, dados_antes, dados_depois, usuario_id)
    values (tg_table_name, v_registro_id, tg_op, to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  else
    v_registro_id := new.id;
    insert into public.audit_log (tabela, registro_id, acao, dados_antes, dados_depois, usuario_id)
    values (tg_table_name, v_registro_id, tg_op, null, to_jsonb(new), auth.uid());
    return new;
  end if;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'perfis','parceiros','contas','contatos','oportunidades',
    'oportunidade_movimentos','closing_date_historico','atividades',
    'papeis_no_deal','meddic_scorecards','metas','conhecimento',
    'jornadas_cliente','propostas_de_atualizacao','solicitacoes_acesso'
  ]
  loop
    execute format(
      'create trigger trg_%s_auditoria after insert or update or delete on public.%I
         for each row execute function public.registrar_auditoria()',
      t, t
    );
  end loop;
end;
$$;

-- ---------- Perfil automático no primeiro login ----------
-- Regra de negócio (D8):
--   · e-mail @doutor-ai.com  → perfil APROVADO automaticamente (papel vendedor)
--   · andre.chade@doutor-ai.com → ADMIN aprovado (seed do André)
--   · qualquer outro e-mail  → perfil PENDENTE + solicitação de acesso registrada
--   · se já existe solicitação APROVADA para o e-mail → perfil aprovado
-- A restrição também é aplicada no servidor do app (auth/callback + layout).
create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_dominio_ok boolean;
  v_pre_aprovado boolean;
begin
  v_nome := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1)
  );
  v_dominio_ok := new.email ilike '%@doutor-ai.com';
  select exists (
    select 1 from public.solicitacoes_acesso
    where lower(email) = lower(new.email) and status = 'aprovada'
  ) into v_pre_aprovado;

  insert into public.perfis (id, nome, email, papel, status)
  values (
    new.id,
    v_nome,
    lower(new.email),
    case when lower(new.email) = 'andre.chade@doutor-ai.com' then 'admin'::public.perfil_papel
         else 'vendedor'::public.perfil_papel end,
    case when v_dominio_ok or v_pre_aprovado then 'aprovado'::public.perfil_status
         else 'pendente'::public.perfil_status end
  )
  on conflict (id) do nothing;

  -- e-mail de fora do domínio sem aprovação prévia → registra a solicitação
  if not v_dominio_ok and not v_pre_aprovado then
    insert into public.solicitacoes_acesso (nome, email, status)
    values (v_nome, lower(new.email), 'pendente')
    on conflict (email) do nothing;
  end if;

  return new;
end;
$$;

create trigger trg_auth_novo_usuario
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();
