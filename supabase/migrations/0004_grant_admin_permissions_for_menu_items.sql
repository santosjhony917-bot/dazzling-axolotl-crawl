-- Grant admins permission to insert menu items
CREATE POLICY "Admins can insert menu items"
ON public.menu_items
FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- Grant admins permission to update menu items
CREATE POLICY "Admins can update menu items"
ON public.menu_items
FOR UPDATE TO authenticated
USING (is_admin());

-- Grant admins permission to delete menu items
CREATE POLICY "Admins can delete menu items"
ON public.menu_items
FOR DELETE TO authenticated
USING (is_admin());