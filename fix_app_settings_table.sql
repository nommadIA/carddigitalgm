-- =========================================================================
-- CORREÇÃO DA TABELA app_settings (Remoção da restrição NOT NULL em owner)
-- Execute este script no SQL Editor do Supabase se desejar flexibilizar
-- a coluna owner caso configurações sejam atualizadas em background.
-- =========================================================================

-- 1. Remove a restrição NOT NULL da coluna owner (se existir)
ALTER TABLE public.app_settings ALTER COLUMN owner DROP NOT NULL;

-- 2. Garante permissão de leitura e escrita
GRANT ALL ON TABLE public.app_settings TO authenticated, anon, service_role;
