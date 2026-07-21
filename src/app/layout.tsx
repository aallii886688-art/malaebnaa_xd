import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ملاعبنا',
  description: 'منصة حجز الملاعب والأكاديميات والبطولات الرياضية في السعودية',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F6E56',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="min-h-full bg-[#F8F9FA] text-[#1A1A1A]">{children}</body>
    </html>
  )
}
