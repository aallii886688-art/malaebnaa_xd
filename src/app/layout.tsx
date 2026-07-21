import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/lib/theme'
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
    <html lang="ar" dir="rtl" data-theme="dark">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
