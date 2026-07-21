-- ============================================================
-- ملاعبنا — قاعدة البيانات الكاملة
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 1. PROFILES (المستخدمون)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  city TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

CREATE POLICY "users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "admin reads all profiles" ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================
-- 2. ROLES (الأدوار)
-- ============================================================

CREATE TYPE user_role AS ENUM ('player', 'partner', 'admin');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON user_roles TO authenticated;
GRANT SELECT ON user_roles TO anon;

CREATE POLICY "users read own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own role" ON user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. ADMIN USERS (الأدمن وموظفيه)
-- ============================================================

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super_admin BOOLEAN NOT NULL DEFAULT false,
  added_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON admin_users TO authenticated;

CREATE POLICY "admins read admin_users" ON admin_users FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users a WHERE a.user_id = auth.uid() AND a.is_active = true));

-- ============================================================
-- 4. PERMISSIONS SYSTEM (نظام الصلاحيات)
-- ============================================================

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  applies_to TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON permissions TO authenticated, anon;
CREATE POLICY "anyone reads permissions" ON permissions FOR SELECT USING (true);

-- صلاحيات الأدمن
CREATE TABLE admin_permission_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, permission_id)
);

ALTER TABLE admin_permission_grants ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON admin_permission_grants TO authenticated;
CREATE POLICY "admins read grants" ON admin_permission_grants FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================
-- 5. PARTNER ROLES (أدوار الشركاء)
-- ============================================================

CREATE TYPE partner_activity AS ENUM ('facility_manager', 'academy_manager', 'tournament_manager');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TABLE partner_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity partner_activity NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity)
);

ALTER TABLE partner_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON partner_roles TO authenticated;

CREATE POLICY "partners read own roles" ON partner_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "partners insert own role" ON partner_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin reads all partner roles" ON partner_roles FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "admin updates partner roles" ON partner_roles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================
-- 6. PARTNER EMPLOYEES (موظفو الشركاء)
-- ============================================================

CREATE TABLE partner_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity partner_activity NOT NULL,
  entity_id UUID, -- facility_id, academy_id, or tournament_id
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_user_id, employee_user_id, activity)
);

ALTER TABLE partner_employees ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON partner_employees TO authenticated;

CREATE POLICY "partner manages own employees" ON partner_employees
  FOR ALL USING (auth.uid() = partner_user_id);
CREATE POLICY "employee reads own assignments" ON partner_employees
  FOR SELECT USING (auth.uid() = employee_user_id);

CREATE TABLE partner_employee_permission_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES partner_employees(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, permission_id)
);

ALTER TABLE partner_employee_permission_grants ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON partner_employee_permission_grants TO authenticated;

CREATE POLICY "partner manages employee permissions" ON partner_employee_permission_grants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM partner_employees pe
      WHERE pe.id = employee_id AND pe.partner_user_id = auth.uid()
    )
  );
CREATE POLICY "employee reads own permissions" ON partner_employee_permission_grants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partner_employees pe
      WHERE pe.id = employee_id AND pe.employee_user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. DYNAMIC FIELD SYSTEM (نظام الحقول الديناميكية)
-- ============================================================

CREATE TABLE field_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE field_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON field_categories TO authenticated;
GRANT SELECT ON field_categories TO anon;
CREATE POLICY "anyone reads field_categories" ON field_categories FOR SELECT USING (true);
CREATE POLICY "admin manages field_categories" ON field_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

CREATE TYPE field_type AS ENUM (
  'text', 'textarea', 'number', 'select', 'multiselect',
  'date', 'time', 'file', 'image', 'boolean', 'phone', 'email', 'url'
);

CREATE TABLE field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES field_categories(id),
  name_ar TEXT NOT NULL,
  field_type field_type NOT NULL,
  placeholder_ar TEXT,
  help_text_ar TEXT,
  is_required_default BOOLEAN NOT NULL DEFAULT false,
  options JSONB, -- for select/multiselect: [{value, label_ar}]
  validation_rules JSONB, -- {min, max, pattern, ...}
  applies_to partner_activity[], -- which partner types can use it
  use_in TEXT[] NOT NULL DEFAULT '{}', -- 'activation_request', 'facility_form', 'academy_student', 'tournament_team'
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE field_definitions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON field_definitions TO authenticated;
GRANT SELECT ON field_definitions TO anon;

CREATE POLICY "anyone reads active field_definitions" ON field_definitions FOR SELECT USING (is_active = true);
CREATE POLICY "admin manages field_definitions" ON field_definitions FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Partner-level field activation
CREATE TABLE partner_field_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES field_definitions(id) ON DELETE CASCADE,
  activity partner_activity NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_required_override BOOLEAN, -- null = use field default
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_user_id, field_id, activity)
);

ALTER TABLE partner_field_assignments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON partner_field_assignments TO authenticated;

CREATE POLICY "partner manages own field assignments" ON partner_field_assignments
  FOR ALL USING (auth.uid() = partner_user_id);

-- Field values storage
CREATE TABLE field_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_id UUID NOT NULL REFERENCES field_definitions(id),
  entity_type TEXT NOT NULL, -- 'partner_role', 'facility', 'academy', 'tournament', 'booking', 'student', 'team'
  entity_id UUID NOT NULL,
  value_text TEXT,
  value_number NUMERIC,
  value_boolean BOOLEAN,
  value_date DATE,
  value_json JSONB,
  file_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE field_values ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON field_values TO authenticated;

CREATE POLICY "users manage own field values" ON field_values
  FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "admin reads all field values" ON field_values FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================
-- 8. FACILITIES (الملاعب)
-- ============================================================

CREATE TYPE sport_type AS ENUM (
  'football', 'futsal', 'padel', 'basketball', 'volleyball',
  'tennis', 'squash', 'badminton', 'swimming', 'other'
);

CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  sport_type sport_type NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  district TEXT,
  address TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  phone TEXT,
  images TEXT[] DEFAULT '{}',
  logo_url TEXT,
  amenities JSONB DEFAULT '{}', -- {parking: true, restrooms: true, cafeteria: false, ...}
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(2,1) DEFAULT 0,
  reviews_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON facilities TO authenticated;
GRANT SELECT ON facilities TO anon;

CREATE POLICY "anyone reads active facilities" ON facilities FOR SELECT USING (is_active = true);
CREATE POLICY "owner manages own facilities" ON facilities
  FOR ALL USING (auth.uid() = owner_id);

-- Time slots configuration
CREATE TABLE facility_time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_hour INT NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour INT NOT NULL CHECK (end_hour BETWEEN 1 AND 24),
  price_sar NUMERIC(10,2) NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(facility_id, day_of_week, start_hour)
);

ALTER TABLE facility_time_slots ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON facility_time_slots TO authenticated;
GRANT SELECT ON facility_time_slots TO anon;

CREATE POLICY "anyone reads time slots" ON facility_time_slots FOR SELECT USING (true);
CREATE POLICY "owner manages time slots" ON facility_time_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM facilities WHERE id = facility_id AND owner_id = auth.uid())
  );

-- ============================================================
-- 9. BOOKINGS (الحجوزات)
-- ============================================================

CREATE TYPE booking_status AS ENUM ('pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show');

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  booking_date DATE NOT NULL,
  start_hour INT NOT NULL,
  end_hour INT NOT NULL,
  total_amount_sar NUMERIC(10,2) NOT NULL,
  commission_sar NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_amount_sar NUMERIC(10,2) NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending_payment',
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Prevent double booking at DB level
  UNIQUE(facility_id, booking_date, start_hour)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON bookings TO authenticated;

CREATE POLICY "users read own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "facility owner reads facility bookings" ON bookings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM facilities WHERE id = facility_id AND owner_id = auth.uid())
  );
CREATE POLICY "admin reads all bookings" ON bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Temporary slot locks (prevent race conditions)
CREATE TABLE booking_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  booking_date DATE NOT NULL,
  start_hour INT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  UNIQUE(facility_id, booking_date, start_hour)
);

ALTER TABLE booking_locks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON booking_locks TO authenticated;

CREATE POLICY "users manage own locks" ON booking_locks FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 10. ACADEMIES (الأكاديميات)
-- ============================================================

CREATE TABLE academies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  sport_types sport_type[] NOT NULL DEFAULT '{}',
  phone TEXT,
  logo_url TEXT,
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(2,1) DEFAULT 0,
  reviews_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON academies TO authenticated;
GRANT SELECT ON academies TO anon;

CREATE POLICY "anyone reads active academies" ON academies FOR SELECT USING (is_active = true);
CREATE POLICY "owner manages own academies" ON academies FOR ALL USING (auth.uid() = owner_id);

-- Training programs
CREATE TYPE pricing_type AS ENUM ('monthly', 'program', 'both');

CREATE TABLE academy_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sport_type sport_type NOT NULL,
  coach_name TEXT,
  age_min INT,
  age_max INT,
  max_students INT NOT NULL,
  current_students INT NOT NULL DEFAULT 0,
  pricing_type pricing_type NOT NULL DEFAULT 'monthly',
  monthly_price_sar NUMERIC(10,2),
  program_price_sar NUMERIC(10,2),
  schedule JSONB NOT NULL DEFAULT '[]', -- [{day, start_time, end_time, location}]
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE academy_programs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON academy_programs TO authenticated;
GRANT SELECT ON academy_programs TO anon;

CREATE POLICY "anyone reads active programs" ON academy_programs FOR SELECT USING (is_active = true);
CREATE POLICY "owner manages own programs" ON academy_programs FOR ALL
  USING (EXISTS (SELECT 1 FROM academies WHERE id = academy_id AND owner_id = auth.uid()));

-- Student subscriptions
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending_payment');

CREATE TABLE academy_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES academy_programs(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  pricing_type pricing_type NOT NULL,
  amount_sar NUMERIC(10,2) NOT NULL,
  commission_sar NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_amount_sar NUMERIC(10,2) NOT NULL,
  status subscription_status NOT NULL DEFAULT 'pending_payment',
  start_date DATE,
  end_date DATE,
  renewal_date DATE,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE academy_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON academy_subscriptions TO authenticated;

CREATE POLICY "users read own subscriptions" ON academy_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users create subscriptions" ON academy_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "academy owner reads subscriptions" ON academy_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM academy_programs ap
      JOIN academies a ON a.id = ap.academy_id
      WHERE ap.id = program_id AND a.owner_id = auth.uid()
    )
  );
CREATE POLICY "admin reads all subscriptions" ON academy_subscriptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================
-- 11. TOURNAMENTS (البطولات)
-- ============================================================

CREATE TYPE tournament_system AS ENUM ('knockout', 'league', 'groups_knockout', 'mixed');

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  sport_type sport_type NOT NULL,
  system tournament_system NOT NULL DEFAULT 'knockout',
  city TEXT NOT NULL,
  venue TEXT,
  max_teams INT NOT NULL,
  players_per_team INT NOT NULL,
  substitutes_per_team INT NOT NULL DEFAULT 0,
  age_group TEXT,
  registration_fee_sar NUMERIC(10,2) NOT NULL DEFAULT 0,
  prizes JSONB DEFAULT '[]', -- [{place, description, amount}]
  start_date DATE,
  end_date DATE,
  registration_deadline DATE,
  show_schedule BOOLEAN NOT NULL DEFAULT true,
  show_results BOOLEAN NOT NULL DEFAULT true,
  show_standings BOOLEAN NOT NULL DEFAULT true,
  show_bracket BOOLEAN NOT NULL DEFAULT true,
  show_stats BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming, registration_open, ongoing, completed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON tournaments TO authenticated;
GRANT SELECT ON tournaments TO anon;

CREATE POLICY "anyone reads active tournaments" ON tournaments FOR SELECT USING (is_active = true);
CREATE POLICY "owner manages own tournaments" ON tournaments FOR ALL USING (auth.uid() = owner_id);

-- Teams
CREATE TYPE team_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');

CREATE TABLE tournament_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  captain_user_id UUID NOT NULL REFERENCES auth.users(id),
  team_name TEXT NOT NULL,
  logo_url TEXT,
  status team_status NOT NULL DEFAULT 'pending',
  registration_fee_paid BOOLEAN NOT NULL DEFAULT false,
  players JSONB NOT NULL DEFAULT '[]', -- [{name, age, jersey_number, is_substitute}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON tournament_teams TO authenticated;
GRANT SELECT ON tournament_teams TO anon;

CREATE POLICY "anyone reads approved teams" ON tournament_teams FOR SELECT USING (status = 'approved');
CREATE POLICY "captain reads own team" ON tournament_teams FOR SELECT USING (auth.uid() = captain_user_id);
CREATE POLICY "captain creates team" ON tournament_teams FOR INSERT WITH CHECK (auth.uid() = captain_user_id);
CREATE POLICY "tournament owner reads all teams" ON tournament_teams FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND owner_id = auth.uid()));
CREATE POLICY "tournament owner updates team status" ON tournament_teams FOR UPDATE
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND owner_id = auth.uid()));

-- Matches
CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INT NOT NULL,
  match_number INT NOT NULL,
  team1_id UUID REFERENCES tournament_teams(id),
  team2_id UUID REFERENCES tournament_teams(id),
  team1_score INT,
  team2_score INT,
  winner_id UUID REFERENCES tournament_teams(id),
  match_date TIMESTAMPTZ,
  venue TEXT,
  stage TEXT, -- 'group_stage', 'quarterfinal', 'semifinal', 'final', 'third_place'
  group_name TEXT,
  is_played BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON tournament_matches TO authenticated;
GRANT SELECT ON tournament_matches TO anon;

CREATE POLICY "anyone reads tournament matches" ON tournament_matches FOR SELECT USING (true);
CREATE POLICY "tournament owner manages matches" ON tournament_matches FOR ALL
  USING (EXISTS (SELECT 1 FROM tournaments WHERE id = tournament_id AND owner_id = auth.uid()));

-- ============================================================
-- 12. PAYMENTS (المدفوعات)
-- ============================================================

CREATE TYPE payment_type AS ENUM ('booking', 'subscription', 'tournament_registration');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  payment_type payment_type NOT NULL,
  entity_id UUID NOT NULL, -- booking_id, subscription_id, or team_id
  amount_sar NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0, -- e.g. 0.05 = 5%
  commission_fixed_sar NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_total_sar NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_amount_sar NUMERIC(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  moyasar_payment_id TEXT,
  moyasar_response JSONB,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_amount_sar NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON payments TO authenticated;

CREATE POLICY "users read own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users create payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin reads all payments" ON payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Commission settings (admin only)
CREATE TABLE commission_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type TEXT NOT NULL UNIQUE, -- 'facility', 'academy', 'tournament'
  commission_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed', 'both'
  percentage NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  fixed_sar NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON commission_settings TO authenticated;

CREATE POLICY "admin manages commission settings" ON commission_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "authenticated reads commission settings" ON commission_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 13. NOTIFICATIONS (الإشعارات)
-- ============================================================

CREATE TYPE notification_type AS ENUM (
  'booking_confirmed', 'booking_cancelled', 'subscription_confirmed',
  'subscription_expiring', 'team_approved', 'team_rejected',
  'activation_approved', 'activation_rejected', 'match_result',
  'match_upcoming', 'general'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title_ar TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_via_whatsapp BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;

CREATE POLICY "users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "service inserts notifications" ON notifications FOR INSERT WITH CHECK (true);

-- ============================================================
-- 14. ACTIVITY LOGS (سجل النشاطات)
-- ============================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON activity_logs TO authenticated, anon;
GRANT SELECT ON activity_logs TO authenticated;

CREATE POLICY "admin reads all logs" ON activity_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "partner reads own logs" ON activity_logs FOR SELECT
  USING (auth.uid() = actor_id);
CREATE POLICY "anyone inserts logs" ON activity_logs FOR INSERT WITH CHECK (true);

-- ============================================================
-- 15. REVIEWS (التقييمات)
-- ============================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type TEXT NOT NULL, -- 'facility', 'academy', 'tournament'
  entity_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON reviews TO authenticated;
GRANT SELECT ON reviews TO anon;

CREATE POLICY "anyone reads visible reviews" ON reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "users create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 16. FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','partner_roles','facilities','bookings','academy_programs','academy_subscriptions','tournaments','tournament_teams','tournament_matches','payments','field_definitions'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update facility rating on new review
CREATE OR REPLACE FUNCTION update_entity_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entity_type = 'facility' THEN
    UPDATE facilities SET
      rating = (SELECT AVG(rating)::NUMERIC(2,1) FROM reviews WHERE entity_type = 'facility' AND entity_id = NEW.entity_id AND is_visible = true),
      reviews_count = (SELECT COUNT(*) FROM reviews WHERE entity_type = 'facility' AND entity_id = NEW.entity_id AND is_visible = true)
    WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'academy' THEN
    UPDATE academies SET
      rating = (SELECT AVG(rating)::NUMERIC(2,1) FROM reviews WHERE entity_type = 'academy' AND entity_id = NEW.entity_id AND is_visible = true),
      reviews_count = (SELECT COUNT(*) FROM reviews WHERE entity_type = 'academy' AND entity_id = NEW.entity_id AND is_visible = true)
    WHERE id = NEW.entity_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_rating AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION update_entity_rating();

-- Decrement academy seats on confirmed subscription
CREATE OR REPLACE FUNCTION manage_academy_seats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    UPDATE academy_programs SET current_students = current_students + 1 WHERE id = NEW.program_id;
  ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
    UPDATE academy_programs SET current_students = GREATEST(0, current_students - 1) WHERE id = NEW.program_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_academy_seats AFTER UPDATE ON academy_subscriptions
FOR EACH ROW EXECUTE FUNCTION manage_academy_seats();

-- ============================================================
-- 17. SEED DATA
-- ============================================================

-- Commission settings defaults
INSERT INTO commission_settings (activity_type, commission_type, percentage, fixed_sar) VALUES
  ('facility', 'percentage', 0.05, 0),
  ('academy', 'percentage', 0.05, 0),
  ('tournament', 'percentage', 0.05, 0);

-- Permissions seed
INSERT INTO permissions (code, name_ar, category, applies_to) VALUES
  ('view_bookings', 'عرض الحجوزات', 'bookings', ARRAY['facility_manager']),
  ('confirm_booking', 'تأكيد / إلغاء حجز', 'bookings', ARRAY['facility_manager']),
  ('edit_schedule', 'تعديل المواعيد', 'facility', ARRAY['facility_manager']),
  ('edit_prices', 'تعديل الأسعار', 'facility', ARRAY['facility_manager']),
  ('view_reports_operational', 'عرض التقارير التشغيلية', 'reports', ARRAY['facility_manager','academy_manager','tournament_manager']),
  ('view_reports_financial', 'عرض التقارير المالية', 'reports', ARRAY['facility_manager','academy_manager','tournament_manager']),
  ('manage_employees', 'إدارة الموظفين', 'management', ARRAY['facility_manager','academy_manager','tournament_manager']),
  ('reply_customers', 'الرد على العملاء', 'customers', ARRAY['facility_manager','academy_manager','tournament_manager']),
  ('manage_programs', 'إدارة البرامج التدريبية', 'academy', ARRAY['academy_manager']),
  ('view_students', 'عرض قائمة الطلاب', 'academy', ARRAY['academy_manager']),
  ('accept_teams', 'قبول الفرق', 'tournament', ARRAY['tournament_manager']),
  ('enter_results', 'إدخال النتائج', 'tournament', ARRAY['tournament_manager']),
  ('generate_schedule', 'توليد جدول المباريات', 'tournament', ARRAY['tournament_manager']),
  ('view_field_library', 'عرض مكتبة الحقول', 'fields', ARRAY['facility_manager','academy_manager','tournament_manager']),
  -- Admin permissions
  ('admin_review_partners', 'مراجعة طلبات الشركاء', 'admin', ARRAY[]::TEXT[]),
  ('admin_manage_users', 'إدارة المستخدمين', 'admin', ARRAY[]::TEXT[]),
  ('admin_manage_commissions', 'إدارة العمولات', 'admin', ARRAY[]::TEXT[]),
  ('admin_manage_fields', 'إدارة الحقول الديناميكية', 'admin', ARRAY[]::TEXT[]),
  ('admin_view_all_logs', 'عرض سجل النشاطات الكامل', 'admin', ARRAY[]::TEXT[]),
  ('admin_manage_admin_employees', 'إدارة موظفي الإدارة', 'admin', ARRAY[]::TEXT[]);

-- Field categories
INSERT INTO field_categories (name_ar, sort_order) VALUES
  ('بيانات شخصية', 1),
  ('بيانات صحية', 2),
  ('بيانات المنشأة', 3),
  ('مستندات رسمية', 4),
  ('بيانات رياضية', 5),
  ('بيانات الفريق', 6),
  ('بيانات التواصل', 7),
  ('أخرى', 8);

-- Field definitions seed (dynamic fields library)
DO $$
DECLARE
  cat_personal UUID;
  cat_health UUID;
  cat_facility UUID;
  cat_docs UUID;
  cat_sports UUID;
  cat_team UUID;
  cat_contact UUID;
BEGIN
  SELECT id INTO cat_personal FROM field_categories WHERE name_ar = 'بيانات شخصية';
  SELECT id INTO cat_health FROM field_categories WHERE name_ar = 'بيانات صحية';
  SELECT id INTO cat_facility FROM field_categories WHERE name_ar = 'بيانات المنشأة';
  SELECT id INTO cat_docs FROM field_categories WHERE name_ar = 'مستندات رسمية';
  SELECT id INTO cat_sports FROM field_categories WHERE name_ar = 'بيانات رياضية';
  SELECT id INTO cat_team FROM field_categories WHERE name_ar = 'بيانات الفريق';
  SELECT id INTO cat_contact FROM field_categories WHERE name_ar = 'بيانات التواصل';

  -- Facility activation fields
  INSERT INTO field_definitions (category_id, name_ar, field_type, placeholder_ar, is_required_default, applies_to, use_in, sort_order) VALUES
    (cat_facility, 'اسم المنشأة', 'text', 'أدخل اسم المنشأة', true, ARRAY['facility_manager']::partner_activity[], ARRAY['activation_request'], 1),
    (cat_docs, 'رقم السجل التجاري', 'text', '1234567890', true, ARRAY['facility_manager']::partner_activity[], ARRAY['activation_request'], 2),
    (cat_docs, 'صورة السجل التجاري', 'image', NULL, true, ARRAY['facility_manager']::partner_activity[], ARRAY['activation_request'], 3),
    (cat_facility, 'المدينة', 'select', NULL, true, ARRAY['facility_manager','academy_manager','tournament_manager']::partner_activity[], ARRAY['activation_request'], 4),
    (cat_facility, 'الحي', 'text', 'أدخل اسم الحي', false, ARRAY['facility_manager']::partner_activity[], ARRAY['activation_request'], 5),
    (cat_contact, 'رقم التواصل', 'phone', '05XXXXXXXX', true, ARRAY['facility_manager','academy_manager','tournament_manager']::partner_activity[], ARRAY['activation_request'], 6),
    (cat_facility, 'شعار المنشأة', 'image', NULL, false, ARRAY['facility_manager','academy_manager']::partner_activity[], ARRAY['activation_request'], 7);

  -- Academy activation fields
  INSERT INTO field_definitions (category_id, name_ar, field_type, placeholder_ar, is_required_default, applies_to, use_in, sort_order) VALUES
    (cat_facility, 'اسم الأكاديمية', 'text', 'أدخل اسم الأكاديمية', true, ARRAY['academy_manager']::partner_activity[], ARRAY['activation_request'], 1),
    (cat_docs, 'رقم الترخيص', 'text', 'أدخل رقم الترخيص', true, ARRAY['academy_manager']::partner_activity[], ARRAY['activation_request'], 2),
    (cat_docs, 'صورة الترخيص', 'image', NULL, true, ARRAY['academy_manager']::partner_activity[], ARRAY['activation_request'], 3),
    (cat_sports, 'التخصصات الرياضية', 'multiselect', NULL, true, ARRAY['academy_manager']::partner_activity[], ARRAY['activation_request'], 4);

  -- Tournament activation fields
  INSERT INTO field_definitions (category_id, name_ar, field_type, placeholder_ar, is_required_default, applies_to, use_in, sort_order) VALUES
    (cat_facility, 'اسم الجهة المنظمة', 'text', 'أدخل اسم الجهة', true, ARRAY['tournament_manager']::partner_activity[], ARRAY['activation_request'], 1),
    (cat_facility, 'نوع الكيان', 'select', NULL, true, ARRAY['tournament_manager']::partner_activity[], ARRAY['activation_request'], 2),
    (cat_facility, 'خبرات سابقة في تنظيم البطولات', 'textarea', 'اذكر خبراتك السابقة', false, ARRAY['tournament_manager']::partner_activity[], ARRAY['activation_request'], 3);

  -- Academy student registration fields
  INSERT INTO field_definitions (category_id, name_ar, field_type, placeholder_ar, is_required_default, applies_to, use_in, sort_order) VALUES
    (cat_personal, 'اسم الطالب كاملاً', 'text', 'الاسم الرباعي', true, ARRAY['academy_manager']::partner_activity[], ARRAY['academy_student'], 1),
    (cat_personal, 'تاريخ الميلاد', 'date', NULL, true, ARRAY['academy_manager']::partner_activity[], ARRAY['academy_student'], 2),
    (cat_health, 'فصيلة الدم', 'select', NULL, false, ARRAY['academy_manager']::partner_activity[], ARRAY['academy_student'], 3),
    (cat_health, 'الحالة الصحية / أمراض مزمنة', 'textarea', 'اذكر أي حالات صحية خاصة', false, ARRAY['academy_manager']::partner_activity[], ARRAY['academy_student'], 4),
    (cat_personal, 'اسم ولي الأمر', 'text', 'اسم ولي الأمر', true, ARRAY['academy_manager']::partner_activity[], ARRAY['academy_student'], 5),
    (cat_contact, 'جوال ولي الأمر', 'phone', '05XXXXXXXX', true, ARRAY['academy_manager']::partner_activity[], ARRAY['academy_student'], 6),
    (cat_sports, 'المستوى الرياضي', 'select', NULL, false, ARRAY['academy_manager']::partner_activity[], ARRAY['academy_student'], 7);

  -- Tournament team registration fields
  INSERT INTO field_definitions (category_id, name_ar, field_type, placeholder_ar, is_required_default, applies_to, use_in, sort_order) VALUES
    (cat_team, 'اسم الفريق', 'text', 'أدخل اسم الفريق', true, ARRAY['tournament_manager']::partner_activity[], ARRAY['tournament_team'], 1),
    (cat_team, 'شعار الفريق', 'image', NULL, false, ARRAY['tournament_manager']::partner_activity[], ARRAY['tournament_team'], 2),
    (cat_team, 'اسم الكابتن', 'text', 'الاسم الكامل للكابتن', true, ARRAY['tournament_manager']::partner_activity[], ARRAY['tournament_team'], 3),
    (cat_contact, 'جوال الكابتن', 'phone', '05XXXXXXXX', true, ARRAY['tournament_manager']::partner_activity[], ARRAY['tournament_team'], 4),
    (cat_sports, 'قائمة اللاعبين', 'textarea', 'اسم اللاعب، العمر، رقم القميص (كل لاعب في سطر)', true, ARRAY['tournament_manager']::partner_activity[], ARRAY['tournament_team'], 5);

END;
$$;
