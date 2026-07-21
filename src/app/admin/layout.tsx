import AdminTopBar from '@/components/AdminTopBar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <AdminTopBar />
      <div style={{ paddingBottom: 32 }}>
        {children}
      </div>
    </div>
  )
}
