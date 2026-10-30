-- ========================================================
-- DELEÇÃO DEFINITIVA DO USUÁRIO nommadart@gmail.com
-- E AJUSTE DE CASCADE PARA PERMITIR DELEÇÃO DIRETA NO SUPABASE
-- ========================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Localiza o id do usuário nommadart@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'nommadart@gmail.com';

  IF v_user_id IS NOT NULL THEN
    -- Remove registros vinculados nas tabelas de dados
    DELETE FROM public.budgets WHERE user_id = v_user_id;
    DELETE FROM public.clients WHERE user_id = v_user_id;
    DELETE FROM public.expenses WHERE user_id = v_user_id;
    DELETE FROM public.app_settings WHERE owner = v_user_id;
    DELETE FROM public.user_branding WHERE user_id = v_user_id;
    DELETE FROM public.tenant_memberships WHERE user_id = v_user_id;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'device_locks') THEN
      DELETE FROM public.device_locks WHERE user_id = v_user_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
      DELETE FROM public.notes WHERE user_id = v_user_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'market_items') THEN
      DELETE FROM public.market_items WHERE user_id = v_user_id;
    END IF;

    -- Deleta o tenant criado exclusivamente por ele (caso exista)
    DELETE FROM public.tenants WHERE id = '29b69f94-eca8-4c7a-ae17-fc707cd6e2f8'
      AND NOT EXISTS (SELECT 1 FROM public.tenant_memberships WHERE tenant_id = '29b69f94-eca8-4c7a-ae17-fc707cd6e2f8' AND user_id != v_user_id);

    -- Deleta o usuário definitivamente do auth.users
    DELETE FROM auth.users WHERE id = v_user_id;
    
    RAISE NOTICE 'Usuário nommadart@gmail.com deletado com sucesso!';
  ELSE
    RAISE NOTICE 'Usuário nommadart@gmail.com não encontrado no auth.users (já pode ter sido removido).';
  END IF;
END $$;

-- 2. Atualizar as foreign keys para ON DELETE CASCADE
-- Isso garante que você poderá deletar qualquer usuário no painel Supabase no futuro sem travar por Foreign Key!

ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_owner_fkey;
ALTER TABLE public.app_settings 
  ADD CONSTRAINT app_settings_owner_fkey 
  FOREIGN KEY (owner) REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'budgets_user_id_fkey') THEN
    ALTER TABLE public.budgets DROP CONSTRAINT budgets_user_id_fkey;
    ALTER TABLE public.budgets ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'clients_user_id_fkey') THEN
    ALTER TABLE public.clients DROP CONSTRAINT clients_user_id_fkey;
    ALTER TABLE public.clients ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'expenses_user_id_fkey') THEN
    ALTER TABLE public.expenses DROP CONSTRAINT expenses_user_id_fkey;
    ALTER TABLE public.expenses ADD CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
