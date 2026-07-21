'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Profile = {
  full_name: string
  phone: string
  city: string | null
  avatar_url: string | null
}

const cities = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'تبوك', 'أبها', 'القصيم', 'حائل', 'جازان', 'نجران']

export default function PlayerProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', city: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        setProfile(data as Profile)
        setForm({ full_name: data?.full_name ?? '', city: data?.city ?? '' })
        setLoading(false)
      })
    })
  }, [router])

  const save = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      full_name: form.full_name,
      city: form.city || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setProfile((p) => p ? { ...p, full_name: form.full_name, city: form.city || null } : p)
    setEditing(false)
    setSaving(false)
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <header className="bg-[#0F6E56] text-white px-4 py-4">
        <p className="text-xs opacity-80">حسابي</p>
        <h1 className="text-lg font-bold">الملف الشخصي</h1>
      </header>

      <div className="px-4 py-5 space-y-4">
        {/* Avatar + name */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-5 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#E8F5F1] rounded-full flex items-center justify-center text-3xl mb-3">
            {profile?.full_name?.[0] ?? '👤'}
          </div>
          <p className="font-bold text-[#1A1A1A] text-base">{profile?.full_name}</p>
          <p className="text-xs text-[#6B7280] mt-0.5" dir="ltr">{profile?.phone}</p>
          {profile?.city && <p className="text-xs text-[#9CA3AF] mt-0.5">📍 {profile.city}</p>}
        </div>

        {/* Edit form */}
        {editing ? (
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4 space-y-4">
            <h2 className="text-sm font-bold text-[#1A1A1A]">تعديل المعلومات</h2>

            <div>
              <label className="block text-xs font-medium text-[#1A1A1A] mb-1">الاسم الكامل</label>
              <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1A1A1A] mb-1">المدينة</label>
              <select value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]">
                <option value="">اختر المدينة</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={save} disabled={saving}
                className="flex-1 bg-[#0F6E56] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={() => setEditing(false)}
                className="flex-1 border border-[#E8ECEF] py-2.5 rounded-xl text-sm">
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="w-full bg-white rounded-2xl border border-[#E8ECEF] p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-[#1A1A1A]">✏️ تعديل المعلومات</span>
            <span className="text-[#6B7280]">←</span>
          </button>
        )}

        {/* Menu items */}
        <div className="bg-white rounded-2xl border border-[#E8ECEF] divide-y divide-[#F8F9FA]">
          {[
            { href: '/player/bookings', icon: '📅', label: 'حجوزاتي' },
            { href: '/player/facilities', icon: '⚽', label: 'تصفح الملاعب' },
          ].map((item) => (
            <a key={item.href} href={item.href}
              className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-[#1A1A1A]">{item.icon} {item.label}</span>
              <span className="text-[#9CA3AF] text-sm">←</span>
            </a>
          ))}
        </div>

        <button onClick={logout}
          className="w-full border border-red-200 text-red-500 py-3 rounded-2xl font-semibold text-sm">
          🚪 تسجيل الخروج
        </button>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8ECEF] flex">
        {[
          { href: '/player', icon: '🏠', label: 'الرئيسية' },
          { href: '/player/bookings', icon: '📅', label: 'حجوزاتي' },
          { href: '/player/facilities', icon: '⚽', label: 'الملاعب' },
          { href: '/player/profile', icon: '👤', label: 'حسابي', active: true },
        ].map((item) => (
          <a key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 ${'active' in item && item.active ? 'text-[#0F6E56]' : 'text-[#6B7280]'}`}>
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
