ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS broiler_initial_population integer NOT NULL DEFAULT 0;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS layer_initial_population integer NOT NULL DEFAULT 0;