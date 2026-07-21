'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Refund = {
  id: string
  payment_type: string
  amount_sar: number
  reason: string
  status: string
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

const statusInfo: Record<string, { label: string; color: string }> = {
  requested:  { label: 'بانتظار المراجعة', color: 'bg-yellow-50 text-yellow-600' },
  approved:   { label: 'موافق عليه',        color: 'bg-blue-50 text-blue-600' },
  rejected:   { label: 'مرفوض',            color: 'bg-red-50 text-red-500' },
  completed:  { label: 'مكتمل',            color: 'bg-[#E8F5F1] text-[#0F6E56]' },
}

const typeLabel: Record<string, string> = {
  booking: '📅 حجز', subscription: '🏅 اشتراك', tournament: '🏆 بطولة',
}

export default function AdminRefundsPage() {
  const router = useRouter()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'requested' | 'all'>('requested')
  const [updating, setUpdating] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    let q = supabase
      .from('refunds')
      .select('*, profiles:user_id(full_name, phone)')
      .order('created_at', { ascending: false })
    if (filter === 'requested') q = q.eq('status', 'requested')
    const { data } = await q
    setRefunds((data as Refund[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  const approve = async (id: string) => {
    setUpdating(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('refunds').update({
      status: 'approved',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    setRefunds((r) => r.map((x) => x.id === id ? { ...x, status: 'approved' } : x))
    setUpdating(null)
  }

  const reject = async (id: string) => {
    if (!rejectReason.trim()) return
    setUpdating(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('refunds').update({
      status: 'rejected',
      rejection_reason: rejectReason,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    setRefunds((r) => r.map((x) => x.id === id ? { ...x, status: 'rejected' } : x))
    setRejectTarget(null); setRejectReason(''); setUpdating(null)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div><p className="text-xs opacity-80">لوحة التحكم</p><h1 className="text-lg font-bold">طلبات الاسترداد</h1></div>
      </header>

      <div className="flex bg-white border-b border-[#E8ECEF]">
        {(['requested', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-3 text-xs font-medium ${filter === f ? 'text-[#0F6E56] border-b-2 border-[#0F6E56]' : 'text-[#6B7280]'}`}>
            {f === 'requested' ? 'بانتظار المراجعة' : 'الكل'}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-16 text-[#6B7280]">لا توجد طلبات</div>
        ) : refunds.map((r) => {
          const st = statusInfo[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-500' }
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm text-[#1A1A1A]">{r.profiles?.full_name}</p>
                  <p className="text-xs text-[#6B7280]" dir="ltr">{r.profiles?.phone}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{typeLabel[r.payment_type]}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  <span className="text-sm font-bold text-[#0F6E56]">{r.amount_sar} ر</span>
                </div>
              </div>

              <div className="bg-[#F8F9FA] rounded-xl px-3 py-2 mb-3">
                <p className="text-xs text-[#6B7280]">السبب: <span className="text-[#1A1A1A]">{r.reason}</span></p>
              </div>

              {r.status === 'requested' && (
                rejectTarget === r.id ? (
                  <div className="space-y-2">
                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="سبب الرفض..."
                      rows={2}
                      className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-400 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => reject(r.id)} disabled={updating === r.id}
                        className="flex-1 bg-red-500 text-white text-xs py-2 rounded-xl disabled:opacity-50">تأكيد الرفض</button>
                      <button onClick={() => { setRejectTarget(null); setRejectReason('') }}
                        className="flex-1 border border-[#E8ECEF] text-xs py-2 rounded-xl">إلغاء</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => approve(r.id)} disabled={updating === r.id}
                      className="flex-1 bg-[#0F6E56] text-white text-xs py-2 rounded-xl disabled:opacity-50">✓ موافقة</button>
                    <button onClick={() => setRejectTarget(r.id)}
                      className="flex-1 border border-red-300 text-red-500 text-xs py-2 rounded-xl">✕ رفض</button>
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
