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

const settlementStatus: Record<string, string> = {
  requested: 'بانتظار المراجعة', approved: 'موافق عليه',
  processing: 'قيد التحويل', completed: 'مكتمل', rejected: 'مرفوض',
}

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

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', background: 'var(--card)', color: 'var(--text)', boxSizing: 'border-box' as const }

  if (loading) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>جاري التحميل...</div>

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 40 }}>
      <header style={{ background: 'var(--bg2)', padding: '52px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ fontSize: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>←</button>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>الشريك</p>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>محفظتي</h1>
        </div>
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* بطاقة الرصيد */}
        <div style={{ background: 'var(--primary)', borderRadius: 20, padding: 20, color: 'var(--primary-fg)' }}>
          <p style={{ fontSize: 12, opacity: 0.8, margin: '0 0 4px' }}>الرصيد المتاح</p>
          <p style={{ fontSize: 36, fontWeight: 800, margin: '0 0 16px' }}>{wallet?.balance_sar?.toFixed(2) ?? '0.00'} <span style={{ fontSize: 16, fontWeight: 400 }}>ر.س</span></p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 12 }}>
            <div>
              <p style={{ fontSize: 11, opacity: 0.7, margin: '0 0 2px' }}>إجمالي الأرباح</p>
              <p style={{ fontWeight: 700, margin: 0 }}>{wallet?.total_earned_sar?.toFixed(2) ?? '0.00'}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, opacity: 0.7, margin: '0 0 2px' }}>إجمالي المسحوب</p>
              <p style={{ fontWeight: 700, margin: 0 }}>{wallet?.total_settled_sar?.toFixed(2) ?? '0.00'}</p>
            </div>
          </div>
        </div>

        {(wallet?.balance_sar ?? 0) > 0 && (
          <button onClick={() => setShowWithdraw(true)}
            style={{ width: '100%', border: '2px solid var(--primary)', color: 'var(--primary)', background: 'var(--primary-dim)', padding: '12px', borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            💸 طلب سحب الأرباح
          </button>
        )}

        {msg && <p style={{ fontSize: 12, textAlign: 'center', color: msg.includes('✓') ? 'var(--primary)' : 'var(--danger)' }}>{msg}</p>}

        {transactions.length > 0 && (
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>آخر الحركات</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {transactions.map((tx) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: '0 0 2px' }}>{tx.description_ar}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{new Date(tx.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: tx.type === 'credit' ? 'var(--primary)' : 'var(--danger)' }}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount_sar} ر
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {settlements.length > 0 && (
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>طلبات السحب</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {settlements.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: i < settlements.length - 1 ? 8 : 0, borderBottom: i < settlements.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: '0 0 2px' }}>{s.amount_sar} ر.س</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>{new Date(s.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{settlementStatus[s.status] ?? s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showWithdraw && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setShowWithdraw(false)}>
          <div style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxHeight: '90dvh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>طلب سحب الأرباح</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 16px' }}>الرصيد المتاح: <strong style={{ color: 'var(--primary)' }}>{wallet?.balance_sar?.toFixed(2)} ر.س</strong></p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>المبلغ (ر.س) *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder={`أقصى ${wallet?.balance_sar?.toFixed(2)}`} max={wallet?.balance_sar ?? 0} min={1}
                  style={{ ...inputStyle }} dir="ltr" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>البنك *</label>
                <select value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} style={inputStyle}>
                  <option value="">اختر البنك</option>
                  {banks.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>صاحب الحساب *</label>
                <input value={form.account_holder} onChange={(e) => setForm((f) => ({ ...f, account_holder: e.target.value }))}
                  placeholder="الاسم كما في البطاقة" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>رقم IBAN *</label>
                <input value={form.iban} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value.toUpperCase() }))}
                  placeholder="SA0000000000000000000000" style={{ ...inputStyle, fontFamily: 'monospace' }}
                  dir="ltr" maxLength={24} />
              </div>
            </div>

            {msg && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{msg}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={requestWithdraw} disabled={submitting}
                style={{ flex: 1, background: 'var(--primary)', color: 'var(--primary-fg)', padding: '11px', borderRadius: 14, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>
                {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
              <button onClick={() => setShowWithdraw(false)}
                style={{ flex: 1, border: '1px solid var(--border)', padding: '11px', borderRadius: 14, fontSize: 13, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
