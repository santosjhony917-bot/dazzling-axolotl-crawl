-- Remove from the app pipeline expansion leads that are not part of the product scope.
-- This is a soft delete only: records remain auditable through ai_log.

WITH candidates AS (
  SELECT
    r.id,
    CASE
      WHEN lower(coalesce(r.name, '') || ' ' || coalesce(r.category, '') || ' ' || coalesce(r.description, ''))
        ~ '(padaria|panificadora|panificacao|panificação)'
        THEN 'padaria/panificadora'

      WHEN lower(coalesce(r.name, '') || ' ' || coalesce(r.category, '') || ' ' || coalesce(r.description, ''))
        ~ '(hotel|pousada|sitio|sítio|chacara|chácara|fazenda|resort|area de lazer|área de lazer|recepcoes|recepções|espaco de eventos|espaço de eventos|casa de festas|buffet de eventos|clube campestre|balneario|balneário|food park)'
        THEN 'hotel/sítio/eventos'

      WHEN lower(coalesce(r.name, '') || ' ' || coalesce(r.category, ''))
        ~ '(^|[^a-z0-9])(mercado publico|mercado público|praca publica|praça pública|praca de alimentacao|praça de alimentação|terminal rodoviario|terminal rodoviário|rodoviaria|rodoviária|rodoviaria velha|rodoviária velha|parque da|parque do|parque de|rua da|rua do)($|[^a-z0-9])'
        OR lower(coalesce(r.name, ''))
        ~ '^(r\.|rua|av\.|avenida|travessa|rod\.|rodovia|bairro|loteamento|condominio|condomínio)($|[^a-z0-9])'
        THEN 'ponto público/rua/praça/mapa'

      ELSE NULL
    END AS rejection_type
  FROM public.restaurants r
  WHERE coalesce(r.is_deleted, false) = false
    AND coalesce(r.is_published, false) = false
    AND coalesce(r.ai_validated, false) = false
    AND (
      lower(coalesce(r.name, '') || ' ' || coalesce(r.category, '') || ' ' || coalesce(r.description, ''))
        ~ '(padaria|panificadora|panificacao|panificação)'
      OR (
        lower(coalesce(r.name, '') || ' ' || coalesce(r.category, '') || ' ' || coalesce(r.description, ''))
          ~ '(hotel|pousada|sitio|sítio|chacara|chácara|fazenda|resort|area de lazer|área de lazer|recepcoes|recepções|recepcões|espaco de eventos|espaço de eventos|casa de festas|buffet de eventos|clube campestre|balneario|balneário|food park)'
        AND lower(coalesce(r.name, '') || ' ' || coalesce(r.category, '') || ' ' || coalesce(r.description, ''))
          !~ '(restaurante|pizzaria|hamburg|lanchonete|pastelaria|sorveteria|açaí|acai|churrascaria|bar e restaurante|petiscaria|cafeteria|bistro|cantina|cozinha|esfiharia|temakeria|sushi|marmitaria|food truck|doceria|confeitaria|espetinho|espetos|lanche|burger|pizza|crepe|tapioca|yakisoba|delivery de comida|marmita|quentinha|salgado|frango|galeto|cafe|café)'
      )
      OR (
        (
          lower(coalesce(r.name, '') || ' ' || coalesce(r.category, ''))
            ~ '(^|[^a-z0-9])(mercado publico|mercado público|praca publica|praça pública|praca de alimentacao|praça de alimentação|terminal rodoviario|terminal rodoviário|rodoviaria|rodoviária|rodoviaria velha|rodoviária velha|parque da|parque do|parque de|rua da|rua do)($|[^a-z0-9])'
          OR lower(coalesce(r.name, ''))
            ~ '^(r\.|rua|av\.|avenida|travessa|rod\.|rodovia|bairro|loteamento|condominio|condomínio)($|[^a-z0-9])'
        )
        AND lower(coalesce(r.name, '') || ' ' || coalesce(r.category, '') || ' ' || coalesce(r.description, ''))
          !~ '(restaurante|pizzaria|hamburg|lanchonete|pastelaria|sorveteria|açaí|acai|churrascaria|bar e restaurante|petiscaria|cafeteria|bistro|cantina|cozinha|esfiharia|temakeria|sushi|marmitaria|food truck|doceria|confeitaria|espetinho|espetos|lanche|burger|pizza|crepe|tapioca|yakisoba|delivery de comida|marmita|quentinha|salgado|frango|galeto|cafe|café)'
      )
    )
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
    'phase', 'product_scope_cleanup',
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
