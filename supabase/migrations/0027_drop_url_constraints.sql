-- Remove as restrições UNIQUE das colunas other_url e external_url para evitar erros de chave duplicada
-- ao cadastrar ou raspar links de cardápio idênticos para diferentes estabelecimentos (ex: filiais ou testes).

ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_other_url_key;
ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_external_url_key;
