-- ==============================================================================
-- FIX: ADICIONAR COLUNAS QUE FALTAM NA TABELA EXPENSES (DESPESAS) NO SUPABASE
-- Execute este script no SQL Editor do seu painel Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Adiciona a coluna is_recurring (booleano para indicar se a despesa é recorrente todo mês)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- 2. Adiciona a coluna reminder_time (texto para guardar horário/data do lembrete programado)
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS reminder_time TEXT;

-- 3. Garante que as colunas de exclusão lógica (lixeira) também existam
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- 4. Notifica o PostgREST para recarregar o cache de schema imediatamente
NOTIFY pgrst, 'reload schema';
