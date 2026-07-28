
-- Bookings: payment method
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method text;

-- Wallets
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY,
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all wallets" ON public.wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  kind text NOT NULL CHECK (kind IN ('topup','booking_payment','booking_earning','refund','payout','adjustment')),
  balance_after numeric(12,2) NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  reference text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_tx_user_created_idx ON public.wallet_transactions (user_id, created_at DESC);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all wallet transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Topups
CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed')),
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_topups TO authenticated;
GRANT ALL ON public.wallet_topups TO service_role;
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own topups" ON public.wallet_topups FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER wallet_topups_updated_at BEFORE UPDATE ON public.wallet_topups FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Internal credit/debit helper (service_role / definer callers only)
CREATE OR REPLACE FUNCTION public.wallet_apply(_user_id uuid, _amount numeric, _kind text, _booking_id uuid DEFAULT NULL, _reference text DEFAULT NULL, _description text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_balance numeric;
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance = balance + _amount WHERE user_id = _user_id RETURNING balance INTO new_balance;
  IF new_balance IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF new_balance < 0 THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  INSERT INTO public.wallet_transactions (user_id, amount, kind, balance_after, booking_id, reference, description)
  VALUES (_user_id, _amount, _kind, new_balance, _booking_id, _reference, _description);
  RETURN new_balance;
END; $$;
REVOKE ALL ON FUNCTION public.wallet_apply(uuid, numeric, text, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_apply(uuid, numeric, text, uuid, text, text) TO service_role;

-- Pay a booking from the caller's wallet
CREATE OR REPLACE FUNCTION public.wallet_pay_booking(_booking_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE b RECORD; bal numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF b.customer_id <> auth.uid() THEN RAISE EXCEPTION 'Not your booking'; END IF;
  IF b.status <> 'confirmed' THEN RAISE EXCEPTION 'Host has not accepted this booking yet'; END IF;
  IF b.payment_status = 'paid' THEN RAISE EXCEPTION 'Already paid'; END IF;

  INSERT INTO public.wallets (user_id) VALUES (b.customer_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO bal FROM public.wallets WHERE user_id = b.customer_id FOR UPDATE;
  IF bal < b.total_price THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

  PERFORM public.wallet_apply(b.customer_id, -b.total_price, 'booking_payment', b.id, NULL, 'Payment for booking');
  IF b.vendor_id <> b.customer_id THEN
    PERFORM public.wallet_apply(b.vendor_id, b.total_price, 'booking_earning', b.id, NULL, 'Earning from booking');
  END IF;

  UPDATE public.bookings
    SET payment_status = 'paid', paid_at = now(), payment_method = 'wallet'
    WHERE id = b.id;

  SELECT balance INTO bal FROM public.wallets WHERE user_id = b.customer_id;
  RETURN bal;
END; $$;
REVOKE ALL ON FUNCTION public.wallet_pay_booking(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.wallet_pay_booking(uuid) TO authenticated;
