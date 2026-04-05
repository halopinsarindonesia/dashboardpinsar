
CREATE TABLE public.cms_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banner_url TEXT NOT NULL,
  title TEXT NOT NULL,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  price NUMERIC NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active events"
ON public.cms_events FOR SELECT
USING (is_active = true);

CREATE POLICY "Superadmin manages events"
ON public.cms_events FOR ALL
USING (is_superadmin(auth.uid()));

CREATE OR REPLACE FUNCTION public.cleanup_expired_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.cms_events
  WHERE end_datetime < (now() - interval '1 day');
$$;
