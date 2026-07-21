'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  type: string
  title_ar: string
  body_ar: string
  created_at: string
  sent_via_whatsapp: boolean
  profiles: { full_name: string; phone: string } | null
}

export default function AdminLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('notifications').select('*, profiles:user_id(full_name, phone)')
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setLogs((data as Notification[]) ?? []); setLoading(false) })
  }, [])

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة التحكم</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>سجل النشاطات</h1>
        </div>
      </header>

      <div style={{ padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>لا توجد نشاطات بعد</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: '0 0 2px' }}>{log.title_ar}</p>
                  <p style={{ fontSize: 11, color: 'var(--text2)', margin: '0 0 2px' }}>{log.body_ar}</p>
                  {log.profiles && (
                    <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{log.profiles.full_name} · {log.profiles.phone}</p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginRight: 8 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: log.sent_via_whatsapp ? 'var(--primary-dim)' : 'var(--danger-dim)', color: log.sent_via_whatsapp ? 'var(--primary)' : 'var(--danger)' }}>
                    {log.sent_via_whatsapp ? 'واتساب ✓' : 'لم يُرسل'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(log.created_at).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
