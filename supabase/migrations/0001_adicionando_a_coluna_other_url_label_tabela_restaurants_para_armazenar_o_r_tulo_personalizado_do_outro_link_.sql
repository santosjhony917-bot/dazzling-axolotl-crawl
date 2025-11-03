ALTER TABLE public.restaurants
ADD COLUMN other_url_label TEXT;

-- Adicionar política de atualização para a nova coluna
CREATE POLICY "Allow owner to update other_url_label" ON public.restaurants
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);