-- Validar IA / Fase 1 cleanup v3
-- Goal: remove only high-confidence non-restaurant expansion noise and keep ambiguous food leads auditable.
-- This is intentionally conservative: rows are soft-deleted only while not published and not AI validated.

WITH scoped AS (
  SELECT
    r.id,
    lower(coalesce(r.name, '') || ' ' || coalesce(r.category, '') || ' ' || coalesce(r.description, '') || ' ' || coalesce(r.address, '')) AS all_text,
    lower(coalesce(r.name, '')) AS clean_name
  FROM public.restaurants r
  WHERE coalesce(r.is_deleted, false) = false
    AND coalesce(r.is_published, false) = false
    AND coalesce(r.ai_validated, false) = false
),
classified AS (
  SELECT
    id,
    all_text,
    clean_name,
    all_text ~ '(restaurante|pizzaria|hamburg|lanchonete|pastelaria|sorveteria|açaí|acai|churrascaria|bar e restaurante|bar/restaurante|petiscaria|cafeteria|bistro|cantina|cozinha|esfiharia|temakeria|sushi|japones|japonês|self service|self-service|marmitaria|marmita|quentinha|food truck|doceria|confeitaria|espetinho|espetos|lanche|lanches|burger|burguer|pizza|crepe|tapioca|yakisoba|salgado|salgados|frango|galeto|cafe|café|bolo|bolos|torta|tortas|massas|feijões|feijoes|churrasco|prato feito)' AS has_food_signal,
    all_text ~ '(restaurante|marmitaria|marmita|quentinha|salgado|salgados|pizza|pizzaria|churrasco|churrascaria|massas|feijões|feijoes|self service|self-service|lanchonete|prato feito|galeto|espetinho|espetos)' AS has_buffet_food_qualifier,
    all_text ~ '(bar|boteco|pub)' AS has_weak_bar_signal
  FROM scoped
),
soft_delete_candidates AS (
  SELECT
    id,
    CASE
      WHEN clean_name ~ '(permanentemente fechado|temporariamente fechado)'
        OR clean_name ~ '^[a-z]?[[:space:]]*[0-9]+([,.][0-9]+)?[[:space:]]*\([0-9]+\)'
        THEN 'ruido/snippet do Google Maps'

      WHEN NOT has_food_signal
        AND all_text ~ '(sinagoga|igreja|hospital|posto de saúde|posto de saude|escola|faculdade|universidade|museu|cemitério|cemiterio|cartorio|cartório|academia|barbearia|salão de beleza|salao de beleza|clínica|clinica|laboratório|laboratorio|oficina|lava jato|pet shop|agropecuária|agropecuaria|material de construção|material de construcao)'
        THEN 'serviço/ponto público fora do escopo'

      WHEN NOT has_food_signal
        AND all_text ~ '(posto de gasolina|posto petrobras|posto ipiranga|posto são josé|posto sao jose|br mania)'
        THEN 'posto/conveniência fora do escopo'

      WHEN NOT has_food_signal
        AND all_text ~ '(supermercado|hipermercado|atacadão|atacadao|atacarejo|mercado público|mercado publico|mercadinho|mercearia|hortifruti|sacolão|sacolao|bomboniere|embalagens|multivarejo)'
        THEN 'mercado/varejo fora do escopo'

      WHEN NOT has_food_signal
        AND all_text ~ '(açougue|acougue|casa de carnes|peixaria|distribuidora de bebidas|depósito de bebidas|deposito de bebidas)'
        THEN 'açougue/peixaria/distribuidora fora do escopo'

      WHEN all_text ~ '(hotel|pousada|motel|sítio|sitio|chácara|chacara|fazenda|resort|área de lazer|area de lazer|cerimonial|espaço de eventos|espaco de eventos|casa de festas|buffet de eventos|buffet festas|buffet e eventos|eventos|festas|balneário|balneario)'
        AND NOT (has_food_signal AND NOT all_text ~ '(eventos|festas|cerimonial|espaço de eventos|espaco de eventos)')
        THEN 'hotel/sítio/eventos fora do escopo'

      ELSE NULL
    END AS rejection_type
  FROM classified
),
ambiguous_buffet AS (
  SELECT id
  FROM classified
  WHERE all_text ~ 'buffet'
    AND NOT has_buffet_food_qualifier
    AND id NOT IN (SELECT id FROM soft_delete_candidates WHERE rejection_type IS NOT NULL)
)
UPDATE public.restaurants r
SET
  is_deleted = true,
  is_published = false,
  ai_validated = false,
  menu_status = 'unavailable',
  menu_status_reason = 'Removido por regra de produto: ' || c.rejection_type || '.',
  ai_log = jsonb_build_object(
    'pipeline', 'validar-ia-extension',
    'status', 'ineligible_removed',
    'phase', 'validar_ia_scope_cleanup_v3',
    'decision', jsonb_build_object(
      'status', 'ineligible',
      'confidence', 0.97,
      'reason', 'Lead fora do escopo do app: ' || c.rejection_type
    ),
    'removedAt', now()
  )::text
FROM soft_delete_candidates c
WHERE r.id = c.id
  AND c.rejection_type IS NOT NULL;

WITH scoped AS (
  SELECT
    r.id,
    lower(coalesce(r.name, '') || ' ' || coalesce(r.category, '') || ' ' || coalesce(r.description, '') || ' ' || coalesce(r.address, '')) AS all_text
  FROM public.restaurants r
  WHERE coalesce(r.is_deleted, false) = false
    AND coalesce(r.is_published, false) = false
    AND coalesce(r.ai_validated, false) = false
),
classified AS (
  SELECT
    id,
    all_text,
    all_text ~ '(restaurante|marmitaria|marmita|quentinha|salgado|salgados|pizza|pizzaria|churrasco|churrascaria|massas|feijões|feijoes|self service|self-service|lanchonete|prato feito|galeto|espetinho|espetos)' AS has_buffet_food_qualifier
  FROM scoped
),
ambiguous_buffet AS (
  SELECT id
  FROM classified
  WHERE all_text ~ 'buffet'
    AND NOT has_buffet_food_qualifier
)
UPDATE public.restaurants r
SET
  menu_status = 'manual_required',
  menu_status_reason = 'Buffet/catering ambíguo: só avançar se o Validar IA encontrar cardápio público organizado.',
  ai_log = jsonb_build_object(
    'pipeline', 'validar-ia-extension',
    'status', 'manual_required',
    'phase', 'validar_ia_scope_cleanup_v3',
    'decision', jsonb_build_object(
      'status', 'unknown',
      'confidence', 0.58,
      'reason', 'Buffet isolado parece catering/evento; exige cardápio público antes de entrar no app.'
    ),
    'reviewedAt', now()
  )::text
FROM ambiguous_buffet b
WHERE r.id = b.id
  AND coalesce(r.is_deleted, false) = false
  AND coalesce(r.is_published, false) = false
  AND coalesce(r.ai_validated, false) = false;
