import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapContainer, TileLayer, Polygon, Polyline,
  CircleMarker, ZoomControl, useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || ''
const DEF_CENTER  = [9.140, 99.332]
const SAT_URL  = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const STEPS = ['ข้อมูลส่วนตัว', 'พื้นที่สวน', 'อุปกรณ์']

/* ─── Map helpers ─── */
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: e => onMapClick(e.latlng) })
  return null
}

/* ─── Step indicator ─── */
function StepIndicator({ current }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', marginBottom:28 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display:'flex', alignItems:'flex-start', flex: i < STEPS.length-1 ? 1 : 'none' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flexShrink:0 }}>
            <div style={{
              width:30, height:30, borderRadius:'50%', fontSize:12, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center',
              background: i+1 < current ? 'var(--accent)' : i+1 === current ? 'var(--accent)' : 'var(--glass-bg)',
              border: `2px solid ${i+1 <= current ? 'var(--accent)' : 'var(--glass-border)'}`,
              color: i+1 <= current ? '#fff' : 'var(--text-3)',
              transition: 'all .3s',
            }}>
              {i+1 < current ? '✓' : i+1}
            </div>
            <span style={{
              fontSize:10, whiteSpace:'nowrap', fontWeight: i+1===current ? 700 : 400,
              color: i+1 <= current ? 'var(--text)' : 'var(--text-3)',
            }}>{label}</span>
          </div>
          {i < STEPS.length-1 && (
            <div style={{
              flex:1, height:2, marginTop:14, marginBottom:0, marginLeft:6, marginRight:6,
              background: i+1 < current ? 'var(--accent)' : 'var(--glass-border)',
              transition: 'background .3s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Embedded map picker ─── */
function MapPicker({ center, polygon, mode, onChange }) {
  function handleClick({ lat, lng }) {
    if (mode === 'center') {
      onChange({ center: [lat, lng], polygon })
    } else {
      onChange({ center, polygon: [...polygon, [lat, lng]] })
    }
  }
  return (
    <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--glass-border)' }}>
      <MapContainer center={center} zoom={15} style={{ height:260, width:'100%' }}>
        <TileLayer url={SAT_URL} maxZoom={20} />
        <TileLayer url={DARK_URL} opacity={0.45} maxZoom={20} />
        <MapClickHandler onMapClick={handleClick} />
        <CircleMarker center={center} radius={10}
          pathOptions={{ color:'#22c55e', fillColor:'#22c55e', fillOpacity:0.9, weight:2.5 }} />
        {polygon.length >= 3 && (
          <Polygon positions={polygon}
            pathOptions={{ color:'#8B5CF6', fillColor:'#8B5CF6', fillOpacity:0.1, weight:2, dashArray:'7 5' }} />
        )}
        {polygon.length === 2 && (
          <Polyline positions={polygon}
            pathOptions={{ color:'#8B5CF6', weight:2, dashArray:'6 4' }} />
        )}
        {polygon.map((pt, i) => (
          <CircleMarker key={i} center={pt} radius={7}
            pathOptions={{ color:'#8B5CF6', fillColor:'#A855F7', fillOpacity:0.9, weight:2 }} />
        ))}
        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  )
}

/* ─── Field wrapper ─── */
function Field({ label, required, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:11, fontWeight:600, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'.4px' }}>
        {label}{required && <span style={{ color:'#f87171', marginLeft:3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════
   MAIN REGISTER
══════════════════════════════════════════ */
const EMPTY_DEVICE = { id:'', display_name:'', role:'node', location:'' }

export default function Register() {
  const { user, fetchProfile, signOut } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  /* Step 1 */
  const [profile, setProfile] = useState({
    first_name: '', last_name: '', nickname: '', phone: '',
  })

  /* Step 2 */
  const [mapMode, setMapMode]   = useState('center')
  const [plantation, setPlantation] = useState({
    name: 'สวนปาล์มน้ำมัน', center: DEF_CENTER, polygon: [],
  })

  /* Step 3 */
  const [devices, setDevices]           = useState([])
  const [showDevForm, setShowDevForm]   = useState(false)
  const [devForm, setDevForm]           = useState(EMPTY_DEVICE)
  const [devError, setDevError]         = useState('')

  const setP = k => e => setProfile(p => ({ ...p, [k]: e.target.value }))

  /* ── Validation ── */
  function step1Valid() {
    return profile.first_name.trim() && profile.last_name.trim() && profile.phone.trim()
  }
  function step2Valid() {
    return plantation.name.trim()
  }

  /* ── Device helpers ── */
  function addDevice() {
    setDevError('')
    if (!devForm.id.trim() || !devForm.display_name.trim()) {
      setDevError('กรุณากรอก Device ID และชื่อ')
      return
    }
    if (devices.find(d => d.id === devForm.id.trim())) {
      setDevError('Device ID นี้มีอยู่แล้ว')
      return
    }
    setDevices(prev => [...prev, { ...devForm, id: devForm.id.trim(), display_name: devForm.display_name.trim() }])
    setDevForm(EMPTY_DEVICE)
    setShowDevForm(false)
  }

  /* ── Final submit ── */
  async function handleSubmit() {
    setLoading(true); setError('')
    try {
      const role = user.email === ADMIN_EMAIL ? 'admin' : 'user'

      /* 1. Profile */
      const { error: profErr } = await supabase.from('profiles').insert({
        id: user.id,
        first_name: profile.first_name.trim(),
        last_name:  profile.last_name.trim(),
        nickname:   profile.nickname.trim() || null,
        phone:      profile.phone.trim(),
        role,
      })
      if (profErr) throw profErr

      /* 2. Plantation config */
      await supabase.from('plantation_configs').upsert({
        user_id: user.id,
        name:    plantation.name.trim(),
        center:  plantation.center,
        polygon: plantation.polygon,
      }, { onConflict: 'user_id' })

      /* 3. Devices (optional) */
      if (devices.length > 0) {
        await supabase.from('devices').insert(
          devices.map(d => ({ ...d, user_id: user.id }))
        )
      }

      await fetchProfile(user.id)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      setLoading(false)
    }
  }

  /* ── Render ── */
  return (
    <div style={{
      minHeight:'100dvh', background:'var(--bg)',
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      padding:'clamp(16px,4vh,40px) 16px 32px',
      position:'relative', overflow:'hidden',
    }}>
      {/* Orbs */}
      <div style={{ position:'absolute', top:'-180px', left:'-180px', width:500, height:500, borderRadius:'50%', pointerEvents:'none', background:'radial-gradient(circle,rgba(139,92,246,.25) 0%,transparent 65%)' }} />
      <div style={{ position:'absolute', bottom:'-140px', right:'-140px', width:440, height:440, borderRadius:'50%', pointerEvents:'none', background:'radial-gradient(circle,rgba(99,102,241,.2) 0%,transparent 65%)' }} />

      {/* Card */}
      <div className="glass glass-lg reg-card" style={{ width:'100%', maxWidth:540, position:'relative', zIndex:1 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:4 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#8B5CF6,#A855F7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg viewBox="0 0 20 20" width="15" height="15" fill="white"><path d="M10 2a4 4 0 00-4 4v5a4 4 0 008 0V6a4 4 0 00-4-4zM6.5 14A5.5 5.5 0 0016 10.5h-1.5A4 4 0 016 10.5H4.5A5.5 5.5 0 006.5 14zM9 14.5v2.5h2v-2.5H9z"/></svg>
              </div>
              <span style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>SAFE-Palm</span>
            </div>
            <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', marginBottom:2 }}>ลงทะเบียน</h2>
            <p style={{ fontSize:12, color:'var(--text-2)' }}>ตั้งค่าระบบครั้งแรก</p>
          </div>
          <div style={{ textAlign:'right' }}>
            {user?.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} style={{ width:36, height:36, borderRadius:'50%', marginBottom:4, display:'block', marginLeft:'auto', border:'2px solid var(--glass-border)' }} />
            )}
            <div style={{ fontSize:11, color:'var(--text-2)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
            <button onClick={signOut} style={{ fontSize:11, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', padding:'2px 0', textDecoration:'underline' }}>ออกจากระบบ</button>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Error */}
        {error && (
          <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', fontSize:12, color:'var(--danger)' }}>
            {error}
          </div>
        )}

        {/* ─── Step 1: Profile ─── */}
        {step === 1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="reg-2col">
              <Field label="ชื่อจริง" required>
                <input className="input-glass" value={profile.first_name} onChange={setP('first_name')} placeholder="สมชาย" />
              </Field>
              <Field label="นามสกุล" required>
                <input className="input-glass" value={profile.last_name} onChange={setP('last_name')} placeholder="ใจดี" />
              </Field>
            </div>
            <Field label="ชื่อเล่น">
              <input className="input-glass" value={profile.nickname} onChange={setP('nickname')} placeholder="ชาย (ไม่บังคับ)" />
            </Field>
            <Field label="เบอร์โทรศัพท์" required>
              <input className="input-glass" type="tel" value={profile.phone} onChange={setP('phone')} placeholder="0812345678" />
            </Field>
          </div>
        )}

        {/* ─── Step 2: Plantation ─── */}
        {step === 2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="ชื่อสวน" required>
              <input className="input-glass" value={plantation.name}
                onChange={e => setPlantation(p => ({ ...p, name: e.target.value }))} />
            </Field>

            {/* Mode toggle */}
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              {[
                { id:'center',  icon:'📍', label:'จุดกลาง' },
                { id:'polygon', icon:'⬡',  label:'วาดขอบเขต' },
              ].map(m => (
                <button key={m.id} onClick={() => setMapMode(m.id)}
                  className={`btn-glass ${mapMode===m.id?'active':''}`}
                  style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
              <span style={{ fontSize:11, color:'var(--text-2)', marginLeft:2 }}>
                {mapMode==='center' ? 'คลิกแผนที่ย้ายจุดกลาง' : 'คลิกเพิ่มมุมขอบเขต'}
              </span>
            </div>

            <MapPicker
              center={plantation.center}
              polygon={plantation.polygon}
              mode={mapMode}
              onChange={({ center, polygon }) => setPlantation(p => ({ ...p, center, polygon }))}
            />

            {/* Info strip */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
                <div style={{ fontSize:9, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:3 }}>จุดกลาง</div>
                <div style={{ fontSize:11, fontFamily:'monospace', color:'var(--text)' }}>
                  {plantation.center[0].toFixed(4)}, {plantation.center[1].toFixed(4)}
                </div>
              </div>
              <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
                <div style={{ fontSize:9, color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:3 }}>ขอบเขต</div>
                <div style={{ fontSize:11, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
                  <span>{plantation.polygon.length} มุม</span>
                  {plantation.polygon.length > 0 && (
                    <button onClick={() => setPlantation(p => ({ ...p, polygon: p.polygon.slice(0,-1) }))}
                      style={{ fontSize:10, padding:'1px 7px', borderRadius:6, background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', color:'var(--warn)', cursor:'pointer' }}>
                      Undo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 3: Devices ─── */}
        {step === 3 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Info note */}
            <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(139,92,246,.07)', border:'1px solid rgba(139,92,246,.18)', fontSize:12, color:'var(--text-2)', lineHeight:1.6 }}>
              เพิ่มอุปกรณ์ ESP32 ของคุณ หรือข้ามแล้วเพิ่มทีหลังใน <strong style={{ color:'var(--accent)' }}>Settings → อุปกรณ์</strong>
            </div>

            {/* Device list */}
            {devices.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {devices.map(d => (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'10px 14px', borderRadius:10, background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{d.display_name}</div>
                      <div style={{ fontSize:10, color:'var(--text-2)', fontFamily:'monospace', marginTop:1 }}>
                        {d.id} &nbsp;·&nbsp;
                        <span style={{ color: d.role==='gateway'?'#06b6d4':'var(--accent)' }}>
                          {d.role==='gateway'?'Gateway':'Node'}
                        </span>
                        {d.location && ` · ${d.location}`}
                      </div>
                    </div>
                    <button onClick={() => setDevices(prev => prev.filter(x => x.id!==d.id))}
                      style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(239,68,68,.25)', background:'rgba(239,68,68,.08)', color:'var(--danger)', cursor:'pointer', fontSize:16, lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline add form */}
            {showDevForm ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'16px 16px', borderRadius:12, background:'var(--glass-bg)', border:'1px solid var(--glass-border)' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:2 }}>เพิ่มอุปกรณ์ใหม่</div>
                <div className="reg-2col">
                  <Field label="Device ID" required>
                    <input className="input-glass" placeholder="esp32-01" value={devForm.id}
                      onChange={e => setDevForm(f => ({ ...f, id: e.target.value }))} />
                  </Field>
                  <Field label="ชื่อ" required>
                    <input className="input-glass" placeholder="Node A" value={devForm.display_name}
                      onChange={e => setDevForm(f => ({ ...f, display_name: e.target.value }))} />
                  </Field>
                </div>
                <div className="reg-2col">
                  <Field label="บทบาท">
                    <select className="input-glass" value={devForm.role}
                      onChange={e => setDevForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="node">Node (รับเสียง)</option>
                      <option value="gateway">Gateway (ส่งข้อมูล)</option>
                    </select>
                  </Field>
                  <Field label="ตำแหน่ง">
                    <input className="input-glass" placeholder="แปลง A (ไม่บังคับ)" value={devForm.location}
                      onChange={e => setDevForm(f => ({ ...f, location: e.target.value }))} />
                  </Field>
                </div>
                {devError && <div style={{ fontSize:11, color:'var(--danger)' }}>{devError}</div>}
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button onClick={() => { setShowDevForm(false); setDevForm(EMPTY_DEVICE); setDevError('') }}
                    className="btn-glass" style={{ fontSize:12, padding:'7px 14px' }}>ยกเลิก</button>
                  <button onClick={addDevice}
                    className="btn-accent" style={{ fontSize:12, padding:'7px 16px' }}>+ เพิ่ม</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowDevForm(true)} style={{
                padding:'10px', borderRadius:10, background:'transparent',
                border:'1px dashed var(--glass-border)', color:'var(--text-2)',
                cursor:'pointer', fontSize:12, fontWeight:600,
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                transition:'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(139,92,246,.4)'; e.currentTarget.style.color='var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--glass-border)'; e.currentTarget.style.color='var(--text-2)' }}>
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4v12M4 10h12"/></svg>
                เพิ่มอุปกรณ์
              </button>
            )}
          </div>
        )}

        {/* ─── Navigation ─── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:28, paddingTop:20, borderTop:'1px solid var(--glass-border)' }}>
          {step > 1 ? (
            <button onClick={() => { setStep(s => s-1); setError('') }}
              className="btn-glass" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 10H5M10 5l-5 5 5 5"/></svg>
              ย้อนกลับ
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => {
                if (step===1 && !step1Valid()) { setError('กรุณากรอกชื่อ นามสกุล และเบอร์โทรให้ครบ'); return }
                if (step===2 && !step2Valid()) { setError('กรุณาระบุชื่อสวน'); return }
                setError(''); setStep(s => s+1)
              }}
              className="btn-accent" style={{ display:'flex', alignItems:'center', gap:6 }}>
              ถัดไป
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 10h10M10 5l5 5-5 5"/></svg>
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="btn-accent"
              style={{ display:'flex', alignItems:'center', gap:6, opacity: loading?.6:1 }}>
              {loading
                ? <><span style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',animation:'spin .7s linear infinite',display:'inline-block' }}/> กำลังบันทึก...</>
                : <>เสร็จสิ้น &amp; เข้าสู่ระบบ ✓</>}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .reg-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .reg-card { padding: 36px 32px; }
        @media (max-width: 480px) {
          .reg-2col { grid-template-columns: 1fr; gap: 10px; }
          .reg-card { padding: 24px 18px; }
        }
      `}</style>
    </div>
  )
}
