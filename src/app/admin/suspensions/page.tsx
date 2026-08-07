'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type SuspendedPlayer = {
  user_id: string
  full_name: string
  phone: string
  reliability_score: number
  no_show_count: number
  suspended_until: string
  is_active_suspension: boolean
}

export default function AdminSuspensionsPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<SuspendedPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [clearing, setClearing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('v_suspended_players').select('*').order('suspended_until', { ascending: false })
    if (filter === 'active') q = q.eq('is_active_suspension', true)
    const { data } = await q
    setPlayers((data as SuspendedPlayer[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      load()
    })
  }, [])

  useEffect(() => { load() }, [filter])

  const clearSuspension = async (targetUserId: string, name: string) => {
    if (!userId) return
    setClearing(targetUserId); setMsg('')
    const supabase = createClient()
    const { data } = await supabase.rpc('clear_player_suspension', {
      p_user_id: targetUserId,
      p_admin_id: userId,
    })
    setClearing(null)
    if (data) {
      setMsg(`✓ تم رفع التعليق عن ${name}`)
      load()
    } else {
      setMsg('فشل رفع التعليق — تأكد من صلاحياتك')
    }
    setTimeout(() => setMsg(''), 3000)
  }

  const active = players.filter(p => p.is_active_suspension).length

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>الأدمن</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>⛔ اللاعبون الموقوفون</h1>
        </div>
      </header>

      {/* KPI */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 2px' }}>موقوف حالياً</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: active > 0 ? 'var(--danger)' : 'var(--primary)', margin: 0 }}>{active}</p>
          </div>
          <span style={{ fontSize: 40 }}>{active > 0 ? '🚫' : '✅'}</span>
        </div>
      </div>

      {msg && (
        <div style={{ margin: '10px 16px 0', padding: '10px 14px', borderRadius: 12, background: msg.startsWith('✓') ? 'var(--primary-dim)' : 'var(--danger-dim)', color: msg.startsWith('✓') ? 'var(--primary)' : 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
          {msg}
        </div>
      )}

      {/* فلتر */}
      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)', marginTop: 16 }}>
        {(['active', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: filter === f ? 'var(--primary)' : 'var(--text2)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {f === 'active' ? '⛔ الموقوفون الآن' : '📋 الكل (تاريخي)'}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : players.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>✅</p>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>
              {filter === 'active' ? 'لا يوجد لاعبون موقوفون حالياً' : 'لا يوجد سجل تعليق'}
            </p>
          </div>
        ) : players.map(p => {
          const scoreColor = p.reliability_score >= 70 ? 'var(--primary)' : p.reliability_score >= 40 ? '#f59e0b' : 'var(--danger)'
          return (
            <div key={p.user_id} style={{ background: 'var(--card)', borderRadius: 18, border: `1px solid ${p.is_active_suspension ? 'var(--danger)' : 'var(--border)'}`, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, margin: '0 0 3px' }}>{p.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }} dir="ltr">{p.phone}</p>
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  background: p.is_active_suspension ? 'var(--danger-dim)' : 'var(--bg)',
                  color: p.is_active_suspension ? 'var(--danger)' : 'var(--text3)',
                  fontWeight: 700,
                }}>
                  {p.is_active_suspension ? '⛔ موقوف' : 'منتهي التعليق'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: scoreColor, margin: '0 0 2px' }}>{p.reliability_score}</p>
                  <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>الموثوقية</p>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)', margin: '0 0 2px' }}>{p.no_show_count}</p>
                  <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>غياب</p>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', margin: '0 0 2px' }}>
                    {new Date(p.suspended_until).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>حتى</p>
                </div>
              </div>

              {p.is_active_suspension && (
                <button
                  onClick={() => clearSuspension(p.user_id, p.full_name)}
                  disabled={clearing === p.user_id}
                  style={{ width: '100%', padding: '9px', borderRadius: 12, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: clearing === p.user_id ? 0.5 : 1 }}>
                  {clearing === p.user_id ? 'جاري الرفع...' : '✓ رفع التعليق وإعادة تعيين الغياب'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
