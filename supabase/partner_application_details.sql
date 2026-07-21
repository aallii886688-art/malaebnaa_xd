-- إضافة أعمدة تفاصيل طلب الشريك
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor

ALTER TABLE partner_roles
  ADD COLUMN IF NOT EXISTS business_name    TEXT,
  ADD COLUMN IF NOT EXISTS business_city    TEXT,
  ADD COLUMN IF NOT EXISTS commercial_reg   TEXT,
  ADD COLUMN IF NOT EXISTS applicant_phone  TEXT,
  ADD COLUMN IF NOT EXISTS applicant_notes  TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes      TEXT;
