-- Step 1: Create the ENUM type for visit status if it doesn't exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visit_status_enum') THEN
        CREATE TYPE public.visit_status_enum AS ENUM (
            'Pendente',
            'Contatado',
            'Interessado',
            'Não Interessado',
            'Não Localizado'
        );
    END IF;
END$$;

-- Step 2: Add the visit_status column to the restaurants table.
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS visit_status public.visit_status_enum DEFAULT 'Pendente';

-- Step 3: Add the visit_notes column to the restaurants table.
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS visit_notes TEXT;