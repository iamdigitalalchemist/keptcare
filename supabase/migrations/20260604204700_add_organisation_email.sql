ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';

UPDATE public.organisations o
SET email = COALESCE(NULLIF(p.email, ''), o.email, '')
FROM public.profiles p
WHERE o.created_by = p.id
  AND COALESCE(o.email, '') = '';
