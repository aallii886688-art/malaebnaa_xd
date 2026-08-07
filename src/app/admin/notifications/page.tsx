'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/logActivity'

type Template = {
  id: string; key: string; category: string; sub_category: string
  name_ar: string; body_ar: string; variables: string[] | null
  event: string; is_active: boolean; channel: string
}

const CATEGORIES = [
  {
    key: 'customers', label: '🔔 إشعارات العملاء',
    subs: [
      { key: 'bookings', label: 'الحجوزات' },
      { key: 'academies', label: 'الأكاديميات' },
      { key: 'tournaments', label: 'البطولات' },
      { key: 'refunds', label: 'الاسترداد' },
      { key: 'account', label: 'الحساب' },
    ],
  },
  {
    key: 'partners', label: '🤝 إشعارات الشركاء',
    subs: [
      { key: 'bookings', label: 'الحجوزات' },
      { key: 'academies', label: 'الأكاديميات' },
      { key: 'tournaments', label: 'البطولات' },
      { key: 'settlements', label: 'التسوية' },
      { key: 'activation', label: 'التفعيل' },
    ],
  },
  {
    key: 'admin', label: '⚙️ إشعارات الإدارة',
    subs: [
      { key: 'partners', label: 'طلبات الشركاء' },
      { key: 'refunds', label: 'الاسترداد' },
      { key: 'settlements', label: 'التسوية' },
    ],
  },
]

const EVENTS = [
  'booking.confirmed', 'booking.cancelled', 'booking.payment_expired', 'booking.reminder',
  'academy.enrolled', 'academy.payment_expired',
  'tournament.registered', 'tournament.payment_expired',
  'refund.approved', 'refund.rejected',
  'account.welcome',
  'partner.new_booking', 'partner.booking_cancelled', 'partner.new_enrollment',
  'partner.new_team', 'partner.settlement_ready', 'partner.settlement_completed',
  'partner.activation_approved', 'partner.activation_rejected', 'partner.activation_revision',
  'admin.new_partner_request', 'admin.new_refund_request', 'admin.new_settlement_request',
]

export default function AdminNotificationsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('customers')
  const [activeSub, setActiveSub] = useState('bookings')
  const [editing, setEditing] = useState<Template | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editSaving, setEditSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newForm, setNewForm] = useState({ name_ar: '', body_ar: '', event: '', key: '' })
  const [addSaving, setAddSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [preview, setPreview] = useState('')

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('notification_templates').select('*').order('category').order('sub_category').order('name_ar')
    setTemplates((data as Template[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const currentCategory = CATEGORIES.find((c) => c.key === activeCategory)!
  const currentSub = currentCategory.subs.find((s) => s.key === activeSub) ?? currentCategory.subs[0]

  const filtered = templates.filter((t) => t.category === activeCategory && t.sub_category === activeSub)

  const openEdit = (t: Template) => {
    setEditing(t); setEditBody(t.body_ar); setEditActive(t.is_active)
    generatePreview(t.body_ar, t.variables)
  }

  const generatePreview = (body: string, vars: string[] | null) => {
    let p = body
    ;(vars ?? []).forEach((v) => { p = p.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), `[${v}]`) })
    setPreview(p)
  }

  const saveEdit = async () => {
    if (!editing) return
    setEditSaving(true)
    const supabase = createClient()
    await supabase.from('notification_templates').update({ body_ar: editBody, is_active: editActive, updated_at: new Date().toISOString() }).eq('id', editing.id)
    await logActivity({ action: 'notification_edited', entity_type: 'notification_templates', entity_id: editing.id, after_data: { name_ar: editing.name_ar, is_active: editActive } })
    await load(); setEditing(null); setEditSaving(false)
  }

  const saveNew = async () => {
    if (!newForm.name_ar.trim() || !newForm.body_ar.trim() || !newForm.event || !newForm.key.trim()) return
    setAddSaving(true)
    const supabase = createClient()
    await supabase.from('notification_templates').insert({
      key: newForm.key, name_ar: newForm.name_ar, body_ar: newForm.body_ar,
      category: activeCategory, sub_category: activeSub, event: newForm.event,
      channel: 'whatsapp', is_active: true,
    })
    await logActivity({ action: 'notification_created', entity_type: 'notification_templates', after_data: { key: newForm.key, name_ar: newForm.name_ar } })
    await load(); setShowAdd(false); setNewForm({ name_ar: '', body_ar: '', event: '', key: '' }); setAddSaving(false)
  }

  const deleteTemplate = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notification_templates').delete().eq('id', id)
    await logActivity({ action: 'notification_deleted', entity_type: 'notification_templates', entity_id: id })
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    setConfirmDelete(null)
  }

  const toggleActive = async (t: Template) => {
    const supabase = createClient()
    await supabase.from('notification_templates').update({ is_active: !t.is_active }).eq('id', t.id)
    await logActivity({ action: t.is_active ? 'notification_deactivated' : 'notification_activated', entity_type: 'notification_templates', entity_id: t.id, after_data: { name_ar: t.name_ar } })
    setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: !t.is_active } : x))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid var(--border)', borderRadius: 12,
    padding: '10px 12px', fontSize: 13, outline: 'none',
    background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '16px' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '0 0 2px' }}>لوحة التحكم</p>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>إدارة الإشعارات</h1>
      </div>

      {/* التصنيفات الرئيسية */}
      <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }} className="no-scrollbar">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => { setActiveCategory(c.key); setActiveSub(c.subs[0].key) }}
            style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: activeCategory === c.key ? 'var(--primary)' : 'var(--card)', color: activeCategory === c.key ? 'var(--primary-fg)' : 'var(--text2)', outline: activeCategory === c.key ? 'none' : '1px solid var(--border)' }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* التصنيفات الفرعية */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }} className="no-scrollbar">
        {currentCategory.subs.map((s) => (
          <button key={s.key} onClick={() => setActiveSub(s.key)}
            style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 20, fontSize: 12, border: 'none', cursor: 'pointer', background: activeSub === s.key ? 'var(--card2)' : 'transparent', color: activeSub === s.key ? 'var(--text)' : 'var(--text3)', outline: activeSub === s.key ? '1.5px solid var(--primary)' : '1px solid var(--border)', fontWeight: activeSub === s.key ? 600 : 400 }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* قائمة الإشعارات */}
      <div style={{ padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>🔔</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>لا توجد إشعارات في هذا التصنيف</p>
            <button onClick={() => setShowAdd(true)}
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', padding: '10px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              + أضف إشعاراً
            </button>
          </div>
        ) : filtered.map((t) => (
          <div key={t.id} style={{ background: 'var(--card)', borderRadius: 16, border: `1px solid ${t.is_active ? 'var(--border)' : 'var(--card2)'}`, padding: '12px 14px', opacity: t.is_active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, margin: 0 }}>{t.name_ar}</p>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: t.is_active ? 'var(--primary-dim)' : 'var(--bg)', color: t.is_active ? 'var(--primary)' : 'var(--text3)', fontWeight: 600 }}>
                    {t.is_active ? 'مفعّل' : 'معطّل'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 4px', lineHeight: 1.5 }}>{t.body_ar}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                  📡 واتساب · 🎯 {t.event}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <button onClick={() => openEdit(t)} style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>تعديل</button>
              <button onClick={() => toggleActive(t)} style={{ fontSize: 12, color: t.is_active ? 'var(--danger)' : 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {t.is_active ? 'تعطيل' : 'تفعيل'}
              </button>
              <button onClick={() => setConfirmDelete(t.id)} style={{ fontSize: 12, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>حذف</button>
            </div>
          </div>
        ))}
      </div>

      {/* زر إضافة */}
      {filtered.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: 16, right: 16 }}>
          <button onClick={() => setShowAdd(true)}
            style={{ width: '100%', background: 'var(--primary)', color: 'var(--primary-fg)', padding: '14px', borderRadius: 20, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            + إضافة إشعار في "{currentSub.label}"
          </button>
        </div>
      )}

      {/* Bottom sheet تعديل */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 60 }}
          onClick={() => setEditing(null)}>
          <div style={{ background: 'var(--card)', borderRadius: '24px 24px 0 0', padding: '20px 16px 40px', width: '100%', maxHeight: '90svh', overflowY: 'auto', boxSizing: 'border-box' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, margin: 0 }}>تعديل: {editing.name_ar}</h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text3)', cursor: 'pointer' }}>✕</button>
            </div>

            {/* معاينة */}
            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 14, marginBottom: 16, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>معاينة الرسالة</p>
              <div style={{ background: '#2a2a2a', borderRadius: 12, padding: '10px 14px' }}>
                <p style={{ fontSize: 13, color: '#e0e0e0', margin: 0, lineHeight: 1.6 }}>{preview || editBody}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>نص الرسالة</label>
                {editing.variables && editing.variables.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {editing.variables.map((v) => (
                      <button key={v} onClick={() => { const n = editBody + `{{${v}}}`; setEditBody(n); generatePreview(n, editing.variables) }}
                        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: 'var(--primary-dim)', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}>
                        + {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                )}
                <textarea value={editBody}
                  onChange={(e) => { setEditBody(e.target.value); generatePreview(e.target.value, editing.variables) }}
                  rows={5}
                  style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 14px', background: 'var(--bg)', borderRadius: 12 }}>
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, fontWeight: 600 }}>إشعار مفعّل</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>إيقاف التفعيل يمنع إرسال هذا الإشعار</p>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={saveEdit} disabled={editSaving}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '13px', borderRadius: 16, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: editSaving ? 0.5 : 1 }}>
                {editSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button onClick={() => setEditing(null)}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '13px', borderRadius: 16, fontSize: 14, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet إضافة إشعار */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 60 }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '24px 24px 0 0', padding: '20px 16px 40px', width: '100%', maxHeight: '90svh', overflowY: 'auto', boxSizing: 'border-box' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16, margin: 0 }}>إضافة إشعار جديد</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text3)', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--primary)', margin: '0 0 16px', background: 'var(--primary-dim)', padding: '5px 10px', borderRadius: 10, display: 'inline-block' }}>
              {currentCategory.label} ← {currentSub.label}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>اسم الإشعار *</label>
                <input value={newForm.name_ar} onChange={(e) => setNewForm((f) => ({ ...f, name_ar: e.target.value }))}
                  placeholder="مثال: تذكير بموعد التدريب" style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>الحدث المرتبط *</label>
                <select value={newForm.event} onChange={(e) => setNewForm((f) => ({ ...f, event: e.target.value }))}
                  style={inputStyle}>
                  <option value="">اختر الحدث...</option>
                  {EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>متى يُرسل هذا الإشعار تلقائياً</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>معرف فريد (key) *</label>
                <input value={newForm.key} onChange={(e) => setNewForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/\s/g, '.') }))}
                  placeholder="مثال: academy.training_reminder" dir="ltr" style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>نص الرسالة * <span style={{ color: 'var(--text3)', fontWeight: 400 }}>استخدم {'{{'+'متغير'+'}}'}  للمتغيرات</span></label>
                <textarea value={newForm.body_ar} onChange={(e) => setNewForm((f) => ({ ...f, body_ar: e.target.value }))}
                  placeholder="مثال: مرحباً {{customer_name}}، تذكير بموعد تدريبك غداً..." rows={4}
                  style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
              </div>

              {/* معاينة */}
              {newForm.body_ar && (
                <div style={{ background: '#1a1a1a', borderRadius: 14, padding: 12, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, color: '#666', margin: '0 0 6px' }}>معاينة</p>
                  <p style={{ fontSize: 13, color: '#e0e0e0', margin: 0, lineHeight: 1.6 }}>
                    {newForm.body_ar.replace(/\{\{(\w+)\}\}/g, '[$1]')}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={saveNew} disabled={addSaving || !newForm.name_ar.trim() || !newForm.body_ar.trim() || !newForm.event || !newForm.key.trim()}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '13px', borderRadius: 16, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: (!newForm.name_ar.trim() || !newForm.body_ar.trim() || !newForm.event || addSaving) ? 0.5 : 1 }}>
                {addSaving ? 'جاري الحفظ...' : 'إضافة الإشعار'}
              </button>
              <button onClick={() => setShowAdd(false)}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '13px', borderRadius: 16, fontSize: 14, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الحذف */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 24 }}>
          <div style={{ background: 'var(--card)', borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: 'var(--text)', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>حذف الإشعار</h3>
            <p style={{ color: 'var(--text2)', fontSize: 13, margin: '0 0 20px' }}>هذا الإجراء لا يمكن التراجع عنه.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => deleteTemplate(confirmDelete)}
                style={{ flex: 1, background: 'var(--danger)', color: '#fff', padding: '12px', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                نعم، احذف
              </button>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '12px', borderRadius: 14, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
