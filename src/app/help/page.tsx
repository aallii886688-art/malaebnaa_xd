import Link from 'next/link'

const faqs = [
  { q: 'كيف أحجز ملعباً؟', a: 'اختر الملعب من قائمة الملاعب، ثم حدد الوقت المناسب، وأكمل الدفع الإلكتروني. ستصلك رسالة تأكيد فور اكتمال الحجز.' },
  { q: 'هل يمكنني إلغاء الحجز؟', a: 'نعم، يمكن إلغاء الحجز قبل 24 ساعة من الموعد للحصول على استرداد كامل. راجع سياسة الإلغاء للتفاصيل.' },
  { q: 'كيف أشترك في أكاديمية؟', a: 'تصفح قائمة الأكاديميات، اختر البرنامج المناسب لعمرك ورياضتك، وأكمل التسجيل والدفع مباشرة من التطبيق.' },
  { q: 'كيف أسجل فريقي في بطولة؟', a: 'ادخل صفحة البطولة، اضغط "سجل فريقك"، أدخل بيانات الفريق واللاعبين، وأكمل رسوم التسجيل.' },
  { q: 'كيف أصبح شريكاً في المنصة؟', a: 'من صفحة حسابك، اختر "وضع الشريك" ثم قدم طلب تفعيل النشاط. سيراجع فريقنا طلبك خلال 24-48 ساعة.' },
  { q: 'ما طرق الدفع المتاحة؟', a: 'نقبل البطاقات الائتمانية وبطاقات مدى وSTC Pay عبر بوابة ميسر الآمنة.' },
  { q: 'كيف أتواصل مع الدعم؟', a: 'يمكنك التواصل معنا عبر البريد الإلكتروني أو واتساب. فريق الدعم متاح من 8 صباحاً إلى 12 منتصف الليل.' },
]

export default function HelpPage() {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 40 }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ fontSize: 20, color: 'var(--text)', display: 'block', marginBottom: 4 }}>←</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>مركز المساعدة</h1>
      </header>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: 'var(--primary-dim)', border: '1px solid var(--primary)', borderRadius: 16, padding: 16, marginBottom: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '0 0 4px' }}>📞 تواصل معنا</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>واتساب: +966 5X XXX XXXX | البريد: support@malaebnaa.sa</p>
        </div>

        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '8px 0 4px' }}>الأسئلة الشائعة</p>

        {faqs.map((faq, i) => (
          <details key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <summary style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {faq.q}
              <span style={{ color: 'var(--text3)', fontSize: 18 }}>+</span>
            </summary>
            <p style={{ fontSize: 13, color: 'var(--text2)', padding: '0 16px 14px', margin: 0, lineHeight: 1.7 }}>{faq.a}</p>
          </details>
        ))}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <Link href="/terms" style={{ display: 'block', padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 13, color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>
            📄 الشروط والأحكام
          </Link>
          <Link href="/privacy" style={{ display: 'block', padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 13, color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>
            🔒 سياسة الخصوصية
          </Link>
          <Link href="/refund-policy" style={{ display: 'block', padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 13, color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>
            💰 سياسة الإلغاء والاسترداد
          </Link>
        </div>
      </div>
    </div>
  )
}
