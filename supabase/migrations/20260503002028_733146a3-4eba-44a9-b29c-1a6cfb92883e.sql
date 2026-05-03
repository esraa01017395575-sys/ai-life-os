CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_en text NOT NULL,
  text_ar text NOT NULL,
  author text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_read_all_authenticated"
ON public.quotes FOR SELECT
TO authenticated
USING (true);
