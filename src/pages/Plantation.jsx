import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, ZoomControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const DEF_CENTER  = [9.140, 99.332]
const DEF_POLYGON = [[9.148,99.325],[9.148,99.339],[9.136,99.340],[9.135,99.326]]

const SAT_URL  = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LITE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const TILE_MODES = [
  { id: 'satellite', label: 'ดาวเทียม', url: SAT_URL,  overlay: DARK_URL, opacity: 0.5 },
  { id: 'dark',      label: 'มืด',      url: DARK_URL, overlay: null,     opacity: 1   },
  { id: 'light',     label: 'สว่าง',    url: LITE_URL, overlay: null,     opacity: 1   },
]

const STATIC_DEVICES = [
  { id: 'esp32-01', name: 'Node A', online: true, lastSeen: '21:14', battery: 87, signal: 'ดี' },
]

const STATS = [
  { label: 'พื้นที่สวน',    value: '12.4 ไร่' },
  { label: 'อุปกรณ์ทั้งหมด', value: '1 โหนด'  },
  { label: 'ออนไลน์',      value: '1/1'      },
  { label: 'ความครอบคลุม',  value: '~100%'    },
]

function FlyToDevice({ pos }) {
  const map = useMap()
  map.flyTo(pos, 17, { duration: 1 })
  return null
}

export default function Plantation() {
  const { user }  = useAuth()
  const [config, setConfig]       = useState(null)
  const [tileMode, setTileMode]   = useState('satellite')
  const [flyTo, setFlyTo]         = useState(null)
  const [selected, setSelected]   = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('plantation_configs').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        setConfig(data
          ? { name: data.name, center: data.center, polygon: data.polygon }
          : { name: 'สวนปาล์มน้ำมัน', center: DEF_CENTER, polygon: DEF_POLYGON }
        )
      })
  }, [user])

  const tile = TILE_MODES.find(t => t.id === tileMode)
  const center  = config?.center  || DEF_CENTER
  const polygon = config?.polygon || DEF_POLYGON
  const devices = STATIC_DEVICES.map(d => ({ ...d, pos: center }))

  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>พื้นที่สวน</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{config?.name || 'สวนปาล์มน้ำมัน'} — Surat Thani</p>
      </div>

      <div className="plantation-layout">

        {/* Map */}
        <div className="glass glass-lg" style={{ overflow: 'hidden', position: 'relative' }}>
          {/* Tile switcher */}
          <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 1000, display: 'flex', gap: 6 }}>
            {TILE_MODES.map(m => (
              <button key={m.id} onClick={() => setTileMode(m.id)}
                className={`btn-glass ${tileMode === m.id ? 'active' : ''}`}
                style={{ fontSize: 11, padding: '5px 12px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                {m.label}
              </button>
            ))}
          </div>

          {config === null ? (
            <div className="skeleton plantation-map-h" style={{ borderRadius: 0 }} />
          ) : (
            <MapContainer
              key={`${center[0].toFixed(5)},${center[1].toFixed(5)}`}
              center={center} zoom={15} zoomControl={false}
              className="plantation-map-h"
              style={{ width: '100%' }}
              dragging={false}
              scrollWheelZoom={false}
              touchZoom={false}
              doubleClickZoom={false}
              keyboard={false}>
              <TileLayer key={tile.url} url={tile.url} maxZoom={20} />
              {tile.overlay && <TileLayer url={tile.overlay} opacity={tile.opacity} maxZoom={20} />}

              {flyTo && <FlyToDevice pos={flyTo} key={flyTo.toString()} />}

              <Polygon positions={polygon}
                pathOptions={{ color:'#8B5CF6', fillColor:'#8B5CF6', fillOpacity:0.1, weight:2.5, dashArray:'8 5' }} />

              {devices.map(d => (
                <CircleMarker key={d.id} center={d.pos} radius={12}
                  pathOptions={{ color: d.online?'#22c55e':'#ef4444', fillColor: d.online?'#22c55e':'#ef4444', fillOpacity:0.9, weight:2.5 }}
                  eventHandlers={{ click: () => setSelected(d.id) }}>
                  <Popup>
                    <div style={{ fontFamily:'system-ui', minWidth:140 }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{d.name}</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>{d.id}</div>
                      <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background: d.online?'#22c55e':'#ef4444' }} />
                        <span style={{ fontSize:12, fontWeight:600, color: d.online?'#22c55e':'#ef4444' }}>
                          {d.online ? 'ออนไลน์' : 'ออฟไลน์'}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>เห็นล่าสุด {d.lastSeen}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              <ZoomControl position="bottomright" />
            </MapContainer>
          )}
        </div>

        {/* Info panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass glass-lg" style={{ padding: 20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:14, textTransform:'uppercase', letterSpacing:'.5px' }}>ข้อมูลสวน</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {STATS.map(s => (
                <div key={s.label} style={{ padding:'12px 14px', borderRadius:'var(--r-sm)', background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
                  <div style={{ fontSize:10, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass glass-lg" style={{ padding: 20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:14, textTransform:'uppercase', letterSpacing:'.5px' }}>อุปกรณ์</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {devices.map(d => (
                <div key={d.id}
                  onClick={() => { setFlyTo([...d.pos]); setSelected(d.id) }}
                  style={{ padding:'14px 16px', borderRadius:'var(--r-sm)', cursor:'pointer',
                    background: selected===d.id ? 'rgba(139,92,246,.1)' : 'var(--glass-bg)',
                    border: `1px solid ${selected===d.id ? 'rgba(139,92,246,.35)' : 'var(--glass-border)'}`,
                    transition: 'all .2s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{d.name}</div>
                      <div style={{ fontSize:10, color:'var(--text-2)', marginTop:2 }}>{d.id}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:99,
                      background: d.online?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)',
                      color: d.online?'var(--ok)':'var(--danger)',
                      border: `1px solid ${d.online?'rgba(34,197,94,.25)':'rgba(239,68,68,.25)'}` }}>
                      {d.online ? 'ออนไลน์' : 'ออฟไลน์'}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:12 }}>
                    {['lastSeen','battery','signal'].map(k => (
                      <div key={k} style={{ fontSize:11, color:'var(--text-2)' }}>
                        <span style={{ color:'var(--text-label)', display:'block', fontSize:9, textTransform:'uppercase', letterSpacing:'.4px' }}>
                          {k==='lastSeen'?'เห็นล่าสุด':k==='battery'?'แบตเตอรี่':'สัญญาณ'}
                        </span>
                        <span style={{ color: k==='battery' ? (d.battery>50?'var(--ok)':d.battery>20?'var(--warn)':'var(--danger)') : 'inherit' }}>
                          {k==='battery' ? `${d.battery}%` : d[k]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass glass-lg" style={{ padding: 20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:12, textTransform:'uppercase', letterSpacing:'.5px' }}>สัญลักษณ์</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:24, height:3, borderRadius:2, border:'2px dashed #8B5CF6', flexShrink:0 }} />
                <span style={{ fontSize:12, color:'var(--text-2)' }}>ขอบเขตพื้นที่สวน</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:'rgba(34,197,94,.9)', border:'2px solid #22c55e', flexShrink:0 }} />
                <span style={{ fontSize:12, color:'var(--text-2)' }}>ESP32 โหนด (ออนไลน์)</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:'rgba(239,68,68,.9)', border:'2px solid #ef4444', flexShrink:0 }} />
                <span style={{ fontSize:12, color:'var(--text-2)' }}>ESP32 โหนด (ออฟไลน์)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </AppLayout>
  )
}
