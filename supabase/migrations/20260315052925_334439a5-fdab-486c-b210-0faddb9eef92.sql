
-- Update profiles SELECT policy to allow DPW to see pending users in their scope
DROP POLICY IF EXISTS "Anyone can read approved profiles" ON public.profiles;
CREATE POLICY "Profiles read policy" ON public.profiles FOR SELECT USING (
  (status = 'approved'::user_status)
  OR (id = auth.uid())
  OR has_role(auth.uid(), 'dpp'::app_role)
  OR (has_role(auth.uid(), 'dpw'::app_role))
);

-- Also allow DPW to update profiles (for approval/rejection)
CREATE POLICY "DPW can update profiles" ON public.profiles FOR UPDATE USING (
  has_role(auth.uid(), 'dpw'::app_role)
);

-- Allow DPW to manage user_roles
CREATE POLICY "DPW can manage roles" ON public.user_roles FOR ALL USING (
  has_role(auth.uid(), 'dpw'::app_role)
);
