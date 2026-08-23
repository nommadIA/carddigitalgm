-- ==============================================================================
-- SCRIPT SQL: EXPORTAÇÃO E CONSULTA COMPLETA DA CONTA gmedificação@gmail.com
-- ==============================================================================
-- Este script permite consultar, exportar e verificar todas as informações
-- da conta (site configurado, timbrado, PIX, clientes, orçamentos, itens,
-- despesas, anotações, mercado, tokens de push para smartphone e desktop).
--
-- Como executar no Supabase:
-- 1. Abra o Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Vá em "SQL Editor" -> "New Query"
-- 3. Cole este código e execute (Run).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONSULTA UNIFICADA (DUMP COMPLETO EM FORMATO JSON - 1 CLIQUE)
-- ------------------------------------------------------------------------------
WITH target_user AS (
  SELECT id, email, created_at
  FROM auth.users
  WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com')
     OR email ILIKE '%gmedifica%'
  LIMIT 1
),
target_tenant AS (
  SELECT m.tenant_id, t.name AS tenant_name, m.role, m.user_id
  FROM public.tenant_memberships m
  JOIN public.tenants t ON t.id = m.tenant_id
  JOIN target_user u ON u.id = m.user_id
  LIMIT 1
)
SELECT jsonb_pretty(
  jsonb_build_object(
    'usuario', (SELECT row_to_json(u) FROM target_user u),
    'tenant', (SELECT row_to_json(tt) FROM target_tenant tt),
    'configuracoes_app_e_pix_timbrado', (
      SELECT row_to_json(s)
      FROM public.app_settings s
      WHERE s.tenant_id = (SELECT tenant_id FROM target_tenant)
         OR s.owner = (SELECT id FROM target_user)
      LIMIT 1
    ),
    'branding', (
      SELECT row_to_json(b)
      FROM public.user_branding b
      WHERE b.user_id = (SELECT id FROM target_user)
      LIMIT 1
    ),
    'clientes', (
      SELECT coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM public.clients c
      WHERE c.tenant_id = (SELECT tenant_id FROM target_tenant)
         OR c.user_id = (SELECT id FROM target_user)
    ),
    'orcamentos', (
      SELECT coalesce(jsonb_agg(
        row_to_json(b)::jsonb || jsonb_build_object(
          'itens', (
            SELECT coalesce(jsonb_agg(row_to_json(bi)), '[]'::jsonb)
            FROM public.budget_items bi
            WHERE bi.budget_id = b.id
          )
        )
      ), '[]'::jsonb)
      FROM public.budgets b
      WHERE b.tenant_id = (SELECT tenant_id FROM target_tenant)
         OR b.user_id = (SELECT id FROM target_user)
    ),
    'despesas', (
      SELECT coalesce(jsonb_agg(row_to_json(e)), '[]'::jsonb)
      FROM public.expenses e
      WHERE e.tenant_id = (SELECT tenant_id FROM target_tenant)
         OR e.user_id = (SELECT id FROM target_user)
    ),
    'anotacoes_notes', (
      SELECT coalesce(jsonb_agg(row_to_json(n)), '[]'::jsonb)
      FROM public.notes n
      WHERE n.tenant_id = (SELECT tenant_id FROM target_tenant)
    ),
    'carteira_mercado', (
      SELECT row_to_json(w)
      FROM public.market_wallet w
      WHERE w.tenant_id = (SELECT tenant_id FROM target_tenant)
      LIMIT 1
    ),
    'itens_mercado', (
      SELECT coalesce(jsonb_agg(row_to_json(si)), '[]'::jsonb)
      FROM public.shopping_items si
      WHERE si.tenant_id = (SELECT tenant_id FROM target_tenant)
    ),
    'transacoes_mercado', (
      SELECT coalesce(jsonb_agg(row_to_json(mt)), '[]'::jsonb)
      FROM public.market_transactions mt
      WHERE mt.tenant_id = (SELECT tenant_id FROM target_tenant)
    ),
    'relatorios_financeiros', (
      SELECT coalesce(jsonb_agg(row_to_json(fr)), '[]'::jsonb)
      FROM public.finance_reports fr
      WHERE fr.tenant_id = (SELECT tenant_id FROM target_tenant)
    ),
    'arquivos_mensais_financeiros', (
      SELECT coalesce(jsonb_agg(row_to_json(fa)), '[]'::jsonb)
      FROM public.finance_monthly_archives fa
      WHERE fa.tenant_id = (SELECT tenant_id FROM target_tenant)
    ),
    'dispositivos_push_registrados', (
      SELECT coalesce(jsonb_agg(row_to_json(ft)), '[]'::jsonb)
      FROM public.fcm_tokens ft
      WHERE ft.tenant_id = (SELECT tenant_id FROM target_tenant)
         OR ft.user_id = (SELECT id FROM target_user)
    )
  )
) AS backup_completo_conta_gmedificacao;


-- ------------------------------------------------------------------------------
-- 2. CONSULTAS TABELA POR TABELA (INDIVIDUAIS)
-- ------------------------------------------------------------------------------

-- A) Identificação do Usuário e Tenant
SELECT 
    u.id AS user_id,
    u.email,
    u.created_at AS user_created_at,
    tm.tenant_id,
    t.name AS tenant_name,
    tm.role
FROM auth.users u
LEFT JOIN public.tenant_memberships tm ON tm.user_id = u.id
LEFT JOIN public.tenants t ON t.id = tm.tenant_id
WHERE lower(u.email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com')
   OR u.email ILIKE '%gmedifica%';

-- B) Configurações do App, Site, PIX, Timbrado e Layout
SELECT * 
FROM public.app_settings
WHERE tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships 
    WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com') OR email ILIKE '%gmedifica%')
)
OR owner IN (
    SELECT id FROM auth.users WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com') OR email ILIKE '%gmedifica%'
);

-- C) Branding da Empresa (Cores, Logo, Avatar, Fonte)
SELECT * 
FROM public.user_branding
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com') OR email ILIKE '%gmedifica%'
);

-- D) Clientes Cadastrados
SELECT * 
FROM public.clients
WHERE tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships 
    WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com') OR email ILIKE '%gmedifica%')
)
ORDER BY created_at DESC;

-- E) Orçamentos e Itens de Orçamento
SELECT 
    b.id AS budget_id,
    b.client_name,
    b.total_amount,
    b.status,
    b.delivery_days,
    b.validity_days,
    b.created_at,
    bi.id AS item_id,
    bi.description AS item_description,
    bi.quantity,
    bi.unit_price,
    bi.total AS item_total
FROM public.budgets b
LEFT JOIN public.budget_items bi ON bi.budget_id = b.id
WHERE b.tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships 
    WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com') OR email ILIKE '%gmedifica%')
)
ORDER BY b.created_at DESC;

-- F) Despesas Financeiras
SELECT * 
FROM public.expenses
WHERE tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships 
    WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com') OR email ILIKE '%gmedifica%')
)
ORDER BY due_date DESC;

-- G) Anotações (Notes)
SELECT * 
FROM public.notes
WHERE tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships 
    WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com') OR email ILIKE '%gmedifica%')
)
ORDER BY is_pinned DESC, created_at DESC;

-- H) Mercado e Compras
SELECT * 
FROM public.shopping_items
WHERE tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships 
    WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com') OR email ILIKE '%gmedifica%')
)
ORDER BY created_at DESC;

-- I) Dispositivos Registrados para Notificação Push Simultânea (Desktop e Smartphone)
SELECT * 
FROM public.fcm_tokens
WHERE tenant_id IN (
    SELECT tenant_id FROM public.tenant_memberships 
    WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com') OR email ILIKE '%gmedifica%')
)
OR user_id IN (
    SELECT id FROM auth.users WHERE lower(email) IN ('gmedificacao@gmail.com', 'gmedificação@gmail.com') OR email ILIKE '%gmedifica%'
);
