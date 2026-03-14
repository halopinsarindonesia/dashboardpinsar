
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('dpp', 'dpw', 'peternak');
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.farm_type AS ENUM ('broiler', 'layer', 'mixed', 'other_cut', 'other_egg', 'other_mixed');
CREATE TYPE public.farm_status AS ENUM ('active', 'renovation', 'inactive');
CREATE TYPE public.audit_action AS ENUM ('create', 'edit', 'delete');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role app_role NOT NULL DEFAULT 'peternak',
  status user_status NOT NULL DEFAULT 'pending',
  province TEXT,
  house_address TEXT,
  work_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table for RBAC
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Farms table
CREATE TABLE public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  country TEXT DEFAULT 'Indonesia',
  province TEXT NOT NULL,
  city TEXT,
  district TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  farm_type farm_type NOT NULL DEFAULT 'broiler',
  other_species TEXT,
  status farm_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Farm-Peternak relationship
CREATE TABLE public.farm_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farm_id, user_id)
);

ALTER TABLE public.farm_members ENABLE ROW LEVEL SECURITY;

-- Supply data
CREATE TABLE public.supply_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  broiler_population INTEGER DEFAULT 0,
  broiler_input INTEGER DEFAULT 0,
  broiler_sold INTEGER DEFAULT 0,
  broiler_death INTEGER DEFAULT 0,
  broiler_price_per_kg DECIMAL(12,2),
  layer_population INTEGER DEFAULT 0,
  layer_input INTEGER DEFAULT 0,
  layer_death INTEGER DEFAULT 0,
  layer_egg_production INTEGER DEFAULT 0,
  layer_egg_price_per_kg DECIMAL(12,2),
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (farm_id, record_date)
);

ALTER TABLE public.supply_records ENABLE ROW LEVEL SECURITY;

-- Price aggregation
CREATE TABLE public.price_aggregation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  province TEXT,
  price_date DATE NOT NULL DEFAULT CURRENT_DATE,
  avg_broiler_price DECIMAL(12,2),
  avg_egg_price DECIMAL(12,2),
  farm_count INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (region, province, price_date)
);

ALTER TABLE public.price_aggregation ENABLE ROW LEVEL SECURITY;

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action audit_action NOT NULL,
  module TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- CMS tables
CREATE TABLE public.cms_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  link_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_banners ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cms_about (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL UNIQUE,
  content TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_about ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cms_contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT,
  email TEXT,
  address TEXT,
  facebook TEXT,
  instagram TEXT,
  twitter TEXT,
  youtube TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_contact ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cms_blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  blog_type TEXT NOT NULL DEFAULT 'news',
  images TEXT[],
  video_urls TEXT[],
  file_attachments TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  publish_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_blogs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Anyone can read approved profiles" ON public.profiles
  FOR SELECT USING (status = 'approved' OR id = auth.uid() OR public.has_role(auth.uid(), 'dpp'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Anyone can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "DPP can update any profile" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'dpp'));

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'dpp'));

CREATE POLICY "DPP can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'dpp'));

CREATE POLICY "Authenticated can read farms" ON public.farms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "DPP can manage all farms" ON public.farms
  FOR ALL USING (public.has_role(auth.uid(), 'dpp'));

CREATE POLICY "DPW can manage province farms" ON public.farms
  FOR ALL USING (
    public.has_role(auth.uid(), 'dpw') AND 
    province = (SELECT province FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Authenticated can read farm members" ON public.farm_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "DPP can manage farm members" ON public.farm_members
  FOR ALL USING (public.has_role(auth.uid(), 'dpp'));

CREATE POLICY "Authenticated can read supply" ON public.supply_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Farm members can insert supply" ON public.supply_records
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.farm_members WHERE farm_id = supply_records.farm_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'dpp')
    OR public.has_role(auth.uid(), 'dpw')
  );

CREATE POLICY "Farm members can update supply" ON public.supply_records
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.farm_members WHERE farm_id = supply_records.farm_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'dpp')
    OR public.has_role(auth.uid(), 'dpw')
  );

CREATE POLICY "Anyone can read prices" ON public.price_aggregation
  FOR SELECT USING (true);

CREATE POLICY "Admins can read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'dpp') OR public.has_role(auth.uid(), 'dpw')
  );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Public can read banners" ON public.cms_banners FOR SELECT USING (true);
CREATE POLICY "DPP manages banners" ON public.cms_banners FOR ALL USING (public.has_role(auth.uid(), 'dpp'));

CREATE POLICY "Public can read about" ON public.cms_about FOR SELECT USING (true);
CREATE POLICY "DPP manages about" ON public.cms_about FOR ALL USING (public.has_role(auth.uid(), 'dpp'));

CREATE POLICY "Public can read contact" ON public.cms_contact FOR SELECT USING (true);
CREATE POLICY "DPP manages contact" ON public.cms_contact FOR ALL USING (public.has_role(auth.uid(), 'dpp'));

CREATE POLICY "Public can read active blogs" ON public.cms_blogs FOR SELECT USING (status = 'active');
CREATE POLICY "DPP manages blogs" ON public.cms_blogs FOR ALL USING (public.has_role(auth.uid(), 'dpp'));

-- Trigger for auto-creating user role on profile insert
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, NEW.role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supply_updated_at BEFORE UPDATE ON public.supply_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON public.cms_blogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
