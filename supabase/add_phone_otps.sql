-- جدول OTP للواتساب
CREATE TABLE phone_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;
-- الجدول يُدار فقط من السيرفر عبر service role — لا policies للعملاء
