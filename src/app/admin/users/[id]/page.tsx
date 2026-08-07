'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { logActivity } from '@/lib/logActivity'

type Profile = { id: string; full_name: string; phone: string; city: string | null; is_active: boolean; created_at: string; avatar_url: string | null }
type Booking = { id: string; booking_date: string; status: string; total_amount_sar: number; facilities: { name: string } | null }
type Subscription = { id: string; status: string; amount_sar: number; academy_programs: { name: string; academies: { name: string } | null } | null }
type TeamReg = { id: string; team_name: string; status: string; tournaments: { name: string } | null }

const statusLabel: Record<string, string> = {
  confirmed: 'مؤكد', pending_payment: 'انتظار الدفع', cancelled: 'ملغي', completed: 'مكتمل',
  active: 'نشط', expired: 'منتهي', pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض',
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [subs, setSubs] = useState<Subscription[]>([])
  const [teams, setTeams] = useState<TeamReg[]>([])
  const [tab, setTab] = useState<'bookings' | 'academies' | 'tournaments'>('bookings')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const [{ data: p }, { data: b }, { data: s }, { data: t }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('bookings').select('*, facilities(name)').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('academy_subscriptions').select('*, academy_programs(name, academies(name))').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('tournament_teams').select('*, tournaments(name)').eq('captain_user_id', id).order('created_at', { ascending: false }).limit(20),
      ])

      setProfile(p as Profile)
      setBookings((b as Booking[]) ?? [])
      setSubs((s as Subscription[]) ?? [])
      setTeams((t as TeamReg[]) ?? [])
      setLoading(false)
    })
  }, [id, router])

  const toggleActive = async () => {
    if (!profile) return
    setToggling(true)
    const supabase = createClient()
    const newVal = !profile.is_active
    await supabase.from('profiles').update({ is_active: newVal }).eq('id', id)
    await logActivity({ action: 'user_' + (newVal ? 'activated' : 'deactivated'), entity_type: 'user', entity_id: id })
    setProfile({ ...profile, is_active: newVal })
    setToggling(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', padding: '80px 16px' }}>
      {[1,2,3].map((i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 12 }} />)}
    </div>
  )

  if (!profile) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>مستخدم غير موجود</div>
  )

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 40 }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)', marginBottom: 8 }}>←</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>{profile.full_name}</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>{profile.phone} {profile.city ? `· ${profile.city}` : ''}</p>
          </div>
          <button onClick={toggleActive} disabled={toggling}
            style={{
              fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: profile.is_active ? 'var(--danger-dim)' : 'var(--primary-dim)',
              color: profile.is_active ? 'var(--danger)' : 'var(--primary)',
            }}>
            {toggling ? '...' : profile.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: profile.is_active ? 'var(--primary-dim)' : 'var(--danger-dim)', color: profile.is_active ? 'var(--primary)' : 'var(--danger)', fontWeight: 700 }}>
            {profile.is_active ? 'نشط' : 'موقوف'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', padding: '3px 0' }}>
            انضم {new Date(profile.created_at).toLocaleDateString('ar-SA')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
          {(['bookings', 'academies', 'tournaments'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent', color: tab === t ? 'var(--primary)' : 'var(--text3)', borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent' }}>
              {t === 'bookings' ? `الحجوزات (${bookings.length})` : t === 'academies' ? `الأكاديميات (${subs.length})` : `البطولات (${teams.length})`}
            </button>
          ))}
        </div>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tab === 'bookings' && (bookings.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px 0' }}>لا توجد حجوزات</p>
        ) : bookings.map((b) => (
          <div key={b.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{b.facilities?.name ?? '—'}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{b.booking_date}</p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{b.total_amount_sar} ر</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{statusLabel[b.status] ?? b.status}</p>
            </div>
          </div>
        )))}

        {tab === 'academies' && (subs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px 0' }}>لا توجد اشتراكات</p>
        ) : subs.map((s) => (
          <div key={s.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{s.academy_programs?.name ?? '—'}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{s.academy_programs?.academies?.name}</p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{s.amount_sar} ر</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{statusLabel[s.status] ?? s.status}</p>
            </div>
          </div>
        )))}

        {tab === 'tournaments' && (teams.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px 0' }}>لا توجد تسجيلات</p>
        ) : teams.map((t) => (
          <div key={t.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{t.team_name}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{t.tournaments?.name}</p>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{statusLabel[t.status] ?? t.status}</p>
          </div>
        )))}
      </div>
    </div>
  )
}
