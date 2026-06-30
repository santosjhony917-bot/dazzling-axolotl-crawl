-- Backfill: opções/sabores pesquisáveis precisam de um rótulo publicável.
-- A regra não inventa cardápio: apenas combina nome do item + nome literal da opção,
-- limpando prefixos operacionais como "1/2" e "ADD".

UPDATE public.menu_item_options AS mio
SET search_label = btrim(regexp_replace(
  concat_ws(
    ' ',
    COALESCE(mi.display_name, mi.search_display_name, mi.name),
    NULLIF(
      btrim(regexp_replace(
        regexp_replace(mio.name, '^\s*(?:[0-9]+\s*/\s*[0-9]+|1/2|meia|meio)\s*', '', 'i'),
        '^\s*(?:add|adc|adicional)\s+',
        '',
        'i'
      )),
      ''
    )
  ),
  '\s+',
  ' ',
  'g'
))
FROM public.menu_items AS mi
WHERE mio.menu_item_id = mi.id
  AND mio.is_searchable_variant = TRUE
  AND (mio.search_label IS NULL OR btrim(mio.search_label) = '');
