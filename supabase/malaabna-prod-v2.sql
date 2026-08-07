-- ============================================================
-- ملاعبنا v2 — Production-Safe SQL
-- يتناسب مع schema الإنتاج الفعلي
-- facilities.id = BIGINT, bookings.id = BIGINT
-- bookings uses field_id, profiles.name (not full_name)
-- ============================================================

-- ============================================================
-- 1. أعمدة جديدة في جداول موجودة
-- ============================================================

-- profiles: reliability score + suspension
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reliability_score INT NOT NULL DEFAULT 100
    CHECK (reliability_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS no_show_count     INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_until   TIMESTAMPTZ;

-- bookings: check-in code + deposit info
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS checkin_code    TEXT,
  ADD COLUMN IF NOT EXISTS deposit_amount  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_status  TEXT DEFAULT 'none'
    CHECK (deposit_status IN ('none','pending','paid','captured','refunded','forfeited')),
  ADD COLUMN IF NOT EXISTS payment_ref     TEXT;

-- facility_staff: role + active flag (if not already there)
ALTER TABLE public.facility_staff
  ADD COLUMN IF NOT EXISTS role      TEXT NOT NULL DEFAULT 'checkin'
    CHECK (role IN ('checkin','manager')),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 2. جداول جديدة
-- ============================================================

CREATE TABLE IF NOT EXISTS public.launch_settings (
  id                   INT  PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_mode        TEXT NOT NULL DEFAULT 'enhanced'
    CHECK (platform_mode IN ('enhanced','full')),
  has_cr               BOOLEAN NOT NULL DEFAULT false,
  cr_number            TEXT,
  tier_normal_price    NUMERIC(10,2) NOT NULL DEFAULT 199,
  tier_active_price    NUMERIC(10,2) NOT NULL DEFAULT 349,
  active_threshold     INT NOT NULL DEFAULT 10,
  deposit_enabled      BOOLEAN NOT NULL DEFAULT true,
  deposit_type         TEXT NOT NULL DEFAULT 'fixed'
    CHECK (deposit_type IN ('fixed','percent')),
  deposit_amount       NUMERIC(10,2) NOT NULL DEFAULT 15,
  deposit_percent      NUMERIC(5,2)  NOT NULL DEFAULT 10,
  warning_threshold    INT NOT NULL DEFAULT 2,
  suspend_threshold    INT NOT NULL DEFAULT 3,
  suspend_days         INT NOT NULL DEFAULT 14,
  cancel_window_hours  INT NOT NULL DEFAULT 6,
  half_refund_hours    INT NOT NULL DEFAULT 24,
  auto_approve         BOOLEAN NOT NULL DEFAULT false,
  min_amount           NUMERIC(10,2) NOT NULL DEFAULT 100,
  frequency            TEXT NOT NULL DEFAULT 'weekly'
    CHECK (frequency IN ('weekly','biweekly','monthly')),
  day_of_week          INT CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month         INT CHECK (day_of_month BETWEEN 1 AND 28),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- اشتراكات الملاعب
CREATE TABLE IF NOT EXISTS public.facility_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id             BIGINT NOT NULL UNIQUE REFERENCES public.facilities(id) ON DELETE CASCADE,
  status                  TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial','active','suspended','expired','cancelled')),
  tier                    TEXT NOT NULL DEFAULT 'normal'
    CHECK (tier IN ('normal','active')),
  monthly_price           NUMERIC(10,2) NOT NULL DEFAULT 199,
  trial_ends_at           TIMESTAMPTZ,
  last_payment_at         TIMESTAMPTZ,
  last_payment_ref        TEXT,
  next_due_at             TIMESTAMPTZ,
  warning_sent            INT NOT NULL DEFAULT 0,
  booking_count_this_month INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- العرابين (deposits)
CREATE TABLE IF NOT EXISTS public.deposits (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id     BIGINT NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  facility_id    BIGINT NOT NULL REFERENCES public.facilities(id),
  amount_sar     NUMERIC(10,2) NOT NULL CHECK (amount_sar > 0),
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','captured','refunded','forfeited')),
  payment_ref    TEXT,
  paid_at        TIMESTAMPTZ,
  captured_at    TIMESTAMPTZ,
  refunded_at    TIMESTAMPTZ,
  forfeited_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تقسيم المدفوعات (للوضع الكامل مستقبلاً)
CREATE TABLE IF NOT EXISTS public.split_rules (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id      BIGINT NOT NULL UNIQUE REFERENCES public.facilities(id) ON DELETE CASCADE,
  platform_pct     NUMERIC(5,2) NOT NULL DEFAULT 8 CHECK (platform_pct BETWEEN 0 AND 100),
  partner_pct      NUMERIC(5,2) NOT NULL DEFAULT 92 CHECK (partner_pct BETWEEN 0 AND 100),
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pcts_sum_100 CHECK (platform_pct + partner_pct = 100)
);

CREATE TABLE IF NOT EXISTS public.payment_splits (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id       BIGINT NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  facility_id      BIGINT NOT NULL REFERENCES public.facilities(id),
  total_amount     NUMERIC(10,2) NOT NULL,
  platform_amount  NUMERIC(10,2) NOT NULL,
  partner_amount   NUMERIC(10,2) NOT NULL,
  platform_pct     NUMERIC(5,2)  NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','captured','refunded','partially_refunded')),
  gateway_ref      TEXT,
  captured_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.launch_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_splits         ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='launch_settings' AND policyname='launch_settings_read') THEN
    EXECUTE 'CREATE POLICY "launch_settings_read" ON public.launch_settings FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='deposits' AND policyname='deposit_service_all') THEN
    EXECUTE 'CREATE POLICY "deposit_service_all" ON public.deposits FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='facility_subscriptions' AND policyname='sub_service_all') THEN
    EXECUTE 'CREATE POLICY "sub_service_all" ON public.facility_subscriptions FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='payment_splits' AND policyname='payment_splits_service') THEN
    EXECUTE 'CREATE POLICY "payment_splits_service" ON public.payment_splits FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='split_rules' AND policyname='split_rules_admin_write') THEN
    EXECUTE 'CREATE POLICY "split_rules_admin_write" ON public.split_rules FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;
  -- facility_staff policy — uses actual column names: added_by (owner), user_id (staff)
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='facility_staff' AND policyname='staff_owner_manage') THEN
    EXECUTE 'CREATE POLICY "staff_owner_manage" ON public.facility_staff FOR ALL USING (auth.uid() = added_by OR is_admin()) WITH CHECK (auth.uid() = added_by OR is_admin())';
  END IF;
END $$;

-- ============================================================
-- 4. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_deposits_user         ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status       ON public.deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_facility     ON public.deposits(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_subs_status  ON public.facility_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_facility_staff_active ON public.facility_staff(facility_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_payment_splits_fac    ON public.payment_splits(facility_id);

-- ============================================================
-- 5. دوال
-- ============================================================

-- هل يمكن للاعب الحجز؟
CREATE OR REPLACE FUNCTION public.can_player_book(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_su TIMESTAMPTZ; v_sc INT;
BEGIN
  SELECT suspended_until, reliability_score INTO v_su, v_sc
    FROM public.profiles WHERE id = p_user_id;
  IF v_su IS NOT NULL AND v_su > now() THEN
    RETURN jsonb_build_object(
      'can_book', false, 'reason', 'suspended',
      'suspended_until', v_su, 'reliability_score', v_sc
    );
  END IF;
  RETURN jsonb_build_object('can_book', true, 'reliability_score', COALESCE(v_sc, 100));
END; $$;

-- حساب مبلغ العربون
CREATE OR REPLACE FUNCTION public.calc_deposit(p_total_amount NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE v_e BOOLEAN; v_t TEXT; v_f NUMERIC; v_p NUMERIC;
BEGIN
  SELECT deposit_enabled, deposit_type, deposit_amount, deposit_percent
    INTO v_e, v_t, v_f, v_p FROM public.launch_settings WHERE id = 1;
  IF v_e IS NULL OR NOT v_e THEN RETURN 0; END IF;
  IF v_t = 'fixed' THEN RETURN LEAST(v_f, p_total_amount);
  ELSE RETURN ROUND(p_total_amount * v_p / 100, 2); END IF;
END; $$;

-- إنشاء حجز جديد
-- يستخدم p_field_id (الملعب الفرعي) وليس facility_id
-- p_start_time, p_end_time بصيغة TIME
CREATE OR REPLACE FUNCTION public.process_booking(
  p_field_id    BIGINT,
  p_date        DATE,
  p_start_time  TIME,
  p_end_time    TIME,
  p_user_id     UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_el       JSONB;
  v_field    RECORD;
  v_bid      BIGINT;
  v_code     TEXT;
  v_dep      NUMERIC;
  v_mode     TEXT;
  v_fac_id   BIGINT;
  v_hours    NUMERIC;
  v_total    NUMERIC;
BEGIN
  -- التحقق من إمكانية الحجز
  v_el := public.can_player_book(p_user_id);
  IF NOT (v_el->>'can_book')::boolean THEN RETURN v_el; END IF;

  -- جلب بيانات الملعب
  SELECT id, facility_id, price_per_hour INTO v_field
    FROM public.fields WHERE id = p_field_id AND status = 'active' AND is_deleted = false;
  IF v_field.id IS NULL THEN
    RETURN jsonb_build_object('can_book', false, 'reason', 'field_not_found');
  END IF;

  v_fac_id := v_field.facility_id;

  -- حساب السعر الكلي (ساعات × السعر)
  v_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600.0;
  v_total := ROUND(v_field.price_per_hour * v_hours, 2);
  v_dep   := public.calc_deposit(v_total);
  v_code  := upper(substr(md5(random()::text || now()::text), 1, 6));

  INSERT INTO public.bookings (
    user_id, field_id, booking_date, start_time, end_time,
    total_price, status, deposit_amount, deposit_status, checkin_code
  ) VALUES (
    p_user_id, p_field_id, p_date, p_start_time, p_end_time,
    v_total, 'pending_payment', v_dep,
    CASE WHEN v_dep > 0 THEN 'pending' ELSE 'none' END,
    v_code
  ) RETURNING id INTO v_bid;

  IF v_dep > 0 THEN
    INSERT INTO public.deposits (booking_id, user_id, facility_id, amount_sar, status)
      VALUES (v_bid, p_user_id, v_fac_id, v_dep, 'pending');
  END IF;

  SELECT platform_mode INTO v_mode FROM public.launch_settings WHERE id = 1;

  RETURN jsonb_build_object(
    'can_book',       true,
    'booking_id',     v_bid,
    'checkin_code',   v_code,
    'total_amount',   v_total,
    'deposit_amount', v_dep,
    'platform_mode',  COALESCE(v_mode, 'enhanced'),
    'next_step',      CASE WHEN v_dep > 0 THEN 'pay_deposit' ELSE 'confirmed' END
  );
END; $$;

-- تأكيد دفع العربون
CREATE OR REPLACE FUNCTION public.confirm_deposit_payment(p_booking_id BIGINT, p_payment_ref TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.deposits SET status='paid', payment_ref=p_payment_ref, paid_at=now()
    WHERE booking_id=p_booking_id AND status='pending';
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.bookings SET status='confirmed', deposit_status='paid', payment_ref=p_payment_ref
    WHERE id=p_booking_id;
  RETURN true;
END; $$;

-- مصادرة العربون (غياب / إلغاء متأخر)
CREATE OR REPLACE FUNCTION public.forfeit_deposit(p_booking_id BIGINT, p_reason TEXT DEFAULT 'no_show')
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_d RECORD;
BEGIN
  SELECT * INTO v_d FROM public.deposits WHERE booking_id=p_booking_id AND status='paid';
  IF v_d.id IS NULL THEN RETURN false; END IF;
  UPDATE public.deposits SET status='forfeited', forfeited_at=now() WHERE id=v_d.id;
  UPDATE public.bookings SET deposit_status='forfeited' WHERE id=p_booking_id;
  RETURN true;
END; $$;

-- استرداد العربون
CREATE OR REPLACE FUNCTION public.refund_deposit(p_booking_id BIGINT, p_full BOOLEAN DEFAULT true)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_d RECORD; v_amt NUMERIC;
BEGIN
  SELECT * INTO v_d FROM public.deposits WHERE booking_id=p_booking_id AND status='paid';
  IF v_d.id IS NULL THEN RETURN false; END IF;
  v_amt := CASE WHEN p_full THEN v_d.amount_sar ELSE ROUND(v_d.amount_sar * 0.5, 2) END;
  UPDATE public.deposits SET status='refunded', refunded_at=now() WHERE id=v_d.id;
  UPDATE public.bookings SET deposit_status='refunded', status='cancelled' WHERE id=p_booking_id;
  RETURN true;
END; $$;

-- مسح كود الدخول (check-in)
-- facility_staff uses: user_id (staff), added_by (owner)
-- profiles uses: name (not full_name)
-- bookings: join fields to get facility_id
CREATE OR REPLACE FUNCTION public.scan_checkin_code(
  p_code        TEXT,
  p_facility_id BIGINT,
  p_staff_id    UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_b RECORD; v_auth BOOLEAN;
BEGIN
  -- التحقق من صلاحية المسؤول (مالك الملعب أو موظف نشط)
  SELECT EXISTS(
    SELECT 1 FROM public.facilities
      WHERE id = p_facility_id AND owner_id = p_staff_id
    UNION ALL
    SELECT 1 FROM public.facility_staff
      WHERE facility_id = p_facility_id AND user_id = p_staff_id AND is_active = true
  ) INTO v_auth;

  IF NOT v_auth THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- البحث عن الحجز
  SELECT b.id, b.user_id, b.checked_in_at,
         p.name AS player_name, p.phone AS player_phone
    INTO v_b
    FROM public.bookings b
    JOIN public.profiles p ON p.id = b.user_id
    JOIN public.fields f ON f.id = b.field_id
    WHERE upper(trim(b.checkin_code)) = upper(trim(p_code))
      AND f.facility_id = p_facility_id
      AND b.booking_date = current_date
      AND b.status = 'confirmed';

  IF v_b.id IS NULL THEN
    -- فحص إن كان الكود موجوداً لكن ليس اليوم
    IF EXISTS(
      SELECT 1 FROM public.bookings b
      JOIN public.fields f ON f.id = b.field_id
      WHERE upper(trim(b.checkin_code)) = upper(trim(p_code))
        AND f.facility_id = p_facility_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'reason', 'wrong_date');
    END IF;
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_b.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 'reason', 'already_checked_in',
      'checked_in_at', v_b.checked_in_at
    );
  END IF;

  -- تسجيل الدخول
  UPDATE public.bookings SET checked_in_at = now(), status = 'completed' WHERE id = v_b.id;
  UPDATE public.profiles
    SET reliability_score = LEAST(100, reliability_score + 1)
    WHERE id = v_b.user_id AND reliability_score < 100;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_b.id,
    'player_name', v_b.player_name,
    'player_phone', v_b.player_phone,
    'checked_in_at', now()
  );
END; $$;

-- تسجيل غياب لاعب
CREATE OR REPLACE FUNCTION public.record_no_show(p_booking_id BIGINT, p_staff_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_b    RECORD;
  v_s    RECORD;
  v_nc   INT;
  v_ns   INT;
  v_su   TIMESTAMPTZ;
  v_auth BOOLEAN;
  v_fac  BIGINT;
BEGIN
  SELECT b.user_id, f.facility_id INTO v_b
    FROM public.bookings b
    JOIN public.fields f ON f.id = b.field_id
    WHERE b.id = p_booking_id AND b.status = 'confirmed';

  IF v_b.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'booking_not_found');
  END IF;

  v_fac := v_b.facility_id;

  -- التحقق من الصلاحية
  SELECT EXISTS(
    SELECT 1 FROM public.facilities WHERE id = v_fac AND owner_id = p_staff_id
    UNION ALL
    SELECT 1 FROM public.facility_staff
      WHERE facility_id = v_fac AND user_id = p_staff_id AND is_active = true
  ) INTO v_auth;

  IF NOT v_auth THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  SELECT * INTO v_s FROM public.launch_settings WHERE id = 1;

  -- تحديث نقاط الموثوقية
  UPDATE public.profiles
    SET no_show_count = no_show_count + 1,
        reliability_score = GREATEST(0, reliability_score - 10)
    WHERE id = v_b.user_id
    RETURNING no_show_count, reliability_score INTO v_nc, v_ns;

  -- تعليق اللاعب عند تجاوز الحد
  IF v_nc >= COALESCE(v_s.suspend_threshold, 3) THEN
    v_su := now() + (COALESCE(v_s.suspend_days, 14) || ' days')::interval;
    UPDATE public.profiles SET suspended_until = v_su WHERE id = v_b.user_id;
  END IF;

  UPDATE public.bookings SET status = 'no_show' WHERE id = p_booking_id;
  PERFORM public.forfeit_deposit(p_booking_id, 'no_show');

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_b.user_id,
    'no_show_count', v_nc,
    'reliability_score', v_ns,
    'suspended', v_su IS NOT NULL,
    'suspended_until', v_su
  );
END; $$;

-- رفع التعليق عن لاعب (أدمن)
CREATE OR REPLACE FUNCTION public.clear_player_suspension(p_user_id UUID, p_admin_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'super_admin') THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET suspended_until = NULL, no_show_count = 0 WHERE id = p_user_id;
  RETURN FOUND;
END; $$;

-- إضافة موظف لملعب
-- facility_staff: facility_id, added_by (owner), user_id (staff)
CREATE OR REPLACE FUNCTION public.add_facility_staff(
  p_facility_id BIGINT,
  p_owner_id    UUID,
  p_staff_phone TEXT,
  p_role        TEXT DEFAULT 'checkin'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sid UUID;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.facilities WHERE id = p_facility_id AND owner_id = p_owner_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_owner');
  END IF;
  SELECT id INTO v_sid FROM public.profiles WHERE phone = p_staff_phone LIMIT 1;
  IF v_sid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'user_not_found');
  END IF;
  -- إضافة أو تحديث (لا يوجد UNIQUE constraint على (facility_id, user_id) في الجدول الأصلي)
  IF EXISTS(SELECT 1 FROM public.facility_staff WHERE facility_id = p_facility_id AND user_id = v_sid) THEN
    UPDATE public.facility_staff SET role = p_role, is_active = true
      WHERE facility_id = p_facility_id AND user_id = v_sid;
  ELSE
    INSERT INTO public.facility_staff (facility_id, added_by, user_id, role)
      VALUES (p_facility_id, p_owner_id, v_sid, p_role);
  END IF;
  RETURN jsonb_build_object('success', true, 'staff_user_id', v_sid);
END; $$;

-- دوال التحكم بوضع المنصة
CREATE OR REPLACE FUNCTION public.get_platform_mode()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT platform_mode FROM public.launch_settings WHERE id = 1; $$;

CREATE OR REPLACE FUNCTION public.activate_full_mode(p_admin_id UUID, p_cr_number TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;
  IF p_cr_number IS NULL OR length(trim(p_cr_number)) < 5 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'cr_required');
  END IF;
  UPDATE public.launch_settings
    SET platform_mode = 'full', has_cr = true, cr_number = p_cr_number, updated_at = now()
    WHERE id = 1;
  RETURN jsonb_build_object('success', true, 'mode', 'full');
END; $$;

CREATE OR REPLACE FUNCTION public.activate_enhanced_mode(p_admin_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;
  UPDATE public.launch_settings SET platform_mode = 'enhanced', updated_at = now() WHERE id = 1;
  RETURN jsonb_build_object('success', true, 'mode', 'enhanced');
END; $$;

-- تجديد اشتراك ملعب
CREATE OR REPLACE FUNCTION public.create_or_renew_subscription(
  p_facility_id BIGINT,
  p_payment_ref TEXT,
  p_months      INT DEFAULT 1
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sub_id   UUID;
  v_settings RECORD;
  v_start    TIMESTAMPTZ;
  v_tier     TEXT;
  v_price    NUMERIC;
BEGIN
  SELECT * INTO v_settings FROM public.launch_settings WHERE id = 1;
  SELECT tier, next_due_at INTO v_tier, v_start
    FROM public.facility_subscriptions WHERE facility_id = p_facility_id;
  v_start := CASE WHEN v_start IS NOT NULL AND v_start > now() THEN v_start ELSE now() END;
  v_tier  := COALESCE(v_tier, 'normal');
  v_price := CASE WHEN v_tier = 'active'
    THEN v_settings.tier_active_price ELSE v_settings.tier_normal_price END;

  INSERT INTO public.facility_subscriptions
    (facility_id, status, tier, monthly_price, last_payment_at, last_payment_ref, next_due_at)
  VALUES
    (p_facility_id, 'active', v_tier, v_price, now(), p_payment_ref,
     v_start + (p_months || ' months')::interval)
  ON CONFLICT (facility_id) DO UPDATE SET
    status = 'active',
    last_payment_at = now(),
    last_payment_ref = EXCLUDED.last_payment_ref,
    next_due_at = v_start + (p_months || ' months')::interval,
    updated_at = now()
  RETURNING id INTO v_sub_id;
  RETURN v_sub_id;
END; $$;

-- Trigger: إنشاء قاعدة تقسيم تلقائية لكل ملعب جديد
CREATE OR REPLACE FUNCTION public.auto_create_split_rule()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.split_rules (facility_id, platform_pct, partner_pct)
    VALUES (NEW.id, 8, 92)
    ON CONFLICT (facility_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_split_rule ON public.facilities;
CREATE TRIGGER trg_auto_split_rule
  AFTER INSERT ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_split_rule();

-- ============================================================
-- 6. Views
-- ============================================================

CREATE OR REPLACE VIEW public.v_subscriptions_dashboard AS
SELECT
  fs.id, fs.facility_id, f.name AS facility_name, f.owner_id,
  p.name AS owner_name, fs.status, fs.tier, fs.monthly_price,
  fs.trial_ends_at, fs.next_due_at, fs.last_payment_at,
  fs.booking_count_this_month,
  fs.next_due_at < now() AS is_overdue,
  fs.next_due_at < now() + interval '3 days' AS expires_soon
FROM public.facility_subscriptions fs
JOIN public.facilities f ON f.id = fs.facility_id
JOIN public.profiles p ON p.id = f.owner_id;

CREATE OR REPLACE VIEW public.v_suspended_players AS
SELECT
  p.id AS user_id, p.name AS full_name, p.phone,
  p.reliability_score, p.no_show_count, p.suspended_until,
  p.suspended_until > now() AS is_active_suspension
FROM public.profiles p
WHERE p.suspended_until IS NOT NULL
ORDER BY p.suspended_until DESC;

CREATE OR REPLACE VIEW public.v_today_checkins AS
SELECT
  b.id AS booking_id, f.facility_id, fac.name AS facility_name,
  b.user_id, p.name AS player_name, p.phone AS player_phone,
  b.checkin_code, b.checked_in_at, b.status,
  b.deposit_amount, b.deposit_status, b.booking_date
FROM public.bookings b
JOIN public.fields f ON f.id = b.field_id
JOIN public.facilities fac ON fac.id = f.facility_id
JOIN public.profiles p ON p.id = b.user_id
WHERE b.booking_date = current_date
  AND b.status IN ('confirmed', 'completed', 'no_show')
ORDER BY b.checked_in_at NULLS LAST;

CREATE OR REPLACE VIEW public.v_facility_staff AS
SELECT
  fs.id, fs.facility_id, fac.name AS facility_name,
  fs.added_by AS owner_user_id, fs.user_id AS staff_user_id,
  p.name AS staff_name, p.phone AS staff_phone,
  fs.role, fs.is_active, fs.created_at
FROM public.facility_staff fs
JOIN public.facilities fac ON fac.id = fs.facility_id
JOIN public.profiles p ON p.id = fs.user_id
WHERE fs.is_active = true;

CREATE OR REPLACE VIEW public.v_deposit_revenue AS
SELECT
  date_trunc('day', d.created_at) AS day,
  COUNT(*) FILTER (WHERE d.status = 'paid')      AS paid_count,
  COUNT(*) FILTER (WHERE d.status = 'forfeited') AS forfeited_count,
  COUNT(*) FILTER (WHERE d.status = 'refunded')  AS refunded_count,
  SUM(d.amount_sar) FILTER (WHERE d.status IN ('forfeited', 'captured')) AS platform_revenue
FROM public.deposits d
GROUP BY date_trunc('day', d.created_at)
ORDER BY day DESC;

CREATE OR REPLACE VIEW public.v_system_status AS
SELECT
  ls.platform_mode, ls.has_cr, ls.deposit_enabled, ls.deposit_type,
  ls.deposit_amount, ls.deposit_percent, ls.tier_normal_price,
  ls.tier_active_price, ls.active_threshold, ls.suspend_threshold, ls.suspend_days,
  (SELECT COUNT(*) FROM public.facility_subscriptions WHERE status = 'active') AS active_subs,
  (SELECT COUNT(*) FROM public.facility_subscriptions WHERE status = 'trial')  AS trial_subs,
  (SELECT COUNT(*) FROM public.profiles WHERE suspended_until > now())          AS suspended_players,
  (SELECT COUNT(*) FROM public.bookings WHERE booking_date = current_date
    AND status = 'confirmed')                                                    AS todays_bookings,
  (SELECT COALESCE(SUM(amount_sar), 0) FROM public.deposits
    WHERE status IN ('forfeited', 'captured')
    AND created_at >= date_trunc('month', now()))                                AS monthly_deposit_revenue
FROM public.launch_settings ls WHERE ls.id = 1;

CREATE OR REPLACE VIEW public.v_subscription_revenue AS
SELECT
  date_trunc('month', last_payment_at) AS month,
  COUNT(*) AS count,
  SUM(monthly_price) AS total_revenue,
  COUNT(CASE WHEN tier = 'active' THEN 1 END) AS active_tier_count,
  COUNT(CASE WHEN tier = 'normal' THEN 1 END) AS normal_tier_count
FROM public.facility_subscriptions
WHERE last_payment_at IS NOT NULL
GROUP BY date_trunc('month', last_payment_at)
ORDER BY month DESC;

-- ============================================================
-- 7. Grants
-- ============================================================

GRANT SELECT ON public.v_system_status           TO authenticated;
GRANT SELECT ON public.v_subscription_revenue    TO authenticated;
GRANT SELECT ON public.v_today_checkins          TO authenticated;
GRANT SELECT ON public.v_facility_staff          TO authenticated;
GRANT SELECT ON public.v_subscriptions_dashboard TO authenticated;
GRANT SELECT ON public.v_suspended_players       TO authenticated;
GRANT SELECT ON public.v_deposit_revenue         TO authenticated;

-- ============================================================
-- 8. Seed البيانات
-- ============================================================

INSERT INTO public.launch_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- اشتراك تجريبي لكل ملعب نشط (30 يوم)
INSERT INTO public.facility_subscriptions (facility_id, status, trial_ends_at)
  SELECT id, 'trial', now() + interval '30 days'
  FROM public.facilities WHERE is_active = true AND (is_deleted IS NULL OR is_deleted = false)
  ON CONFLICT (facility_id) DO NOTHING;

-- ============================================================
-- تحقق نهائي
-- ============================================================

SELECT
  'تم الحقن بنجاح' AS status,
  (SELECT platform_mode FROM public.launch_settings WHERE id = 1) AS platform_mode,
  (SELECT COUNT(*) FROM public.facility_subscriptions) AS subscriptions_seeded,
  (SELECT COUNT(*) FROM public.deposits) AS deposits_count,
  (SELECT COUNT(*) FROM public.profiles WHERE reliability_score IS NOT NULL) AS profiles_with_score;
