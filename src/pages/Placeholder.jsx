import AppLayout from '../components/layout/AppLayout'

export default function Placeholder({ title }) {
  return (
    <AppLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{title}</h1>
      </div>
      <div className="glass glass-lg" style={{ padding: 64, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
          background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Coming Soon</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>หน้านี้กำลังพัฒนา</div>
      </div>
    </AppLayout>
  )
}
