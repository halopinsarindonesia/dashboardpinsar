
CREATE TABLE public.cms_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active partners" ON public.cms_partners
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "DPP manages partners" ON public.cms_partners
  FOR ALL TO public USING (has_role(auth.uid(), 'dpp'::app_role));
