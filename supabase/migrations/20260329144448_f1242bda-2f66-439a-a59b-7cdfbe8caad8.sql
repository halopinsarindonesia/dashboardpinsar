
-- Add DPD role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dpd';

-- Add KTP and KK columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ktp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kk TEXT;

-- Add layer_sold and layer_price_per_unit to supply_records for Ayam Petelur
ALTER TABLE public.supply_records ADD COLUMN IF NOT EXISTS layer_sold INTEGER DEFAULT 0;
ALTER TABLE public.supply_records ADD COLUMN IF NOT EXISTS layer_price_per_unit NUMERIC;

-- Create CMS Gallery table
CREATE TABLE IF NOT EXISTS public.cms_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active gallery" ON public.cms_gallery FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Superadmin manages gallery" ON public.cms_gallery FOR ALL TO public USING (is_superadmin(auth.uid()));
