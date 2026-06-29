import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../contexts/ThemeContext'
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
  MapContainer, TileLayer, Polygon, Polyline,
  CircleMarker, ZoomControl, useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/* ─── Constants ─── */
const PLANTATION_DEF = {
  name:    'สวนปาล์มน้ำมัน',
  center:  [9.140, 99.332],
  polygon: [[9.148,99.325],[9.148,99.339],[9.136,99.340],[9.135,99.326]],
}
const SAT_URL  = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

/* ─── Crop helper ─── */
async function cropToBlob(imgEl, pixCrop) {
  const scaleX = imgEl.naturalWidth  / imgEl.width
  const scaleY = imgEl.naturalHeight / imgEl.height
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imgEl, pixCrop.x*scaleX, pixCrop.y*scaleY, pixCrop.width*scaleX, pixCrop.height*scaleY, 0, 0, 256, 256)
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9))
}

/* ─── Shared UI ─── */
function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</label>
      {children}
    </div>
  )
}
function SaveBtn({ onClick, saving, saved }) {
  return (
    <button onClick={onClick} disabled={saving} className="btn-accent" style={{ minWidth: 100, opacity: saving ? .6 : 1 }}>
      {saving ? 'กำลังบันทึก...' : saved ? 'บันทึกแล้ว ✓' : 'บันทึก'}
    </button>
  )
}
function Modal({ title, onClose, children, maxWidth = 480 }) {
  /* Portal renders outside .app-main — avoids stacking-context trap from glass backdrop-filter */
  return createPortal(
    <div className="stg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass glass-lg stg-modal-box" style={{ maxWidth }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--glass-border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-2)', fontSize:22, lineHeight:1 }}>×</button>
        </div>
        <div className="stg-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  )
}

/* ══════════════════════════════════════════
   MAP COMPONENTS
══════════════════════════════════════════ */
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng) })
  return null
}

function PreviewMap({ center, polygon }) {
  return (
    <MapContainer center={center} zoom={14} zoomControl={false}
      dragging={false} scrollWheelZoom={false} touchZoom={false} doubleClickZoom={false}
      style={{ height: 210, width:'100%', borderRadius: 14, pointerEvents:'none' }}>
      <TileLayer url={SAT_URL} maxZoom={20} />
      <TileLayer url={DARK_URL} opacity={0.45} maxZoom={20} />
      {polygon.length >= 3 && (
        <Polygon positions={polygon}
          pathOptions={{ color:'#8B5CF6', fillColor:'#8B5CF6', fillOpacity:0.12, weight:2.5, dashArray:'7 5' }} />
      )}
      <CircleMarker center={center} radius={9}
        pathOptions={{ color:'#22c55e', fillColor:'#22c55e', fillOpacity:1, weight:2.5 }} />
    </MapContainer>
  )
}

function LocationPickerModal({ config, onSave, onClose }) {
  const [mode,    setMode]    = useState('center')
  const [center,  setCenter]  = useState([...config.center])
  const [polygon, setPolygon] = useState(config.polygon.map(p => [...p]))

  function handleMapClick({ lat, lng }) {
    if (mode === 'center') {
      setCenter([lat, lng])
    } else {
      setPolygon(prev => [...prev, [lat, lng]])
    }
  }

  return (
    <Modal title="เลือกพิกัดสวน" onClose={onClose} maxWidth={660}>
      {/* Mode toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
        <button className={`btn-glass ${mode==='center'?'active':''}`} onClick={() => setMode('center')}
          style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:14 }}>📍</span> จุดกลาง
        </button>
        <button className={`btn-glass ${mode==='polygon'?'active':''}`} onClick={() => setMode('polygon')}
          style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:14 }}>⬡</span> วาดขอบเขต
        </button>
        <span style={{ fontSize:11, color:'var(--text-2)', marginLeft:4 }}>
          {mode === 'center' ? 'คลิกแผนที่เพื่อย้ายจุดกลาง' : 'คลิกแผนที่เพื่อเพิ่มมุมขอบเขต'}
        </span>
      </div>

      {/* Interactive map */}
      <div style={{ borderRadius: 14, overflow:'hidden', border:'1px solid var(--glass-border)', marginBottom:14 }}>
        <MapContainer center={center} zoom={15} style={{ width:'100%' }} className="stg-picker-map">
          <TileLayer url={SAT_URL} maxZoom={20} />
          <TileLayer url={DARK_URL} opacity={0.45} maxZoom={20} />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Center pin */}
          <CircleMarker center={center} radius={10}
            pathOptions={{ color:'#22c55e', fillColor:'#22c55e', fillOpacity:0.9, weight:2.5 }} />

          {/* Polygon */}
          {polygon.length >= 3 && (
            <Polygon positions={polygon}
              pathOptions={{ color:'#8B5CF6', fillColor:'#8B5CF6', fillOpacity:0.12, weight:2.5, dashArray:'7 5' }} />
          )}
          {polygon.length === 2 && (
            <Polyline positions={polygon}
              pathOptions={{ color:'#8B5CF6', weight:2, dashArray:'6 4' }} />
          )}
          {polygon.map((pt, i) => (
            <CircleMarker key={i} center={pt} radius={8}
              pathOptions={{ color:'#8B5CF6', fillColor:'#A855F7', fillOpacity:0.9, weight:2 }} />
          ))}

          <ZoomControl position="bottomright" />
        </MapContainer>
      </div>

      {/* Info row */}
      <div className="stg-picker-info">
        <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
          <div style={{ fontSize:9, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>จุดกลาง</div>
          <div style={{ fontSize:11, fontFamily:'monospace', color:'var(--text)' }}>
            {center[0].toFixed(5)}, {center[1].toFixed(5)}
          </div>
        </div>
        <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
          <div style={{ fontSize:9, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>ขอบเขต</div>
          <div style={{ fontSize:11, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
            <span>{polygon.length} มุม</span>
            {polygon.length > 0 && (
              <>
                <button onClick={() => setPolygon(p => p.slice(0,-1))}
                  style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', color:'var(--warn)', cursor:'pointer' }}>
                  Undo
                </button>
                <button onClick={() => setPolygon([])}
                  style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', color:'var(--danger)', cursor:'pointer' }}>
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onClose} className="btn-glass">ยกเลิก</button>
        <button onClick={() => onSave({ center, polygon })} className="btn-accent">ยืนยัน</button>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════
   CROP MODAL
══════════════════════════════════════════ */
function CropModal({ src, onSave, onClose }) {
  const imgRef  = useRef(null)
  const [crop, setCrop]           = useState()
  const [completedCrop, setDone]  = useState()
  const [saving, setSaving]       = useState(false)

  function onImageLoad(e) {
    const { width, height } = e.currentTarget
    setCrop(centerCrop(makeAspectCrop({ unit:'%', width:80 }, 1, width, height), width, height))
  }
  async function handleSave() {
    if (!completedCrop || !imgRef.current) return
    setSaving(true)
    const pix = convertToPixelCrop(completedCrop, imgRef.current.width, imgRef.current.height)
    const blob = await cropToBlob(imgRef.current, pix)
    await onSave(blob)
    setSaving(false)
  }

  return (
    <Modal title="ครอบรูปโปรไฟล์" onClose={onClose} maxWidth={520}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:16, background:'var(--bg)', borderRadius:12, padding:12 }}>
        <ReactCrop crop={crop} onChange={(_,pct) => setCrop(pct)} onComplete={(_,pct) => setDone(pct)}
          aspect={1} circularCrop style={{ maxHeight:360 }}>
          <img ref={imgRef} src={src} onLoad={onImageLoad} style={{ maxHeight:360, maxWidth:'100%', display:'block' }} />
        </ReactCrop>
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onClose} className="btn-glass">ยกเลิก</button>
        <button onClick={handleSave} disabled={saving || !completedCrop} className="btn-accent">
          {saving ? 'กำลังบันทึก...' : 'ใช้รูปนี้'}
        </button>
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════
   SECTION 1 — โปรไฟล์
══════════════════════════════════════════ */
function ProfileSection() {
  const { user, profile, refreshProfile } = useAuth()
  const fileRef = useRef(null)
  const [cropSrc, setCropSrc]     = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    last_name:  profile?.last_name  || '',
    nickname:   profile?.nickname   || '',
    phone:      profile?.phone      || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function onFileChange(e) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCropSrc(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  async function handleCropSave(blob) {
    const path = `${user.id}/avatar.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert:true, contentType:'image/jpeg' })
    if (error) { console.error(error); setCropSrc(null); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + `?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
    setAvatarUrl(url); await refreshProfile(); setCropSrc(null)
  }
  async function handleSave() {
    setSaving(true); setSaved(false)
    await supabase.from('profiles').update({ first_name:form.first_name, last_name:form.last_name, nickname:form.nickname, phone:form.phone }).eq('id', user.id)
    await refreshProfile(); setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="glass glass-lg stg-section">
      <SectionHead title="โปรไฟล์" sub="แก้ไขข้อมูลส่วนตัวและรูปโปรไฟล์" />
      <div style={{ display:'flex', gap:28, flexWrap:'wrap' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ position:'relative' }}>
            <div style={{ width:96, height:96, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,var(--accent),var(--accent-2))', border:'3px solid var(--glass-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {avatarUrl ? <img src={avatarUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:36, fontWeight:700, color:'#fff' }}>{form.first_name?.[0] || '?'}</span>}
            </div>
            <button onClick={() => fileRef.current?.click()} style={{ position:'absolute', bottom:0, right:0, width:28, height:28, borderRadius:'50%', background:'var(--accent)', border:'2px solid var(--bg-surface)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display:'none' }} />
          <span style={{ fontSize:11, color:'var(--text-2)' }}>คลิกเพื่อเปลี่ยนรูป</span>
        </div>
        <div style={{ flex:1, minWidth:220, display:'flex', flexDirection:'column', gap:14 }}>
          <div className="stg-name-row">
            <Field label="ชื่อจริง *"><input className="input-glass" value={form.first_name} onChange={set('first_name')} /></Field>
            <Field label="นามสกุล *"><input className="input-glass" value={form.last_name} onChange={set('last_name')} /></Field>
          </div>
          <Field label="ชื่อเล่น"><input className="input-glass" placeholder="ไม่บังคับ" value={form.nickname} onChange={set('nickname')} /></Field>
          <Field label="เบอร์โทรศัพท์"><input className="input-glass" type="tel" placeholder="0812345678" value={form.phone} onChange={set('phone')} /></Field>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:4 }}>
            <SaveBtn onClick={handleSave} saving={saving} saved={saved} />
          </div>
        </div>
      </div>
      {cropSrc && <CropModal src={cropSrc} onSave={handleCropSave} onClose={() => setCropSrc(null)} />}
    </div>
  )
}

/* ══════════════════════════════════════════
   SECTION 2 — พื้นที่สวน (Supabase)
══════════════════════════════════════════ */
function PlantationSection() {
  const { user } = useAuth()
  const [config,     setConfig]     = useState(null)
  const [name,       setName]       = useState(PLANTATION_DEF.name)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [dbError,    setDbError]    = useState(false)

  const fetchConfig = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('plantation_configs').select('*').eq('user_id', user.id).maybeSingle()
    if (error) { setDbError(true); setConfig(PLANTATION_DEF); return }
    if (data) {
      setConfig({ name: data.name, center: data.center, polygon: data.polygon })
      setName(data.name)
    } else {
      setConfig(PLANTATION_DEF)
    }
  }, [user])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  async function handleSave() {
    if (!config) return
    setSaving(true)
    const { error } = await supabase.from('plantation_configs').upsert(
      { user_id: user.id, name, center: config.center, polygon: config.polygon, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  function handlePickerSave({ center, polygon }) {
    setConfig(prev => ({ ...prev, center, polygon }))
    setShowPicker(false)
  }

  return (
    <div className="glass glass-lg stg-section">
      <SectionHead title="พื้นที่สวน" sub="กำหนดขอบเขตและตำแหน่งสวนบนแผนที่ (บันทึกต่อ user)" />

      {dbError && (
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:10, background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', fontSize:12, color:'var(--warn)' }}>
          ยังไม่ได้สร้างตาราง plantation_configs — รัน SQL ใน claude/SQL-plantation.sql
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <Field label="ชื่อสวน">
          <input className="input-glass" value={name} onChange={e => setName(e.target.value)} />
        </Field>

        {/* Preview map */}
        <div style={{ position:'relative', borderRadius:14, overflow:'hidden' }}>
          {config
            ? <PreviewMap center={config.center} polygon={config.polygon} />
            : <div className="skeleton" style={{ height:210, borderRadius:14 }} />}
          <button onClick={() => config && setShowPicker(true)} style={{
            position:'absolute', bottom:10, right:10,
            padding:'7px 14px', fontSize:12, fontWeight:600,
            background:'rgba(9,9,15,.75)', backdropFilter:'blur(10px)',
            border:'1px solid rgba(139,92,246,.45)', color:'#f1f5f9',
            borderRadius:9, cursor:'pointer', zIndex:500,
          }}>
            แก้ไขบนแผนที่ →
          </button>
        </div>

        {/* Coord summary */}
        {config && (
          <div className="stg-picker-info" style={{ marginBottom:0 }}>
            <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
              <div style={{ fontSize:9, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>จุดกลาง</div>
              <div style={{ fontSize:11, fontFamily:'monospace', color:'var(--text)' }}>{config.center[0].toFixed(5)}, {config.center[1].toFixed(5)}</div>
            </div>
            <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
              <div style={{ fontSize:9, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>ขอบเขต</div>
              <div style={{ fontSize:11, color:'var(--text)' }}>{config.polygon.length} มุม</div>
            </div>
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <SaveBtn onClick={handleSave} saving={saving} saved={saved} />
        </div>
      </div>

      {showPicker && config && (
        <LocationPickerModal config={config} onSave={handlePickerSave} onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   SECTION 3 — อุปกรณ์
══════════════════════════════════════════ */
const ROLE_STYLE = {
  node:    { label:'Node',    color:'#8B5CF6', bg:'rgba(139,92,246,.1)' },
  gateway: { label:'Gateway', color:'#06b6d4', bg:'rgba(6,182,212,.1)'  },
}

function AddDeviceModal({ userId, onSave, onClose }) {
  const [form, setForm] = useState({ id:'', display_name:'', role:'node', location:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    if (!form.id.trim() || !form.display_name.trim()) { setErr('กรุณากรอก Device ID และชื่อ'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('devices').insert({
      id: form.id.trim(), display_name: form.display_name.trim(),
      role: form.role, location: form.location.trim(), user_id: userId,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSave()
  }

  return (
    <Modal title="เพิ่มอุปกรณ์" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Field label="Device ID *"><input className="input-glass" placeholder="esp32-02" value={form.id} onChange={set('id')} /></Field>
        <Field label="ชื่ออุปกรณ์ *"><input className="input-glass" placeholder="Node B" value={form.display_name} onChange={set('display_name')} /></Field>
        <Field label="บทบาท">
          <select className="input-glass" value={form.role} onChange={set('role')}>
            <option value="node">Node (รับเสียง)</option>
            <option value="gateway">Gateway (ส่งข้อมูล)</option>
          </select>
        </Field>
        <Field label="ตำแหน่ง (ไม่บังคับ)"><input className="input-glass" placeholder="แปลง B — มุมตะวันออก" value={form.location} onChange={set('location')} /></Field>
        {err && <div style={{ fontSize:12, color:'var(--danger)', padding:'8px 12px', background:'rgba(239,68,68,.08)', borderRadius:8 }}>{err}</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
          <button onClick={onClose} className="btn-glass">ยกเลิก</button>
          <button onClick={handleSave} disabled={saving} className="btn-accent">{saving ? 'กำลังบันทึก...' : 'เพิ่มอุปกรณ์'}</button>
        </div>
      </div>
    </Modal>
  )
}

function DevicesSection() {
  const { user } = useAuth()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [dbError, setDbError] = useState(false)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('devices').select('*').eq('user_id', user.id).order('created_at')
    setLoading(false)
    if (error) { setDbError(true); return }
    setDevices(data)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  async function updateRole(id, role) {
    await supabase.from('devices').update({ role }).eq('id', id)
    setDevices(prev => prev.map(d => d.id === id ? { ...d, role } : d))
  }
  async function deleteDevice(id) {
    if (!confirm(`ลบอุปกรณ์ ${id} ?`)) return
    await supabase.from('devices').delete().eq('id', id)
    setDevices(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="glass glass-lg stg-section">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <SectionHead title="อุปกรณ์" sub="จัดการ ESP32 Nodes และ Gateway" />
        <button onClick={() => setShowAdd(true)} className="btn-accent" style={{ padding:'8px 16px', fontSize:12, flexShrink:0 }}>+ เพิ่มอุปกรณ์</button>
      </div>
      {dbError ? (
        <div style={{ padding:16, borderRadius:12, background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--warn)', marginBottom:6 }}>ยังไม่ได้สร้างตาราง devices</div>
          <div style={{ fontSize:12, color:'var(--text-2)' }}>รัน SQL ใน claude/SQL-devices.sql ก่อน</div>
        </div>
      ) : loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height:64, borderRadius:12 }} />)}
        </div>
      ) : devices.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-2)', fontSize:13 }}>ยังไม่มีอุปกรณ์ — กด "+ เพิ่มอุปกรณ์"</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {devices.map(d => {
            const rs = ROLE_STYLE[d.role] || ROLE_STYLE.node
            return (
              <div key={d.id} className="stg-device-row">
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{d.display_name}</div>
                  <div style={{ fontSize:10, color:'var(--text-2)', marginTop:2, fontFamily:'monospace' }}>{d.id}</div>
                  {d.location && <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>{d.location}</div>}
                </div>
                <div className="stg-device-actions">
                  <select value={d.role} onChange={e => updateRole(d.id, e.target.value)}
                    style={{ padding:'5px 10px', borderRadius:99, fontSize:11, fontWeight:700, background:rs.bg, color:rs.color, border:`1px solid ${rs.color}40`, cursor:'pointer', outline:'none', appearance:'none', textAlign:'center' }}>
                    <option value="node">Node</option>
                    <option value="gateway">Gateway</option>
                  </select>
                  <button onClick={() => deleteDevice(d.id)} style={{ padding:'6px 10px', borderRadius:8, fontSize:11, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', color:'var(--danger)', cursor:'pointer', fontWeight:600 }}>ลบ</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {showAdd && <AddDeviceModal userId={user?.id} onSave={() => { setShowAdd(false); fetch() }} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

/* ══════════════════════════════════════════
   SECTION 4 — บัญชี
══════════════════════════════════════════ */
function ThemeSection() {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'
  return (
    <div className="glass glass-lg stg-section">
      <SectionHead title="การแสดงผล" sub="เลือกโหมดสีของแอป" />
      <button onClick={toggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px', borderRadius: 12,
        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        cursor: 'pointer', transition: 'all .2s', textAlign: 'left',
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor='rgba(139,92,246,.35)'}
        onMouseLeave={e => e.currentTarget.style.borderColor='var(--glass-border)'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: isLight ? 'rgba(245,158,11,.12)' : 'rgba(139,92,246,.12)',
            border: `1px solid ${isLight ? 'rgba(245,158,11,.3)' : 'rgba(139,92,246,.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isLight
              ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B5CF6" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{isLight ? 'โหมดสว่าง' : 'โหมดมืด'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>แตะเพื่อสลับโหมด</div>
          </div>
        </div>
        {/* Toggle switch */}
        <div style={{
          width: 44, height: 24, borderRadius: 99, flexShrink: 0,
          background: isLight ? 'var(--accent)' : 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          position: 'relative', transition: 'background .25s',
        }}>
          <div style={{
            position: 'absolute', top: 3,
            left: isLight ? 22 : 3,
            width: 16, height: 16, borderRadius: '50%',
            background: isLight ? '#fff' : 'var(--text-3)',
            transition: 'left .25s',
          }} />
        </div>
      </button>
    </div>
  )
}

function AccountSection() {
  const { user, signOut } = useAuth()
  return (
    <div className="glass glass-lg stg-section">
      <SectionHead title="บัญชี" />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 18px', borderRadius:12, background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
        <div>
          <div style={{ fontSize:12, color:'var(--text-label)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:4 }}>อีเมล</div>
          <div style={{ fontSize:14, color:'var(--text)', fontWeight:500 }}>{user?.email}</div>
        </div>
        <button onClick={signOut}
          style={{ padding:'9px 20px', borderRadius:'var(--r-sm)', fontSize:13, fontWeight:600, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'var(--danger)', cursor:'pointer', transition:'all .2s' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,.18)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,.1)'}>
          ออกจากระบบ
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function Settings() {
  return (
    <AppLayout>
      <style>{`
        /* Modal overlay — portal-rendered, always on top */
        .stg-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,.78);
          backdrop-filter: blur(6px);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 20px 16px 32px;
          overflow-y: auto;
        }
        .stg-modal-box {
          width: 100%; flex-shrink: 0;
          display: flex; flex-direction: column;
          max-height: none;
        }
        .stg-modal-body { padding: 20px 22px; overflow-y: visible; }

        /* Map picker */
        .stg-picker-map { height: 400px; }

        /* Picker info grid */
        .stg-picker-info {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; margin-bottom: 16px;
        }

        /* Profile name row */
        .stg-name-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        /* Device row */
        .stg-device-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
          padding: 14px 16px; border-radius: 12px;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
        }
        .stg-device-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

        /* ── Mobile ─────────────────────────────── */
        @media (max-width: 540px) {
          .stg-name-row       { grid-template-columns: 1fr; }
          .stg-picker-info    { grid-template-columns: 1fr; }
          .stg-picker-map     { height: 280px; }
          .stg-modal-body     { padding: 14px 14px; }
          .stg-overlay        { padding: 12px 10px 24px; }
        }
        @media (max-width: 380px) {
          .stg-picker-map { height: 220px; }
        }
      `}</style>

      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:4 }}>การตั้งค่า</h1>
        <p style={{ fontSize:13, color:'var(--text-2)' }}>จัดการโปรไฟล์ พื้นที่สวน และอุปกรณ์</p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:740 }}>
        <ProfileSection />
        <PlantationSection />
        <DevicesSection />
        <ThemeSection />
        <AccountSection />
      </div>
    </AppLayout>
  )
}
