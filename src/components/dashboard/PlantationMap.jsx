import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const DRK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DEF_CENTER  = [9.140, 99.332]
const DEF_POLYGON = [[9.148,99.325],[9.148,99.339],[9.136,99.340],[9.135,99.326]]

function useIsMobile(breakpoint = 480) {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= breakpoint)
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return mobile
}

export default function PlantationMap() {
  const { user } = useAuth()
  const [config,  setConfig]  = useState(null)   // null = loading
  const [devices, setDevices] = useState([])
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('plantation_configs').select('name,center,polygon').eq('user_id', user.id).maybeSingle(),
      supabase.from('devices').select('id,display_name,location,role').eq('user_id', user.id),
    ]).then(([{ data: cfg }, { data: devs }]) => {
      setConfig(cfg ?? { name: 'สวนปาล์มน้ำมัน', center: DEF_CENTER, polygon: DEF_POLYGON })
      setDevices(devs ?? [])
    })
  }, [user])

  const center  = config?.center  ?? DEF_CENTER
  const polygon = config?.polygon ?? DEF_POLYGON
  const name    = config?.name    ?? 'สวนปาล์มน้ำมัน'

  return (
    <div className="glass glass-lg" style={{ padding:0, overflow:'hidden', height:'100%', minHeight: isMobile ? 240 : 320, display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div className="db-pad" style={{ borderBottom:'1px solid var(--glass-border)', flexShrink:0, paddingBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>ภาพรวมพื้นที่สวน</div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{name}</div>
          </div>
          {devices.length > 0 && (
            <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:99,
              background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.25)', color:'var(--ok)',
              display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--ok)', display:'inline-block' }} />
              {devices.length} อุปกรณ์
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      {config === null ? (
        <div className="skeleton" style={{ flex:1 }} />
      ) : (
        <MapContainer
          key={`${center[0].toFixed(5)},${center[1].toFixed(5)}`}
          center={center} zoom={15} zoomControl={false}
          style={{ flex:1, width:'100%', minHeight: isMobile ? 180 : 251 }}
          dragging={false} touchZoom={false} doubleClickZoom={false}
          scrollWheelZoom={false} keyboard={false}>

          <TileLayer url={DRK_URL} maxZoom={20} />
          <TileLayer url={SAT_URL} maxZoom={20} opacity={0.6} />

          {/* Plantation boundary */}
          {polygon.length >= 3 && (
            <Polygon positions={polygon}
              pathOptions={{ color:'#8B5CF6', fillColor:'#8B5CF6', fillOpacity:0.12, weight:2, dashArray:'6 4' }} />
          )}

          {/* Device markers — positioned at center (devices have no GPS coords) */}
          {devices.length > 0 ? devices.map((d, i) => {
            /* Offset slightly so overlapping markers are visible */
            const offset = devices.length > 1
              ? [center[0] + (i - (devices.length-1)/2) * 0.0004, center[1]]
              : center
            return (
              <CircleMarker key={d.id} center={offset} radius={9}
                pathOptions={{ color:'#22c55e', fillColor:'#22c55e', fillOpacity:0.9, weight:2.5 }}>
                <Popup>
                  <div style={{ fontFamily:'system-ui', minWidth:130 }}>
                    <div style={{ fontWeight:700, fontSize:12, marginBottom:2 }}>{d.display_name}</div>
                    <div style={{ fontSize:10, color:'#64748b', fontFamily:'monospace' }}>{d.id}</div>
                    {d.location && <div style={{ fontSize:10, color:'#64748b', marginTop:3 }}>{d.location}</div>}
                    <div style={{ fontSize:10, marginTop:4, color: d.role==='gateway'?'#06b6d4':'#8B5CF6', fontWeight:600 }}>
                      {d.role==='gateway' ? 'เกตเวย์' : 'โหนด'}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          }) : (
            /* No devices: grey placeholder dot at center */
            <CircleMarker center={center} radius={7}
              pathOptions={{ color:'#64748b', fillColor:'#475569', fillOpacity:0.6, weight:1.5 }} />
          )}
        </MapContainer>
      )}
    </div>
  )
}
