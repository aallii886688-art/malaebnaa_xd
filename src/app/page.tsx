import Link from 'next/link'

const sections = [
  { href: '/player/facilities', label: 'الملاعب', color: 'bg-[#E8F5F1] border-[#0F6E56]', icon: '⚽', accent: '#0F6E56' },
  { href: '/player/academies', label: 'الأكاديميات', color: 'bg-[#F0E8FF] border-[#6B3FA0]', icon: '🏅', accent: '#6B3FA0' },
  { href: '/player/tournaments', label: 'البطولات', color: 'bg-[#FFF8E8] border-[#C17B1A]', icon: '🏆', accent: '#C17B1A' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E8ECEF] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="text-xl font-bold text-[#0F6E56]">ملاعبنا</span>
        <div className="flex gap-2">
          <Link href="/login" className="text-sm text-[#0F6E56] font-medium px-3 py-1.5 border border-[#0F6E56] rounded-lg">دخول</Link>
          <Link href="/register" className="text-sm text-white bg-[#0F6E56] px-3 py-1.5 rounded-lg">تسجيل</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#E8F5F1] px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-[#0F6E56] mb-2">احجز ملعبك الآن</h1>
        <p className="text-[#6B7280] text-sm mb-6">ملاعب، أكاديميات، وبطولات في مكان واحد</p>
        <input
          type="text"
          placeholder="ابحث عن ملعب أو مدينة..."
          className="w-full max-w-md mx-auto block bg-white border border-[#E8ECEF] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0F6E56]"
        />
      </section>

      {/* Sections */}
      <section className="px-4 py-6">
        <h2 className="text-base font-bold text-[#1A1A1A] mb-4">استكشف</h2>
        <div className="grid grid-cols-3 gap-3">
          {sections.map((s) => (
            <Link key={s.href} href={s.href}
              className={`${s.color} border-2 rounded-2xl p-4 flex flex-col items-center gap-2 text-center`}>
              <span className="text-3xl">{s.icon}</span>
              <span className="text-sm font-semibold" style={{ color: s.accent }}>{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Facilities */}
      <section className="px-4 pb-8">
        <h2 className="text-base font-bold text-[#1A1A1A] mb-4">ملاعب مميزة</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E8ECEF] overflow-hidden flex">
              <div className="w-24 h-24 bg-[#E8F5F1] flex-shrink-0 flex items-center justify-center text-3xl">⚽</div>
              <div className="p-3 flex-1">
                <div className="font-semibold text-sm text-[#1A1A1A]">ملعب النجوم {i}</div>
                <div className="text-xs text-[#6B7280] mt-0.5">الرياض • كرة قدم</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[#C17B1A]">⭐ 4.8</span>
                  <span className="text-xs font-bold text-[#0F6E56]">150 ر.س / ساعة</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
