'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

type Notification = {
  id: string
  type: string
  title_ar: string
  body_ar: string
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

const typeIcon: Record<string, string> = {
  booking_confirmed: '✅', booking_cancelled: '❌',
  subscription_confirmed: '🏅', subscription_expiring: '⏰',
  team_approved: '🏆', team_rejected: '❌',
  activation_approved: '✅', activation_rejected: '❌',
  match_result: '⚽', match_upcoming: '📅', general: '🔔',
}

const entityRoute: Record<string, string> = {
  booking: '/player/bookings',
  subscription: '/player/subscriptions',
  tournament_team: '/player/subscriptions',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `منذ ${mins || 1} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} ساعة`
  return `منذ ${Math.floor(hrs / 24)} يوم`
}

export default function PlayerNotificationsPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setNotes(data ?? [])
      setLoading(false)

      // تحديد الكل كمقروء
      const unread = (data ?? []).filter((n) => !n.is_read).map((n) => n.id)
      if (unread.length) {
        await supabase.from('notifications').update({ is_read: true }).in('id', unread)
      }
    })
  }, [router])

  const handleTap = (n: Notification) => {
    if (n.entity_type && entityRoute[n.entity_type]) {
      router.push(entityRoute[n.entity_type])
    }
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 80 }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)', marginBottom: 4 }}>←</button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>الإشعارات</h1>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 16 }} />
          ))
        ) : notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)' }}>لا توجد إشعارات</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>ستظهر هنا إشعارات حجوزاتك واشتراكاتك</p>
          </div>
        ) : notes.map((n) => (
          <button
            key={n.id}
            onClick={() => handleTap(n)}
            style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              background: n.is_read ? 'var(--card)' : 'var(--primary-dim)',
              border: `1px solid ${n.is_read ? 'var(--border)' : 'var(--primary)'}`,
              borderRadius: 16, padding: '14px', textAlign: 'right',
              cursor: n.entity_type ? 'pointer' : 'default', width: '100%',
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{typeIcon[n.type] ?? '🔔'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{n.title_ar}</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 6px', lineHeight: 1.5 }}>{n.body_ar}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{timeAgo(n.created_at)}</p>
            </div>
            {!n.is_read && (
              <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--primary)', flexShrink: 0, marginTop: 6 }} />
            )}
          </button>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
