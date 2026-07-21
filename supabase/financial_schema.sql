-- ============================================================
-- ملاعبنا — المعمارية المالية الكاملة
-- wallets + transactions + settlements + refunds
-- شغّل في Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. محافظ الشركاء
-- ============================================================

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_sar NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance_sar >= 0),
  pending_sar NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (pending_sar >= 0),
  total_earned_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_settled_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. حركات المحفظة (immutable — لا حذف أبداً)
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'hold', 'release')),
  source_type TEXT NOT NULL CHECK (source_type IN ('booking', 'subscription', 'tournament', 'settlement', 'refund', 'adjustment')),
  source_id UUID,
  amount_sar NUMERIC(10,2) NOT NULL CHECK (amount_sar > 0),
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  description_ar TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. طلبات التسوية (سحب الأرباح)
-- ============================================================

CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_user_id UUID NOT NULL REFERENCES auth.users(id),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  amount_sar NUMERIC(10,2) NOT NULL CHECK (amount_sar > 0),
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'processing', 'completed', 'rejected')),
  bank_name TEXT,
  iban TEXT,
  account_holder TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  transfer_reference TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. طلبات الاسترداد (Refunds)
-- ============================================================

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('booking', 'subscription', 'tournament')),
  entity_id UUID NOT NULL,
  amount_sar NUMERIC(10,2) NOT NULL CHECK (amount_sar > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'rejected', 'completed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  gateway_refund_id TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. سجل مدفوعات البوابة (gateway_payments)
-- ============================================================

CREATE TABLE IF NOT EXISTS gateway_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('booking', 'subscription', 'tournament')),
  entity_id UUID NOT NULL,
  amount_sar NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  gateway_provider TEXT,
  gateway_payment_id TEXT,
  gateway_response JSONB,
  checkout_url TEXT,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. RLS
-- ============================================================

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_payments ENABLE ROW LEVEL SECURITY;

-- wallets: الشريك يرى محفظته فقط، الأدمن يرى الكل
CREATE POLICY "own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "service inserts wallet" ON wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "service updates wallet" ON wallets FOR UPDATE USING (true);

-- wallet_transactions: readonly للشريك
CREATE POLICY "own transactions" ON wallet_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM wallets WHERE id = wallet_id AND user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "service inserts transactions" ON wallet_transactions FOR INSERT WITH CHECK (true);

-- settlements
CREATE POLICY "own settlements" ON settlements FOR SELECT
  USING (auth.uid() = partner_user_id OR is_admin(auth.uid()));
CREATE POLICY "partner requests settlement" ON settlements FOR INSERT
  WITH CHECK (auth.uid() = partner_user_id);
CREATE POLICY "admin manages settlements" ON settlements FOR UPDATE
  USING (is_admin(auth.uid()));

-- refunds
CREATE POLICY "own refunds" ON refunds FOR SELECT
  USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "player requests refund" ON refunds FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin manages refunds" ON refunds FOR UPDATE
  USING (is_admin(auth.uid()));

-- gateway_payments
CREATE POLICY "own gateway payments" ON gateway_payments FOR SELECT
  USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "service manages gateway payments" ON gateway_payments FOR ALL USING (true);

-- ============================================================
-- 7. Grants
-- ============================================================

GRANT SELECT ON wallets TO authenticated;
GRANT SELECT ON wallet_transactions TO authenticated;
GRANT SELECT, INSERT ON settlements TO authenticated;
GRANT SELECT ON settlements TO authenticated;
GRANT SELECT, INSERT ON refunds TO authenticated;
GRANT SELECT, INSERT ON gateway_payments TO authenticated;

-- ============================================================
-- 8. Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_wallet_updated_at();

CREATE TRIGGER trg_settlements_updated_at
  BEFORE UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_refunds_updated_at
  BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_gateway_payments_updated_at
  BEFORE UPDATE ON gateway_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_source ON wallet_transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_settlements_partner ON settlements(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_gateway_payments_user ON gateway_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_gateway_payments_entity ON gateway_payments(payment_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gateway_payments_status ON gateway_payments(status);

-- ============================================================
-- 10. دالة مساعدة — إنشاء محفظة تلقائية للشريك
-- ============================================================

CREATE OR REPLACE FUNCTION ensure_partner_wallet(p_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_wallet_id UUID;
BEGIN
  INSERT INTO wallets (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_wallet_id;

  IF v_wallet_id IS NULL THEN
    SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_user_id;
  END IF;

  RETURN v_wallet_id;
END;
$$;

-- ============================================================
-- 11. دالة إضافة رصيد للمحفظة (تُستدعى بعد إتمام الدفع)
-- ============================================================

CREATE OR REPLACE FUNCTION credit_partner_wallet(
  p_partner_id UUID,
  p_amount NUMERIC,
  p_source_type TEXT,
  p_source_id UUID,
  p_description TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wallet_id UUID;
  v_balance_before NUMERIC;
BEGIN
  v_wallet_id := ensure_partner_wallet(p_partner_id);

  SELECT balance_sar INTO v_balance_before FROM wallets WHERE id = v_wallet_id FOR UPDATE;

  UPDATE wallets SET
    balance_sar = balance_sar + p_amount,
    total_earned_sar = total_earned_sar + p_amount
  WHERE id = v_wallet_id;

  INSERT INTO wallet_transactions (
    wallet_id, type, source_type, source_id, amount_sar,
    balance_before, balance_after, description_ar
  ) VALUES (
    v_wallet_id, 'credit', p_source_type, p_source_id, p_amount,
    v_balance_before, v_balance_before + p_amount, p_description
  );
END;
$$;

-- ============================================================
-- 12. دالة خصم رصيد (عند الاسترداد أو التسوية)
-- ============================================================

CREATE OR REPLACE FUNCTION debit_partner_wallet(
  p_partner_id UUID,
  p_amount NUMERIC,
  p_source_type TEXT,
  p_source_id UUID,
  p_description TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wallet_id UUID;
  v_balance_before NUMERIC;
BEGIN
  SELECT id, balance_sar INTO v_wallet_id, v_balance_before
  FROM wallets WHERE user_id = p_partner_id FOR UPDATE;

  IF v_balance_before < p_amount THEN
    RAISE EXCEPTION 'رصيد غير كافٍ في المحفظة';
  END IF;

  UPDATE wallets SET balance_sar = balance_sar - p_amount WHERE id = v_wallet_id;

  INSERT INTO wallet_transactions (
    wallet_id, type, source_type, source_id, amount_sar,
    balance_before, balance_after, description_ar
  ) VALUES (
    v_wallet_id, 'debit', p_source_type, p_source_id, p_amount,
    v_balance_before, v_balance_before - p_amount, p_description
  );
END;
$$;
