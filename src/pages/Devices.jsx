import { useEffect, useState, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import AppLayout from '../components/layout/AppLayout'

const OFFLINE_THRESHOLD = 5 * 60 * 1000   // 5 minutes

/* Static hardware metadata — supplements live DB data per known device */
const DEVICE_META = {
  'esp32-01': {
    firmware: 'v1.2.3',
    hardware: 'ESP32-WROOM-32',
    mic:      'INMP441 (I2S MEMS)',
    lora:     'SX1278 915 MHz',
    battery:  87,
    signal:   -68,
  },
}

function signalLabel(rssi) {
  if (rssi >= -60) return { label: 'ดีมาก',  color: 'var(--ok)' }
  if (rssi >= -70) return { label: 'ดี',      color: 'var(--ok)' }
  if (rssi >= -80) return { label: 'พอใช้',  color: 'var(--warn)' }
  return                   { label: 'อ่อน',   color: 'var(--danger)' }
}

function BatteryIcon({ pct }) {
  const color = pct > 50 ? 'var(--ok)' : pct > 20 ? 'var(--warn)' : 'var(--danger)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 28, height: 14 }}>
        <div style={{
          width: 24, height: 14, borderRadius: 3,
          border: `1.5px solid ${color}`, position: 'absolute', left: 0,
        }} />
        <div style={{
          position: 'absolute', right: -4, top: 4,
          width: 3, height: 6, borderRadius: '0 2px 2px 0',
          background: color,
        }} />
        <div style={{
          position: 'absolute', left: 2, top: 2,
          width: `${(pct / 100) * 18}px`, height: 10,
          borderRadius: 1.5, background: color,
          transition: 'width .5s',
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct}%</span>
    </div>
  )
}

function SignalBars({ rssi }) {
  const sig  = signalLabel(rssi)
  const bars = rssi >= -60 ? 4 : rssi >= -70 ? 3 : rssi >= -80 ? 2 : 1
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            width: 4, borderRadius: 2,
            height: `${i * 4}px`,
            background: i <= bars ? sig.color : 'var(--bg-elevated)',
            transition: 'background .3s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: sig.color }}>{sig.label}</span>
      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>({rssi} dBm)</span>
    </div>
  )
}

function DeviceCard({ device, liveData }) {
  const meta    = DEVICE_META[device.id] || {}
  const [open, setOpen] = useState(false)

  const lastSeen = liveData?.last_seen
  const online   = lastSeen
    ? Date.now() - new Date(lastSeen).getTime() < OFFLINE_THRESHOLD
    : false
  const lastSeenStr = lastSeen
    ? new Date(lastSeen).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <div className="glass glass-lg" style={{ overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{
        padding: '20px 22px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: online ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.1)',
            border: `1.5px solid ${online ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.25)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
              stroke={online ? 'var(--ok)' : 'var(--danger)'} strokeWidth="1.5">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <rect x="9" y="9" width="6" height="6"/>
              <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
              <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
              <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
              <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{device.display_name}</div>
            {device.location && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{device.location}</div>}
            <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 1, fontFamily: 'monospace' }}>{device.id}</div>
          </div>
        </div>

        {/* Online chip */}
        {liveData === undefined ? (
          <div className="skeleton" style={{ width: 72, height: 24, borderRadius: 99 }} />
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
            background: online ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.1)',
            border: `1px solid ${online ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.25)'}`,
            color: online ? 'var(--ok)' : 'var(--danger)',
          }}>
            <span className={`dot ${online ? 'dot-ok' : 'dot-danger'}`} />
            {online ? 'ออนไลน์' : 'ออฟไลน์'}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="dev-stats-row">
        {[
          { label: 'เห็นล่าสุด',  value: liveData === undefined
              ? <div className="skeleton" style={{ height: 18, width: 60, borderRadius: 6 }} />
              : lastSeenStr },
          { label: 'แบตเตอรี่', value: <BatteryIcon pct={meta.battery ?? 0} /> },
          { label: 'สัญญาณ',    value: <SignalBars rssi={meta.signal ?? -100} /> },
        ].map((item, i) => (
          <div key={i} className="dev-stats-item">
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Expandable details */}
      <div style={{ borderTop: '1px solid var(--glass-border)' }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: '100%', padding: '12px 22px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, color: 'var(--text-2)',
        }}>
          <span>ข้อมูลทางเทคนิค</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {open && (
          <div style={{ padding: '0 22px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'ฮาร์ดแวร์',  value: meta.hardware  || '—', mono: false },
              { label: 'เฟิร์มแวร์', value: meta.firmware  || '—', mono: true  },
              { label: 'ไมโครโฟน',   value: meta.mic       || '—', mono: false },
              { label: 'LoRa',        value: meta.lora      || '—', mono: false },
              { label: 'รหัสอุปกรณ์', value: device.id,            mono: true  },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 'var(--r-sm)',
                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-label)', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text)', fontFamily: row.mono ? 'monospace' : 'inherit' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Devices() {
  const { user }  = useAuth()
  const [devices,  setDevices]  = useState([])
  const [liveMap,  setLiveMap]  = useState({})
  const [loading,  setLoading]  = useState(true)

  const loadDevices = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('devices').select('*').eq('user_id', user.id).order('created_at')
    setDevices(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadDevices() }, [loadDevices])

  useEffect(() => {
    supabase.from('board_status').select('*').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(row => { map[row.id] = row })
      setLiveMap(map)
    })

    const channel = supabase.channel('devices-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_status' },
        ({ new: row }) => setLiveMap(prev => ({ ...prev, [row.id]: row })))
      .subscribe()

    const t = setInterval(async () => {
      const { data } = await supabase.from('board_status').select('*')
      if (!data) return
      const map = {}
      data.forEach(row => { map[row.id] = row })
      setLiveMap(map)
    }, 15000)

    return () => { supabase.removeChannel(channel); clearInterval(t) }
  }, [])

  const totalOnline = devices.filter(d => {
    const live = liveMap[d.id]
    return live && Date.now() - new Date(live.last_seen).getTime() < OFFLINE_THRESHOLD
  }).length

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>อุปกรณ์</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>สถานะและข้อมูลทางเทคนิค — ESP32 โหนด</p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,360px), 1fr))', gap: 20 }}>
          {[1, 2].map(i => (
            <div key={i} className="skeleton" style={{ height: 240, borderRadius: 18 }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && devices.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(139,92,246,.1)', border: '1.5px solid rgba(139,92,246,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#8B5CF6" strokeWidth="1.5">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <rect x="9" y="9" width="6" height="6"/>
              <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
              <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
              <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
              <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              ยังไม่มีอุปกรณ์
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              เพิ่ม ESP32 Node ในการตั้งค่าเพื่อเริ่มตรวจสอบสถานะ
            </div>
          </div>
          <NavLink to="/settings" style={{
            padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.3)',
            color: 'var(--accent)', textDecoration: 'none',
          }}>
            ไปที่การตั้งค่า →
          </NavLink>
        </div>
      )}

      {/* Content */}
      {!loading && devices.length > 0 && (
        <>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            {[
              { label: 'อุปกรณ์ทั้งหมด', value: devices.length,              color: '#8B5CF6' },
              { label: 'ออนไลน์',        value: totalOnline,                  color: '#22c55e' },
              { label: 'ออฟไลน์',        value: devices.length - totalOnline, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="glass" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 140px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}18`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 3 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Device grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,360px), 1fr))', gap: 20 }}>
            {devices.map(d => (
              <DeviceCard key={d.id} device={d} liveData={liveMap[d.id]} />
            ))}
          </div>
        </>
      )}
    </AppLayout>
  )
}
