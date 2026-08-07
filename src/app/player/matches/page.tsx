'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

type OpenMatch = {
  id: string
  title: string
  sport_type: string
  city: string
  venue: string | null
  match_date: string
  match_time: string | null
  slots_total: number
  slots_filled: number
  skill_level: string | null
  notes: string | null
  created_by: string
  profiles: { full_name: string } | null
}

const sportEmoji: Record<string, string> = {
  football: '⚽', futsal: '🥅', basketball: '🏀', padel: '🎾', volleyball: '🏐', other: '🏅',
}

const skillLabel: Record<string, string> = {
  beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم',
}

const defaultForm = { title: '', sport_type: 'football', city: '', venue: '', match_date: '', match_time: '', slots_total: '10', skill_level: '', notes: '' }

export default function PlayerMatchesPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<OpenMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [cityFilter, setCityFilter] = useState('')

  const load = async (uid: string) => {
    const supabase = createClient()
    const [{ data: m }, { data: j }] = await Promise.all([
      supabase.from('open_matches')
        .select('*, profiles(full_name)')
        .gt('match_date', new Date().toISOString().slice(0, 10))
        .order('match_date'),
      supabase.from('match_players').select('match_id').eq('user_id', uid),
    ])
    setMatches((m ?? []) as unknown as OpenMatch[])
    setJoinedIds(new Set((j ?? []).map((x: { match_id: string }) => x.match_id)))
    setLoading(false)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      load(user.id)
    })
  }, [router])

  const joinMatch = async (matchId: string, slotsFilled: number, slotsTotal: number) => {
    if (!userId || slotsFilled >= slotsTotal) return
    setJoiningId(matchId)
    const supabase = createClient()
    await supabase.from('match_players').insert({ match_id: matchId, user_id: userId })
    await supabase.from('open_matches').update({ slots_filled: slotsFilled + 1 }).eq('id', matchId)
    setJoinedIds((prev) => new Set([...prev, matchId]))
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, slots_filled: m.slots_filled + 1 } : m))
    setJoiningId(null)
  }

  const leaveMatch = async (matchId: string, slotsFilled: number) => {
    if (!userId) return
    setJoiningId(matchId)
    const supabase = createClient()
    await supabase.from('match_players').delete().eq('match_id', matchId).eq('user_id', userId)
    await supabase.from('open_matches').update({ slots_filled: Math.max(0, slotsFilled - 1) }).eq('id', matchId)
    setJoinedIds((prev) => { const s = new Set(prev); s.delete(matchId); return s })
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, slots_filled: Math.max(0, m.slots_filled - 1) } : m))
    setJoiningId(null)
  }

  const createMatch = async () => {
    if (!form.title.trim() || !form.city.trim() || !form.match_date || !userId) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('open_matches').insert({
      title: form.title, sport_type: form.sport_type, city: form.city,
      venue: form.venue || null, match_date: form.match_date,
      match_time: form.match_time || null, slots_total: +form.slots_total,
      slots_filled: 1, skill_level: form.skill_level || null,
      notes: form.notes || null, created_by: userId,
    }).select('id').single()
    if (data?.id) {
      await supabase.from('match_players').insert({ match_id: data.id, user_id: userId })
      setJoinedIds((prev) => new Set([...prev, data.id]))
    }
    setShowCreate(false); setForm(defaultForm)
    await load(userId); setSaving(false)
  }

  const filtered = matches.filter((m) => !cityFilter || m.city.includes(cityFilter))

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', boxSizing: 'border-box' as const }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 80 }}>
      <header style={{ background: 'linear-gradient(135deg,#1a2e4d,#2d4a7f)', padding: '52px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>المجتمع</p>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>⚡ أكمل الفريق</h1>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)}
            style={{ fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 600 }}>
            + مباراة
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '8px 14px' }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
            placeholder="ابحث بالمدينة..."
            style={{ flex: 1, fontSize: 13, outline: 'none', background: 'transparent', color: '#fff', border: 'none' }} />
        </div>
      </header>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontSize: 48, marginBottom: 8 }}>⚽</p>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>لا توجد مباريات قادمة</p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>كن أول من يُنشئ مباراة في مدينتك!</p>
          </div>
        ) : filtered.map((m) => {
          const joined = joinedIds.has(m.id)
          const full = m.slots_filled >= m.slots_total
          const fillPct = Math.min((m.slots_filled / m.slots_total) * 100, 100)
          return (
            <div key={m.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 20 }}>{sportEmoji[m.sport_type] ?? '🏅'}</span>
                    <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, margin: 0 }}>{m.title}</p>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 2px' }}>
                    📍 {m.city}{m.venue ? ` · ${m.venue}` : ''}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
                    🗓 {new Date(m.match_date).toLocaleDateString('ar-SA')}{m.match_time ? ` · ${m.match_time}` : ''}
                  </p>
                </div>
                {m.skill_level && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--primary-dim)', color: 'var(--primary)', flexShrink: 0 }}>
                    {skillLabel[m.skill_level] ?? m.skill_level}
                  </span>
                )}
              </div>

              {m.notes && <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 10px', lineHeight: 1.5 }}>{m.notes}</p>}

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
                  <span>اللاعبون</span>
                  <span style={{ fontWeight: 700, color: full ? 'var(--danger)' : 'var(--primary)' }}>
                    {m.slots_filled} / {m.slots_total}
                  </span>
                </div>
                <div style={{ width: '100%', background: 'var(--bg)', borderRadius: 20, height: 6 }}>
                  <div style={{ background: full ? 'var(--danger)' : 'var(--primary)', height: 6, borderRadius: 20, width: `${fillPct}%`, transition: 'width 0.3s' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                  بواسطة: {m.profiles?.full_name ?? '—'}
                </p>
                {userId !== m.created_by && (
                  joined ? (
                    <button onClick={() => leaveMatch(m.id, m.slots_filled)} disabled={joiningId === m.id}
                      style={{ fontSize: 12, padding: '6px 16px', borderRadius: 20, border: '1px solid var(--danger)', color: 'var(--danger)', background: 'transparent', cursor: 'pointer', opacity: joiningId === m.id ? 0.5 : 1 }}>
                      {joiningId === m.id ? '...' : '✕ انسحاب'}
                    </button>
                  ) : (
                    <button onClick={() => joinMatch(m.id, m.slots_filled, m.slots_total)} disabled={full || joiningId === m.id}
                      style={{ fontSize: 12, padding: '6px 16px', borderRadius: 20, border: 'none', background: full ? 'var(--bg)' : 'var(--primary)', color: full ? 'var(--text3)' : 'var(--primary-fg)', cursor: full ? 'default' : 'pointer', fontWeight: 600, opacity: joiningId === m.id ? 0.5 : 1 }}>
                      {joiningId === m.id ? '...' : full ? 'مكتملة' : '✓ انضمام'}
                    </button>
                  )
                )}
                {userId === m.created_by && (
                  <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>مبارياتك ✓</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '85svh', overflowY: 'auto', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>إنشاء مباراة مفتوحة</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>عنوان المباراة *</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثال: مباراة كرة قدم مساء الجمعة" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>المدينة *</label>
                <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="الرياض" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>الملعب / الموقع</label>
                <input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                  placeholder="اسم الملعب" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>التاريخ *</label>
                <input type="date" value={form.match_date} onChange={(e) => setForm((f) => ({ ...f, match_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>الوقت</label>
                <input type="time" value={form.match_time} onChange={(e) => setForm((f) => ({ ...f, match_time: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>عدد اللاعبين المطلوب</label>
                <input type="number" min="2" max="22" value={form.slots_total} onChange={(e) => setForm((f) => ({ ...f, slots_total: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>المستوى</label>
                <select value={form.skill_level} onChange={(e) => setForm((f) => ({ ...f, skill_level: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">الكل</option>
                  <option value="beginner">مبتدئ</option>
                  <option value="intermediate">متوسط</option>
                  <option value="advanced">متقدم</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>ملاحظات</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="أي تفاصيل إضافية..." rows={2}
                style={{ ...inputStyle, resize: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createMatch} disabled={saving || !form.title.trim() || !form.city.trim() || !form.match_date}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '12px', borderRadius: 14, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: (saving || !form.title.trim() || !form.city.trim() || !form.match_date) ? 0.5 : 1 }}>
                {saving ? 'جاري الإنشاء...' : 'إنشاء المباراة'}
              </button>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, border: '1px solid var(--border)', padding: '12px', borderRadius: 14, fontSize: 13, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
