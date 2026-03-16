
-- Create a helper function to check if user is superadmin using text comparison
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'superadmin'
  )
$$;

-- Update RLS policies for profiles to allow superadmin
CREATE POLICY "Superadmin can manage all profiles"
ON public.profiles FOR ALL
TO public
USING (public.is_superadmin(auth.uid()));

-- Update RLS policies for farms to allow superadmin
CREATE POLICY "Superadmin can manage all farms"
ON public.farms FOR ALL
TO public
USING (public.is_superadmin(auth.uid()));

-- Update RLS policies for supply_records to allow superadmin
CREATE POLICY "Superadmin can manage all supply"
ON public.supply_records FOR ALL
TO public
USING (public.is_superadmin(auth.uid()));

-- Update RLS policies for farm_members to allow superadmin
CREATE POLICY "Superadmin can manage all farm members"
ON public.farm_members FOR ALL
TO public
USING (public.is_superadmin(auth.uid()));

-- Update RLS policies for user_roles to allow superadmin
CREATE POLICY "Superadmin can manage all roles"
ON public.user_roles FOR ALL
TO public
USING (public.is_superadmin(auth.uid()));

-- Update RLS for audit_logs to allow superadmin
CREATE POLICY "Superadmin can manage audit logs"
ON public.audit_logs FOR ALL
TO public
USING (public.is_superadmin(auth.uid()));

-- Allow farms delete for authenticated users who own them
CREATE POLICY "Authenticated can delete own farms"
ON public.farms FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM farm_members WHERE farm_id = farms.id AND user_id = auth.uid())
  OR public.is_superadmin(auth.uid())
);

-- Update CMS policies to use superadmin instead of DPP
DROP POLICY IF EXISTS "DPP manages about" ON public.cms_about;
DROP POLICY IF EXISTS "DPP manages banners" ON public.cms_banners;
DROP POLICY IF EXISTS "DPP manages blogs" ON public.cms_blogs;
DROP POLICY IF EXISTS "DPP manages contact" ON public.cms_contact;
DROP POLICY IF EXISTS "DPP manages partners" ON public.cms_partners;

CREATE POLICY "Superadmin manages about" ON public.cms_about FOR ALL TO public USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin manages banners" ON public.cms_banners FOR ALL TO public USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin manages blogs" ON public.cms_blogs FOR ALL TO public USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin manages contact" ON public.cms_contact FOR ALL TO public USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmin manages partners" ON public.cms_partners FOR ALL TO public USING (public.is_superadmin(auth.uid()));
