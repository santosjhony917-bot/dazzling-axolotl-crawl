-- Step 1: Add the new column for the short claim code, if it doesn't exist.
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS claim_code TEXT;

-- Step 2: Create a function that generates a unique 8-character code.
-- This version fixes the type casting issue for the substr function.
CREATE OR REPLACE FUNCTION public.generate_restaurant_claim_code()
RETURNS text AS $$
DECLARE
  new_code TEXT;
  is_unique BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character uppercase alphanumeric string.
    new_code := (
        SELECT string_agg(c, '')
        FROM (
            SELECT substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', (floor(random() * 36) + 1)::integer, 1)
            FROM generate_series(1, 8)
        ) AS sub(c)
    );
    -- Check if the generated code already exists.
    SELECT NOT EXISTS(SELECT 1 FROM public.restaurants WHERE claim_code = new_code) INTO is_unique;
    -- If it's unique, exit the loop.
    IF is_unique THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Step 3: Backfill the `claim_code` for all existing restaurants that don't have one.
UPDATE public.restaurants
SET claim_code = public.generate_restaurant_claim_code()
WHERE claim_code IS NULL;

-- Step 4: Now that all rows are populated, add a UNIQUE constraint to enforce uniqueness.
-- We remove it first in case a partial execution from before left it in a bad state.
ALTER TABLE public.restaurants DROP CONSTRAINT IF EXISTS restaurants_claim_code_unique;
ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_claim_code_unique UNIQUE (claim_code);

-- Step 5: Create a trigger function that will automatically set the claim code for any new restaurant.
CREATE OR REPLACE FUNCTION public.set_restaurant_claim_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_code IS NULL THEN
    NEW.claim_code := public.generate_restaurant_claim_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create the trigger that fires before a new restaurant is inserted.
DROP TRIGGER IF EXISTS before_insert_set_claim_code ON public.restaurants;
CREATE TRIGGER before_insert_set_claim_code
BEFORE INSERT ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.set_restaurant_claim_code();