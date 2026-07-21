'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type PartnerRole = {
  id: string
  user_id: string
  activity: string
  status: string
  rejection_reason: string | null
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

const activityLabel: Record<string, string> = {
  facility_manager: '🏟️ مدير ملعب',
  academy_manager: '🏅 مدير أكاديمية',
  tournament_manager: '🏆 منظم بطولة',
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending:   { label: 'معلق',    color: 'bg-yellow-50 text-yellow-600' },
  approved:  { label: 'مقبول',   color: 'bg-[#E8F5F1] text-[#0F6E56]' },
  rejected:  { label: 'مرفوض',  color: 'bg-red-50 text-red-500' },
  suspended: { label: 'موقوف',  color: 'bg-gray-100 text-gray-500' },
}

export default function AdminPartnersPage() {
  const router = useRouter()
  const [roles, setRoles] = useState<PartnerRole[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('partner_roles')
      .select('*, profiles(full_name, phone)')
      .order('created_at', { ascending: false })
    setRoles((data as PartnerRole[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approve = async (id: string) => {
    setActionLoading(id)
    const supabase = createClient()
    await supabase.from('partner_roles').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', id)
    await load()
    setActionLoading(null)
  }

  const reject = async () => {
    if (!rejectId) return
    setActionLoading(rejectId)
    const supabase = createClient()
    await supabase.from('partner_roles').update({
      status: 'rejected',
      rejection_reason: rejectReason,
      reviewed_at: new Date().toISOString(),
    }).eq('id', rejectId)
    setRejectId(null)
    setRejectReason('')
    await load()
    setActionLoading(null)
  }

  const filtered = filter === 'all' ? roles : roles.filter((r) => r.status === filter)

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">لوحة التحكم</p>
          <h1 className="text-lg font-bold">طلبات الشركاء</h1>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === f ? 'bg-[#0F6E56] text-white' : 'bg-white border border-[#E8ECEF] text-[#6B7280]'}`}>
            {f === 'pending' ? 'معلقة' : f === 'approved' ? 'مقبولة' : f === 'rejected' ? 'مرفوضة' : 'الكل'}
            {' '}({f === 'all' ? roles.length : roles.filter((r) => r.status === f).length})
          </button>
        ))}
      </div>

      <div className="px-4 pb-6 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-[#6B7280]">لا توجد طلبات</div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-[#E8ECEF] p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm text-[#1A1A1A]">{r.profiles?.full_name}</p>
                  <p className="text-xs text-[#6B7280]" dir="ltr">{r.profiles?.phone}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel[r.status]?.color}`}>
                  {statusLabel[r.status]?.label}
                </span>
              </div>

              <p className="text-xs text-[#1A1A1A] mb-1">{activityLabel[r.activity]}</p>
              <p className="text-[10px] text-[#9CA3AF] mb-3">
                {new Date(r.created_at).toLocaleDateString('ar-SA')}
              </p>

              {r.rejection_reason && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2 mb-3">سبب الرفض: {r.rejection_reason}</p>
              )}

              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => approve(r.id)} disabled={actionLoading === r.id}
                    className="flex-1 bg-[#0F6E56] text-white text-xs py-2 rounded-lg font-medium disabled:opacity-50">
                    {actionLoading === r.id ? '...' : '✓ قبول'}
                  </button>
                  <button onClick={() => setRejectId(r.id)}
                    className="flex-1 border border-red-500 text-red-500 text-xs py-2 rounded-lg font-medium">
                    ✕ رفض
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setRejectId(null)}>
          <div className="bg-white rounded-t-2xl p-5 w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[#1A1A1A] mb-3">سبب الرفض</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب الرفض..."
              rows={3}
              className="w-full border border-[#E8ECEF] rounded-xl p-3 text-sm focus:outline-none focus:border-[#0F6E56] mb-3" />
            <div className="flex gap-2">
              <button onClick={reject} disabled={!rejectReason.trim() || !!actionLoading}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                تأكيد الرفض
              </button>
              <button onClick={() => setRejectId(null)} className="flex-1 border border-[#E8ECEF] py-2.5 rounded-xl text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
