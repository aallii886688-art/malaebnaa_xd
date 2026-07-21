-- ============================================================
-- بيانات وهمية لاختبار منصة ملاعبنا
-- owner_id = 2e6a5a47-ca08-487c-948f-e8a947c14ac5 (هادي عسيري)
-- ============================================================

DO $$
DECLARE
  owner UUID := '2e6a5a47-ca08-487c-948f-e8a947c14ac5';

  -- Facilities
  f1 UUID; f2 UUID; f3 UUID; f4 UUID; f5 UUID;

  -- Academies
  a1 UUID; a2 UUID; a3 UUID;

  -- Programs
  p1 UUID; p2 UUID; p3 UUID; p4 UUID;

  -- Tournaments
  t1 UUID; t2 UUID; t3 UUID;

BEGIN

-- ============================================================
-- FACILITIES
-- ============================================================

INSERT INTO facilities (id, owner_id, name, sport_type, city, district, address, phone, description, is_active, rating, reviews_count)
VALUES
  (gen_random_uuid(), owner, 'ملعب النور', 'football', 'الرياض', 'حي النزهة', 'شارع الأمير سلطان، بجوار مسجد النور', '512345678', 'ملعب عشب طبيعي بإضاءة كاملة ودرجات متفرجين. مجهز بغرف تبديل ملابس ودورات مياه.', true, 4.5, 23)
RETURNING id INTO f1;

INSERT INTO facilities (id, owner_id, name, sport_type, city, district, address, phone, description, is_active, rating, reviews_count)
VALUES
  (gen_random_uuid(), owner, 'أكاديمية الرياض للبادل', 'padel', 'الرياض', 'حي العليا', 'طريق الملك فهد، برج المملكة', '556789012', '4 ملاعب بادل احترافية بإضاءة LED وتكييف مركزي. متاح للحجز الخاص والدروس الجماعية.', true, 4.8, 47)
RETURNING id INTO f2;

INSERT INTO facilities (id, owner_id, name, sport_type, city, district, address, phone, description, is_active, rating, reviews_count)
VALUES
  (gen_random_uuid(), owner, 'مركز جدة للفوتسال', 'futsal', 'جدة', 'حي الروضة', 'شارع التحلية', '509876543', 'ملعب فوتسال داخلي بأرضية مطاطية احترافية. مجهز بكاميرات تصوير لتحليل الأداء.', true, 4.2, 18)
RETURNING id INTO f3;

INSERT INTO facilities (id, owner_id, name, sport_type, city, district, address, phone, description, is_active, rating, reviews_count)
VALUES
  (gen_random_uuid(), owner, 'صالة الدمام للكرة الطائرة', 'volleyball', 'الدمام', 'حي الفيصلية', 'شارع الأمير محمد بن فهد', '534567890', 'صالة مغلقة بملعبين للكرة الطائرة. مناسبة للتدريب والمباريات الودية.', true, 3.9, 12)
RETURNING id INTO f4;

INSERT INTO facilities (id, owner_id, name, sport_type, city, district, address, phone, description, is_active, rating, reviews_count)
VALUES
  (gen_random_uuid(), owner, 'ملعب الهلال للسكواش', 'squash', 'الرياض', 'حي الملقا', 'شارع أنس بن مالك', '501234567', '3 ملاعب سكواش بزجاج شفاف للمشاهدة. يوفر مدربين محترفين للمبتدئين.', true, 4.6, 31)
RETURNING id INTO f5;

-- Time slots for f1 (ملعب النور) - كل أيام الأسبوع
INSERT INTO facility_time_slots (facility_id, day_of_week, start_hour, end_hour, price_sar, is_available)
SELECT f1, d, h, h+2, CASE WHEN h >= 17 THEN 200 WHEN h >= 14 THEN 150 ELSE 100 END, true
FROM generate_series(0,6) d, generate_series(8,22,2) h;

-- Time slots for f2 (بادل)
INSERT INTO facility_time_slots (facility_id, day_of_week, start_hour, end_hour, price_sar, is_available)
SELECT f2, d, h, h+1, CASE WHEN h >= 18 THEN 180 WHEN h >= 14 THEN 140 ELSE 100 END, true
FROM generate_series(0,6) d, generate_series(8,23) h;

-- Time slots for f3 (فوتسال)
INSERT INTO facility_time_slots (facility_id, day_of_week, start_hour, end_hour, price_sar, is_available)
SELECT f3, d, h, h+2, CASE WHEN h >= 16 THEN 120 ELSE 80 END, true
FROM generate_series(0,6) d, generate_series(9,21,2) h;

-- Time slots for f4 (طائرة)
INSERT INTO facility_time_slots (facility_id, day_of_week, start_hour, end_hour, price_sar, is_available)
SELECT f4, d, h, h+2, 90, true
FROM generate_series(0,6) d, generate_series(8,20,2) h;

-- Time slots for f5 (سكواش)
INSERT INTO facility_time_slots (facility_id, day_of_week, start_hour, end_hour, price_sar, is_available)
SELECT f5, d, h, h+1, CASE WHEN h >= 17 THEN 130 ELSE 90 END, true
FROM generate_series(0,6) d, generate_series(7,22) h;


-- ============================================================
-- ACADEMIES
-- ============================================================

INSERT INTO academies (id, owner_id, name, city, sport_types, phone, description, is_active, rating, reviews_count)
VALUES (gen_random_uuid(), owner, 'أكاديمية النجوم لكرة القدم', 'الرياض', ARRAY['football','futsal']::sport_type[], '512300001', 'أكاديمية متخصصة في تطوير مهارات اللاعبين من الناشئين حتى الاحتراف. لدينا مدربون معتمدون من الاتحاد السعودي.', true, 4.7, 56)
RETURNING id INTO a1;

INSERT INTO academies (id, owner_id, name, city, sport_types, phone, description, is_active, rating, reviews_count)
VALUES (gen_random_uuid(), owner, 'أكاديمية جدة للتنس والبادل', 'جدة', ARRAY['tennis','padel']::sport_type[], '556000002', 'أكاديمية رائدة في تعليم التنس والبادل. نقدم برامج للجميع بدءاً من عمر 6 سنوات.', true, 4.4, 38)
RETURNING id INTO a2;

INSERT INTO academies (id, owner_id, name, city, sport_types, phone, description, is_active, rating, reviews_count)
VALUES (gen_random_uuid(), owner, 'مركز الدمام للسباحة', 'الدمام', ARRAY['swimming']::sport_type[], '534000003', 'مركز سباحة متكامل مع حمامات مدفأة ومدربين متخصصين. نقدم دورات للمبتدئين والمحترفين.', true, 4.3, 29)
RETURNING id INTO a3;

-- Programs for a1
INSERT INTO academy_programs (academy_id, name, sport_type, coach_name, age_min, age_max, max_students, current_students, pricing_type, monthly_price_sar, program_price_sar, is_active)
VALUES
  (a1, 'برنامج الناشئين (6-10 سنوات)', 'football', 'المدرب أحمد الغامدي', 6, 10, 20, 12, 'monthly', 350, NULL, true),
  (a1, 'برنامج الشباب (11-16 سنة)', 'football', 'المدرب خالد العتيبي', 11, 16, 18, 15, 'both', 500, 2500, true),
  (a1, 'برنامج البالغين والهواة', 'football', 'المدرب سعد القحطاني', 17, NULL, 16, 8, 'monthly', 600, NULL, true),
  (a1, 'دورة فوتسال مكثفة', 'futsal', 'المدرب فيصل الدوسري', NULL, NULL, 12, 5, 'program', NULL, 1800, true);

-- Programs for a2
INSERT INTO academy_programs (academy_id, name, sport_type, coach_name, age_min, age_max, max_students, current_students, pricing_type, monthly_price_sar, program_price_sar, is_active)
VALUES
  (a2, 'تنس للمبتدئين', 'tennis', 'المدرب نورة الشهري', NULL, NULL, 10, 6, 'monthly', 800, NULL, true),
  (a2, 'بادل للجميع', 'padel', 'المدرب محمد الزهراني', NULL, NULL, 14, 11, 'both', 700, 3500, true);

-- Programs for a3
INSERT INTO academy_programs (academy_id, name, sport_type, coach_name, age_min, age_max, max_students, current_students, pricing_type, monthly_price_sar, program_price_sar, is_active)
VALUES
  (a3, 'سباحة للأطفال (4-12 سنة)', 'swimming', 'المدرب ريم الأحمدي', 4, 12, 15, 13, 'monthly', 400, NULL, true),
  (a3, 'سباحة للبالغين', 'swimming', 'المدرب يوسف السلمي', 18, NULL, 12, 4, 'both', 500, 2200, true);


-- ============================================================
-- TOURNAMENTS
-- ============================================================

INSERT INTO tournaments (id, owner_id, name, sport_type, system, city, venue, max_teams, players_per_team, substitutes_per_team, registration_fee_sar, age_group, start_date, end_date, registration_deadline, status, is_active, show_results, show_standings, show_bracket)
VALUES (gen_random_uuid(), owner, 'كأس الرياض الخامس لكرة القدم', 'football', 'knockout', 'الرياض', 'ملعب الأمير فيصل', 8, 11, 5, 500, NULL, CURRENT_DATE + 14, CURRENT_DATE + 21, CURRENT_DATE + 10, 'registration', true, true, true, true)
RETURNING id INTO t1;

INSERT INTO tournaments (id, owner_id, name, sport_type, system, city, venue, max_teams, players_per_team, substitutes_per_team, registration_fee_sar, age_group, start_date, end_date, registration_deadline, status, is_active, show_results, show_standings, show_bracket)
VALUES (gen_random_uuid(), owner, 'دوري جدة للبادل 2026', 'padel', 'league', 'جدة', 'أكاديمية الرياض للبادل', 6, 2, 0, 300, NULL, CURRENT_DATE + 7, CURRENT_DATE + 35, CURRENT_DATE + 5, 'registration', true, true, true, true)
RETURNING id INTO t2;

INSERT INTO tournaments (id, owner_id, name, sport_type, system, city, venue, max_teams, players_per_team, substitutes_per_team, registration_fee_sar, age_group, start_date, end_date, registration_deadline, status, is_active, show_results, show_standings, show_bracket)
VALUES (gen_random_uuid(), owner, 'بطولة الفوتسال للناشئين', 'futsal', 'groups_knockout', 'الدمام', 'مركز جدة للفوتسال', 8, 7, 3, 0, 'تحت 18', CURRENT_DATE + 30, CURRENT_DATE + 45, CURRENT_DATE + 25, 'upcoming', true, true, true, true)
RETURNING id INTO t3;

-- Add some dummy teams to t1
INSERT INTO tournament_teams (tournament_id, captain_user_id, team_name, status, registration_fee_paid, players)
VALUES
  (t1, owner, 'النسور', 'approved', true, '[{"name":"محمد علي"},{"name":"خالد حسن"},{"name":"أحمد سعد"},{"name":"فيصل عمر"},{"name":"ناصر يوسف"},{"name":"عبدالله محمد"},{"name":"سعود أحمد"},{"name":"تركي علي"},{"name":"راشد فهد"},{"name":"منصور سالم"},{"name":"عمر عبدالله"}]'),
  (t1, owner, 'الصقور', 'approved', true, '[{"name":"سلطان الغامدي"},{"name":"بندر العتيبي"},{"name":"ماجد الدوسري"},{"name":"وليد الزهراني"},{"name":"حمد القحطاني"},{"name":"فراس المالكي"},{"name":"عادل الشهري"},{"name":"جابر العنزي"},{"name":"هاني السلمي"},{"name":"يزيد الحربي"},{"name":"طلال الأحمدي"}]'),
  (t1, owner, 'الأسود', 'approved', true, '[{"name":"زياد الرشيدي"},{"name":"عبدالعزيز الحارثي"},{"name":"ثامر الصاعدي"},{"name":"مشاري القرني"},{"name":"حسين الزيد"},{"name":"عمار البلوي"},{"name":"غانم الشمري"},{"name":"لؤي السبيعي"},{"name":"مبارك الحمدان"},{"name":"نواف الفايز"},{"name":"ضيف الله المطيري"}]'),
  (t1, owner, 'البروق', 'pending', false, '[{"name":"حمزة العريفي"},{"name":"معاذ الجهني"}]');

-- Add matches to t1
INSERT INTO tournament_matches (tournament_id, round, match_number, team1_id, team2_id, team1_score, team2_score, winner_id, is_played, match_date)
SELECT t1, 1, 1, tt1.id, tt2.id, 3, 1, tt1.id, true, NOW() - INTERVAL '2 days'
FROM tournament_teams tt1, tournament_teams tt2
WHERE tt1.tournament_id = t1 AND tt2.tournament_id = t1
  AND tt1.team_name = 'النسور' AND tt2.team_name = 'الصقور';

INSERT INTO tournament_matches (tournament_id, round, match_number, team1_id, team2_id, team1_score, team2_score, winner_id, is_played, match_date)
SELECT t1, 1, 2, tt1.id, tt2.id, 2, 2, NULL, true, NOW() - INTERVAL '1 day'
FROM tournament_teams tt1, tournament_teams tt2
WHERE tt1.tournament_id = t1 AND tt2.tournament_id = t1
  AND tt1.team_name = 'الأسود' AND tt2.team_name = 'النسور';

-- Add teams to t2 (بادل)
INSERT INTO tournament_teams (tournament_id, captain_user_id, team_name, status, registration_fee_paid, players)
VALUES
  (t2, owner, 'ثنائي العليا', 'approved', true, '[{"name":"سامي الحربي"},{"name":"وائل المطيري"}]'),
  (t2, owner, 'نجوم جدة', 'approved', true, '[{"name":"أنس الغامدي"},{"name":"رائد الشمري"}]'),
  (t2, owner, 'الرياح', 'pending', false, '[{"name":"فارس الدوسري"},{"name":"جاسم الكندي"}]');

RAISE NOTICE 'تم إضافة البيانات الوهمية بنجاح ✅';
END $$;
