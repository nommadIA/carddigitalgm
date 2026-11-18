-- ============================================================================
-- CARD DIGITAL GM - SCRIPT DE CONFIGURAÇÃO DE PLANOS E ASSINATURAS
-- Execute este script no SQL Editor do seu Supabase (Database -> SQL Editor).
-- Script 100% idempotente (pode ser executado com segurança mais de uma vez).
-- ============================================================================

-- 1. Adiciona a coluna app_plans_config na tabela app_settings (se ainda não existir)
alter table public.app_settings
  add column if not exists app_plans_config jsonb default '{}'::jsonb;

-- 2. Garante a tabela public.subscriptions e adiciona as colunas necessárias
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_email text,
  plan_id text default 'intermediario',
  status text default 'teste',
  gateway text default 'pix',
  starts_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

alter table public.subscriptions
  add column if not exists user_id uuid,
  add column if not exists user_name text,
  add column if not exists phone text,
  add column if not exists requested_plan_id text,
  add column if not exists requested_at timestamptz,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz default now();

-- Garante que tenant_id possa ser opcional em registros prévios por e-mail
alter table public.subscriptions
  alter column tenant_id drop not null;

-- Índice único case-insensitive por e-mail para sincronização e upsert seguros
create unique index if not exists subscriptions_user_email_lower_idx
  on public.subscriptions (lower(user_email))
  where user_email is not null;

create index if not exists subscriptions_tenant_id_idx
  on public.subscriptions (tenant_id);

-- 3. Segurança RLS e Permissões de Acesso para Planos e Configurações
alter table public.subscriptions enable row level security;
grant select, insert, update, delete on public.subscriptions to authenticated, anon;

drop policy if exists "subscriptions_allow" on public.subscriptions;
create policy "subscriptions_allow" on public.subscriptions
  for all using (true) with check (true);

alter table public.app_settings enable row level security;
grant select, insert, update, delete on public.app_settings to authenticated, anon;

drop policy if exists "settings_allow_all" on public.app_settings;
create policy "settings_allow_all" on public.app_settings
  for all using (true) with check (true);

-- 4. Garante o registro do Administrador Master com acesso irrestrito
insert into public.subscriptions (
  tenant_id,
  user_email,
  user_name,
  plan_id,
  status,
  gateway,
  starts_at,
  expires_at,
  notes,
  updated_at
)
select
  '6f4ee596-eb5e-415f-9189-d571ad85ed95'::uuid,
  'gmedificacao@gmail.com',
  'GM Edificação (Administrador Master)',
  'adm',
  'adm',
  'master',
  now(),
  null,
  'Conta oficial do proprietário e desenvolvedor',
  now()
where exists (
  select 1 from public.tenants where id = '6f4ee596-eb5e-415f-9189-d571ad85ed95'::uuid
)
on conflict ((lower(user_email))) where user_email is not null
do update set
  plan_id = 'adm',
  status = 'adm',
  expires_at = null,
  updated_at = now();

-- 5. Tabela dedicada de Notificações Direcionadas para o App dos Usuários
-- Garante que alterações de plano, confirmações de pagamento e avisos manuais
-- cheguem ao app/dispositivo instalado mesmo se o app estava fechado na hora do envio.
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  user_email text,
  title text not null,
  message text not null,
  type text default 'system',
  url text default '/planos',
  read boolean default false,
  created_by text,
  created_at timestamptz default now()
);

create index if not exists user_notifications_tenant_created_idx
  on public.user_notifications (tenant_id, created_at desc);

create index if not exists user_notifications_email_created_idx
  on public.user_notifications (lower(user_email), created_at desc);

alter table public.user_notifications enable row level security;
grant select, insert, update, delete on public.user_notifications to authenticated, anon;

drop policy if exists "user_notifications_allow" on public.user_notifications;
create policy "user_notifications_allow" on public.user_notifications
  for all using (true) with check (true);

-- Habilita entrega instantânea em tempo real via Supabase Realtime (idempotente)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.user_notifications;
    exception when duplicate_object then
      null;
    end;
    begin
      alter publication supabase_realtime add table public.subscriptions;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;

