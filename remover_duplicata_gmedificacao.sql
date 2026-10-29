-- =========================================================================================
-- REMOVER DUPLICATA DE GM EDIFICAÇÃO (DEIXAR APENAS 1 ATIVO)
-- Execute este script no SQL Editor do seu Supabase Dashboard (https://supabase.com/dashboard)
-- =========================================================================================

-- -----------------------------------------------------------------------------------------
-- PASSO 1: EXCLUIR O REGISTRO DUPLICADO ANTIGO / OBSOLETO (id: 19609c6b-85a3-4fb1-a40a-18250554fc62)
-- Esse registro continha o tenant antigo (d79bb193-0927-4b56-bcba-83e2b2bef9c6) sem bio e sem logo.
-- -----------------------------------------------------------------------------------------
DELETE FROM public.app_settings 
WHERE id = '19609c6b-85a3-4fb1-a40a-18250554fc62'
   OR (tenant_id = 'd79bb193-0927-4b56-bcba-83e2b2bef9c6' AND id <> 'dd5ab0ff-3e7c-4031-9b14-c6a6eb66922f');

-- Opcional: remover vínculos antigos do tenant obsoleto caso existam em memberships
DELETE FROM public.tenant_memberships 
WHERE tenant_id = 'd79bb193-0927-4b56-bcba-83e2b2bef9c6';

DELETE FROM public.tenants 
WHERE id = 'd79bb193-0927-4b56-bcba-83e2b2bef9c6';


-- -----------------------------------------------------------------------------------------
-- PASSO 2: ATUALIZAR O REGISTRO OFICIAL E ATIVO (id: dd5ab0ff-3e7c-4031-9b14-c6a6eb66922f)
-- Gravando os banners, logotipos, fontes e configurações restauradas do Website Bio (08/10/2026)
-- -----------------------------------------------------------------------------------------
UPDATE public.app_settings
SET 
  company_name = 'GM edificação',
  website_logo_url = 'https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/logo_1790345925228_lq174s.svg',
  company_logo_url = 'https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/logo.jpg?t=1790426179060',
  bio_config = '{
    "title": "GM edificação",
    "title_mobile": "GM edificação",
    "title_font": "syne",
    "title_font_mobile": "syne",
    "title_size": "36 pt",
    "title_size_mobile": "26 pt",
    "title_color": "#FFFFFF",
    "hero_title": "GM edificação",
    "hero_title_mobile": "GM edificação",
    "description": "GM edificação, Design Feroz",
    "description_mobile": "GM edificação, Design Feroz",
    "description_align": "left",
    "description_align_mobile": "center",
    "description_bold": true,
    "description_bold_mobile": true,
    "description_italic": false,
    "description_italic_mobile": false,
    "description_font": "syne",
    "description_font_mobile": "syne",
    "description_size": "18 pt",
    "description_size_mobile": "16 pt",
    "description_color": "#E4E4E7",
    "phone": "(98) 98840-2049",
    "email": "gmedificacao@gmail.com",
    "whatsapp": "5598988402049",
    "instagram": "gmedificacao",
    "facebook": "",
    "telegram": "",
    "linkedin": "",
    "tiktok": "",
    "website": "https://gmedificacao.com",
    "portfolio_url": "",
    "catalog_url": "",
    "address": "São Luís - MA",
    "address_url": "",
    "pix_key": "carddigitalgm@gmail.com",
    "pix_type": "CNPJ",
    "card_url": "",
    "bg_image_url": "",
    "bg_mobile_image_url": "",
    "theme": "dark",
    "color": "#FE540B",
    "show_banners": true,
    "banner_img_url_1": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787217210889.jpg?t=1787217210889",
    "banner_img_url_2": "",
    "banner_img_url_3": "",
    "mobile_banner_img_url_1": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787213992954.webp?t=1787213992954",
    "mobile_banner_img_url_2": "",
    "mobile_banner_img_url_3": "",
    "contact_banner_img_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787217210889.jpg?t=1787217210889",
    "contact_title": "Fale com a nossa equipe",
    "contact_desc": "Estamos prontos para atender você e transformar o seu projeto em realidade.",
    "about_banner_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/background_1787217210889.jpg?t=1787217210889",
    "show_about": true,
    "about_title": "SOBRE A GM EDIFICAÇÃO",
    "about_description": "A GM edificação é uma agência criativa que transforma ideias em experiências visuais, marcas e conteúdos que comunicam, conectam e geram impacto. Especializada em Design Gráfico, Branding, Identidade Visual, Motion Design, Design 3D, Social Media e Produção de Conteúdo, a GM edificação combina criatividade, estratégia e tecnologia para desenvolver projetos únicos, profissionais e alinhados à essência de cada cliente. Mais do que criar uma arte, construímos conceitos.",
    "about_highlight": "Edificamos ideias. Criamos impacto. Design Feroz. 🦁",
    "about_btn_text": "Fale Conosco",
    "about_btn_link": "https://wa.me/5598988402049",
    "about_title_align": "center",
    "about_title_bold": true,
    "about_title_italic": false,
    "about_title_font": "funnel",
    "about_title_size": "30 pt",
    "about_desc_align": "center",
    "about_desc_bold": false,
    "about_desc_italic": false,
    "about_desc_font": "ui",
    "about_desc_size": "16 pt",
    "about_highlight_align": "center",
    "about_highlight_bold": true,
    "about_highlight_italic": false,
    "about_highlight_font": "ui",
    "about_highlight_size": "16 pt",
    "website_logo_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/logo_1790345925228_lq174s.svg",
    "logo_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/logo_1790345925228_lq174s.svg",
    "hero_button_label": "Conheça nossos Serviços",
    "hero_button_action": "portfolio",
    "hero_button_url": "",
    "site_font": "syne",
    "site_font_size": "18 pt",
    "site_font_mobile": "syne",
    "site_font_size_mobile": "16 pt",
    "bg_animation": "parallax",
    "button_style": "solid",
    "button_bg": "#FE540B",
    "button_border": "#FE540B",
    "button_text": "#FFFFFF",
    "button_icon": "#FFFFFF",
    "theme_colors_dark": {
      "bg": "#0B0B0C",
      "icon": "#FE540B",
      "title": "#FFFFFF",
      "accent": "#FF7A38",
      "button": "#FF7A38",
      "menu_bg": "#131315",
      "primary": "#FE540B",
      "subtitle": "#E2E8F0",
      "menu_icon": "#FE540B",
      "menu_title": "#FFFFFF",
      "menu_button": "#FE540B",
      "menu_primary": "#FE540B",
      "menu_subtitle": "#E2E8F0"
    },
    "button_config_dark": {
      "bg": "#FE540B",
      "icon": "#FFFFFF",
      "text": "#FFFFFF",
      "style": "solid",
      "border": "#FE540B"
    },
    "chat_balloon_enabled": true,
    "chat_balloon_show_qrcode": true,
    "chat_balloon_qr_link": "https://wa.me/5598988402049",
    "chat_balloon_qr_msg": "Olá! Estou vindo do site GM edificação, quero saber mais.",
    "chat_balloon_bg_color": "#FE540B",
    "chat_balloon_text_color": "#FFFFFF",
    "chat_balloon_text": "Olá 👋\\nSou Denis, como posso te ajudar hoje?",
    "chat_balloon_button_text": "Abrir chat",
    "catalog_title": "Catálogo de Serviços",
    "catalog_items": [],
    "portfolio_title": "Portfólio",
    "portfolio_items": [
      {
        "id": "portfolio-lolla-coiffeur",
        "title": "Lolla Coiffeur - Espaço de Beleza",
        "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305212249_22vaka.webp",
        "layers": [
          { "id": "layer-lolla-1", "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305212249_22vaka.webp" },
          { "id": "layer-lolla-2", "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1790794170659_gbz30c.webp" }
        ],
        "description": "Identidade visual e posicionamento de marca para o Espaço de Beleza Lolla Coiffeur. Criação de comunicação visual moderna, peças digitais e materiais de alta fidelidade para captação de clientes.",
        "description_align": "left",
        "description_bold": true,
        "description_italic": false,
        "description_font": "funnel",
        "description_size": "16 pt"
      },
      {
        "id": "portfolio-guerreiros-cross",
        "title": "Guerreiros Cross - Guerra de Troia",
        "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305236624_2rozol.webp",
        "layers": [
          { "id": "layer-cross-1", "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305230215_av82js.webp" },
          { "id": "layer-cross-2", "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305236624_2rozol.webp" },
          { "id": "layer-cross-3", "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1790794105721_9egh0h.webp" }
        ],
        "description": "Identidade e campanha do Treinão Aberto Guerra de Troia em comemoração ao Dia da Mulher. Comunicação de alto impacto e energia para a academia Guerreiros Cross.",
        "description_align": "left",
        "description_bold": true,
        "description_italic": false,
        "description_font": "funnel",
        "description_size": "16 pt"
      },
      {
        "id": "portfolio-satcom",
        "title": "Satcom - Internet Fibra Óptica",
        "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305256146_9hcell.jpg",
        "layers": [
          { "id": "layer-satcom-1", "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305247987_an4mrd.jpg" },
          { "id": "layer-satcom-2", "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1791305256146_9hcell.jpg" },
          { "id": "layer-satcom-3", "image_url": "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/tenant-assets/6f4ee596-eb5e-415f-9189-d571ad85ed95/bio/bio_image_1790794120207_zzjjgl.jpg" }
        ],
        "description": "Campanhas publicitárias e banners promocionais de Ultra Velocidade Fibra Óptica para a operadora Satcom.",
        "description_align": "left",
        "description_bold": true,
        "description_italic": false,
        "description_font": "funnel",
        "description_size": "16 pt"
      }
    ],
    "custom_links": [
      {
        "id": "link-whatsapp-orcamento",
        "label": "Fale com Denis no WhatsApp",
        "url": "https://wa.me/5598988402049?text=Ol%C3%A1%21%20Gostaria%20de%20um%20or%C3%A7amento%20com%20a%20GM%20edifica%C3%A7%C3%A3o.",
        "platform": "whatsapp",
        "value": ""
      },
      {
        "id": "link-instagram-oficial",
        "label": "Instagram Oficial @gmedificacao",
        "url": "https://instagram.com/gmedificacao",
        "platform": "instagram",
        "value": ""
      },
      {
        "id": "link-portfolio",
        "label": "Ver Nosso Portfólio de Projetos",
        "url": "#portfolio-section",
        "platform": "website",
        "value": ""
      }
    ]
  }'::jsonb,
  updated_at = NOW()
WHERE id = 'dd5ab0ff-3e7c-4031-9b14-c6a6eb66922f';


-- -----------------------------------------------------------------------------------------
-- PASSO 3: CONSULTA DE CONFERÊNCIA (VERIFICAR O RESULTADO FINAL)
-- -----------------------------------------------------------------------------------------
SELECT 
    s.id,
    s.company_name,
    s.tenant_id,
    u.email AS usuario_dono,
    s.bio_config->>'website_logo_url' AS logo_website,
    s.bio_config->>'banner_img_url_1' AS banner_desktop,
    s.bio_config->>'mobile_banner_img_url_1' AS banner_mobile,
    s.bio_config->>'contact_banner_img_url' AS banner_contato,
    jsonb_array_length(COALESCE(s.bio_config->'portfolio_items', '[]'::jsonb)) AS total_projetos_portfolio,
    s.updated_at
FROM public.app_settings s
LEFT JOIN auth.users u ON s.owner = u.id
WHERE s.company_name ILIKE '%GM%' OR u.email = 'gmedificacao@gmail.com'
ORDER BY s.updated_at DESC NULLS LAST;
