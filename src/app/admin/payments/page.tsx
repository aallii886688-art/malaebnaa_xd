'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Payment = {
  id: number
  booking_date: string
  start_time: string
  end_time: string
  total_price: number
  status: string
  deposit_amount: number | null
  deposit_status: string | null
  payment_ref: string | null
  created_at: string
  field_name: string
  facility_name: string
  facility_city: string
  player_name: string
  player_phone: string
}

type ExpirySettings = { id?: string; payment_expiry_minutes: number }

const statusInfo: Record<string, { label: string; color: string; bg: string }> = {
  confirmed:  { label: 'مؤكد',    color: 'var(--primary)', bg: 'var(--primary-dim)' },
  pending:    { label: 'معلق',    color: '#f59e0b',         bg: 'rgba(245,158,11,0.1)' },
  cancelled:  { label: 'ملغى',   color: 'var(--danger)',   bg: 'var(--danger-dim)' },
  completed:  { label: 'مكتمل',  color: 'var(--text2)',    bg: 'var(--bg)' },
}

const depositInfo: Record<string, { label: string; color: string }> = {
  paid:      { label: 'مدفوع',    color: 'var(--primary)' },
  pending:   { label: 'معلق',     color: '#f59e0b' },
  forfeited: { label: 'محجوز',   color: 'var(--danger)' },
  refunded:  { label: 'مسترد',   color: 'var(--text2)' },
}

type FilterKey = 'all' | 'confirmed' | 'pending' | 'cancelled'

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<ExpirySettings>({ payment_expiry_minutes: 60 })
  const [inputValue, setInputValue] = useState('60')
  const [unit, setUnit] = useState<'minutes' | 'hours'>('minutes')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPayments()
    loadSettings()
  }, [])

  const loadPayments = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('bookings')
      .select(`
        id, booking_date, start_time, end_time, total_price, status,
        deposit_amount, deposit_status, payment_ref, created_at,
        fields!field_id(name, facilities!facility_id(name, city)),
        profiles:user_id(name, phone)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    const rows: Payment[] = (data ?? []).map((b: Record<string, unknown>) => {
      const field = Array.isArray(b.fields) ? b.fields[0] : b.fields as Record<string, unknown> | null
      const fac = field && Array.isArray((field as Record<string,unknown>).facilities)
        ? ((field as Record<string,unknown>).facilities as Record<string,unknown>[])[0]
        : (field as Record<string,unknown>)?.facilities as Record<string,unknown> | null
      const prof = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles as Record<string, unknown> | null
      return {
        id: b.id as number,
        booking_date: b.booking_date as string,
        start_time: (b.start_time as string)?.slice(0, 5) ?? '',
        end_time:   (b.end_time   as string)?.slice(0, 5) ?? '',
        total_price:    (b.total_price    as number) ?? 0,
        status:         b.status         as string,
        deposit_amount: b.deposit_amount  as number | null,
        deposit_status: b.deposit_status  as string | null,
        payment_ref:    b.payment_ref     as string | null,
        created_at:     b.created_at      as string,
        field_name:     (field as Record<string,unknown>)?.name    as string ?? '—',
        facility_name:  fac?.name    as string ?? '—',
        facility_city:  fac?.city    as string ?? '',
        player_name:    prof?.name   as string ?? '—',
        player_phone:   prof?.phone  as string ?? '',
      }
    })
    setPayments(rows)
    setLoading(false)
  }

  const loadSettings = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('settlement_settings').select('id, payment_expiry_minutes').limit(1).single()
    if (data) {
      setSettings(data as ExpirySettings)
      const m = (data as ExpirySettings).payment_expiry_minutes
      if (m % 60 === 0) { setUnit('hours'); setInputValue(String(m / 60)) }
      else { setUnit('minutes'); setInputValue(String(m)) }
    }
  }

  const saveSettings = async () => {
    const num = parseInt(inputValue)
    if (!num || num <= 0) return
    const minutes = unit === 'hours' ? num * 60 : num
    setSaving(true)
    const supabase = createClient()
    const payload = { payment_expiry_minutes: minutes }
    if (settings.id) await supabase.from('settlement_settings').update(payload).eq('id', settings.id)
    else await supabase.from('settlement_settings').insert(payload)
    setSettings(s => ({ ...s, ...payload }))
    setSaving(false); setShowSettings(false)
  }

  const filtered = payments.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return p.player_name.toLowerCase().includes(q) ||
        p.facility_name.toLowerCase().includes(q) ||
        p.player_phone.includes(q) ||
        (p.payment_ref ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const totalRevenue   = payments.filter(p => p.status === 'confirmed' || p.status === 'completed').reduce((s, p) => s + p.total_price, 0)
  const pendingRevenue = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.total_price, 0)
  const confirmedCount = payments.filter(p => p.status === 'confirmed' || p.status === 'completed').length
  const pendingCount   = payments.filter(p => p.status === 'pending').length
  const cancelledCount = payments.filter(p => p.status === 'cancelled').length

  const displayExpiry = () => {
    const m = settings.payment_expiry_minutes
    if (m % 60 === 0) return `${m / 60} ${m/60 === 1 ? 'ساعة' : 'ساعات'}`
    return `${m} دقيقة`
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>الأدمن</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>💳 المدفوعات</h1>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '7px 12px', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
          ⚙️ مهلة الدفع: {displayExpiry()}
        </button>
      </header>

      {/* KPIs */}
      <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'الإيرادات', val: `${totalRevenue.toLocaleString('ar-SA')} ر`, color: 'var(--primary)' },
          { label: 'معلقة', val: `${pendingRevenue.toLocaleString()} ر`, color: '#f59e0b' },
          { label: 'الحجوزات', val: `${confirmedCount}/${pendingCount}/${cancelledCount}`, color: 'var(--text)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: '12px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: k.color, margin: '0 0 2px', fontVariantNumeric: 'tabular-nums' }}>{k.val}</p>
            <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* بحث */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 12px', gap: 8 }}>
          <span style={{ color: 'var(--text3)' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الملعب، الهاتف، رقم الدفع..."
            style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 0', fontSize: 13, outline: 'none', color: 'var(--text)' }} />
        </div>
      </div>

      {/* فلتر */}
      <div style={{ display: 'flex', padding: '10px 16px 0', gap: 8, overflowX: 'auto' }}>
        {(['all', 'confirmed', 'pending', 'cancelled'] as FilterKey[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: filter === f ? 'var(--primary)' : 'var(--card)', color: filter === f ? 'var(--primary-fg)' : 'var(--text2)' }}>
            {f === 'all' ? `الكل (${payments.length})` : f === 'confirmed' ? `مؤكد (${confirmedCount})` : f === 'pending' ? `معلق (${pendingCount})` : `ملغى (${cancelledCount})`}
          </button>
        ))}
      </div>

      {/* القائمة */}
      <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          [1,2,3,4].map(i => <div key={i} style={{ height: 100, borderRadius: 16, background: 'var(--card)', animation: 'pulse 1.5s infinite' }} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 40 }}>📭</p>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>لا توجد نتائج</p>
          </div>
        ) : filtered.map(p => {
          const st = statusInfo[p.status] ?? { label: p.status, color: 'var(--text2)', bg: 'var(--bg)' }
          const dep = p.deposit_status ? depositInfo[p.deposit_status] : null
          return (
            <div key={p.id} style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 14 }}>
              {/* Row 1: اسم اللاعب + الحالة + المبلغ */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, margin: '0 0 1px' }}>{p.player_name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }} dir="ltr">{p.player_phone}</p>
                </div>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{p.total_price} ر</p>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 700 }}>{st.label}</span>
                </div>
              </div>

              {/* Row 2: الملعب والتاريخ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
                <span>🏟️ {p.facility_name} — {p.field_name}</span>
                <span>📍 {p.facility_city}</span>
                <span>📅 {new Date(p.booking_date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span>🕐 {p.start_time} – {p.end_time}</span>
              </div>

              {/* Row 3: العربون + رقم الدفع */}
              {(p.deposit_amount || p.payment_ref) && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 6 }}>
                  {p.deposit_amount != null && (
                    <span style={{ fontSize: 11, color: dep?.color ?? 'var(--text2)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 10 }}>
                      🔒 عربون {p.deposit_amount} ر — {dep?.label ?? p.deposit_status}
                    </span>
                  )}
                  {p.payment_ref && (
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }} dir="ltr">#{p.payment_ref.slice(-10)}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom sheet: إعدادات مهلة الدفع */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 60 }}
          onClick={() => setShowSettings(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '24px 24px 0 0', padding: '20px 16px 40px', width: '100%', boxSizing: 'border-box' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />
            <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, margin: '0 0 6px' }}>⏱️ مهلة الإلغاء التلقائي</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 16px' }}>المدفوعات غير المؤكدة تُلغى تلقائياً بعد هذه المهلة ويُرسل إشعار واتساب</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input type="number" min={1} value={inputValue} onChange={e => setInputValue(e.target.value)}
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none', background: 'var(--bg)', color: 'var(--text)' }} dir="ltr" />
              <select value={unit} onChange={e => setUnit(e.target.value as 'minutes' | 'hours')}
                style={{ width: 100, border: '1px solid var(--border)', borderRadius: 12, padding: '10px', fontSize: 13, outline: 'none', background: 'var(--bg)', color: 'var(--text)' }}>
                <option value="minutes">دقيقة</option>
                <option value="hours">ساعة</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveSettings} disabled={saving}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '13px', borderRadius: 16, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={() => setShowSettings(false)}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '13px', borderRadius: 16, fontSize: 14, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
