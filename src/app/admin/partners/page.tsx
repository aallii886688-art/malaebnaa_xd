'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PartnerRole = {
  id: string; user_id: string; activity: string; status: string
  rejection_reason: string | null; admin_notes: string | null; created_at: string
  business_name: string | null; business_city: string | null
  commercial_reg: string | null; applicant_phone: string | null; applicant_notes: string | null
}
type Profile = { id: string; full_name: string; phone: string }

const activityLabel: Record<string, string> = {
  facility_manager: '🏟️ مدير ملعب',
  academy_manager: '🏅 مدير أكاديمية',
  tournament_manager: '🏆 منظم بطولة',
}

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  pending:          { label: 'معلق',         bg: 'var(--gold-dim)',    color: 'var(--gold)' },
  approved:         { label: 'مقبول ✓',      bg: 'var(--primary-dim)', color: 'var(--primary)' },
  rejected:         { label: 'مرفوض',        bg: 'var(--danger-dim)',  color: 'var(--danger)' },
  revision_needed:  { label: 'يحتاج تعديل',  bg: 'rgba(234,88,12,0.1)', color: '#ea580c' },
  suspended:        { label: 'موقوف',        bg: 'var(--card2)',       color: 'var(--text3)' },
}

type ModalType = 'reject' | 'revision' | null

export default function AdminPartnersPage() {
  const [roles, setRoles] = useState<PartnerRole[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [modal, setModal] = useState<{ type: ModalType; id: string } | null>(null)
  const [noteText, setNoteText] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()

    // جلب الطلبات
    const { data: rolesData, error } = await supabase
      .from('partner_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !rolesData) { setLoading(false); return }
    setRoles(rolesData as PartnerRole[])

    // جلب بيانات المتقدمين بشكل منفصل
    const userIds = [...new Set(rolesData.map((r) => r.user_id))]
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', userIds)
      const profileMap: Record<string, Profile> = {}
      profilesData?.forEach((p) => { profileMap[p.id] = p as Profile })
      setProfiles(profileMap)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: string, note?: string) => {
    setActionLoading(id)
    const supabase = createClient()
    const update: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() }
    if (status === 'rejected') update.rejection_reason = note ?? ''
    if (status === 'revision_needed') update.admin_notes = note ?? ''
    await supabase.from('partner_roles').update(update).eq('id', id)
    setModal(null); setNoteText('')
    await load()
    setActionLoading(null)
  }

  const filtered = filter === 'all' ? roles : roles.filter((r) => r.status === filter)
  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, revision_needed: 0, all: roles.length }
  roles.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1 })

  return (
    <div>
      {/* Sub-header */}
      <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '16px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>طلبات الشركاء</h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>مراجعة طلبات تفعيل الأنشطة</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }} className="no-scrollbar">
        {[
          { key: 'pending', label: 'معلقة' },
          { key: 'revision_needed', label: 'تحتاج تعديل' },
          { key: 'approved', label: 'مقبولة' },
          { key: 'rejected', label: 'مرفوضة' },
          { key: 'all', label: 'الكل' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: filter === key ? 'none' : '1px solid var(--border)', cursor: 'pointer', background: filter === key ? 'var(--primary)' : 'var(--card)', color: filter === key ? 'var(--primary-fg)' : 'var(--text2)', whiteSpace: 'nowrap' }}>
            {label} ({counts[key] ?? 0})
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          [1,2,3].map((i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 18 }} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ color: 'var(--text2)', fontSize: 15 }}>لا توجد طلبات</p>
          </div>
        ) : filtered.map((r) => {
          const st = statusStyle[r.status] ?? { label: r.status, bg: 'var(--bg)', color: 'var(--text3)' }
          const profile = profiles[r.user_id]
          const isExpanded = expanded === r.id
          return (
            <div key={r.id} style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, margin: '0 0 2px' }}>
                    {r.business_name ?? profile?.full_name ?? '—'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 4px' }}>
                    {activityLabel[r.activity]} {r.business_city ? `· ${r.business_city}` : ''}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                    {new Date(r.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600, flexShrink: 0 }}>{st.label}</span>
              </div>

              {/* Quick info */}
              <div style={{ display: 'flex', gap: 16, padding: '0 16px 12px', borderBottom: '1px solid var(--border)' }}>
                {profile?.full_name && <span style={{ fontSize: 12, color: 'var(--text2)' }}>👤 {profile.full_name}</span>}
                {(r.applicant_phone ?? profile?.phone) && (
                  <span style={{ fontSize: 12, color: 'var(--text2)' }} dir="ltr">📞 {r.applicant_phone ?? profile?.phone}</span>
                )}
              </div>

              {/* Expandable details */}
              <button onClick={() => setExpanded(isExpanded ? null : r.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>
                <span>تفاصيل الطلب</span>
                <span>{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div style={{ padding: '4px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)' }}>
                  {[
                    { label: 'اسم النشاط', value: r.business_name },
                    { label: 'المدينة', value: r.business_city },
                    { label: 'السجل التجاري', value: r.commercial_reg },
                    { label: 'رقم التواصل', value: r.applicant_phone },
                    { label: 'ملاحظات المتقدم', value: r.applicant_notes },
                  ].filter(i => i.value).map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>{label}:</span>
                      <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                  {r.admin_notes && (
                    <div style={{ background: 'rgba(234,88,12,0.08)', borderRadius: 10, padding: '8px 12px', marginTop: 4 }}>
                      <p style={{ fontSize: 12, color: '#ea580c', margin: 0 }}>ملاحظات الإدارة: {r.admin_notes}</p>
                    </div>
                  )}
                  {r.rejection_reason && (
                    <div style={{ background: 'var(--danger-dim)', borderRadius: 10, padding: '8px 12px', marginTop: 4 }}>
                      <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>سبب الرفض: {r.rejection_reason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => updateStatus(r.id, 'approved')} disabled={actionLoading === r.id}
                    style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', fontSize: 13, padding: '9px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, opacity: actionLoading === r.id ? 0.5 : 1 }}>
                    ✓ قبول
                  </button>
                  <button onClick={() => { setModal({ type: 'revision', id: r.id }); setNoteText('') }}
                    style={{ flex: 1, background: 'rgba(234,88,12,0.1)', color: '#ea580c', fontSize: 13, padding: '9px', borderRadius: 12, border: '1px solid #ea580c', cursor: 'pointer', fontWeight: 600 }}>
                    ✏️ طلب تعديل
                  </button>
                  <button onClick={() => { setModal({ type: 'reject', id: r.id }); setNoteText('') }}
                    style={{ flex: 1, background: 'var(--danger-dim)', color: 'var(--danger)', fontSize: 13, padding: '9px', borderRadius: 12, border: '1px solid var(--danger)', cursor: 'pointer', fontWeight: 600 }}>
                    ✕ رفض
                  </button>
                </div>
              )}
              {r.status === 'approved' && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => updateStatus(r.id, 'suspended')} disabled={actionLoading === r.id}
                    style={{ background: 'var(--card2)', color: 'var(--text2)', fontSize: 12, padding: '7px 16px', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer' }}>
                    إيقاف النشاط
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal: reject or revision */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', zIndex: 60 }}
          onClick={() => setModal(null)}>
          <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
              {modal.type === 'reject' ? '✕ رفض الطلب' : '✏️ طلب تعديل'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 14px' }}>
              {modal.type === 'reject' ? 'اكتب سبب الرفض ليصل للشريك' : 'اكتب ما يحتاج تعديله ليتمكن الشريك من المراجعة وإعادة التقديم'}
            </p>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
              placeholder={modal.type === 'reject' ? 'سبب الرفض...' : 'ما الذي يحتاج تعديلاً؟...'}
              rows={4}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 14, padding: 12, fontSize: 14, outline: 'none', background: 'var(--bg)', color: 'var(--text)', resize: 'none', boxSizing: 'border-box', marginBottom: 14, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => updateStatus(modal.id, modal.type === 'reject' ? 'rejected' : 'revision_needed', noteText)}
                disabled={!noteText.trim() || !!actionLoading}
                style={{ flex: 1, background: modal.type === 'reject' ? 'var(--danger)' : '#ea580c', color: '#fff', padding: '12px', borderRadius: 14, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', opacity: !noteText.trim() ? 0.5 : 1 }}>
                {modal.type === 'reject' ? 'تأكيد الرفض' : 'إرسال ملاحظات التعديل'}
              </button>
              <button onClick={() => setModal(null)}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '12px', borderRadius: 14, fontSize: 14, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
