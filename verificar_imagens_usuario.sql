-- =========================================================================================
-- CONSULTA SQL: CONFIRMAR IMAGENS ENVIADAS PARA A CONTA INDIVIDUAL DO USUÁRIO
-- Execute no SQL Editor do seu Supabase Dashboard (https://supabase.com/dashboard)
-- =========================================================================================

-- -----------------------------------------------------------------------------------------
-- 1. LISTAR TODAS AS IMAGENS DO BUCKET 'tenant-assets' COM DADOS DO USUÁRIO CADASTRADO (LOGIN/EMAIL)
-- -----------------------------------------------------------------------------------------
SELECT 
    u.email AS usuario_email,
    u.id AS usuario_id,
    o.bucket_id,
    o.name AS caminho_arquivo,
    split_part(o.name, '/', 1) AS pasta_tenant_ou_usuario,
    split_part(o.name, '/', 2) AS subpasta,
    split_part(o.name, '/', 3) AS nome_arquivo,
    round((o.metadata->>'size')::numeric / 1024, 2) AS tamanho_kb,
    o.metadata->>'mimetype' AS tipo_arquivo,
    o.created_at AS data_upload,
    'https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/' || o.bucket_id || '/' || o.name AS url_publica
FROM storage.objects o
LEFT JOIN auth.users u ON (
    o.owner = u.id 
    OR split_part(o.name, '/', 1) = u.id::text
    OR EXISTS (
        SELECT 1 FROM public.app_settings s 
        WHERE s.owner = u.id 
          AND s.tenant_id::text = split_part(o.name, '/', 1)
    )
)
WHERE o.bucket_id = 'tenant-assets'
ORDER BY o.created_at DESC;


-- -----------------------------------------------------------------------------------------
-- 2. FILTRAR IMAGENS ENVIADAS ESPECIFICAMENTE PELO SEU USUÁRIO / EMAIL
-- Substitua 'seu_email@gmail.com' pelo email do seu login
-- -----------------------------------------------------------------------------------------
SELECT 
    u.email AS usuario_email,
    o.name AS caminho_storage,
    round((o.metadata->>'size')::numeric / 1024, 2) AS tamanho_kb,
    o.created_at AS data_upload,
    'https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/' || o.name AS url_visualizacao
FROM storage.objects o
JOIN auth.users u ON (
    o.owner = u.id 
    OR split_part(o.name, '/', 1) = u.id::text
    OR EXISTS (
        SELECT 1 FROM public.app_settings s 
        WHERE s.owner = u.id 
          AND s.tenant_id::text = split_part(o.name, '/', 1)
    )
)
WHERE o.bucket_id = 'tenant-assets'
  AND u.email = 'gmedificacao@gmail.com' -- troque pelo seu email se necessário
ORDER BY o.created_at DESC;


-- -----------------------------------------------------------------------------------------
-- 3. CONFIRMAR IMAGENS VINCULADAS AO SEU WEBSITE BIO (BANNERS, LOGOS, PORTFÓLIO, CATÁLOGO)
-- Mostra a estrutura JSON da bio_config do seu usuário
-- -----------------------------------------------------------------------------------------
SELECT 
    s.id AS config_id,
    s.company_name,
    s.tenant_id,
    u.email AS dono_conta_email,
    s.bio_config->>'website_logo_url' AS logo_website,
    s.bio_config->>'banner_img_url_1' AS banner_desktop,
    s.bio_config->>'mobile_banner_img_url_1' AS banner_smartphone,
    s.bio_config->>'contact_banner_img_url' AS banner_contato,
    s.bio_config->>'about_banner_url' AS banner_sobre,
    jsonb_array_length(COALESCE(s.bio_config->'portfolio_items', '[]'::jsonb)) AS total_projetos_portfolio,
    jsonb_array_length(COALESCE(s.bio_config->'catalog_items', '[]'::jsonb)) AS total_produtos_catalogo,
    s.updated_at AS ultima_atualizacao
FROM public.app_settings s
LEFT JOIN auth.users u ON s.owner = u.id
WHERE s.company_name ILIKE '%GM%' OR s.owner IS NOT NULL
ORDER BY s.updated_at DESC NULLS LAST;


-- -----------------------------------------------------------------------------------------
-- 4. POLÍTICAS DE SEGURANÇA (RLS) GARANTINDO QUE CADA USUÁRIO SÓ GERENCIA SEUS PRÓPRIOS ARQUIVOS
-- Se desejar reforçar a separação por conta individual no Storage:
-- -----------------------------------------------------------------------------------------
-- Permite leitura pública das imagens do website para os visitantes
CREATE POLICY IF NOT EXISTS "Visitantes podem ver imagens do website"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-assets');

-- Permite ao usuário logado enviar imagens somente para a pasta da sua conta individual
CREATE POLICY IF NOT EXISTS "Usuario pode subir imagens na sua pasta individual"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tenant-assets'
    AND (
        -- Subpasta com o próprio ID do usuário autenticado ou tenant pertencente a ele
        split_part(name, '/', 1) = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.app_settings 
            WHERE owner = auth.uid() 
              AND tenant_id::text = split_part(name, '/', 1)
        )
    )
);
