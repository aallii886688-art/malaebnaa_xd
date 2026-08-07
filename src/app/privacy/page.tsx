import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 40 }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/help" style={{ fontSize: 20, color: 'var(--text)', display: 'block', marginBottom: 4 }}>←</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>سياسة الخصوصية</h1>
        <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0' }}>آخر تحديث: يناير 2025</p>
      </header>
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {[
          { title: 'ما المعلومات التي نجمعها؟', body: 'نجمع الاسم الكامل، رقم الجوال، المدينة، وبيانات المعاملات المالية. لا نجمع أي معلومات حساسة بدون إذنك الصريح.' },
          { title: 'كيف نستخدم معلوماتك؟', body: 'تُستخدم معلوماتك لتأكيد الحجوزات وإرسال الإشعارات وتحسين الخدمة. لا نبيع بياناتك لأي طرف ثالث.' },
          { title: 'مشاركة المعلومات', body: 'نشارك بياناتك مع أصحاب المنشآت فقط بالقدر الضروري لإتمام الحجز أو التسجيل. نلتزم بأنظمة حماية البيانات السعودية.' },
          { title: 'الأمان', body: 'نستخدم تشفير SSL وبروتوكولات أمان متقدمة لحماية بياناتك. يتم تخزين بيانات الدفع لدى مزود الدفع المعتمد (ميسر) ولا نحتفظ بها.' },
          { title: 'حقوقك', body: 'يحق لك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها في أي وقت. تواصل معنا عبر البريد الإلكتروني لممارسة هذه الحقوق.' },
          { title: 'ملفات الارتباط (Cookies)', body: 'نستخدم ملفات الارتباط لتحسين تجربة الاستخدام وتذكر تفضيلاتك. يمكنك إيقاف تشغيلها من إعدادات متصفحك.' },
        ].map((s) => (
          <div key={s.title}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{s.title}</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
