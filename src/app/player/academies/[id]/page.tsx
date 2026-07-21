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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>
  if (!academy) return <div className="min-h-screen flex items-center justify-center text-red-500">الأكاديمية غير موجودة</div>

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div className="flex-1">
          <p className="text-xs opacity-80">{academy.sport_types.map((s) => sportLabel[s]).join(' · ')}</p>
          <h1 className="text-base font-bold">{academy.name}</h1>
        </div>
        {academy.reviews_count > 0 && <span className="text-sm font-bold">⭐ {academy.rating}</span>}
      </header>

      <div className="px-4 py-4 space-y-4 pb-10">
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-2">
          <p className="text-sm text-[#6B7280]">📍 {academy.city}</p>
          {academy.phone && <a href={`tel:+966${academy.phone}`} className="text-xs text-[#0F6E56]">📞 +966{academy.phone}</a>}
          {academy.description && <p className="text-xs text-[#6B7280] pt-1">{academy.description}</p>}
        </div>

        <h2 className="text-sm font-bold text-[#1A1A1A]">البرامج التدريبية ({programs.length})</h2>

        {programs.length === 0 ? (
          <div className="text-center py-10 text-[#6B7280]">
            <p className="text-4xl mb-2">🏃</p><p className="text-sm">لا توجد برامج متاحة حالياً</p>
          </div>
        ) : programs.map((p) => {
          const full = p.current_students >= p.max_students
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-[#1A1A1A]">{p.name}</p>
                  <p className="text-xs text-[#6B7280]">{sportLabel[p.sport_type]}</p>
                  {p.coach_name && <p className="text-xs text-[#9CA3AF]">المدرب: {p.coach_name}</p>}
                  {(p.age_min || p.age_max) && <p className="text-xs text-[#9CA3AF]">للأعمار {p.age_min ?? '?'} – {p.age_max ?? '?'} سنة</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${full ? 'bg-red-50 text-red-500' : 'bg-[#E8F5F1] text-[#0F6E56]'}`}>
                  {full ? 'مكتمل' : `${p.max_students - p.current_students} مقعد`}
                </span>
              </div>

              <div className="w-full bg-[#F8F9FA] rounded-full h-1.5 mb-3">
                <div className="bg-[#0F6E56] h-1.5 rounded-full" style={{ width: `${Math.min((p.current_students / p.max_students) * 100, 100)}%` }} />
              </div>

              {!full && (
                <div className="flex gap-2">
                  {(p.pricing_type === 'monthly' || p.pricing_type === 'both') && p.monthly_price_sar && (
                    <button onClick={() => subscribe(p, 'monthly')} disabled={subscribing === p.id}
                      className="flex-1 bg-[#0F6E56] text-white text-xs py-2.5 rounded-xl font-medium disabled:opacity-50">
                      {subscribing === p.id ? '...' : `${p.monthly_price_sar} ر/شهر`}
                    </button>
                  )}
                  {(p.pricing_type === 'program' || p.pricing_type === 'both') && p.program_price_sar && (
                    <button onClick={() => subscribe(p, 'program')} disabled={subscribing === p.id}
                      className="flex-1 border border-[#0F6E56] text-[#0F6E56] text-xs py-2.5 rounded-xl font-medium disabled:opacity-50">
                      {subscribing === p.id ? '...' : `${p.program_price_sar} ر/برنامج`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
      </div>
    </div>
  )
}
