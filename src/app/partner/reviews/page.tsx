'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Review = {
  id: string; rating: number; comment: string | null; is_visible: boolean
  created_at: string; entity_type: string; entity_id: string
  profiles: { full_name: string } | null
  entityName?: string
}

export default function PartnerReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'facilities' | 'academies'>('all')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // جلب ملاعب وأكاديميات الشريك
      const [{ data: facilities }, { data: academies }] = await Promise.all([
        supabase.from('facilities').select('id, name').eq('owner_id', user.id),
        supabase.from('academies').select('id, name').eq('owner_id', user.id),
      ])

      const facilityIds = facilities?.map((f) => f.id) ?? []
      const academyIds = academies?.map((a) => a.id) ?? []
      const nameMap: Record<string, string> = {}
      facilities?.forEach((f) => { nameMap[f.id] = f.name })
      academies?.forEach((a) => { nameMap[a.id] = a.name })

      if (facilityIds.length === 0 && academyIds.length === 0) { setLoading(false); return }

      // جلب المراجعات
      const allIds = [...facilityIds, ...academyIds]
      const { data: rawReviews } = await supabase.from('reviews')
        .select('*, profiles:user_id(full_name)')
        .in('entity_id', allIds)
        .order('created_at', { ascending: false })

      const all: Review[] = ((rawReviews ?? []) as Review[])
        .map((r) => ({ ...r, entityName: nameMap[r.entity_id] ?? '—' }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setReviews(all)
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = filter === 'all' ? reviews
    : reviews.filter((r) => (filter === 'facilities' ? r.entity_type === 'facility' : r.entity_type === 'academy'))

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—'

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>الشريك</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>التقييمات</h1>
        </div>
        {reviews.length > 0 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)', margin: 0 }}>⭐ {avgRating}</p>
            <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>{reviews.length} تقييم</p>
          </div>
        )}
      </header>

      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        {(['all', 'facilities', 'academies'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flex: 1, padding: '12px', fontSize: 12, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', color: filter === f ? 'var(--primary)' : 'var(--text2)', borderBottom: filter === f ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {f === 'all' ? 'الكل' : f === 'facilities' ? '🏟️ ملاعب' : '🏅 أكاديميات'}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          [1,2,3].map((i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>⭐</p>
            <p style={{ fontSize: 14, color: 'var(--text2)' }}>لا توجد تقييمات بعد</p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>ستظهر هنا تقييمات العملاء بعد اكتمال حجوزاتهم</p>
          </div>
        ) : filtered.map((r) => (
          <div key={r.id} style={{ background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, margin: '0 0 2px' }}>
                  {r.profiles?.full_name ?? 'مستخدم'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                  {r.entity_type === 'facility' ? '🏟️' : '🏅'} {r.entityName}
                </p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 16 }}>{'⭐'.repeat(r.rating)}</div>
                <p style={{ fontSize: 10, color: 'var(--text3)', margin: '2px 0 0', textAlign: 'right' }}>
                  {new Date(r.created_at).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </div>
            {r.comment && (
              <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                {r.comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
