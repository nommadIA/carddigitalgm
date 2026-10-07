-- =========================================================================
-- GM EDIFICAÇÃO / CARDDIGITAL GM - CORREÇÃO DE PORTFÓLIO E WEBSITE
-- Execute este script no SQL Editor do seu Supabase Dashboard
-- =========================================================================

-- 1. Garante que a coluna bio_config existe na tabela app_settings
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS bio_config jsonb DEFAULT '{}'::jsonb;

-- 2. Garante que a coluna tenant_id possui restrição UNIQUE (necessária para upsert seguro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'app_settings_tenant_id_key' 
      AND conrelid = 'public.app_settings'::regclass
  ) THEN
    -- Remove possíveis duplicatas antes de criar a restrição UNIQUE (mantém o mais recente)
    DELETE FROM public.app_settings a
    WHERE a.id NOT IN (
      SELECT DISTINCT ON (tenant_id) id
      FROM public.app_settings
      WHERE tenant_id IS NOT NULL
      ORDER BY tenant_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    )
    AND a.tenant_id IS NOT NULL;

    ALTER TABLE public.app_settings 
    ADD CONSTRAINT app_settings_tenant_id_key UNIQUE (tenant_id);
  END IF;
END $$;

-- 3. Habilita RLS e garante permissões de leitura pública e gravação autenticada
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'app_settings' AND policyname = 'Allow public read app_settings'
  ) THEN
    CREATE POLICY "Allow public read app_settings" ON public.app_settings
    FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'app_settings' AND policyname = 'Allow auth all app_settings'
  ) THEN
    CREATE POLICY "Allow auth all app_settings" ON public.app_settings
    FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Garante que o bucket de armazenamento 'tenant-assets' está configurado como público e permite uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow public read tenant-assets'
  ) THEN
    CREATE POLICY "Allow public read tenant-assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'tenant-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow auth upload tenant-assets'
  ) THEN
    CREATE POLICY "Allow auth upload tenant-assets" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'tenant-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow auth update tenant-assets'
  ) THEN
    CREATE POLICY "Allow auth update tenant-assets" ON storage.objects
    FOR UPDATE USING (bucket_id = 'tenant-assets');
  END IF;
END $$;

-- Concluído com sucesso!
