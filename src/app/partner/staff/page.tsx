'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { logActivity } from '@/lib/logActivity'

type Facility = { id: string; name: string }
type StaffMember = {
  id: string
  facility_id: string
  user_id: string
  role: string
  created_at: string
  profiles: { name: string; phone: string } | null
}
type Permission = {
  key: string
  label_ar: string
  category: string
  sub_category: string | null
}

const roleLabel: Record<string, string> = {
  manager: 'مدير',
  staff:   'موظف',
  viewer:  'مشاهد',
}

async function sendNotifyPhone(phone: string, message: string) {
  await fetch('/api/notify-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.NEXT_PUBLIC_INTERNAL_KEY ?? '' },
    body: JSON.stringify({ phone, message }),
  })
}

async function sendNotifyUser(userId: string, type: string, data: Record<string, unknown>) {
  await fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.NEXT_PUBLIC_INTERNAL_KEY ?? '' },
    body: JSON.stringify({ type, userId, data }),
  })
}

export default function PartnerStaffPage() {
  const router = useRouter()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedFacility, setSelectedFacility] = useState('')
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  // Add flow
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'manager' | 'staff' | 'viewer'>('staff')
  const [searching, setSearching] = useState(false)
  const [foundUser, setFoundUser] = useState<{ id: string; name: string; phone: string } | null>(null)
  const [unregisteredPhone, setUnregisteredPhone] = useState<string | null>(null) // رقم غير مسجّل
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')

  // Permissions picker
  const [allPerms, setAllPerms] = useState<Permission[]>([])
  const [showPermSheet, setShowPermSheet] = useState(false)
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())

  // Edit permissions
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set())
  const [savingEdit, setSavingEdit] = useState(false)

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
    loadPermissions()
  }, [router])

  useEffect(() => {
    if (!selectedFacility) return
    loadStaff()
  }, [selectedFacility])

  const loadStaff = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('facility_staff')
      .select('*, profiles:user_id(name, phone)')
      .eq('facility_id', selectedFacility)
      .order('created_at')
    setStaff((data as StaffMember[]) ?? [])
  }

  const loadPermissions = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('system_permissions')
      .select('key, label_ar, category, sub_category')
      .eq('scope', 'partner')
      .order('sort_order')
    setAllPerms((data as Permission[]) ?? [])
  }

  const getFacilityName = () => facilities.find(f => f.id === selectedFacility)?.name ?? 'الملعب'

  const grouped = allPerms.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  const togglePerm = (key: string, perms: Set<string>, setPerms: (s: Set<string>) => void) => {
    const next = new Set(perms)
    if (next.has(key)) next.delete(key); else next.add(key)
    setPerms(next)
  }

  const toggleCategory = (cat: string, perms: Set<string>, setPerms: (s: Set<string>) => void) => {
    const catKeys = (grouped[cat] ?? []).map((p) => p.key)
    const allSelected = catKeys.every((k) => perms.has(k))
    const next = new Set(perms)
    catKeys.forEach((k) => allSelected ? next.delete(k) : next.add(k))
    setPerms(next)
  }

  const resetAddForm = () => {
    setPhone(''); setFoundUser(null); setUnregisteredPhone(null)
    setShowPermSheet(false); setSelectedPerms(new Set())
  }

  const searchUser = async () => {
    if (!phone.trim()) return
    setSearching(true); setMsg(''); setFoundUser(null); setUnregisteredPhone(null)
    const supabase = createClient()
    const digits = phone.replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '')
    const normalized = `+966${digits}`
    const { data } = await supabase.from('profiles').select('id, name, phone').eq('phone', normalized).single()
    if (!data) {
      // غير مسجّل — نمرر لمرحلة الدعوة
      setUnregisteredPhone(normalized)
      setShowPermSheet(true)
      setSelectedPerms(new Set())
    } else {
      setFoundUser(data)
      setShowPermSheet(true)
      setSelectedPerms(new Set())
    }
    setSearching(false)
  }

  // إضافة موظف مسجّل
  const confirmAdd = async () => {
    if (!foundUser) return
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('facility_staff').insert({
      facility_id: selectedFacility, user_id: foundUser.id, role, added_by: user!.id,
    })
    if (error?.code === '23505') { setMsg('هذا المستخدم مضاف بالفعل'); setAdding(false); return }
    if (error) { setMsg('فشل الإضافة'); setAdding(false); return }

    if (selectedPerms.size > 0) {
      const rows = Array.from(selectedPerms).map((key) => ({
        employee_user_id: foundUser.id, permission_key: key, scope: 'partner',
      }))
      await supabase.from('employee_permissions').insert(rows)
    }

    // إشعار واتساب للموظف المسجّل
    await sendNotifyUser(foundUser.id, 'staff_added', {
      facilityName: getFacilityName(),
      roleLabel: roleLabel[role],
      entityType: 'facility_staff',
    })

    await logActivity({
      action: 'add_staff', entity_type: 'facility_staff',
      after_data: { name: foundUser.name, phone: foundUser.phone, role, facility_id: selectedFacility, permissions_count: selectedPerms.size },
    })
    setMsg(`✓ تمت إضافة ${foundUser.name} وإرسال إشعار واتساب`)
    resetAddForm()
    loadStaff()
    setAdding(false)
  }

  // إرسال دعوة لغير المسجّل
  const confirmInvite = async () => {
    if (!unregisteredPhone) return
    setAdding(true)
    const { messages } = await import('@/lib/whatsapp')
    await sendNotifyPhone(unregisteredPhone, messages.staffInvited(getFacilityName(), roleLabel[role]))

    await logActivity({
      action: 'invite_staff', entity_type: 'facility_staff',
      after_data: { phone: unregisteredPhone, role, facility_id: selectedFacility, status: 'invited_unregistered' },
    })
    setMsg(`✓ تم إرسال دعوة واتساب إلى ${unregisteredPhone}`)
    resetAddForm()
    setAdding(false)
  }

  const removeStaff = async (s: StaffMember) => {
    const supabase = createClient()
    await supabase.from('facility_staff').delete().eq('id', s.id)
    await supabase.from('employee_permissions').delete().eq('employee_user_id', s.user_id).eq('scope', 'partner')
    await logActivity({ action: 'remove_staff', entity_type: 'facility_staff', entity_id: s.id, before_data: { name: s.profiles?.name, role: s.role } })
    setStaff((prev) => prev.filter((x) => x.id !== s.id))
  }

  const openEditPerms = async (s: StaffMember) => {
    setEditingStaff(s)
    const supabase = createClient()
    const { data } = await supabase.from('employee_permissions')
      .select('permission_key').eq('employee_user_id', s.user_id).eq('scope', 'partner')
    setEditPerms(new Set((data ?? []).map((x: { permission_key: string }) => x.permission_key)))
  }

  const saveEditPerms = async () => {
    if (!editingStaff) return
    setSavingEdit(true)
    const supabase = createClient()
    await supabase.from('employee_permissions').delete().eq('employee_user_id', editingStaff.user_id).eq('scope', 'partner')
    if (editPerms.size > 0) {
      const rows = Array.from(editPerms).map((key) => ({
        employee_user_id: editingStaff.user_id, permission_key: key, scope: 'partner',
      }))
      await supabase.from('employee_permissions').insert(rows)
    }
    setSavingEdit(false); setEditingStaff(null)
  }

  const PermSheet = ({ perms, setPerms, onConfirm, confirmLabel, saving }: {
    perms: Set<string>; setPerms: (s: Set<string>) => void
    onConfirm: () => void; confirmLabel: string; saving: boolean
  }) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) { setShowPermSheet(false); setEditingStaff(null) } }}>
      <div style={{ background: 'var(--card)', borderRadius: '24px 24px 0 0', maxHeight: '80svh', overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>الصلاحيات</p>

        {allPerms.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>لا توجد صلاحيات لتحديدها</p>
        ) : (
          Object.entries(grouped).map(([cat, catPerms]) => {
            const allSel = catPerms.every((p) => perms.has(p.key))
            return (
              <div key={cat}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', margin: 0 }}>{cat}</p>
                  <button onClick={() => toggleCategory(cat, perms, setPerms)}
                    style={{ fontSize: 11, color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    {allSel ? 'إلغاء الكل' : 'تحديد الكل'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {catPerms.map((p) => (
                    <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={perms.has(p.key)} onChange={() => togglePerm(p.key, perms, setPerms)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{p.label_ar}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })
        )}

        <button onClick={onConfirm} disabled={saving}
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 14, fontWeight: 600, padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
          {saving ? '...' : confirmLabel}
        </button>
      </div>
    </div>
  )

  if (loading) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>جاري التحميل...</div>

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <header style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '52px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>لوحة الشريك</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>إدارة الموظفين</h1>
        </div>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {facilities.length > 1 && (
          <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 6px' }}>الملعب</p>
            <select value={selectedFacility} onChange={(e) => setSelectedFacility(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'var(--bg)', color: 'var(--text)' }}>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        )}

        {facilities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text2)' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>🏟️</p>
            <p style={{ fontSize: 13 }}>لا توجد ملاعب مفعّلة</p>
          </div>
        )}

        {selectedFacility && (
          <>
            {/* بطاقة الإضافة */}
            <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>إضافة موظف جديد</p>

              {/* حقل الهاتف */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 10, padding: '0 12px', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }} dir="ltr">+966</span>
                  <input value={phone} onChange={(e) => { setPhone(e.target.value); setFoundUser(null); setUnregisteredPhone(null) }}
                    onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                    placeholder="5XXXXXXXX" dir="ltr" maxLength={9}
                    style={{ flex: 1, fontSize: 13, outline: 'none', background: 'transparent', color: 'var(--text)', border: 'none', padding: '9px 0' }} />
                </div>
                <button onClick={searchUser} disabled={searching || !phone.trim()}
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 13, padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', opacity: (searching || !phone.trim()) ? 0.5 : 1 }}>
                  {searching ? '...' : 'بحث'}
                </button>
              </div>

              {/* اختيار الدور */}
              <div style={{ display: 'flex', gap: 8 }}>
                {(['manager', 'staff', 'viewer'] as const).map((r) => (
                  <button key={r} onClick={() => setRole(r)}
                    style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: `1px solid ${role === r ? 'var(--primary)' : 'var(--border)'}`, background: role === r ? 'var(--primary-dim)' : 'transparent', color: role === r ? 'var(--primary)' : 'var(--text2)', cursor: 'pointer' }}>
                    {roleLabel[r]}
                  </button>
                ))}
              </div>

              {/* معاينة المستخدم المسجّل */}
              {foundUser && !showPermSheet && (
                <div style={{ background: 'var(--primary-dim)', border: '1px solid var(--primary)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '0 0 2px' }}>✅ {foundUser.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }} dir="ltr">{foundUser.phone}</p>
                  </div>
                  <button onClick={() => setShowPermSheet(true)}
                    style={{ fontSize: 12, color: 'var(--primary)', background: 'var(--card)', border: '1px solid var(--primary)', padding: '6px 12px', borderRadius: 10, cursor: 'pointer' }}>
                    حدد الصلاحيات
                  </button>
                </div>
              )}

              {/* معاينة غير المسجّل */}
              {unregisteredPhone && !showPermSheet && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid #f59e0b', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: '0 0 2px' }}>⚠️ غير مسجّل في المنصة</p>
                    <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }} dir="ltr">{unregisteredPhone}</p>
                    <p style={{ fontSize: 11, color: 'var(--text2)', margin: '3px 0 0' }}>سيتم إرسال دعوة تسجيل عبر واتساب</p>
                  </div>
                  <button onClick={() => setShowPermSheet(true)}
                    style={{ fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid #f59e0b', padding: '6px 12px', borderRadius: 10, cursor: 'pointer' }}>
                    إرسال الدعوة
                  </button>
                </div>
              )}

              {msg && (
                <div style={{ fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 10, background: msg.startsWith('✓') ? 'var(--primary-dim)' : 'var(--danger-dim)', color: msg.startsWith('✓') ? 'var(--primary)' : 'var(--danger)' }}>
                  {msg}
                </div>
              )}
            </div>

            {/* قائمة الموظفين */}
            <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>الموظفون ({staff.length})</p>
              {staff.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', padding: '16px 0' }}>لا يوجد موظفون بعد</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {staff.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{s.profiles?.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }} dir="ltr">{s.profiles?.phone}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}>{roleLabel[s.role] ?? s.role}</span>
                        <button onClick={() => openEditPerms(s)}
                          style={{ fontSize: 11, color: 'var(--primary)', border: '1px solid var(--primary)', padding: '4px 8px', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}>
                          صلاحيات
                        </button>
                        <button onClick={() => removeStaff(s)}
                          style={{ fontSize: 11, color: 'var(--danger)', border: '1px solid var(--danger)', padding: '4px 8px', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}>
                          حذف
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

      {/* Perm sheet — إضافة مسجّل */}
      {showPermSheet && foundUser && (
        <PermSheet
          perms={selectedPerms} setPerms={setSelectedPerms}
          onConfirm={confirmAdd}
          confirmLabel={adding ? 'جاري الإضافة...' : `➕ إضافة ${foundUser.name} وإرسال واتساب`}
          saving={adding}
        />
      )}

      {/* Perm sheet — دعوة غير مسجّل */}
      {showPermSheet && unregisteredPhone && !foundUser && (
        <PermSheet
          perms={selectedPerms} setPerms={setSelectedPerms}
          onConfirm={confirmInvite}
          confirmLabel={adding ? 'جاري الإرسال...' : `📲 إرسال دعوة واتساب إلى ${unregisteredPhone}`}
          saving={adding}
        />
      )}

      {/* Perm sheet — تعديل صلاحيات موظف موجود */}
      {editingStaff && (
        <PermSheet
          perms={editPerms} setPerms={setEditPerms}
          onConfirm={saveEditPerms}
          confirmLabel={savingEdit ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
          saving={savingEdit}
        />
      )}
    </div>
  )
}
