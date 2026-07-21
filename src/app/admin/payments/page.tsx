'use client'
import { useRouter } from 'next/navigation'

export default function AdminPaymentsPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة التحكم</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>المدفوعات</h1>
        </div>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12, padding: '0 16px' }}>
        <span style={{ fontSize: 48 }}>💳</span>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>قيد الإعداد</p>
        <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', margin: 0 }}>سيتم عرض سجل المدفوعات بعد تفعيل بوابة الدفع</p>
      </div>
    </div>
  )
}
