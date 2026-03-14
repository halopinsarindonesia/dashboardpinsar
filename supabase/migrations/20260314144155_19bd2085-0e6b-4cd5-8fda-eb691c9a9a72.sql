
ALTER TABLE public.cms_contact ADD COLUMN IF NOT EXISTS whatsapp text;

CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact submissions"
  ON public.contact_submissions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "DPP can read contact submissions"
  ON public.contact_submissions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'dpp'::app_role));
