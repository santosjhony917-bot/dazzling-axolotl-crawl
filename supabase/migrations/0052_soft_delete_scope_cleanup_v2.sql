-- Second-pass scope cleanup used by Validar IA.
-- Deletes only non-published/non-validated expansion candidates outside product scope.
-- Food-protected names like "Aurora Cafe da praça" or "Clube Vava Espetos" are kept for IA validation.

WITH scoped AS (
  SELECT
    r.id,
    lower(coalesce(r.name, '') || ' ' || coalesce(r.category, '') || ' ' || coalesce(r.description, '')) AS all_text,
    lower(coalesce(r.name, '') || ' ' || coalesce(r.category, '')) AS name_category,
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
    name_category,
    clean_name,
    all_text ~ '(restaurante|pizzaria|hamburg|lanchonete|pastelaria|sorveteria|açaí|acai|churrascaria|bar e restaurante|petiscaria|cafeteria|bistro|cantina|cozinha|esfiharia|temakeria|sushi|marmitaria|food truck|doceria|confeitaria|espetinho|espetos|lanche|burger|pizza|crepe|tapioca|yakisoba|delivery de comida|marmita|quentinha|salgado|frango|galeto|cafe|café)' AS has_food_signal
  FROM scoped
),
candidates AS (
  SELECT
    id,
    CASE
      WHEN all_text ~ '(padaria|panificadora|panificacao|panificação)'
        THEN 'padaria/panificadora'
      WHEN NOT has_food_signal
        AND all_text ~ '(hotel|pousada|sitio|sítio|chacara|chácara|fazenda|resort|area de lazer|área de lazer|recepcoes|recepções|recepcões|espaco de eventos|espaço de eventos|casa de festas|buffet de eventos|clube|balneario|balneário|food park)'
        THEN 'hotel/sítio/eventos'
      WHEN NOT has_food_signal
        AND (
          name_category ~ '(^|[^a-z0-9])(mercado publico|mercado público|praca publica|praça pública|praca de alimentacao|praça de alimentação|terminal rodoviario|terminal rodoviário|rodoviaria|rodoviária|rodoviaria velha|rodoviária velha|parque da|parque do|parque de|rua da|rua do)($|[^a-z0-9])'
          OR clean_name ~ '^(r\.|rua|av\.|avenida|travessa|rod\.|rodovia|bairro|loteamento|condominio|condomínio)($|[^a-z0-9])'
        )
        THEN 'ponto público/rua/praça/mapa'
      ELSE NULL
    END AS rejection_type
  FROM classified
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
    'phase', 'product_scope_cleanup_v2',
    'decision', jsonb_build_object(
      'status', 'ineligible',
      'confidence', 0.97,
      'reason', 'Tipo de lead fora do escopo do app: ' || c.rejection_type
    ),
    'removedAt', now()
  )::text
FROM candidates c
WHERE r.id = c.id
  AND c.rejection_type IS NOT NULL;
