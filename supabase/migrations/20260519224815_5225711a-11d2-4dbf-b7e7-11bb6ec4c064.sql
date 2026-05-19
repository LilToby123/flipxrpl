
-- Referral fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_earnings_drops BIGINT NOT NULL DEFAULT 0;

-- Backfill existing rows
UPDATE public.profiles
SET referral_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
WHERE referral_code IS NULL;

-- Generate referral code helper
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_count INT;
BEGIN
  LOOP
    code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    SELECT COUNT(*) INTO exists_count FROM public.profiles WHERE referral_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$;

-- Update handle_new_user to set referral_code and optional referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_addr TEXT;
  v_dtag INTEGER;
  v_ref_code TEXT;
  v_referred_by UUID;
  v_ref_input TEXT;
BEGIN
  v_addr := COALESCE(NEW.raw_user_meta_data->>'xrpl_address', '');
  v_dtag := nextval('public.dtag_seq');
  v_ref_code := public.generate_referral_code();

  v_ref_input := NEW.raw_user_meta_data->>'ref';
  IF v_ref_input IS NOT NULL AND length(v_ref_input) > 0 THEN
    SELECT id INTO v_referred_by FROM public.profiles WHERE referral_code = upper(v_ref_input) LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, xrpl_address, destination_tag, display_name, referral_code, referred_by)
  VALUES (NEW.id, v_addr, v_dtag, NEW.raw_user_meta_data->>'display_name', v_ref_code, v_referred_by);
  INSERT INTO public.balances (user_id, drops) VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$;

-- House treasury snapshots
CREATE TABLE IF NOT EXISTS public.house_treasury_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drops BIGINT NOT NULL,
  liabilities_drops BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.house_treasury_snapshots ENABLE ROW LEVEL SECURITY;

-- No public reads; admin route uses service role
CREATE POLICY "treasury_no_read" ON public.house_treasury_snapshots
  FOR SELECT USING (false);

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
