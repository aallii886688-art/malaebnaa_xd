import Link from 'next/link'

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 40 }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/help" style={{ fontSize: 20, color: 'var(--text)', display: 'block', marginBottom: 4 }}>←</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>الشروط والأحكام</h1>
        <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0' }}>آخر تحديث: يناير 2025</p>
      </header>
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {[
          { title: '1. قبول الشروط', body: 'باستخدامك منصة ملاعبنا، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، يرجى عدم استخدام المنصة.' },
          { title: '2. الخدمات المقدمة', body: 'تتيح منصة ملاعبنا حجز الملاعب الرياضية، الاشتراك في الأكاديميات، والتسجيل في البطولات. نحن وسيط بين المستخدمين وأصحاب المنشآت.' },
          { title: '3. حساب المستخدم', body: 'أنت مسؤول عن الحفاظ على سرية بيانات حسابك. يجب أن تكون المعلومات المقدمة صحيحة ودقيقة. نحتفظ بحق تعليق الحسابات التي تنتهك هذه الشروط.' },
          { title: '4. الدفع والأسعار', body: 'جميع المبالغ معروضة بالريال السعودي وتشمل ضريبة القيمة المضافة. يتم الدفع عبر بوابة ميسر الآمنة. نستقطع عمولة خدمة من كل معاملة.' },
          { title: '5. الإلغاء والاسترداد', body: 'تخضع عمليات الإلغاء والاسترداد لسياسة الإلغاء المعتمدة. راجع صفحة سياسة الإلغاء للاطلاع على التفاصيل الكاملة.' },
          { title: '6. المسؤولية', body: 'لا تتحمل منصة ملاعبنا المسؤولية عن أي أضرار مباشرة أو غير مباشرة ناجمة عن استخدام الخدمات أو أي إصابات قد تحدث أثناء ممارسة الرياضة.' },
          { title: '7. التعديلات', body: 'نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بالتغييرات الجوهرية عبر البريد الإلكتروني أو الإشعارات داخل التطبيق.' },
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
