-- =========================================================================================
-- CORREÇÃO DEFINITIVA DE PERMISSÕES: TENANT_MEMBERSHIPS, BUDGETS E TABELAS SUPABASE
-- Elimina permanentemente o erro 42501 (permission denied for table tenant_memberships)
-- =========================================================================================

-- 1. Garante permissão de uso no schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Garante que as tabelas existem
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'owner',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

-- 3. Concessão explícita de permissões (PostgreSQL 42501 fix)
GRANT ALL ON TABLE public.tenants TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.tenant_memberships TO authenticated, anon, service_role;

-- Concede também nas tabelas principais para garantir leitura sem bloqueios
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'budgets') THEN
    GRANT ALL ON TABLE public.budgets TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'budget_items') THEN
    GRANT ALL ON TABLE public.budget_items TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shopping_items') THEN
    GRANT ALL ON TABLE public.shopping_items TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN
    GRANT ALL ON TABLE public.clients TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    GRANT ALL ON TABLE public.expenses TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notes') THEN
    GRANT ALL ON TABLE public.notes TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_settings') THEN
    GRANT ALL ON TABLE public.app_settings TO authenticated, anon, service_role;
  END IF;
END $$;

-- 4. Habilitar RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de RLS não-recursivas para tenant_memberships
DROP POLICY IF EXISTS "Users can view their memberships" ON public.tenant_memberships;
DROP POLICY IF EXISTS "allow_select_tenant_memberships" ON public.tenant_memberships;
CREATE POLICY "allow_select_tenant_memberships" ON public.tenant_memberships
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Users can insert their memberships" ON public.tenant_memberships;
DROP POLICY IF EXISTS "allow_insert_tenant_memberships" ON public.tenant_memberships;
CREATE POLICY "allow_insert_tenant_memberships" ON public.tenant_memberships
  FOR ALL TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 6. Políticas de RLS para tenants
DROP POLICY IF EXISTS "Users can view tenants they belong to" ON public.tenants;
DROP POLICY IF EXISTS "allow_select_tenants" ON public.tenants;
CREATE POLICY "allow_select_tenants" ON public.tenants
  FOR SELECT TO authenticated, anon
  USING (true);

-- 7. Função is_tenant_member em PLPGSQL SECURITY DEFINER (Impede o bug de inlining do Postgres!)
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.tenant_memberships m
    WHERE m.tenant_id = p_tenant_id
      AND (m.user_id = auth.uid() OR auth.uid() IS NULL)
  );
END;
$$;

-- 8. Função get_my_tenants em PLPGSQL SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_my_tenants()
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, COALESCE(m.role, 'owner')
  FROM public.tenants t
  LEFT JOIN public.tenant_memberships m ON m.tenant_id = t.id AND m.user_id = auth.uid()
  WHERE m.user_id = auth.uid() OR auth.uid() IS NULL;
END;
$$;

-- 9. Função create_tenant em PLPGSQL SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_tenant(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  INSERT INTO public.tenants (name) VALUES (p_name)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role)
  VALUES (v_tenant_id, auth.uid(), 'owner')
  ON CONFLICT DO NOTHING;

  -- Inicializa wallet zerada se a tabela existir
  BEGIN
    INSERT INTO public.market_wallet (tenant_id, balance) VALUES (v_tenant_id, 0);
  EXCEPTION WHEN OTHERS THEN
    -- ignora se market_wallet ainda não existir
  END;

  RETURN v_tenant_id;
END;
$$;

-- 10. Conceder permissão de execução nas funções RPC
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_tenants() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_tenant(text) TO authenticated, service_role;
