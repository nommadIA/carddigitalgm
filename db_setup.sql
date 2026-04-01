
-- Habilita extensão pgcrypto
create extension if not exists pgcrypto;

-- 1. ESTRUTURA DE TENANTS
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

-- RLS para Tenants e Memberships
alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;

create policy "Users can view their memberships" on public.tenant_memberships
for select using (auth.uid() = user_id);

create policy "Users can view tenants they belong to" on public.tenants
for select using (
  exists (
    select 1 from public.tenant_memberships
    where tenant_id = tenants.id and user_id = auth.uid()
  )
);

-- 2. BRANDING TABLE
create table if not exists public.user_branding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_name text,
  profile_name text,
  avatar_path text,
  logo_path text,
  background_path text,
  primary_color text default '#ff7a00',
  accent_color text default '#3B82F6',
  app_bg_color text default '#0b1220',
  font_family text default 'Inter',
  button_anim text default 'none',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_branding enable row level security;

create policy "Users can view own branding" on public.user_branding
  for select using (auth.uid() = user_id);

create policy "Users can insert own branding" on public.user_branding
  for insert with check (auth.uid() = user_id);

create policy "Users can update own branding" on public.user_branding
  for update using (auth.uid() = user_id);

-- 2. FUNÇÕES RPC (Backend Logic)
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
      and m.user_id = auth.uid()
  );
$$;

drop function if exists public.get_my_tenants();
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

  insert into public.tenant_memberships (tenant_id, user_id, role)
  values (v_tenant_id, auth.uid(), 'owner');

  -- Inicializa wallet zerada
  insert into public.market_wallet (tenant_id, balance) values (v_tenant_id, 0);

  return v_tenant_id;
end;
$$;

-- STORAGE BUCKET: branding
insert into storage.buckets (id, name, public) values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "Branding images are public" on storage.objects
  for select using ( bucket_id = 'branding' );

create policy "Users can upload branding images" on storage.objects
  for insert with check (
    bucket_id = 'branding' and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Users can update their branding images" on storage.objects
  for update using (
    bucket_id = 'branding' and auth.uid() = (storage.foldername(name))[1]::uuid
  );

-- STORAGE BUCKET: tenant-assets
insert into storage.buckets (id, name, public) values ('tenant-assets', 'tenant-assets', true)
on conflict (id) do nothing;

create policy "Tenant assets are public" on storage.objects
  for select using ( bucket_id = 'tenant-assets' );

create policy "Tenant members can upload assets" on storage.objects
  for insert with check (
    bucket_id = 'tenant-assets' and
    public.is_tenant_member((storage.foldername(name))[1]::uuid)
  );

create policy "Tenant members can update assets" on storage.objects
  for update using (
    bucket_id = 'tenant-assets' and
    public.is_tenant_member((storage.foldername(name))[1]::uuid)
  );

grant execute on function public.get_my_tenants() to authenticated;
grant execute on function public.create_tenant(text) to authenticated;
grant execute on function public.is_tenant_member(uuid) to authenticated;

-- 3. ATUALIZAÇÃO DAS TABELAS EXISTENTES

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  owner uuid references auth.users(id), 
  company_name text,
  pix_key text,
  pix_type text,
  brand_primary text,
  brand_accent text,
  brand_bg text,
  font_family text,
  avatar_url text,
  company_logo_url text,
  timbrado_url text,
  theme_presets jsonb default '[]',
  app_background_url text,
  app_background_fit text default 'cover',
  app_background_opacity numeric default 1,
  budget_approved_reminder_enabled boolean default false,
  budget_approved_reminder_times jsonb default '[]',
  app_scale numeric default 1.0,
  mobile_scale numeric default 1.5,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id)
);

alter table public.app_settings enable row level security;

create policy "settings_select" on public.app_settings
  for select using (
    (tenant_id is not null and public.is_tenant_member(tenant_id)) or
    (owner = auth.uid())
  );

create policy "settings_insert" on public.app_settings
  for insert with check (
    (tenant_id is not null and public.is_tenant_member(tenant_id)) or
    (owner = auth.uid())
  );

create policy "settings_update" on public.app_settings
  for update using (
    (tenant_id is not null and public.is_tenant_member(tenant_id)) or
    (owner = auth.uid())
  );

-- Clients
alter table public.clients 
add column if not exists tenant_id uuid references public.tenants(id);

alter table public.clients add column if not exists instagram text;
alter table public.clients add column if not exists deleted_at timestamptz;

-- Budgets
alter table public.budgets 
add column if not exists tenant_id uuid references public.tenants(id);

alter table public.budgets add column if not exists deleted_at timestamptz;

-- ✅ FIX: Add delivery_days column (Essential for saving budgets)
alter table public.budgets
add column if not exists delivery_days numeric default 5;

alter table public.budgets
add column if not exists validity_days numeric default 5;

-- FIX BUDGETS STATUS CONSTRAINT
do $$
begin
  alter table public.budgets drop constraint if exists budgets_status_check;
  alter table public.budgets add constraint budgets_status_check 
    check (status in ('AGUARDANDO', 'APROVADO', 'PRODUCAO', 'CONCLUIDO', 'CANCELADO'));
exception when others then null;
end $$;

-- FIX BUDGET ITEMS SERVICE TYPE CONSTRAINT
do $$
begin
  alter table public.budget_items drop constraint if exists budget_items_service_type_check;
exception when others then null;
end $$;

-- EXPENSES
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id),
  user_id uuid references auth.users(id) default auth.uid(),
  description text not null,
  amount numeric not null,
  due_date date,
  paid boolean default false,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  deleted_by uuid
);

alter table public.expenses add column if not exists deleted_at timestamptz;
alter table public.expenses add column if not exists deleted_by uuid;

do $$
begin
  alter table public.expenses alter column user_id set default auth.uid();
exception
  when others then null;
end $$;

-- Budget Items
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references public.budgets(id) on delete cascade,
  description text not null,
  service_type text default 'AGENCIA',
  quantity numeric default 1,
  unit_price numeric default 0,
  total numeric default 0,
  width numeric,
  height numeric,
  created_at timestamptz default now()
);

-- ==========================================
-- 4. MARKET / SHOPPING LIST TABLES
-- ==========================================

create table if not exists public.market_wallet (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  balance numeric default 0,
  updated_at timestamptz default now()
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text not null,
  quantity numeric default 1,
  unit_price numeric default 0,
  is_checked boolean default false,
  bought_at timestamptz,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  deleted_by uuid
);

alter table public.shopping_items add column if not exists deleted_at timestamptz;
alter table public.shopping_items add column if not exists deleted_by uuid;

create table if not exists public.market_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  amount numeric not null,
  note text,
  items jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

-- Adiciona a coluna items caso a tabela já exista
alter table public.market_transactions add column if not exists items jsonb;

create table if not exists public.market_catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  brand text,
  typical_unit_price numeric default 0,
  default_unit text default 'un',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Seed básico
insert into public.market_catalog_items (name, category, typical_unit_price) values 
('Arroz 5kg', 'Alimentos', 28.90),
('Feijão Carioca 1kg', 'Alimentos', 8.50),
('Açúcar Refinado 1kg', 'Alimentos', 4.99),
('Óleo de Soja 900ml', 'Alimentos', 6.50),
('Leite Integral 1L', 'Bebidas', 5.20),
('Café em Pó 500g', 'Alimentos', 18.00),
('Sabão em Pó 800g', 'Limpeza', 14.50),
('Detergente Líquido', 'Limpeza', 2.50),
('Papel Higiênico 12un', 'Higiene', 22.00),
('Creme Dental', 'Higiene', 5.90),
('Refrigerante 2L', 'Bebidas', 9.00),
('Pão de Forma', 'Alimentos', 10.00),
('Manteiga 200g', 'Alimentos', 12.00),
('Ovos Dúzia', 'Hortifruti', 14.00),
('Banana Prata kg', 'Hortifruti', 6.99),
('Tomate kg', 'Hortifruti', 8.99),
('Cebola kg', 'Hortifruti', 5.99),
('Batata kg', 'Hortifruti', 6.99),
('Alcatra kg', 'Carnes', 45.90),
('Frango Inteiro kg', 'Carnes', 14.90)
on conflict do nothing;

-- Policies for Market
alter table public.market_wallet enable row level security;
alter table public.shopping_items enable row level security;
alter table public.market_transactions enable row level security;
alter table public.market_catalog_items enable row level security;

create policy "wallet_select" on public.market_wallet for select using (public.is_tenant_member(tenant_id));
create policy "wallet_update" on public.market_wallet for update using (public.is_tenant_member(tenant_id));

create policy "shopping_select" on public.shopping_items for select using (public.is_tenant_member(tenant_id));
create policy "shopping_insert" on public.shopping_items for insert with check (public.is_tenant_member(tenant_id));
create policy "shopping_update" on public.shopping_items for update using (public.is_tenant_member(tenant_id));
create policy "shopping_delete" on public.shopping_items for delete using (public.is_tenant_member(tenant_id));

create policy "trans_select" on public.market_transactions for select using (public.is_tenant_member(tenant_id));
create policy "catalog_select" on public.market_catalog_items for select using (true);

-- ==========================================
-- 5. MARKET RPC FUNCTIONS
-- ==========================================

create or replace function public.market_wallet_topup(p_tenant_id uuid, p_amount numeric, p_note text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric;
begin
  insert into public.market_wallet (tenant_id, balance)
  values (p_tenant_id, 0)
  on conflict (tenant_id) do nothing;

  update public.market_wallet
  set balance = balance + p_amount, updated_at = now()
  where tenant_id = p_tenant_id
  returning balance into v_new_balance;

  insert into public.market_transactions (tenant_id, amount, note, created_by)
  values (p_tenant_id, p_amount, p_note, auth.uid());

  return v_new_balance;
end;
$$;

create or replace function public.market_wallet_spend(p_tenant_id uuid, p_amount numeric, p_note text, p_items jsonb default null)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_new_balance numeric;
begin
  select balance into v_balance from public.market_wallet where tenant_id = p_tenant_id;
  
  if v_balance is null then 
     v_balance := 0; 
  end if;

  if v_balance < p_amount then
     raise exception 'Saldo insuficiente na carteira (Atual: %, Necessário: %)', v_balance, p_amount;
  end if;

  update public.market_wallet
  set balance = balance - p_amount, updated_at = now()
  where tenant_id = p_tenant_id
  returning balance into v_new_balance;

  insert into public.market_transactions (tenant_id, amount, note, created_by, items)
  values (p_tenant_id, -p_amount, p_note, auth.uid(), p_items);

  return v_new_balance;
end;
$$;

create or replace function public.market_trash_delete_permanently(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.shopping_items
  where tenant_id = p_tenant_id
    and deleted_at is not null;
    
  return 'ok';
end;
$$;

grant execute on function public.market_wallet_topup(uuid, numeric, text) to authenticated;
grant execute on function public.market_wallet_spend(uuid, numeric, text, jsonb) to authenticated;
grant execute on function public.market_trash_delete_permanently(uuid) to authenticated;

-- ==========================================
-- 6. POLÍTICAS RLS DAS OUTRAS TABELAS
-- ==========================================

-- CLIENTS POLICIES
do $$
begin
  alter table public.clients enable row level security;
  drop policy if exists "clients_select" on public.clients;
  create policy "clients_select" on public.clients for select using (public.is_tenant_member(tenant_id));

  drop policy if exists "clients_insert" on public.clients;
  create policy "clients_insert" on public.clients for insert with check (public.is_tenant_member(tenant_id));

  drop policy if exists "clients_update" on public.clients;
  create policy "clients_update" on public.clients for update using (public.is_tenant_member(tenant_id));

  drop policy if exists "clients_delete" on public.clients;
  create policy "clients_delete" on public.clients for delete using (public.is_tenant_member(tenant_id));
end $$;

-- BUDGETS POLICIES
do $$
begin
  alter table public.budgets enable row level security;
  drop policy if exists "budgets_select" on public.budgets;
  create policy "budgets_select" on public.budgets for select using (public.is_tenant_member(tenant_id));

  drop policy if exists "budgets_insert" on public.budgets;
  create policy "budgets_insert" on public.budgets for insert with check (public.is_tenant_member(tenant_id));

  drop policy if exists "budgets_update" on public.budgets;
  create policy "budgets_update" on public.budgets for update using (public.is_tenant_member(tenant_id));

  drop policy if exists "budgets_delete" on public.budgets;
  create policy "budgets_delete" on public.budgets for delete using (public.is_tenant_member(tenant_id));
end $$;

-- EXPENSES POLICIES
do $$
begin
  alter table public.expenses enable row level security;

  drop policy if exists "expenses_select" on public.expenses;
  create policy "expenses_select" on public.expenses for select using (public.is_tenant_member(tenant_id));

  drop policy if exists "expenses_insert" on public.expenses;
  create policy "expenses_insert" on public.expenses for insert with check (public.is_tenant_member(tenant_id));

  drop policy if exists "expenses_update" on public.expenses;
  create policy "expenses_update" on public.expenses for update using (public.is_tenant_member(tenant_id));

  drop policy if exists "expenses_delete" on public.expenses;
  create policy "expenses_delete" on public.expenses for delete using (public.is_tenant_member(tenant_id));
end $$;

-- BUDGET_ITEMS POLICIES
do $$
begin
  alter table public.budget_items enable row level security;
  drop policy if exists "budget_items_select" on public.budget_items;
  execute $p$
    create policy "budget_items_select"
    on public.budget_items for select
    using ( exists ( select 1 from public.budgets b where b.id = budget_items.budget_id and public.is_tenant_member(b.tenant_id) ) );
  $p$;

  drop policy if exists "budget_items_insert" on public.budget_items;
  execute $p$
    create policy "budget_items_insert"
    on public.budget_items for insert
    with check ( exists ( select 1 from public.budgets b where b.id = budget_items.budget_id and public.is_tenant_member(b.tenant_id) ) );
  $p$;
  
  drop policy if exists "budget_items_all" on public.budget_items;
  execute $p$
    create policy "budget_items_all"
    on public.budget_items for all
    using ( exists ( select 1 from public.budgets b where b.id = budget_items.budget_id and public.is_tenant_member(b.tenant_id) ) );
  $p$;
end $$;

-- LIXEIRA E SEGURANÇA
create table if not exists public.app_security (
  id int primary key default 1,
  password_hash text not null,
  pin_hash text
);

insert into public.app_security (id, password_hash, pin_hash)
values (1, crypt('NovaSenha@123', gen_salt('bf')), crypt('NovaSenha@123', gen_salt('bf')))
on conflict (id) do nothing;

grant select on public.app_security to authenticated;

create or replace function public.hard_delete_expense(p_expense_id uuid, p_password text)
returns text
language plpgsql
security definer
as $$
declare
  v_hash text;
begin
  select pin_hash into v_hash from public.app_security where id = 1;
  if v_hash is null or v_hash != crypt(p_password, v_hash) then
    raise exception 'invalid_app_password';
  end if;

  delete from public.expenses where id = p_expense_id;
  return 'ok';
end;
$$;

create or replace function public.hard_delete_expenses_trash(pin text)
returns text
language plpgsql
security definer
as $$
declare
  v_hash text;
begin
  select pin_hash into v_hash from public.app_security where id = 1;
  if v_hash is null or v_hash != crypt(pin, v_hash) then
     raise exception 'invalid_app_password';
  end if;

  delete from public.expenses where deleted_at is not null;
  return 'ok';
end;
$$;

create or replace function public.hard_delete_trash(pin text)
returns text
language plpgsql
security definer
as $$
declare
  v_hash text;
begin
  select pin_hash into v_hash from public.app_security where id = 1;
  if v_hash is null or v_hash != crypt(pin, v_hash) then
     raise exception 'invalid_app_password';
  end if;

  delete from public.clients where deleted_at is not null;
  delete from public.budgets where deleted_at is not null;
  delete from public.expenses where deleted_at is not null;
  delete from public.shopping_items where deleted_at is not null;

  return 'ok';
end;
$$;

-- ==========================================
-- 7. FINANCE MONTHLY ARCHIVES
-- ==========================================

create table if not exists public.finance_monthly_archives (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  month date not null,
  totals jsonb default '{}',
  lists jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, month)
);

alter table public.finance_monthly_archives enable row level security;
create policy "finance_archives_select" on public.finance_monthly_archives for select using (public.is_tenant_member(tenant_id));

create or replace function public.finance_archive_month(p_tenant_id uuid, p_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date := date_trunc('month', p_month);
  v_end date := v_start + interval '1 month';
  
  v_income numeric;
  v_expense numeric;
  v_net numeric;
  
  v_top_clients jsonb;
  v_top_categories jsonb;
begin
  select coalesce(sum(total_amount), 0) into v_income
  from budgets
  where tenant_id = p_tenant_id
    and status in ('APROVADO', 'CONCLUIDO')
    and created_at >= v_start and created_at < v_end
    and deleted_at is null;

  select coalesce(sum(amount), 0) into v_expense
  from expenses
  where tenant_id = p_tenant_id
    and due_date >= v_start and due_date < v_end
    and deleted_at is null;

  v_net := v_income - v_expense;

  select jsonb_agg(t) into v_top_clients
  from (
    select client_name as name, sum(total_amount) as total
    from budgets
    where tenant_id = p_tenant_id
      and status in ('APROVADO', 'CONCLUIDO')
      and created_at >= v_start and created_at < v_end
      and deleted_at is null
    group by client_name
    order by total desc
    limit 10
  ) t;

  select jsonb_agg(t) into v_top_categories
  from (
    select description as category, sum(amount) as total
    from expenses
    where tenant_id = p_tenant_id
      and due_date >= v_start and due_date < v_end
      and deleted_at is null
    group by description
    order by total desc
    limit 10
  ) t;

  insert into finance_monthly_archives (tenant_id, month, totals, lists, updated_at)
  values (
    p_tenant_id, 
    v_start, 
    jsonb_build_object('income', v_income, 'expense', v_expense, 'net', v_net),
    jsonb_build_object('top_clients', coalesce(v_top_clients, '[]'::jsonb), 'top_expense_categories', coalesce(v_top_categories, '[]'::jsonb)),
    now()
  )
  on conflict (tenant_id, month) do update
  set totals = excluded.totals,
      lists = excluded.lists,
      updated_at = now();

end;
$$;

grant execute on function public.finance_archive_month(uuid, date) to authenticated;

-- ==========================================
-- 8. FINANCE REPORTS (MANUAL/SAVED)
-- ==========================================

create table if not exists public.finance_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) default auth.uid(),
  title text not null,
  month_ref text,
  period_start date,
  period_end date,
  totals jsonb default '{}',
  items jsonb default '[]',
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.finance_reports enable row level security;

-- Garantir permissões de acesso
grant all on public.finance_reports to authenticated;
grant all on public.finance_reports to service_role;

do $$
begin
  drop policy if exists "finance_reports_select" on public.finance_reports;
  create policy "finance_reports_select" on public.finance_reports for select using (public.is_tenant_member(tenant_id));

  drop policy if exists "finance_reports_insert" on public.finance_reports;
  create policy "finance_reports_insert" on public.finance_reports for insert with check (public.is_tenant_member(tenant_id));

  drop policy if exists "finance_reports_update" on public.finance_reports;
  create policy "finance_reports_update" on public.finance_reports for update using (public.is_tenant_member(tenant_id));

  drop policy if exists "finance_reports_delete" on public.finance_reports;
  create policy "finance_reports_delete" on public.finance_reports for delete using (
    tenant_id in (
      select m.tenant_id 
      from public.tenant_memberships m 
      where m.user_id = auth.uid()
    )
  );
end $$;

-- ==========================================
-- 9. STORAGE BUCKETS & POLICIES
-- ==========================================

-- STORAGE BUCKET: timbrados
insert into storage.buckets (id, name, public) values ('timbrados', 'timbrados', true)
on conflict (id) do nothing;

create policy "Timbrados are public" on storage.objects
  for select using ( bucket_id = 'timbrados' );

create policy "Users can upload timbrados" on storage.objects
  for insert with check ( bucket_id = 'timbrados' );

create policy "Users can update their timbrados" on storage.objects
  for update using ( bucket_id = 'timbrados' );
