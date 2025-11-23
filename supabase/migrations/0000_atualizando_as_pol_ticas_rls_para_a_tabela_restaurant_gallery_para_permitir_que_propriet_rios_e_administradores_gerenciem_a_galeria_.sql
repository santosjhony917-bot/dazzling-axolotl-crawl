-- Remove a política existente para evitar conflitos
DROP POLICY IF EXISTS "Owners can view and update their gallery" ON public.restaurant_gallery;

-- Remove a política de INSERT específica, se existir, pois a política FOR ALL a cobrirá.
DROP POLICY IF EXISTS "Owners can insert gallery images" ON public.restaurant_gallery;

-- Remove a política alvo se ela já existir para evitar erro de duplicação
DROP POLICY IF EXISTS "Owners and Admins can manage gallery" ON public.restaurant_gallery;

-- Cria uma nova política FOR ALL que permite que o proprietário do restaurante OU um administrador gerencie (SELECT, INSERT, UPDATE, DELETE) as imagens da galeria.
CREATE POLICY "Owners and Admins can manage gallery" ON public.restaurant_gallery
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_gallery.restaurant_id AND r.user_id = auth.uid()
  ) OR is_admin()
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = restaurant_gallery.restaurant_id AND r.user_id = auth.uid()
  ) OR is_admin()
);