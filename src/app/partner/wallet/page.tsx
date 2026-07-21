'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Wallet = {
  balance_sar: number
  pending_sar: number
  total_earned_sar: number
  total_settled_sar: number
}

type WalletTx = {
  id: string
  type: string
  source_type: string
  amount_sar: number
  description_ar: string
  created_at: string
}

type Settlement = {
  id: string
  amount_sar: number
  status: string
  created_at: string
}

const banks = ['البنك الأهلي', 'بنك الراجحي', 'بنك الرياض', 'البنك السعودي الفرنسي', 'بنك البلاد', 'بنك الإنماء', 'بنك الجزيرة', 'سامبا', 'غيره']

export default function PartnerWalletPage() {
  const router = useRouter()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<WalletTx[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [form, setForm] = useState({ amount: '', bank_name: '', iban: '', account_holder: '' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: w }, { data: tx }, { data: st }] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', user.id).single(),
        supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('settlements').select('id, amount_sar, status, created_at').eq('partner_user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ])

      setWallet(w as Wallet)
      setTransactions((tx as WalletTx[]) ?? [])
      setSettlements((st as Settlement[]) ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  const requestWithdraw = async () => {
    if (!form.amount || !form.bank_name || !form.iban || !form.account_holder) {
      setMsg('يرجى تعبئة جميع الحقول'); return
    }
    const amount = parseFloat(form.amount)
    if (!wallet || amount > wallet.balance_sar || amount <= 0) {
      setMsg('المبلغ غير صحيح أو يتجاوز الرصيد'); return
    }
    setSubmitting(true); setMsg('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: w } = await supabase.from('wallets').select('id').eq('user_id', user.id).single()
    if (!w) { setMsg('المحفظة غير موجودة'); setSubmitting(false); return }

    const { error } = await supabase.from('settlements').insert({
      partner_user_id: user.id,
      wallet_id: w.id,
      amount_sar: amount,
      bank_name: form.bank_name,
      iban: form.iban,
      account_holder: form.account_holder,
    })

    if (error) { setMsg('فشل إرسال الطلب'); setSubmitting(false); return }
    setMsg('تم إرسال طلب السحب بنجاح ✓')
    setShowWithdraw(false)
    setForm({ amount: '', bank_name: '', iban: '', account_holder: '' })
    setSubmitting(false)
  }

  const txColor = (type: string) => type === 'credit' ? 'text-[#0F6E56]' : 'text-red-500'
  const txSign  = (type: string) => type === 'credit' ? '+' : '-'

  const settlementStatus: Record<string, string> = {
    requested: 'بانتظار المراجعة', approved: 'موافق عليه',
    processing: 'قيد التحويل', completed: 'مكتمل', rejected: 'مرفوض',
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#6B7280]">جاري التحميل...</div>

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-10">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl">←</button>
        <div><p className="text-xs opacity-80">الشريك</p><h1 className="text-lg font-bold">محفظتي</h1></div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* بطاقة الرصيد */}
        <div className="bg-[#0F6E56] rounded-2xl p-5 text-white">
          <p className="text-xs opacity-80 mb-1">الرصيد المتاح</p>
          <p className="text-4xl font-bold mb-4">{wallet?.balance_sar?.toFixed(2) ?? '0.00'} <span className="text-lg">ر.س</span></p>
          <div className="grid grid-cols-2 gap-3 border-t border-white/20 pt-3">
            <div>
              <p className="text-xs opacity-70">إجمالي الأرباح</p>
              <p className="font-bold">{wallet?.total_earned_sar?.toFixed(2) ?? '0.00'}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">إجمالي المسحوب</p>
              <p className="font-bold">{wallet?.total_settled_sar?.toFixed(2) ?? '0.00'}</p>
            </div>
          </div>
        </div>

        {/* زر السحب */}
        {(wallet?.balance_sar ?? 0) > 0 && (
          <button onClick={() => setShowWithdraw(true)}
            className="w-full bg-white border-2 border-[#0F6E56] text-[#0F6E56] py-3 rounded-2xl font-bold text-sm">
            💸 طلب سحب الأرباح
          </button>
        )}

        {msg && <p className={`text-xs text-center ${msg.includes('✓') ? 'text-[#0F6E56]' : 'text-red-500'}`}>{msg}</p>}

        {/* سجل الحركات */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
            <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">آخر الحركات</h2>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#1A1A1A]">{tx.description_ar}</p>
                    <p className="text-[10px] text-[#9CA3AF]">
                      {new Date(tx.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${txColor(tx.type)}`}>
                    {txSign(tx.type)}{tx.amount_sar} ر
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* طلبات التسوية السابقة */}
        {settlements.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8ECEF] p-4">
            <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">طلبات السحب</h2>
            <div className="space-y-2">
              {settlements.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-[#F8F9FA] last:border-0">
                  <div>
                    <p className="text-xs font-medium text-[#1A1A1A]">{s.amount_sar} ر.س</p>
                    <p className="text-[10px] text-[#9CA3AF]">{new Date(s.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <span className="text-xs text-[#6B7280]">{settlementStatus[s.status] ?? s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* نافذة طلب السحب */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowWithdraw(false)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[#1A1A1A] mb-4">طلب سحب الأرباح</h3>
            <p className="text-xs text-[#6B7280] mb-4">الرصيد المتاح: <strong className="text-[#0F6E56]">{wallet?.balance_sar?.toFixed(2)} ر.س</strong></p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">المبلغ (ر.س) *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder={`أقصى ${wallet?.balance_sar?.toFixed(2)}`}
                  max={wallet?.balance_sar ?? 0} min={1}
                  className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">البنك *</label>
                <select value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                  className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]">
                  <option value="">اختر البنك</option>
                  {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">صاحب الحساب *</label>
                <input value={form.account_holder} onChange={(e) => setForm((f) => ({ ...f, account_holder: e.target.value }))}
                  placeholder="الاسم كما في البطاقة"
                  className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">رقم IBAN *</label>
                <input value={form.iban} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value.toUpperCase() }))}
                  placeholder="SA0000000000000000000000"
                  className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] font-mono"
                  dir="ltr" maxLength={24} />
              </div>
            </div>

            {msg && <p className="text-red-500 text-xs mt-2">{msg}</p>}

            <div className="flex gap-2 mt-4">
              <button onClick={requestWithdraw} disabled={submitting}
                className="flex-1 bg-[#0F6E56] text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">
                {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
              <button onClick={() => setShowWithdraw(false)}
                className="flex-1 border border-[#E8ECEF] py-2.5 rounded-xl text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
