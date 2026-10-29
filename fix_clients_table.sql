-- ==============================================================================
-- FIX DEFINITIVO: TABELA CLIENTS (SUPABASE SQL EDITOR)
-- Remove restrição antiga de NOT NULL e Foreign Key de user_id
-- para permitir que clientes pertençam ao tenant_id normalmente
-- ==============================================================================

-- 1. Remove a restrição NOT NULL da coluna user_id
ALTER TABLE public.clients ALTER COLUMN user_id DROP NOT NULL;

-- 2. Remove a foreign key antiga que bloqueava cadastros com erro 23503
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_fkey;

-- 3. Garante que a coluna tenant_id existe e está indexada
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);

-- 4. Notifica sucesso
DO $$
BEGIN
  RAISE NOTICE 'Tabela clients atualizada com sucesso! Agora suporta criação rápida por tenant.';
END $$;
