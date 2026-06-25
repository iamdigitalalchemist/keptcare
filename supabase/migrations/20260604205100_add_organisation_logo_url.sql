ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
