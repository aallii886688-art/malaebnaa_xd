'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Log = {
  id: string
  actor_id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  after_data: Record<string, unknown> | null
  before_data: Record<string, unknown> | null
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  facility_activated:     { label: 'تفعيل ملعب',         icon: '✅', color: '#22c55e' },
  facility_deactivated:   { label: 'إيقاف ملعب',         icon: '🚫', color: '#ef4444' },
  academy_activated:      { label: 'تفعيل أكاديمية',     icon: '✅', color: '#22c55e' },
  academy_deactivated:    { label: 'إيقاف أكاديمية',     icon: '🚫', color: '#ef4444' },
  tournament_activated:   { label: 'تفعيل بطولة',         icon: '✅', color: '#22c55e' },
  tournament_deactivated: { label: 'إيقاف بطولة',         icon: '🚫', color: '#ef4444' },
  booking_cancelled:      { label: 'إلغاء حجز',           icon: '❌', color: '#ef4444' },
  booking_confirmed:      { label: 'تأكيد حجز',           icon: '✅', color: '#22c55e' },
  add_staff:              { label: 'إضافة موظف',          icon: '👤', color: '#3b82f6' },
  remove_staff:           { label: 'إزالة موظف',          icon: '❌', color: '#ef4444' },
  settlement_requested:   { label: 'طلب تسوية',           icon: '💸', color: '#f59e0b' },
  refund_requested:       { label: 'طلب استرداد',          icon: '↩️', color: '#f59e0b' },
}

export default function PartnerLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get all facility_staff user_ids under this partner's facilities
    const { data: facilities } = await supabase
      .from('facilities').select('id').eq('owner_id', user.id)

    const facilityIds = (facilities ?? []).map((f: { id: string }) => f.id)

    let staffIds: string[] = []
    if (facilityIds.length > 0) {
      const { data: staff } = await supabase
        .from('facility_staff').select('user_id').in('facility_id', facilityIds)
      staffIds = (staff ?? []).map((s: { user_id: string }) => s.user_id)
    }

    const actorIds = [user.id, ...staffIds]

    const { data } = await supabase
      .from('activity_logs')
      .select('*, profiles:actor_id(full_name, phone)')
      .in('actor_id', actorIds)
      .order('created_at', { ascending: false })
      .limit(200)

    setLogs((data as Log[]) ?? [])
    setLoading(false)
  }

  const fmt = (v: Record<string, unknown> | null) => {
    if (!v) return null
    return Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(' · ')
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة الشريك</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>سجل النشاطات</h1>
        </div>
      </header>

      <div style={{ padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>لا توجد نشاطات بعد</div>
        ) : logs.map((log) => {
          const meta = ACTION_LABELS[log.action] ?? { label: log.action, icon: '📋', color: 'var(--text2)' }
          const isExpanded = expanded === log.id
          const detail = fmt(log.after_data) || fmt(log.before_data)
          return (
            <div key={log.id} onClick={() => setExpanded(isExpanded ? null : log.id)}
              style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 12, cursor: detail ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{meta.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: meta.color, margin: '0 0 2px' }}>{meta.label}</p>
                  {log.profiles && (
                    <p style={{ fontSize: 11, color: 'var(--text2)', margin: '0 0 2px' }}>
                      بواسطة: {log.profiles.full_name}
                    </p>
                  )}
                  {isExpanded && detail && (
                    <p style={{ fontSize: 11, color: 'var(--text3)', margin: '4px 0 0', wordBreak: 'break-all' }}>{detail}</p>
                  )}
                </div>
                <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>
                  {new Date(log.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
