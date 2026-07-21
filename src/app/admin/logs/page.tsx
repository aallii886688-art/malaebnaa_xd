'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  type: string
  title_ar: string
  body_ar: string
  created_at: string
  sent_via_whatsapp: boolean
  profiles: { full_name: string; phone: string } | null
}

export default function AdminLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('notifications')
      .select('*, profiles:user_id(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setLogs((data as Notification[]) ?? []); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">لوحة التحكم</p>
          <h1 className="text-lg font-bold">سجل النشاطات</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-2">
        {loading ? (
          <div className="text-center py-10 text-[#6B7280]">جاري التحميل...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-[#6B7280]">لا توجد نشاطات بعد</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl border border-[#E8ECEF] p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">{log.title_ar}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{log.body_ar}</p>
                  {log.profiles && (
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{log.profiles.full_name} · {log.profiles.phone}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${log.sent_via_whatsapp ? 'bg-[#E8F5F1] text-[#0F6E56]' : 'bg-red-50 text-red-400'}`}>
                    {log.sent_via_whatsapp ? 'واتساب ✓' : 'لم يُرسل'}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    {new Date(log.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
