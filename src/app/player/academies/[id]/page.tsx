'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'

type Academy = { id: string; name: string; city: string; phone: string | null; description: string | null; sport_types: string[]; rating: number; reviews_count: number }
type Program = { id: string; name: string; sport_type: string; coach_name: string | null; age_min: number | null; age_max: number | null; max_students: number; current_students: number; monthly_price_sar: number | null; program_price_sar: number | null; pricing_type: string; is_active: boolean }

const sportLabel: Record<string, string> = {
  football: '⚽ كرة قدم', futsal: '🥅 فوتسال', padel: '🎾 بادل', basketball: '🏀 كرة سلة',
  volleyball: '🏐 كرة طائرة', tennis: '🎾 تنس', squash: '🏸 سكواش', swimming: '🏊 سباحة', other: '🏅 أخرى',
}

export default function AcademyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [academy, setAcademy] = useState<Academy | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('academies').select('*').eq('id', id).single(),
      supabase.from('academy_programs').select('*').eq('academy_id', id).eq('is_active', true),
    ]).then(([{ data: a }, { data: p }]) => {
      setAcademy(a as Academy); setPrograms((p as Program[]) ?? []); setLoading(false)
    })
  }, [id])

  const subscribe = async (program: Program, pricingType: 'monthly' | 'program') => {
    setSubscribing(program.id); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const amount = pricingType === 'monthly' ? program.monthly_price_sar! : program.program_price_sar!
    const commission = Math.round(amount * 0.05 * 100) / 100

    const { data, error: err } = await supabase.from('academy_subscriptions').insert({
      program_id: program.id, user_id: user.id, pricing_type: pricingType,
      amount_sar: amount, commission_sar: commission, net_amount_sar: amount - commission,
      status: 'pending_payment',
    }).select('id').single()

    if (err) { setError(err.message); setSubscribing(null); return }
    setSubscribed(program.id)
    setSubscribing(null)
    router.push(`/payment?booking_id=${data.id}&amount=${amount}&facility=${encodeURIComponent(academy!.name + ' — ' + program.name)}`)
  }

  if (loading) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>جاري التحميل...</div>
  if (!academy) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>الأكاديمية غير موجودة</div>

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{academy.sport_types.map((s) => sportLabel[s]).join(' · ')}</p>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{academy.name}</h1>
        </div>
        {academy.reviews_count > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>⭐ {academy.rating}</span>}
      </header>

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 8px' }}>📍 {academy.city}</p>
          {academy.phone && <a href={`tel:+966${academy.phone}`} style={{ fontSize: 12, color: 'var(--primary)', display: 'block', marginBottom: 4, textDecoration: 'none' }}>📞 +966{academy.phone}</a>}
          {academy.description && <p style={{ fontSize: 12, color: 'var(--text2)', margin: '4px 0 0' }}>{academy.description}</p>}
        </div>

        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>البرامج التدريبية ({programs.length})</h2>

        {programs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>🏃</p><p style={{ fontSize: 13 }}>لا توجد برامج متاحة حالياً</p>
          </div>
        ) : programs.map((p) => {
          const full = p.current_students >= p.max_students
          return (
            <div key={p.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>{p.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>{sportLabel[p.sport_type]}</p>
                  {p.coach_name && <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 2px' }}>المدرب: {p.coach_name}</p>}
                  {(p.age_min || p.age_max) && <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>للأعمار {p.age_min ?? '?'} – {p.age_max ?? '?'} سنة</p>}
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: full ? 'var(--danger-dim)' : 'var(--primary-dim)', color: full ? 'var(--danger)' : 'var(--primary)' }}>
                  {full ? 'مكتمل' : `${p.max_students - p.current_students} مقعد`}
                </span>
              </div>

              <div style={{ width: '100%', background: 'var(--bg)', borderRadius: 20, height: 6, marginBottom: 12 }}>
                <div style={{ background: 'var(--primary)', height: 6, borderRadius: 20, width: `${Math.min((p.current_students / p.max_students) * 100, 100)}%` }} />
              </div>

              {!full && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {(p.pricing_type === 'monthly' || p.pricing_type === 'both') && p.monthly_price_sar && (
                    <button onClick={() => subscribe(p, 'monthly')} disabled={subscribing === p.id}
                      style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 12, padding: '10px', borderRadius: 12, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: subscribing === p.id ? 0.5 : 1 }}>
                      {subscribing === p.id ? '...' : `${p.monthly_price_sar} ر/شهر`}
                    </button>
                  )}
                  {(p.pricing_type === 'program' || p.pricing_type === 'both') && p.program_price_sar && (
                    <button onClick={() => subscribe(p, 'program')} disabled={subscribing === p.id}
                      style={{ flex: 1, border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: 12, padding: '10px', borderRadius: 12, fontWeight: 600, background: 'transparent', cursor: 'pointer', opacity: subscribing === p.id ? 0.5 : 1 }}>
                      {subscribing === p.id ? '...' : `${p.program_price_sar} ر/برنامج`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {error && <p style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>{error}</p>}
      </div>
    </div>
  )
}
