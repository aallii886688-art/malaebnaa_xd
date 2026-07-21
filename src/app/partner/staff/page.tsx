'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Facility = { id: string; name: string }
type StaffMember = {
  id: string
  facility_id: string
  user_id: string
  role: string
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

const roleLabel: Record<string, string> = {
  manager: 'مدير',
  staff:   'موظف',
  viewer:  'مشاهد فقط',
}

const roleColor: Record<string, string> = {
  manager: 'bg-[#E8F5F1] text-[#0F6E56]',
  staff:   'bg-blue-50 text-blue-600',
  viewer:  'bg-gray-100 text-gray-500',
}

export default function PartnerStaffPage() {
  const router = useRouter()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedFacility, setSelectedFacility] = useState('')
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'manager' | 'staff' | 'viewer'>('staff')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: facs } = await supabase.from('facilities').select('id, name').eq('owner_id', user.id).eq('is_active', true)
      const list = (facs as Facility[]) ?? []
      setFacilities(list)
      if (list.length > 0) setSelectedFacility(list[0].id)
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!selectedFacility) return
    const loadStaff = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('facility_staff')
        .select('*, profiles:user_id(full_name, phone)')
        .eq('facility_id', selectedFacility)
        .order('created_at')
      setStaff((data as StaffMember[]) ?? [])
    }
    loadStaff()
  }, [selectedFacility])

  const addStaff = async () => {
    const digits = phone.replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '')
    if (digits.length !== 9) { setMsg('رقم الجوال غير صحيح (9 أرقام بدون 0 أو 966)'); return }
    setAdding(true); setMsg('')
    const supabase = createClient()
    const fullPhone = `+966${digits}`
    const internalEmail = `${digits}@malaebnaa.internal`
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .or(`phone.eq.${fullPhone},id.in.(select id from auth.users where email='${internalEmail}')`)
      .single()

    if (!profile) { setMsg('المستخدم غير موجود — يجب أن يكون مسجلاً في المنصة أولاً'); setAdding(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('facility_staff').insert({
      facility_id: selectedFacility,
      user_id: profile.id,
      role,
      added_by: user!.id,
    })
    if (error?.code === '23505') { setMsg('هذا المستخدم مضاف بالفعل'); setAdding(false); return }
    if (error) { setMsg('فشل الإضافة'); setAdding(false); return }
    setMsg(`تم إضافة ${profile.full_name} بنجاح ✓`)
    setPhone('')
    const { data } = await supabase.from('facility_staff').select('*, profiles:user_id(full_name, phone)').eq('facility_id', selectedFacility).order('created_at')
    setStaff((data as StaffMember[]) ?? [])
    setAdding(false)
  }

  const removeStaff = async (id: string) => {
    setRemoving(id)
    const supabase = createClient()
    await supabase.from('facility_staff').delete().eq('id', id)
    setStaff((s) => s.filter((x) => x.id !== id))
    setRemoving(null)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div><p className="text-xs opacity-80">الشريك</p><h1 className="text-lg font-bold">إدارة الموظفين</h1></div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* اختيار الملعب */}
        {facilities.length > 1 && (
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
            <label className="block text-xs font-medium text-[#1A1A1A] mb-2">الملعب</label>
            <select value={selectedFacility} onChange={(e) => setSelectedFacility(e.target.value)}
              className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]">
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}

        {facilities.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">🏟️</p>
            <p className="text-sm text-[#6B7280]">لا توجد ملاعب مفعّلة</p>
          </div>
        )}

        {selectedFacility && (
          <>
            {/* إضافة موظف */}
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">إضافة موظف جديد</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">رقم جوال الموظف</label>
                  <div className="flex gap-2 items-center border border-[#E8ECEF] rounded-xl px-3 py-2.5 focus-within:border-[#0F6E56]">
                    <span className="text-xs text-[#6B7280]" dir="ltr">+966</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="5XXXXXXXX" dir="ltr"
                      className="flex-1 text-sm focus:outline-none" maxLength={9} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">الصلاحية</label>
                  <div className="flex gap-2">
                    {(['manager', 'staff', 'viewer'] as const).map((r) => (
                      <button key={r} onClick={() => setRole(r)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                          role === r ? 'bg-[#0F6E56] text-white border-[#0F6E56]' : 'border-[#E8ECEF] text-[#6B7280]'
                        }`}>
                        {roleLabel[r]}
                      </button>
                    ))}
                  </div>
                </div>
                {msg && (
                  <p className={`text-xs ${msg.includes('✓') ? 'text-[#0F6E56]' : 'text-red-500'}`}>{msg}</p>
                )}
                <button onClick={addStaff} disabled={adding || !phone.trim()}
                  className="w-full bg-[#0F6E56] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                  {adding ? 'جاري الإضافة...' : '+ إضافة موظف'}
                </button>
              </div>
            </div>

            {/* قائمة الموظفين */}
            <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">الموظفون ({staff.length})</h2>
              {staff.length === 0 ? (
                <p className="text-sm text-[#9CA3AF] text-center py-4">لا يوجد موظفون بعد</p>
              ) : (
                <div className="space-y-3">
                  {staff.map((s) => (
                    <div key={s.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{s.profiles?.full_name}</p>
                        <p className="text-xs text-[#6B7280]" dir="ltr">{s.profiles?.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[s.role]}`}>{roleLabel[s.role]}</span>
                        <button onClick={() => removeStaff(s.id)} disabled={removing === s.id}
                          className="text-red-400 text-xs border border-red-200 px-2 py-0.5 rounded-lg disabled:opacity-50">
                          {removing === s.id ? '...' : 'حذف'}
                        </button>
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
