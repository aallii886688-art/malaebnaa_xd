'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Settlement = {
  id: string
  amount_sar: number
  status: string
  bank_name: string | null
  iban: string | null
  account_holder: string | null
  created_at: string
  profiles: { full_name: string; phone: string } | null
}

const statusInfo: Record<string, { label: string; color: string }> = {
  requested:  { label: 'طلب جديد',     color: 'bg-yellow-50 text-yellow-600' },
  approved:   { label: 'موافق عليه',   color: 'bg-blue-50 text-blue-600' },
  processing: { label: 'قيد التحويل', color: 'bg-purple-50 text-purple-600' },
  completed:  { label: 'مكتمل',        color: 'bg-[#E8F5F1] text-[#0F6E56]' },
  rejected:   { label: 'مرفوض',        color: 'bg-red-50 text-red-500' },
}

export default function AdminSettlementsPage() {
  const router = useRouter()
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'requested' | 'all'>('requested')
  const [updating, setUpdating] = useState<string | null>(null)
  const [refInput, setRefInput] = useState<Record<string, string>>({})

  const load = async () => {
    const supabase = createClient()
    let q = supabase
      .from('settlements')
      .select('*, profiles:partner_user_id(full_name, phone)')
      .order('created_at', { ascending: false })
    if (filter === 'requested') q = q.eq('status', 'requested')
    const { data } = await q
    setSettlements((data as Settlement[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { setLoading(true); load() }, [filter])

  const updateStatus = async (id: string, status: string, extra?: Record<string, string>) => {
    setUpdating(id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('settlements').update({
      status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      ...extra,
    }).eq('id', id)
    setSettlements((s) => s.map((x) => x.id === id ? { ...x, status } : x))
    setUpdating(null)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div><p className="text-xs opacity-80">لوحة التحكم</p><h1 className="text-lg font-bold">طلبات التسوية</h1></div>
      </header>

      <div className="flex bg-white border-b border-[#E8ECEF]">
        {(['requested', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-3 text-xs font-medium ${filter === f ? 'text-[#0F6E56] border-b-2 border-[#0F6E56]' : 'text-[#6B7280]'}`}>
            {f === 'requested' ? 'الجديدة' : 'الكل'}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : settlements.length === 0 ? (
          <div className="text-center py-16 text-[#6B7280]">لا توجد طلبات</div>
        ) : settlements.map((s) => {
          const st = statusInfo[s.status] ?? { label: s.status, color: 'bg-gray-100 text-gray-500' }
          return (
            <div key={s.id} className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm text-[#1A1A1A]">{s.profiles?.full_name}</p>
                  <p className="text-xs text-[#6B7280]" dir="ltr">{s.profiles?.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  <span className="text-base font-bold text-[#0F6E56]">{s.amount_sar} ر</span>
                </div>
              </div>

              {(s.bank_name || s.iban) && (
                <div className="bg-[#F8F9FA] rounded-xl px-3 py-2 mb-3 space-y-0.5">
                  {s.account_holder && <p className="text-xs text-[#1A1A1A]">{s.account_holder}</p>}
                  {s.bank_name && <p className="text-xs text-[#6B7280]">البنك: {s.bank_name}</p>}
                  {s.iban && <p className="text-xs text-[#6B7280] font-mono" dir="ltr">{s.iban}</p>}
                </div>
              )}

              {s.status === 'requested' && (
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(s.id, 'approved')} disabled={updating === s.id}
                    className="flex-1 bg-[#0F6E56] text-white text-xs py-2 rounded-xl disabled:opacity-50">موافقة</button>
                  <button onClick={() => updateStatus(s.id, 'rejected')} disabled={updating === s.id}
                    className="flex-1 border border-red-300 text-red-500 text-xs py-2 rounded-xl disabled:opacity-50">رفض</button>
                </div>
              )}

              {s.status === 'approved' && (
                <div className="space-y-2">
                  <input value={refInput[s.id] ?? ''} onChange={(e) => setRefInput((r) => ({ ...r, [s.id]: e.target.value }))}
                    placeholder="رقم مرجع التحويل البنكي"
                    className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0F6E56]"
                    dir="ltr" />
                  <button onClick={() => updateStatus(s.id, 'completed', { transfer_reference: refInput[s.id] ?? '' })}
                    disabled={updating === s.id || !refInput[s.id]?.trim()}
                    className="w-full bg-[#0F6E56] text-white text-xs py-2 rounded-xl disabled:opacity-50">
                    ✓ تأكيد إتمام التحويل
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
