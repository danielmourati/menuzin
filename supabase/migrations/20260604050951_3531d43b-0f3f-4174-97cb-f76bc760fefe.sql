CREATE TABLE public.cep_ranges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uf text NOT NULL,
  city text NOT NULL,
  cep_start text NOT NULL,
  cep_end text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cep_ranges_uf_len CHECK (char_length(uf) = 2),
  CONSTRAINT cep_ranges_cep_start_len CHECK (char_length(cep_start) = 8),
  CONSTRAINT cep_ranges_cep_end_len CHECK (char_length(cep_end) = 8),
  CONSTRAINT cep_ranges_order CHECK (cep_start <= cep_end)
);

CREATE INDEX cep_ranges_uf_city_idx ON public.cep_ranges (uf, city);
CREATE INDEX cep_ranges_cep_start_idx ON public.cep_ranges (cep_start);
CREATE INDEX cep_ranges_cep_end_idx ON public.cep_ranges (cep_end);
CREATE INDEX cep_ranges_city_lower_idx ON public.cep_ranges (lower(city));

GRANT SELECT ON public.cep_ranges TO anon, authenticated;
GRANT ALL ON public.cep_ranges TO service_role;

ALTER TABLE public.cep_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cep_ranges: public read"
  ON public.cep_ranges FOR SELECT
  TO anon, authenticated
  USING (true);