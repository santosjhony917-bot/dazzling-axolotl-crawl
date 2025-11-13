CREATE POLICY "Admins can delete any restaurant"
ON public.restaurants
FOR DELETE
TO authenticated
USING (is_admin());