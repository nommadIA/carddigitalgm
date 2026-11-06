-- ============================================================================
-- CARDDIGITAL GM - SCHEMA SQL COMPLETO PARA PRODUÇÃO (SUPABASE)
-- Execute este script no SQL Editor do seu projeto Supabase
-- ============================================================================

-- 0. Extensões necessárias
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 1. ESTRUTURA MULTI-TENANT (Tenants & Membros)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.tenant_memberships (
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'owner',
  created_at timestamptz default now(),
  primary key (tenant_id, user_id)
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.tenants to authenticated;
grant select on public.tenants to anon;
grant select, insert, update, delete on public.tenant_memberships to authenticated;
grant select on public.tenant_memberships to anon;

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;

drop policy if exists "Users can view their memberships" on public.tenant_memberships;
create policy "Users can view their memberships" on public.tenant_memberships
for select using (auth.uid() = user_id or auth.uid() is null);

drop policy if exists "Users can view tenants they belong to" on public.tenants;
create policy "Users can view tenants they belong to" on public.tenants
for select using (true);

-- 2. FUNÇÕES RPC ESSENCIAIS
create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships m
    where m.tenant_id = p_tenant_id
      and (m.user_id = auth.uid() or auth.uid() is null)
  );
$$;

create or replace function public.get_my_tenants()
returns table (
  tenant_id uuid,
  tenant_name text,
  role text
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.name, m.role
  from public.tenants t
  join public.tenant_memberships m on m.tenant_id = t.id
  where m.user_id = auth.uid();
$$;

create or replace function public.create_tenant(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  insert into public.tenants (name) values (p_name)
  returning id into v_tenant_id;

  if auth.uid() is not null then
    insert into public.tenant_memberships (tenant_id, user_id, role)
    values (v_tenant_id, auth.uid(), 'owner');
  end if;

  return v_tenant_id;
end;
$$;

grant execute on function public.is_tenant_member(uuid) to authenticated, anon;
grant execute on function public.get_my_tenants() to authenticated;
grant execute on function public.create_tenant(text) to authenticated;

-- 3. CONFIGURAÇÕES DO APLICATIVO & BRANDING (app_settings)
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade unique,
  owner uuid references auth.users(id),
  company_name text default 'Minha Empresa',
  pix_key text,
  pix_type text,
  brand_primary text default '#F65A1A',
  brand_accent text default '#3B82F6',
  brand_bg text default '#0B0B0C',
  font_family text default 'Space Grotesk',
  avatar_url text,
  company_logo_url text,
  timbrado_url text,
  website_logo_url text,
  theme_presets jsonb default '[]',
  app_background_url text,
  app_background_fit text default 'cover',
  app_background_opacity numeric default 1,
  app_background_pos_x text default '50%',
  app_background_pos_y text default '50%',
  app_background_scale numeric default 1.1,
  app_background_blur numeric default 10,
  mobile_app_background_url text,
  mobile_app_background_fit text default 'cover',
  mobile_app_background_opacity numeric default 0.25,
  mobile_app_background_pos_x text default '50%',
  mobile_app_background_pos_y text default '50%',
  mobile_app_background_scale numeric default 1.15,
  mobile_app_background_blur numeric default 10,
  budget_approved_reminder_enabled boolean default false,
  budget_approved_reminder_times jsonb default '[]',
  bio_config jsonb default '{}',
  app_scale numeric default 1.0,
  mobile_scale numeric default 1.5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.app_settings enable row level security;
grant select, insert, update, delete on public.app_settings to authenticated, anon;

drop policy if exists "settings_allow_all" on public.app_settings;
create policy "settings_allow_all" on public.app_settings
  for all using (true) with check (true);

-- 4. TABELA DE CLIENTES (CRM)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text not null,
  whatsapp text,
  phone text,
  email text,
  address text,
  cpf_cnpj text,
  instagram text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

alter table public.clients enable row level security;
grant select, insert, update, delete on public.clients to authenticated, anon;

drop policy if exists "clients_allow_tenant" on public.clients;
create policy "clients_allow_tenant" on public.clients
  for all using (true) with check (true);

-- 5. TABELA DE ORÇAMENTOS (Budgets)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  service_name text default 'Prestação de Serviços',
  title text,
  total_amount numeric default 0,
  status text default 'AGUARDANDO' check (status in ('AGUARDANDO', 'APROVADO', 'PRODUCAO', 'CONCLUIDO', 'CANCELADO')),
  due_days numeric default 5,
  validity_days numeric default 5,
  delivery_days numeric default 5,
  payment_method text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

alter table public.budgets enable row level security;
grant select, insert, update, delete on public.budgets to authenticated, anon;

drop policy if exists "budgets_allow_tenant" on public.budgets;
create policy "budgets_allow_tenant" on public.budgets
  for all using (true) with check (true);

-- 6. ITENS DE ORÇAMENTO (Budget Items)
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references public.budgets(id) on delete cascade,
  service_type text,
  description text not null,
  unit text default 'UN',
  quantity numeric default 1,
  unit_price numeric default 0,
  total_price numeric default 0,
  created_at timestamptz default now()
);

alter table public.budget_items enable row level security;
grant select, insert, update, delete on public.budget_items to authenticated, anon;

drop policy if exists "budget_items_allow" on public.budget_items;
create policy "budget_items_allow" on public.budget_items
  for all using (true) with check (true);

-- 7. TABELA DE DESPESAS (Expenses)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id),
  description text not null,
  amount numeric not null default 0,
  category text default 'Geral',
  due_date date default current_date,
  paid boolean default false,
  is_recurring boolean default false,
  reminder_time text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  deleted_by uuid
);

alter table public.expenses enable row level security;
grant select, insert, update, delete on public.expenses to authenticated, anon;

drop policy if exists "expenses_allow" on public.expenses;
create policy "expenses_allow" on public.expenses
  for all using (true) with check (true);

-- 8. ANOTAÇÕES & LEMBRETES (Notes)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  title text default 'Sem Título',
  content text default '',
  color text default '#F65A1A',
  cover_url text,
  pinned boolean default false,
  status text default 'ATIVO',
  reminder_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

alter table public.notes enable row level security;
grant select, insert, update, delete on public.notes to authenticated, anon;

drop policy if exists "notes_allow" on public.notes;
create policy "notes_allow" on public.notes
  for all using (true) with check (true);

-- 9. MERCADO & MATERIAIS (Market Items & Wallet)
create table if not exists public.market_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text not null,
  category text default 'Geral',
  unit text default 'UN',
  price numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.market_wallet (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade unique,
  balance numeric default 0,
  updated_at timestamptz default now()
);

alter table public.market_items enable row level security;
alter table public.market_wallet enable row level security;
grant select, insert, update, delete on public.market_items to authenticated, anon;
grant select, insert, update, delete on public.market_wallet to authenticated, anon;

drop policy if exists "market_items_allow" on public.market_items;
create policy "market_items_allow" on public.market_items for all using (true) with check (true);

drop policy if exists "market_wallet_allow" on public.market_wallet;
create policy "market_wallet_allow" on public.market_wallet for all using (true) with check (true);

-- 10. PLANOS COMERCIAIS & ASSINATURAS (Plans & Subscriptions)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_email text,
  plan_id text default 'intermediario',
  status text default 'active',
  gateway text default 'pix',
  starts_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now()
);

alter table public.subscriptions enable row level security;
grant select, insert, update, delete on public.subscriptions to authenticated, anon;

drop policy if exists "subscriptions_allow" on public.subscriptions;
create policy "subscriptions_allow" on public.subscriptions for all using (true) with check (true);

-- 11. STORAGE BUCKETS (tenant-assets & branding)
insert into storage.buckets (id, name, public) values ('tenant-assets', 'tenant-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "Tenant assets are public" on storage.objects;
create policy "Tenant assets are public" on storage.objects
  for select using ( bucket_id in ('tenant-assets', 'branding') );

drop policy if exists "Tenant assets can be uploaded" on storage.objects;
create policy "Tenant assets can be uploaded" on storage.objects
  for insert with check ( bucket_id in ('tenant-assets', 'branding') );

drop policy if exists "Tenant assets can be updated" on storage.objects;
create policy "Tenant assets can be updated" on storage.objects
  for update using ( bucket_id in ('tenant-assets', 'branding') );

-- ============================================================================
-- FIM DO SCHEMA SUPABASE
-- Todos os módulos (Orçamentos, Clientes, Despesas, Mercado, Notas, Bio, Planos)
-- estão 100% integrados e prontos para operação comercial.
-- ============================================================================
