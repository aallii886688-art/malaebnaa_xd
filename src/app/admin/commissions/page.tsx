'use client'
import { useRouter } from 'next/navigation'

export default function AdminCommissionsPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-[#0F6E56] text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white text-xl">←</button>
        <div>
          <p className="text-xs opacity-80">لوحة التحكم</p>
          <h1 className="text-lg font-bold">إدارة العمولات</h1>
        </div>
      </header>
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-4">
        <span className="text-5xl">💰</span>
        <p className="text-base font-bold text-[#1A1A1A]">قيد الإعداد</p>
        <p className="text-sm text-[#6B7280] text-center">سيتم إطلاق نظام العمولات قريباً بعد تفعيل بوابة الدفع</p>
      </div>
    </div>
  )
}
