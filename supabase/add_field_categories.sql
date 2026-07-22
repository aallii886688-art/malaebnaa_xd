-- إضافة تصنيفات حقول جديدة مع ملاحظة توضيحية
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor

ALTER TABLE field_categories ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- تحديث التصنيفات الموجودة بوصف توضيحي
UPDATE field_categories SET description_ar = 'مثال: الاسم، تاريخ الميلاد، الجنس، رقم الهوية' WHERE name_ar = 'بيانات شخصية';
UPDATE field_categories SET description_ar = 'مثال: فصيلة الدم، أمراض مزمنة، حساسية، إعاقة' WHERE name_ar = 'بيانات صحية';
UPDATE field_categories SET description_ar = 'مثال: اسم المنشأة، المدينة، الحي، الطاقة الاستيعابية' WHERE name_ar = 'بيانات المنشأة';
UPDATE field_categories SET description_ar = 'مثال: السجل التجاري، رخصة البلدية، صورة الترخيص' WHERE name_ar = 'مستندات رسمية';
UPDATE field_categories SET description_ar = 'مثال: المستوى الرياضي، الرياضة المفضلة، سنوات الخبرة' WHERE name_ar = 'بيانات رياضية';
UPDATE field_categories SET description_ar = 'مثال: اسم الفريق، شعار الفريق، قائمة اللاعبين' WHERE name_ar = 'بيانات الفريق';
UPDATE field_categories SET description_ar = 'مثال: رقم الجوال، البريد الإلكتروني، حساب تويتر' WHERE name_ar = 'بيانات التواصل';

-- إضافة التصنيفات الجديدة
INSERT INTO field_categories (name_ar, description_ar, sort_order) VALUES
  ('بيانات ولي الأمر',   'مثال: اسم ولي الأمر، جواله، علاقته بالطالب، وظيفته',         8),
  ('معلومات الإقامة',    'مثال: المدينة، الحي، الشارع، رقم المبنى',                      9),
  ('بيانات مالية',       'مثال: رقم الآيبان، اسم البنك، طريقة الدفع المفضلة',          10),
  ('تقييم ومتابعة',      'مثال: أهداف التدريب، المستوى الحالي، ملاحظات المدرب',         11),
  ('موافقات وإقرارات',   'مثال: موافقة ولي الأمر، إقرار السلامة، قبول الشروط والأحكام', 12);
