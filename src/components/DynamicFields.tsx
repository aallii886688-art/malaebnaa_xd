'use client'
import { useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type FieldDef = {
  id: string
  name_ar: string
  field_type: string
  placeholder_ar: string | null
  help_text_ar: string | null
  is_required_default: boolean
  options: { label: string; value: string }[] | null
  sort_order: number
  assignment_required: boolean | null  // override من الشريك
}

export type DynamicFieldsHandle = {
  validate: () => boolean
  getValues: () => { field_id: string; value: string }[]
}

type Props = {
  ownerId: string        // user_id للشريك صاحب الملعب/الأكاديمية
  activity: string       // facility_manager | academy_manager | tournament_manager
  useIn: string          // registration | booking | facility_profile | academy_profile
  entityId?: string      // لجلب القيم المحفوظة مسبقاً (تعديل)
  entityType?: string    // facilities | academy_subscriptions | bookings
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--border)', borderRadius: 12,
  padding: '11px 12px', fontSize: 14, outline: 'none',
  background: 'var(--card)', color: 'var(--text)', boxSizing: 'border-box',
}

const DynamicFields = forwardRef<DynamicFieldsHandle, Props>(
  ({ ownerId, activity, useIn, entityId, entityType }, ref) => {
    const [fields, setFields] = useState<FieldDef[]>([])
    const [values, setValues] = useState<Record<string, string>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      if (!ownerId) return
      const supabase = createClient()

      // جلب الحقول المفعّلة لهذا الشريك + النشاط + الاستخدام
      supabase
        .from('field_definitions')
        .select(`
          id, name_ar, field_type, placeholder_ar, help_text_ar,
          is_required_default, options, sort_order,
          partner_field_assignments!left(is_enabled, is_required_override)
        `)
        .contains('applies_to', [activity])
        .contains('use_in', [useIn])
        .eq('is_active', true)
        .eq('partner_field_assignments.partner_user_id', ownerId)
        .order('sort_order')
        .then(({ data }) => {
          if (!data) { setLoading(false); return }

          // فقط الحقول التي فعّلها الشريك (أو لا يوجد assignment = يظهر بشكل افتراضي)
          const active = (data as unknown as Array<{
            id: string; name_ar: string; field_type: string
            placeholder_ar: string | null; help_text_ar: string | null
            is_required_default: boolean; options: { label: string; value: string }[] | null
            sort_order: number
            partner_field_assignments: { is_enabled: boolean; is_required_override: boolean | null }[]
          }>).filter((f) => {
            const asgn = f.partner_field_assignments?.[0]
            return !asgn || asgn.is_enabled !== false
          }).map((f) => ({
            ...f,
            assignment_required: f.partner_field_assignments?.[0]?.is_required_override ?? null,
          }))

          setFields(active)
          setLoading(false)
        })

      // جلب قيم محفوظة إذا كان entityId موجود
      if (entityId && entityType) {
        supabase
          .from('field_values')
          .select('field_id, value_text, value_number, value_boolean, value_date, value_json')
          .eq('entity_id', entityId)
          .eq('entity_type', entityType)
          .then(({ data }) => {
            if (!data) return
            const saved: Record<string, string> = {}
            data.forEach((v: { field_id: string; value_text: string | null; value_number: number | null; value_boolean: boolean | null; value_date: string | null }) => {
              saved[v.field_id] = String(
                v.value_text ?? v.value_number ?? v.value_boolean ?? v.value_date ?? ''
              )
            })
            setValues(saved)
          })
      }
    }, [ownerId, activity, useIn, entityId, entityType])

    useImperativeHandle(ref, () => ({
      validate() {
        const errs: Record<string, string> = {}
        fields.forEach((f) => {
          const required = f.assignment_required ?? f.is_required_default
          if (required && !values[f.id]?.trim()) {
            errs[f.id] = `${f.name_ar} مطلوب`
          }
        })
        setErrors(errs)
        return Object.keys(errs).length === 0
      },
      getValues() {
        return fields.map((f) => ({ field_id: f.id, value: values[f.id] ?? '' }))
          .filter((v) => v.value.trim())
      },
    }))

    const set = (id: string, val: string) => {
      setValues((prev) => ({ ...prev, [id]: val }))
      setErrors((prev) => { const next = { ...prev }; delete next[id]; return next })
    }

    if (loading || fields.length === 0) return null

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
          معلومات إضافية
        </p>
        {fields.map((f) => {
          const required = f.assignment_required ?? f.is_required_default
          const err = errors[f.id]
          return (
            <div key={f.id}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>
                {f.name_ar}
                {required && <span style={{ color: 'var(--danger)', marginRight: 2 }}>*</span>}
              </label>

              {f.field_type === 'textarea' ? (
                <textarea value={values[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)}
                  placeholder={f.placeholder_ar ?? ''} rows={3}
                  style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />

              ) : f.field_type === 'select' && f.options ? (
                <select value={values[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)}
                  style={{ ...inputStyle }}>
                  <option value="">اختر...</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

              ) : f.field_type === 'boolean' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  {['نعم', 'لا'].map((opt) => (
                    <button key={opt} type="button" onClick={() => set(f.id, opt)}
                      style={{ flex: 1, padding: '10px', borderRadius: 12, border: `2px solid ${values[f.id] === opt ? 'var(--primary)' : 'var(--border)'}`, background: values[f.id] === opt ? 'var(--primary-dim)' : 'var(--card)', color: values[f.id] === opt ? 'var(--primary)' : 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {opt}
                    </button>
                  ))}
                </div>

              ) : f.field_type === 'multiselect' && f.options ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {f.options.map((o) => {
                    const selected = (values[f.id] ?? '').split(',').filter(Boolean).includes(o.value)
                    return (
                      <button key={o.value} type="button" onClick={() => {
                        const current = (values[f.id] ?? '').split(',').filter(Boolean)
                        const next = selected ? current.filter((x) => x !== o.value) : [...current, o.value]
                        set(f.id, next.join(','))
                      }}
                        style={{ padding: '6px 14px', borderRadius: 20, border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`, background: selected ? 'var(--primary-dim)' : 'var(--card)', color: selected ? 'var(--primary)' : 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                        {o.label}
                      </button>
                    )
                  })}
                </div>

              ) : (
                <input
                  type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : f.field_type === 'phone' ? 'tel' : 'text'}
                  inputMode={f.field_type === 'number' ? 'numeric' : f.field_type === 'phone' ? 'tel' : undefined}
                  value={values[f.id] ?? ''}
                  onChange={(e) => set(f.id, e.target.value)}
                  placeholder={f.placeholder_ar ?? ''}
                  style={inputStyle}
                />
              )}

              {f.help_text_ar && !err && (
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{f.help_text_ar}</p>
              )}
              {err && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{err}</p>}
            </div>
          )
        })}
      </div>
    )
  }
)

DynamicFields.displayName = 'DynamicFields'
export default DynamicFields

// دالة مساعدة لحفظ القيم بعد إنشاء الـ entity
export async function saveDynamicFieldValues(
  fieldValues: { field_id: string; value: string }[],
  entityId: string,
  entityType: string,
  createdBy: string,
) {
  if (!fieldValues.length) return
  const supabase = createClient()
  const rows = fieldValues.map(({ field_id, value }) => ({
    field_id,
    entity_id: entityId,
    entity_type: entityType,
    value_text: value,
    created_by: createdBy,
  }))
  await supabase.from('field_values').upsert(rows, { onConflict: 'field_id,entity_id,entity_type' })
}
