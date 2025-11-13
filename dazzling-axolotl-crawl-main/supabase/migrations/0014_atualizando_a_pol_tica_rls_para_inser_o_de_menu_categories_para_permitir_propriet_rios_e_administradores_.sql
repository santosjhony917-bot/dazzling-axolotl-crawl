-- Remover a política existente se ela estiver mal configurada
DROP POLICY IF EXISTS "Owners and Admins can insert menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners can insert their menu categories" ON public.menu_categories;

-- Criar uma nova política para inserção de categorias de menu
CREATE POLICY "Owners and Admins can insert menu categories" ON public.menu_categories
FOR INSERT TO authenticated
WITH CHECK (
    (auth.uid() = (SELECT user_id FROM public.restaurants WHERE id = restaurant_id))
    OR public.is_admin()
);