'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type FacilityRevenue = {
  facility_id: number
  facility_name: string
  owner_name: string
  city: string
  booking_count: number
  total_revenue: number
  commission_rate: number
  commission_amount: number
  net_to_partner: number
}

type PeriodKey = '7d' | '30d' | '90d' | 'all'

export default function AdminCommissionsPage() {
  const router = useRouter()
  const [data, setData] = useState<FacilityRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodKey>('30d')
  const [commissionRate, setCommissionRate] = useState(10) // % افتراضي
  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState('10')

  useEffect(() => { load() }, [period])

  const load = async () => {
    setLoading(true)
    const supabase = createClient()

    // جلب نسبة العمولة من launch_settings إن وجدت
    const { data: settings } = await supabase
      .from('launch_settings')
      .select('commission_percent')
      .limit(1)
      .single()
    const rate = (settings as Record<string,unknown> | null)?.commission_percent as number ?? commissionRate
    setCommissionRate(rate); setRateInput(String(rate))

    // تحديد نطاق التاريخ
    const now = new Date()
    let fromDate: string | null = null
    if (period === '7d')  fromDate = new Date(now.getTime() - 7*86400000).toISOString().slice(0,10)
    if (period === '30d') fromDate = new Date(now.getTime() - 30*86400000).toISOString().slice(0,10)
    if (period === '90d') fromDate = new Date(now.getTime() - 90*86400000).toISOString().slice(0,10)

    // جلب الحجوزات المؤكدة مع بيانات الملعب والمالك
    let q = supabase
      .from('bookings')
      .select(`
        total_price, field_id,
        fields!field_id(name, facility_id,
          facilities!facility_id(id, name, city, owner_id,
            profiles:owner_id(name)
          )
        )
      `)
      .in('status', ['confirmed', 'completed'])
    if (fromDate) q = q.gte('booking_date', fromDate)

    const { data: bookings } = await q

    // تجميع حسب الملعب (facility)
    const map: Record<number, FacilityRevenue> = {}
    ;(bookings ?? []).forEach((b: Record<string,unknown>) => {
      const field = Array.isArray(b.fields) ? b.fields[0] : b.fields as Record<string,unknown> | null
      const fac = field && (Array.isArray((field as Record<string,unknown>).facilities)
        ? ((field as Record<string,unknown>).facilities as Record<string,unknown>[])[0]
        : (field as Record<string,unknown>).facilities) as Record<string,unknown> | null
      if (!fac) return
      const facId = fac.id as number
      const prof = Array.isArray(fac.profiles) ? fac.profiles[0] : fac.profiles as Record<string,unknown> | null
      if (!map[facId]) {
        map[facId] = {
          facility_id:  facId,
          facility_name: fac.name as string ?? '—',
          owner_name:   prof?.name as string ?? '—',
          city:         fac.city as string ?? '',
          booking_count: 0, total_revenue: 0,
          commission_rate: rate, commission_amount: 0, net_to_partner: 0,
        }
      }
      const amount = b.total_price as number ?? 0
      map[facId].booking_count++
      map[facId].total_revenue += amount
    })

    // حساب العمولات
    const rows = Object.values(map).map(r => ({
      ...r,
      commission_amount: Math.round(r.total_revenue * rate / 100 * 100) / 100,
      net_to_partner:    Math.round(r.total_revenue * (1 - rate/100) * 100) / 100,
    })).sort((a, b) => b.total_revenue - a.total_revenue)

    setData(rows)
    setLoading(false)
  }

  const saveRate = async () => {
    const num = parseFloat(rateInput)
    if (!num || num < 0 || num > 100) return
    const supabase = createClient()
    await supabase.from('launch_settings').update({ commission_percent: num }).neq('id', 0)
    setCommissionRate(num); setEditingRate(false)
    load()
  }

  const totalRevenue    = data.reduce((s, r) => s + r.total_revenue, 0)
  const totalCommission = data.reduce((s, r) => s + r.commission_amount, 0)
  const totalNet        = data.reduce((s, r) => s + r.net_to_partner, 0)
  const totalBookings   = data.reduce((s, r) => s + r.booking_count, 0)

  const periodLabels: Record<PeriodKey, string> = { '7d': '7 أيام', '30d': '30 يوم', '90d': '90 يوم', all: 'الكل' }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>الأدمن</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>💰 العمولات</h1>
          </div>
        </div>
        <button onClick={() => setEditingRate(true)}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '7px 12px', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
          نسبة العمولة: {commissionRate}%
        </button>
      </header>

      {/* KPIs */}
      <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'إجمالي الإيراد', val: totalRevenue.toLocaleString('ar-SA') + ' ر', color: 'var(--primary)' },
          { label: 'عمولة المنصة', val: totalCommission.toLocaleString('ar-SA') + ' ر', color: '#f59e0b' },
          { label: 'صافي الشركاء', val: totalNet.toLocaleString('ar-SA') + ' ر', color: 'var(--text)' },
          { label: 'الحجوزات', val: totalBookings.toString(), color: 'var(--text)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: '14px 12px' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: k.color, margin: '0 0 2px', fontVariantNumeric: 'tabular-nums' }}>{k.val}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* فلتر الفترة */}
      <div style={{ display: 'flex', padding: '12px 16px 0', gap: 8 }}>
        {(['7d','30d','90d','all'] as PeriodKey[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ flex: 1, padding: '7px 4px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: period === p ? 'var(--primary)' : 'var(--card)', color: period === p ? 'var(--primary-fg)' : 'var(--text2)' }}>
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* جدول العمولات */}
      <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          [1,2,3].map(i => <div key={i} style={{ height: 110, borderRadius: 16, background: 'var(--card)' }} />)
        ) : data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 40 }}>📊</p>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>لا توجد بيانات لهذه الفترة</p>
          </div>
        ) : data.map(r => (
          <div key={r.facility_id} style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 14 }}>
            {/* الاسم */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, margin: '0 0 1px' }}>{r.facility_name}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{r.owner_name} · {r.city}</p>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--bg)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
                {r.booking_count} حجز
              </span>
            </div>

            {/* الأرقام */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { label: 'الإيراد الكلي', val: r.total_revenue.toLocaleString('ar-SA'), color: 'var(--primary)' },
                { label: `عمولة ${r.commission_rate}%`, val: r.commission_amount.toLocaleString('ar-SA'), color: '#f59e0b' },
                { label: 'صافي الشريك', val: r.net_to_partner.toLocaleString('ar-SA'), color: 'var(--text2)' },
              ].map(c => (
                <div key={c.label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: c.color, margin: '0 0 2px', fontVariantNumeric: 'tabular-nums' }}>{c.val}</p>
                  <p style={{ fontSize: 9, color: 'var(--text3)', margin: 0 }}>{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom sheet: تعديل نسبة العمولة */}
      {editingRate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 60 }}
          onClick={() => setEditingRate(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '24px 24px 0 0', padding: '20px 16px 40px', width: '100%', boxSizing: 'border-box' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />
            <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, margin: '0 0 6px' }}>💰 نسبة عمولة المنصة</h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 16px' }}>النسبة تُطبق على كل حجز مؤكد</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
              <input type="number" min={0} max={100} step={0.5} value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 12, padding: '12px', fontSize: 18, fontWeight: 700, outline: 'none', background: 'var(--bg)', color: 'var(--text)', textAlign: 'center' }} dir="ltr" />
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text3)' }}>%</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveRate}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '13px', borderRadius: 16, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                حفظ النسبة
              </button>
              <button onClick={() => setEditingRate(false)}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '13px', borderRadius: 16, fontSize: 14, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
