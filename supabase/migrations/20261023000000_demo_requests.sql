-- Demo requests from the landing page "Book a demo" form.
-- Anyone may insert; nobody can read through the API (view them in the Supabase dashboard).
CREATE TABLE public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (char_length(email) <= 320 AND email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  mobile text NOT NULL CHECK (mobile ~ '^\+?[0-9 ()-]{7,20}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request a demo"
  ON public.demo_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
