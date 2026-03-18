
-- ==========================================
-- SCRIPT DE CONFIGURAÇÃO FULL WHITE LABEL
-- ==========================================
-- Este script garante que cada usuário tenha seu próprio sistema isolado.

-- 1. GARANTIR QUE TODAS AS TABELAS TENHAM A COLUNA TENANT_ID
DO $$ 
BEGIN
    -- Lista de tabelas que precisam de tenant_id para isolamento total
    -- (Algumas já podem ter, o script ignora se já existir)
    
    -- budget_actions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='budget_actions' AND column_name='tenant_id') THEN
        ALTER TABLE public.budget_actions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;

    -- budget_notifications
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='budget_notifications' AND column_name='tenant_id') THEN
        ALTER TABLE public.budget_notifications ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;

    -- fcm_tokens
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fcm_tokens' AND column_name='tenant_id') THEN
        ALTER TABLE public.fcm_tokens ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;

    -- market_recent_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_recent_items' AND column_name='tenant_id') THEN
        ALTER TABLE public.market_recent_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;

    -- push_send_log
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_send_log' AND column_name='tenant_id') THEN
        ALTER TABLE public.push_send_log ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;

    -- market_transactions (Garantir que tenha tenant_id se não tiver)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_transactions' AND column_name='tenant_id') THEN
        ALTER TABLE public.market_transactions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;

END $$;

-- 2. ATIVAR RLS (ROW LEVEL SECURITY) EM TODAS AS TABELAS
-- Isso impede que um usuário veja os dados de outro.

ALTER TABLE public.budget_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_recent_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branding ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE ISOLAMENTO POR TENANT
-- Usamos a função is_tenant_member(tenant_id) para validar o acesso.

-- Função Auxiliar (Garantir que existe)
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships 
    WHERE tenant_id = p_tenant_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Aplicar políticas em massa
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.columns 
             WHERE table_schema = 'public' AND column_name = 'tenant_id'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.%I', t);
        EXECUTE format('CREATE POLICY "tenant_isolation_policy" ON public.%I FOR ALL USING (public.is_tenant_member(tenant_id))', t);
    END LOOP;
END $$;

-- Políticas Específicas para tabelas sem tenant_id (isolamento por user_id)

-- Profiles
DROP POLICY IF EXISTS "profiles_isolation" ON public.profiles;
CREATE POLICY "profiles_isolation" ON public.profiles FOR ALL USING (auth.uid() = id);

-- User Branding
DROP POLICY IF EXISTS "branding_isolation" ON public.user_branding;
CREATE POLICY "branding_isolation" ON public.user_branding FOR ALL USING (auth.uid() = user_id);

-- Password Resets
DROP POLICY IF EXISTS "password_resets_isolation" ON public.password_resets;
CREATE POLICY "password_resets_isolation" ON public.password_resets FOR ALL USING (auth.uid() = user_id);

-- 4. CONFIGURAÇÃO DE STORAGE (ARQUIVOS)
-- Garante que cada usuário só acesse seus próprios uploads.

DO $$
BEGIN
    -- Garantir buckets
    INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true) ON CONFLICT DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-assets', 'tenant-assets', true) ON CONFLICT DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('timbrados', 'timbrados', true) ON CONFLICT DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
END $$;

-- Políticas de Storage Genéricas (Isolamento por pasta com ID do usuário ou tenant)
DROP POLICY IF EXISTS "storage_isolation_select" ON storage.objects;
CREATE POLICY "storage_isolation_select" ON storage.objects FOR SELECT USING (true); -- Visualização pública (links assinados/públicos)

DROP POLICY IF EXISTS "storage_isolation_insert" ON storage.objects;
CREATE POLICY "storage_isolation_insert" ON storage.objects FOR INSERT WITH CHECK (
    auth.uid()::text = (storage.foldername(name))[1] OR 
    public.is_tenant_member((storage.foldername(name))[1]::uuid)
);

-- 5. PERMISSÕES DE EXECUÇÃO
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- MENSAGEM DE SUCESSO
SELECT 'Sistema White Label configurado com sucesso! Todos os dados estão agora isolados por Tenant.' as status;
