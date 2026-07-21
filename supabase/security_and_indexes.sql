-- ============================================================
-- ملاعبنا — الأمان + الأداء
-- شغّل هذا الملف في Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. جدول تتبع محاولات التحقق من OTP (منع Brute Force)
-- ============================================================

CREATE TABLE IF NOT EXISTS otp_verify_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تنظيف تلقائي للمحاولات القديمة (أقدم من ساعة)
CREATE OR REPLACE FUNCTION cleanup_otp_attempts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM otp_verify_attempts WHERE created_at < now() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_otp_attempts
AFTER INSERT ON otp_verify_attempts
FOR EACH STATEMENT EXECUTE FUNCTION cleanup_otp_attempts();

ALTER TABLE otp_verify_attempts ENABLE ROW LEVEL SECURITY;
-- لا يقرأها أحد من الـ client — تُستخدم فقط من service role
CREATE POLICY "service only" ON otp_verify_attempts FOR ALL USING (false);

-- ============================================================
-- 2. تحسين جدول phone_otps (إضافة expires_at إن لم يكن موجوداً)
-- ============================================================

ALTER TABLE phone_otps
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 3. Indexes — تسريع الاستعلامات الأكثر استخداماً
-- ============================================================

-- bookings: أكثر جدول يُستعلم عنه
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_facility_id ON bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
-- composite للحجوزات القادمة لمستخدم محدد
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, booking_date);
-- composite للحجوزات الخاصة بملعب في تاريخ
CREATE INDEX IF NOT EXISTS idx_bookings_facility_date ON bookings(facility_id, booking_date);

-- facilities: مستعلم عنها كثيراً مع فلتر
CREATE INDEX IF NOT EXISTS idx_facilities_owner_id ON facilities(owner_id);
CREATE INDEX IF NOT EXISTS idx_facilities_city ON facilities(city);
CREATE INDEX IF NOT EXISTS idx_facilities_sport_type ON facilities(sport_type);
CREATE INDEX IF NOT EXISTS idx_facilities_active ON facilities(is_active) WHERE is_active = true;

-- facility_time_slots: يُستعلم عنها في كل حجز
CREATE INDEX IF NOT EXISTS idx_slots_facility_day ON facility_time_slots(facility_id, day_of_week);

-- academies
CREATE INDEX IF NOT EXISTS idx_academies_owner_id ON academies(owner_id);
CREATE INDEX IF NOT EXISTS idx_academies_city ON academies(city);
CREATE INDEX IF NOT EXISTS idx_academies_active ON academies(is_active) WHERE is_active = true;

-- academy_programs
CREATE INDEX IF NOT EXISTS idx_programs_academy_id ON academy_programs(academy_id);
CREATE INDEX IF NOT EXISTS idx_programs_active ON academy_programs(is_active) WHERE is_active = true;

-- academy_subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON academy_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_program_id ON academy_subscriptions(program_id);

-- tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_owner_id ON tournaments(owner_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_active ON tournaments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);

-- tournament_teams
CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_captain ON tournament_teams(captain_user_id);

-- tournament_matches
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON tournament_matches(tournament_id);

-- partner_roles
CREATE INDEX IF NOT EXISTS idx_partner_roles_user_id ON partner_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_roles_status ON partner_roles(status);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read) WHERE is_read = false;

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- phone_otps
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON phone_otps(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otps_created ON phone_otps(created_at);

-- otp_verify_attempts
CREATE INDEX IF NOT EXISTS idx_otp_attempts_phone_time ON otp_verify_attempts(phone, created_at);

-- ============================================================
-- 4. تنظيف تلقائي لـ OTP المنتهية الصلاحية (يومياً)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM phone_otps WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;
