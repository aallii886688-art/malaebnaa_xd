'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

type FacilityPin = {
  id: string
  name: string
  city: string
  address: string | null
  latitude: number
  longitude: number
  sport_types: string[]
  price_per_hour: number | null
  is_active: boolean
}

const sportEmoji: Record<string, string> = {
  football: '⚽', futsal: '🥅', basketball: '🏀', padel: '🎾', volleyball: '🏐', tennis: '🎾', swimming: '🏊', other: '🏅',
}

export default function MapPage() {
  const router = useRouter()
  const [facilities, setFacilities] = useState<FacilityPin[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FacilityPin | null>(null)
  const [sportFilter, setSportFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('facilities')
      .select('id, name, city, address, latitude, longitude, sport_types, price_per_hour, is_active')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .then(({ data }) => { setFacilities((data ?? []) as FacilityPin[]); setLoading(false) })
  }, [])

  const filtered = facilities.filter((f) => {
    if (sportFilter && !f.sport_types.includes(sportFilter)) return false
    if (cityFilter && !f.city.includes(cityFilter)) return false
    return true
  })

  const cities = [...new Set(facilities.map((f) => f.city))].sort()
  const sports = [...new Set(facilities.flatMap((f) => f.sport_types))].sort()

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 80, display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'linear-gradient(135deg,#0F6E56,#1A9870)', padding: '52px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>استكشف</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>🗺️ خريطة الملاعب</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
            style={{ flex: 1, fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '8px 10px', outline: 'none', cursor: 'pointer' }}>
            <option value="" style={{ background: '#1a1a1a' }}>كل المدن</option>
            {cities.map((c) => <option key={c} value={c} style={{ background: '#1a1a1a' }}>{c}</option>)}
          </select>
          <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)}
            style={{ flex: 1, fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '8px 10px', outline: 'none', cursor: 'pointer' }}>
            <option value="" style={{ background: '#1a1a1a' }}>كل الرياضات</option>
            {sports.map((s) => <option key={s} value={s} style={{ background: '#1a1a1a' }}>{sportEmoji[s] ?? ''} {s}</option>)}
          </select>
        </div>
      </header>

      {/* Map placeholder - shows OpenStreetMap embed if coordinates available */}
      {!loading && filtered.length > 0 && (
        <div style={{ height: 280, background: 'var(--card)', position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)' }}>
          <iframe
            title="ملاعب"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(...filtered.map(f=>f.longitude))-0.1},${Math.min(...filtered.map(f=>f.latitude))-0.1},${Math.max(...filtered.map(f=>f.longitude))+0.1},${Math.max(...filtered.map(f=>f.latitude))+0.1}&layer=mapnik&marker=${filtered[0].latitude},${filtered[0].longitude}`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            loading="lazy"
          />
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--card)', borderRadius: 10, padding: '4px 10px', fontSize: 11, color: 'var(--text2)', border: '1px solid var(--border)' }}>
            {filtered.length} ملعب
          </div>
        </div>
      )}

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{filtered.length} ملعب متاح</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>🗺️</p>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>لا توجد ملاعب تطابق الفلتر</p>
          </div>
        ) : filtered.map((f) => (
          <div key={f.id}
            onClick={() => router.push(`/player/facilities/${f.id}`)}
            style={{ background: 'var(--card)', borderRadius: 20, border: `1.5px solid ${selected?.id === f.id ? 'var(--primary)' : 'var(--border)'}`, padding: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {f.sport_types.length > 0 ? sportEmoji[f.sport_types[0]] ?? '🏟️' : '🏟️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text2)', margin: '0 0 2px' }}>📍 {f.city}{f.address ? ` · ${f.address}` : ''}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                {f.sport_types.slice(0, 3).map((s) => sportEmoji[s] ?? s).join(' ')}
              </p>
            </div>
            <div style={{ textAlign: 'left', flexShrink: 0 }}>
              {f.price_per_hour && (
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', margin: '0 0 2px' }}>{f.price_per_hour} ر/س</p>
              )}
              <a
                href={`https://www.google.com/maps?q=${f.latitude},${f.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 11, color: 'var(--text3)', display: 'block' }}>
                🧭 اتجاهات
              </a>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
