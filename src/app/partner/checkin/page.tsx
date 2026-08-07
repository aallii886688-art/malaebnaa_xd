'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Facility = { id: number; name: string }
type CheckinResult = {
  success: boolean
  reason?: string
  booking_id?: number
  player_name?: string
  player_phone?: string
  checked_in_at?: string
}

export default function PartnerCheckinPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedFacility, setSelectedFacility] = useState<number | null>(null)
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayBookings, setTodayBookings] = useState<{ checkin_code: string; player_name: string; player_phone: string; checked_in_at: string | null; status: string }[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // ملاعب يملكها أو موظف فيها
      const [{ data: owned }, { data: staffed }] = await Promise.all([
        supabase.from('facilities').select('id, name').eq('owner_id', user.id).eq('is_active', true),
        supabase.from('facility_staff').select('facility_id, facilities!facility_id(id, name)').eq('user_id', user.id).eq('is_active', true),
      ])

      const ownedList = (owned ?? []) as Facility[]
      const staffedList = ((staffed ?? []) as { facilities: Facility | null }[]).map(s => s.facilities).filter(Boolean) as Facility[]

      const merged = [...ownedList, ...staffedList].filter((f, i, arr) => arr.findIndex(x => x.id === f.id) === i)
      setFacilities(merged)
      if (merged.length > 0) setSelectedFacility(merged[0].id)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!selectedFacility) return
    loadTodayBookings()
  }, [selectedFacility])

  const loadTodayBookings = async () => {
    if (!selectedFacility) return
    setLoadingBookings(true)
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('v_today_checkins')
      .select('checkin_code, player_name, player_phone, checked_in_at, status')
      .eq('facility_id', selectedFacility)
      .eq('booking_date', today)
      .order('checked_in_at', { ascending: false })
    setTodayBookings((data ?? []) as typeof todayBookings)
    setLoadingBookings(false)
  }

  const scan = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed || !selectedFacility || !userId) return
    setScanning(true)
    setResult(null)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('scan_checkin_code', {
      p_code: trimmed,
      p_facility_id: selectedFacility,
      p_staff_id: userId,
    })
    setScanning(false)
    if (error) { setResult({ success: false, reason: 'server_error' }); return }
    const res = data as CheckinResult
    setResult(res)
    if (res.success) {
      setCode('')
      loadTodayBookings()
    }
    inputRef.current?.focus()
  }

  const reasonLabel: Record<string, string> = {
    not_found:        'الكود غير موجود أو الحجز غير مؤكد',
    wrong_date:       'هذا الكود لحجز في يوم آخر',
    already_checked_in: 'تم تسجيل الدخول مسبقاً',
    unauthorized:     'ليس لديك صلاحية على هذا الملعب',
    server_error:     'حدث خطأ في الخادم',
  }

  if (loading) return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text3)' }}>جاري التحميل...</p>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh', paddingBottom: 40 }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg,#0F6E56,#1A9870)', padding: '52px 16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>الشريك</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>🎫 تسجيل الدخول</h1>
        </div>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* اختيار الملعب */}
        {facilities.length > 1 && (
          <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 6px' }}>الملعب</p>
            <select
              value={selectedFacility ?? ''}
              onChange={(e) => setSelectedFacility(Number(e.target.value))}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 14, outline: 'none', background: 'var(--bg)', color: 'var(--text)' }}
            >
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}

        {facilities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🏟️</p>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>لا توجد ملاعب مرتبطة بحسابك</p>
          </div>
        )}

        {selectedFacility && (
          <>
            {/* كود الدخول */}
            <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>أدخل كود الحجز</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={inputRef}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setResult(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && scan()}
                  placeholder="XXXXXX"
                  maxLength={6}
                  dir="ltr"
                  autoFocus
                  style={{
                    flex: 1, border: '2px solid var(--border)', borderRadius: 14, padding: '14px 16px',
                    fontSize: 28, fontWeight: 800, textAlign: 'center', letterSpacing: 6,
                    outline: 'none', background: 'var(--bg)', color: 'var(--text)',
                    textTransform: 'uppercase',
                  }}
                />
              </div>
              <button
                onClick={scan}
                disabled={scanning || code.trim().length < 4}
                style={{
                  marginTop: 12, width: '100%', padding: '14px', borderRadius: 14,
                  background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none',
                  fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  opacity: (scanning || code.trim().length < 4) ? 0.5 : 1,
                }}
              >
                {scanning ? 'جاري التحقق...' : '✓ تحقق وسجّل الدخول'}
              </button>
            </div>

            {/* نتيجة الفحص */}
            {result && (
              <div style={{
                borderRadius: 20, border: `2px solid ${result.success ? 'var(--primary)' : 'var(--danger)'}`,
                background: result.success ? 'var(--primary-dim)' : 'var(--danger-dim)',
                padding: 20, textAlign: 'center',
              }}>
                <p style={{ fontSize: 48, margin: '0 0 8px' }}>{result.success ? '✅' : '❌'}</p>
                {result.success ? (
                  <>
                    <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', margin: '0 0 4px' }}>تم تسجيل الدخول!</p>
                    <p style={{ fontSize: 15, color: 'var(--text)', fontWeight: 700, margin: '0 0 4px' }}>{result.player_name}</p>
                    <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }} dir="ltr">{result.player_phone}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                      {new Date(result.checked_in_at!).toLocaleTimeString('ar-SA')}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)', margin: '0 0 4px' }}>فشل التحقق</p>
                    <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>
                      {reasonLabel[result.reason ?? ''] ?? result.reason}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* حجوزات اليوم */}
            <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  حجوزات اليوم ({todayBookings.length})
                </p>
                <button onClick={loadTodayBookings} style={{ fontSize: 11, color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  تحديث
                </button>
              </div>
              {loadingBookings ? (
                <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>جاري التحميل...</p>
              ) : todayBookings.length === 0 ? (
                <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>لا توجد حجوزات اليوم</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todayBookings.map((b, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'var(--bg)', borderRadius: 12,
                      borderRight: `3px solid ${b.checked_in_at ? 'var(--primary)' : 'var(--border)'}`,
                    }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{b.player_name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }} dir="ltr">{b.player_phone}</p>
                      </div>
                      <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: 2,
                          color: 'var(--primary)', fontFamily: 'monospace',
                          background: 'var(--primary-dim)', padding: '2px 6px', borderRadius: 6,
                        }}>{b.checkin_code}</span>
                        {b.checked_in_at ? (
                          <span style={{ fontSize: 10, color: 'var(--primary)' }}>
                            ✓ {new Date(b.checked_in_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>لم يحضر بعد</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
