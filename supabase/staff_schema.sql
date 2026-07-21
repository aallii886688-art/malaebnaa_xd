-- ============================================================
-- ملاعبنا — جدول موظفي الشريك
-- شغّل في Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS facility_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('manager', 'staff', 'viewer')),
  added_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (facility_id, user_id)
);

ALTER TABLE facility_staff ENABLE ROW LEVEL SECURITY;

-- الشريك يرى موظفيه فقط
CREATE POLICY "owner manages staff" ON facility_staff FOR ALL
  USING (
    EXISTS (SELECT 1 FROM facilities WHERE id = facility_id AND owner_id = auth.uid())
    OR auth.uid() = user_id
    OR is_admin(auth.uid())
  );

GRANT SELECT, INSERT, DELETE ON facility_staff TO authenticated;

CREATE INDEX IF NOT EXISTS idx_facility_staff_facility ON facility_staff(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_staff_user ON facility_staff(user_id);
