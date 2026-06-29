import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const OFFLINE_THRESHOLD = 5 * 60 * 1000   // 5 minutes

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="glass db-pad-s">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</div>
      <div style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, color: accent || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

/* info shape: null (loading) | { total: 0 } | { total: 1, online: bool, lastSeen: string|null } | { total: N, count: N } */
function NodeCard() {
  const { user } = useAuth()
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (!user) return

    async function load() {
      const { data: devData } = await supabase
        .from('devices').select('id').eq('user_id', user.id)
      const devList = devData || []

      if (devList.length === 0) {
        setInfo({ total: 0 })
        return
      }

      const ids = devList.map(d => d.id)
      const { data: statusData } = await supabase
        .from('board_status').select('*').in('id', ids)

      const now = Date.now()
      const map = {}
      ;(statusData || []).forEach(row => { map[row.id] = row })

      if (devList.length === 1) {
        const s = map[devList[0].id]
        const online = !!(s && now - new Date(s.last_seen).getTime() < OFFLINE_THRESHOLD)
        setInfo({ total: 1, online, lastSeen: s?.last_seen || null })
      } else {
        const count = devList.filter(d => {
          const s = map[d.id]
          return s && now - new Date(s.last_seen).getTime() < OFFLINE_THRESHOLD
        }).length
        setInfo({ total: devList.length, count })
      }
    }

    load()

    const channel = supabase.channel('node-status-card')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_status' },
        () => load())
      .subscribe()

    const t = setInterval(load, 15000)
    return () => { supabase.removeChannel(channel); clearInterval(t) }
  }, [user])

  const label = (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
      โหนด ESP32
    </div>
  )

  /* Loading */
  if (info === null) {
    return (
      <div className="glass db-pad-s">
        {label}
        <div className="skeleton" style={{ height: 28, width: 80, marginTop: 4 }} />
      </div>
    )
  }

  /* No devices registered yet */
  if (info.total === 0) {
    return (
      <div className="glass db-pad-s">
        {label}
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-2)', lineHeight: 1, marginTop: 4 }}>—</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>ยังไม่มีอุปกรณ์</div>
      </div>
    )
  }

  /* Single device */
  if (info.total === 1) {
    const { online, lastSeen } = info
    return (
      <div className="glass db-pad-s">
        {label}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span className={`dot ${online ? 'dot-ok' : 'dot-danger'}`} />
          <span style={{ fontSize: 22, fontWeight: 700, color: online ? 'var(--ok)' : 'var(--danger)' }}>
            {online ? 'ออนไลน์' : 'ออฟไลน์'}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
          {lastSeen ? `เห็นล่าสุด ${new Date(lastSeen).toLocaleTimeString('th-TH')}` : 'ไม่พบข้อมูล'}
        </div>
      </div>
    )
  }

  /* Multiple devices — show count */
  const { count, total } = info
  const allOnline = count === total
  const anyOnline = count > 0
  const statusColor = allOnline ? 'var(--ok)' : anyOnline ? 'var(--warn)' : 'var(--danger)'
  const dotClass    = allOnline ? 'dot-ok'    : anyOnline ? 'dot-warn'    : 'dot-danger'
  return (
    <div className="glass db-pad-s">
      {label}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span className={`dot ${dotClass}`} />
        <span style={{ fontSize: 22, fontWeight: 700, color: statusColor }}>
          {count}/{total}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-2)' }}>ออนไลน์</div>
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
