CREATE POLICY "Superadmin can insert farms"
ON public.farms
FOR INSERT
TO authenticated
WITH CHECK (is_superadmin(auth.uid()));