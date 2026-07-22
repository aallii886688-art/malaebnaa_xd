'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type FieldDef = {
  id: string; name_ar: string; field_type: string; is_required_default: boolean
  applies_to: string[] | null; use_in: string[]; help_text_ar: string | null
  field_categories: { name_ar: string } | null
}
type Assignment = { field_id: string; is_enabled: boolean; is_required_override: boolean | null }

const fieldTypeLabel: Record<string, string> = {
  text: 'نص', textarea: 'نص طويل', number: 'رقم', select: 'قائمة',
  multiselect: 'قائمة متعددة', date: 'تاريخ', boolean: 'نعم/لا',
  file: 'ملف', image: 'صورة', phone: 'جوال', email: 'إيميل',
}

// تصنيفات مطابقة لصفحة الأدمن — كل شريك يشوف اللي يخصه فقط
const ALL_SUBS = [
  {
    key: 'facility_profile',
    label: '🏟️ ملف الملعب',
    note: 'حقول تظهر عند إضافة ملعب جديد',
    activity: 'facility_manager',
    use_in: 'facility_profile',
  },
  {
    key: 'academy_profile',
    label: '🏅 ملف الأكاديمية',
    note: 'حقول تظهر عند إضافة أكاديمية جديدة',
    activity: 'academy_manager',
    use_in: 'academy_profile',
  },
  {
    key: 'academy_program',
    label: '🏃 ملف البرنامج التدريبي',
    note: 'حقول تظهر عند إضافة برنامج تدريبي جديد',
    activity: 'academy_manager',
    use_in: 'academy_program',
  },
  {
    key: 'registration',
    label: '📝 تسجيل طالب',
    note: 'حقول يملأها الطالب عند الاشتراك في برنامج',
    activity: 'academy_manager',
    use_in: 'registration',
  },
  {
    key: 'tournament_registration',
    label: '🏆 تسجيل فريق',
    note: 'حقول يملأها العميل عند تسجيل فريقه في بطولة',
    activity: 'tournament_manager',
    use_in: 'tournament_registration',
  },
]

export default function PartnerFieldsPage() {
  const router = useRouter()
  const [fields, setFields] = useState<FieldDef[]>([])
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({})
  const [myActivities, setMyActivities] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeSub, setActiveSub] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: roles } = await supabase
        .from('partner_roles').select('activity').eq('user_id', user.id).eq('status', 'approved')
      const acts = roles?.map((r) => r.activity) ?? []
      setMyActivities(acts)
      if (!acts.length) { setLoading(false); return }

      const { data: defs } = await supabase
        .from('field_definitions')
        .select('*, field_categories(name_ar)')
        .eq('is_active', true)
        .order('sort_order')
      const relevant = (defs ?? []).filter((f: FieldDef) =>
        !f.applies_to || f.applies_to.some((a) => acts.includes(a))
      )
      setFields(relevant)

      const { data: asgns } = await supabase
        .from('partner_field_assignments')
        .select('field_id, is_enabled, is_required_override')
        .eq('partner_user_id', user.id)
      const map: Record<string, Assignment> = {}
      asgns?.forEach((a: Assignment) => { map[a.field_id] = a })
      setAssignments(map)
      setLoading(false)
    })
  }, [router])

  // التصنيفات المتاحة لهذا الشريك فقط
  const mySubs = ALL_SUBS.filter((s) => myActivities.includes(s.activity))

  // اختيار أول تصنيف تلقائياً
  useEffect(() => {
    if (mySubs.length && !activeSub) setActiveSub(mySubs[0].key)
  }, [mySubs.length])

  const currentSub = ALL_SUBS.find((s) => s.key === activeSub) ?? mySubs[0]
  const currentFields = fields.filter((f) => f.use_in.includes(currentSub?.use_in ?? ''))

  const toggle = async (fieldId: string) => {
    if (!userId || !currentSub) return
    setSaving(fieldId)
    const supabase = createClient()
    const current = assignments[fieldId]
    const isEnabled = current ? !current.is_enabled : false

    if (!current) {
      await supabase.from('partner_field_assignments').insert({
        partner_user_id: userId, field_id: fieldId,
        activity: currentSub.activity, is_enabled: false,
      })
      setAssignments((prev) => ({ ...prev, [fieldId]: { field_id: fieldId, is_enabled: false, is_required_override: null } }))
    } else {
      await supabase.from('partner_field_assignments')
        .update({ is_enabled: isEnabled })
        .eq('partner_user_id', userId).eq('field_id', fieldId)
      setAssignments((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], is_enabled: isEnabled } }))
    }
    setSaving(null)
  }

  const toggleRequired = async (fieldId: string, currentOverride: boolean | null, defaultRequired: boolean) => {
    if (!userId || !currentSub) return
    setSaving(fieldId)
    const supabase = createClient()
    const next = currentOverride === null ? !defaultRequired : (currentOverride ? false : null)
    await supabase.from('partner_field_assignments')
      .upsert({ partner_user_id: userId, field_id: fieldId, activity: currentSub.activity, is_enabled: true, is_required_override: next },
        { onConflict: 'partner_user_id,field_id,activity' })
    setAssignments((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], field_id: fieldId, is_enabled: true, is_required_override: next } }))
    setSaving(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text2)' }}>جاري التحميل...</p>
    </div>
  )

  if (!myActivities.length) return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
      <p style={{ color: 'var(--text)', fontWeight: 600 }}>لا توجد أنشطة معتمدة</p>
      <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>فعّل نشاطك أولاً لإدارة الحقول</p>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1A9870)', padding: '20px 16px 20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '0 0 4px' }}>إدارة الحقول</p>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>حقولي</h1>
      </div>

      {/* تبويبات التصنيفات */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }} className="no-scrollbar">
        {mySubs.map((s) => (
          <button key={s.key} onClick={() => setActiveSub(s.key)}
            style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeSub === s.key ? 'var(--primary)' : 'var(--card)', color: activeSub === s.key ? 'var(--primary-fg)' : 'var(--text2)', outline: activeSub === s.key ? 'none' : '1px solid var(--border)' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* وصف التصنيف */}
      {currentSub && (
        <div style={{ margin: '14px 16px 0', background: 'var(--primary-dim)', borderRadius: 14, padding: '10px 14px', border: '1px solid var(--primary)' }}>
          <p style={{ fontSize: 12, color: 'var(--primary)', margin: 0 }}>💡 {currentSub.note}</p>
        </div>
      )}

      {/* الحقول */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {currentFields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>لا توجد حقول في هذا التصنيف بعد</p>
            <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>تواصل مع الإدارة لإضافة حقول</p>
          </div>
        ) : currentFields.map((f) => {
          const asgn = assignments[f.id]
          const enabled = !asgn || asgn.is_enabled !== false
          const requiredOverride = asgn?.is_required_override ?? null
          const isRequired = requiredOverride ?? f.is_required_default
          const isSaving = saving === f.id

          return (
            <div key={f.id} style={{ background: 'var(--card)', borderRadius: 16, border: `1.5px solid ${enabled ? 'var(--border)' : 'var(--card2)'}`, padding: '14px 16px', opacity: enabled ? 1 : 0.55, transition: 'opacity 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Toggle */}
                <button onClick={() => toggle(f.id)} disabled={isSaving}
                  style={{ width: 44, height: 26, borderRadius: 13, background: enabled ? 'var(--primary)' : 'var(--border)', position: 'relative', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 3, left: enabled ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
                </button>

                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{f.name_ar}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fieldTypeLabel[f.field_type] ?? f.field_type}</span>
                    {f.field_categories && <span style={{ fontSize: 11, color: 'var(--text3)' }}>· {f.field_categories.name_ar}</span>}
                  </div>
                </div>

                {enabled && (
                  <button onClick={() => toggleRequired(f.id, requiredOverride, f.is_required_default)} disabled={isSaving}
                    style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: isRequired ? 'var(--danger-dim)' : 'var(--card2)', color: isRequired ? 'var(--danger)' : 'var(--text3)', flexShrink: 0 }}>
                    {isRequired ? 'إلزامي' : 'اختياري'}
                  </button>
                )}
              </div>

              {f.help_text_ar && enabled && (
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: '8px 0 0 56px' }}>{f.help_text_ar}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
