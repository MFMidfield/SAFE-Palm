import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const OFFLINE_THRESHOLD = 30 * 1000

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="glass db-pad-s">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</div>
      <div style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: accent || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function NodeCard() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetchStatus()
    const channel = supabase.channel('node-status-card')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_status' },
        payload => checkOnline(payload.new))
      .subscribe()
    const t = setInterval(fetchStatus, 15000)
    return () => { supabase.removeChannel(channel); clearInterval(t) }
  }, [])

  const fetchStatus = async () => {
    const { data } = await supabase.from('board_status').select('*').eq('id', 'esp32-01').single()
    if (data) checkOnline(data)
  }
  const checkOnline = d => {
    const online = Date.now() - new Date(d.last_seen).getTime() < OFFLINE_THRESHOLD
    setStatus({ ...d, online })
  }

  const online = status?.online
  return (
    <div className="glass db-pad-s">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.6px' }}>โหนด ESP32</div>
      {status === null ? (
        <div className="skeleton" style={{ height: 28, width: 80, marginTop: 4 }} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className={`dot ${online ? 'dot-ok' : 'dot-danger'}`} />
            <span style={{ fontSize: 22, fontWeight: 700, color: online ? 'var(--ok)' : 'var(--danger)' }}>
              {online ? 'ออนไลน์' : 'ออฟไลน์'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
            เห็นล่าสุด {new Date(status.last_seen).toLocaleTimeString('th-TH')}
          </div>
        </>
      )}
    </div>
  )
}

function SystemCard() {
  const items = [
    { label: 'AI ฟังเสียง',   ok: true },
    { label: 'ไมโครโฟน',      ok: true },
    { label: 'TinyML',         ok: false },
  ]
  return (
    <div className="glass db-pad-s">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>สถานะระบบ</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.map(i => (
          <div key={i.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{i.label}</span>
            <span className={`chip ${i.ok ? 'chip-ok' : 'chip-warn'}`}>
              <span className="dot" style={{ width: 6, height: 6, background: i.ok ? 'var(--ok)' : 'var(--warn)' }} />
              {i.ok ? 'ทำงาน' : 'ไม่ทำงาน'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SummaryCards() {
  const [totalEvents, setTotalEvents] = useState('—')
  const [todayEvents, setTodayEvents] = useState('—')

  useEffect(() => {
    supabase.from('events').select('ts').then(({ data }) => {
      if (!data) return
      setTotalEvents(data.length)
      setTodayEvents(data.filter(e =>
        new Date(e.ts).toDateString() === new Date().toDateString()
      ).length)
    })
  }, [])

  return (
    <div className="summary-grid">
      <StatCard label="เหตุการณ์ทั้งหมด" value={totalEvents} sub="ทุกเหตุการณ์"      accent="var(--accent)" />
      <NodeCard />
      <StatCard label="เหตุการณ์วันนี้"   value={todayEvents} sub="ตั้งแต่เที่ยงคืน" accent="var(--warn)" />
      <SystemCard />
    </div>
  )
}
