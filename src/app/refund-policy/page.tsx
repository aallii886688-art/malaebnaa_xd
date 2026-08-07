import Link from 'next/link'

export default function RefundPolicyPage() {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 40 }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/help" style={{ fontSize: 20, color: 'var(--text)', display: 'block', marginBottom: 4 }}>←</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>سياسة الإلغاء والاسترداد</h1>
      </header>
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ background: 'var(--primary-dim)', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>⚽ حجوزات الملاعب</p>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { when: 'قبل 24 ساعة أو أكثر', refund: 'استرداد 100%' },
              { when: 'من 12 إلى 24 ساعة', refund: 'استرداد 50%' },
              { when: 'أقل من 12 ساعة', refund: 'لا يوجد استرداد' },
            ].map((r) => (
              <div key={r.when} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>{r.when}</span>
                <span style={{ fontWeight: 700, color: r.refund.includes('100') ? 'var(--primary)' : r.refund.includes('50') ? 'var(--gold)' : 'var(--danger)' }}>{r.refund}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ background: 'var(--primary-dim)', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>🏅 اشتراكات الأكاديميات</p>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { when: 'قبل بدء البرنامج', refund: 'استرداد 100%' },
              { when: 'خلال أول 7 أيام', refund: 'استرداد 75%' },
              { when: 'بعد 7 أيام', refund: 'لا يوجد استرداد' },
            ].map((r) => (
              <div key={r.when} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>{r.when}</span>
                <span style={{ fontWeight: 700, color: r.refund.includes('100') ? 'var(--primary)' : r.refund.includes('75') ? 'var(--gold)' : 'var(--danger)' }}>{r.refund}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ background: 'var(--primary-dim)', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>🏆 رسوم تسجيل البطولات</p>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { when: 'قبل إغلاق التسجيل', refund: 'استرداد 100%' },
              { when: 'بعد إغلاق التسجيل', refund: 'لا يوجد استرداد' },
            ].map((r) => (
              <div key={r.when} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>{r.when}</span>
                <span style={{ fontWeight: 700, color: r.refund.includes('100') ? 'var(--primary)' : 'var(--danger)' }}>{r.refund}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, margin: 0 }}>
            يتم معالجة الاستردادات خلال 3-5 أيام عمل. للتقدم بطلب استرداد، تواصل مع الدعم أو قدم طلبك من صفحة حجوزاتك.
          </p>
        </div>
      </div>
    </div>
  )
}
