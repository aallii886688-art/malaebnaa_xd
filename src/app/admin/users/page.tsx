'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Profile = {
  id: string
  full_name: string
  phone: string
  city: string | null
  is_active: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProfiles(data ?? []); setLoading(false) })
  }, [])

  const filtered = profiles.filter((p) =>
    p.full_name.includes(search) || p.phone.includes(search)
  )

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">لوحة التحكم</p>
          <h1 className="text-lg font-bold">المستخدمون</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        <div className="bg-white rounded-xl border border-[#E8ECEF] px-4 py-3 flex items-center gap-2">
          <span className="text-[#6B7280]">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الجوال..."
            className="flex-1 text-sm focus:outline-none" />
        </div>

        <p className="text-xs text-[#6B7280]">{filtered.length} مستخدم</p>

        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-[#6B7280]">لا يوجد مستخدمون</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-[#E8ECEF] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-[#1A1A1A] text-sm">{p.full_name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5" dir="ltr">{p.phone}</p>
                    {p.city && <p className="text-xs text-[#6B7280]">📍 {p.city}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-[#E8F5F1] text-[#0F6E56]' : 'bg-red-50 text-red-500'}`}>
                      {p.is_active ? 'نشط' : 'موقوف'}
                    </span>
                    <p className="text-[10px] text-[#9CA3AF]">
                      {new Date(p.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
