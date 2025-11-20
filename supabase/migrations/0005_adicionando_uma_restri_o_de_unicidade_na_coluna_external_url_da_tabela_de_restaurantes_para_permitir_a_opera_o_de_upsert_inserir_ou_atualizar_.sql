-- Adiciona uma restrição UNIQUE à coluna external_url para evitar duplicatas.
-- A operação pode falhar se já existirem valores duplicados (não nulos).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_external_url_key') THEN
        ALTER TABLE public.restaurants
        ADD CONSTRAINT restaurants_external_url_key UNIQUE (external_url);
    END IF;
END $$;