import PartnerTopBar from '@/components/PartnerTopBar'

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <PartnerTopBar />
      <div style={{ paddingBottom: 32 }}>
        {children}
      </div>
    </div>
  )
}
