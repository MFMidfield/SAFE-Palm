import { useState, useMemo, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'

const EVENT_TYPES = ['Palm Cutting', 'Chainsaw Sound', 'Suspicious Activity', 'Unknown Sound']
const TYPE_FILTER_LABEL = {
  'All':                 'ทั้งหมด',
  'Palm Cutting':        'ตัดปาล์ม',
  'Chainsaw Sound':      'เลื่อยไฟฟ้า',
  'Suspicious Activity': 'น่าสงสัย',
  'Unknown Sound':       'ไม่ทราบ',
}

const TYPE_STYLE = {
  'Palm Cutting':        { color: '#ef4444', bg: 'rgba(239,68,68,.12)',    label: 'ตัดปาล์ม'    },
  'Chainsaw Sound':      { color: '#f59e0b', bg: 'rgba(245,158,11,.12)',   label: 'เลื่อยไฟฟ้า' },
  'Suspicious Activity': { color: '#8B5CF6', bg: 'rgba(139,92,246,.12)',  label: 'น่าสงสัย'    },
  'Unknown Sound':       { color: '#64748b', bg: 'rgba(100,116,139,.12)', label: 'ไม่ทราบ'     },
}

const PER_PAGE = 8

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit' })
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })
}

function StatChip({ label, value, color }) {
  return (
    <div className="glass" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, flex:'1 1 140px' }}>
      <div style={{
        width:40, height:40, borderRadius:12,
        background:`${color}18`, border:`1px solid ${color}30`,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>
        <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />
      </div>
      <div>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--text)', lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:11, color:'var(--text-2)', marginTop:3 }}>{label}</div>
      </div>
    </div>
  )
}

function ConfBar({ value }) {
  const color = value > 90 ? 'var(--ok)' : value > 75 ? 'var(--warn)' : 'var(--danger)'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:64, height:5, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
        <div style={{ width:`${value}%`, height:'100%', borderRadius:99, background:color }} />
      </div>
      <span style={{ fontSize:12, fontWeight:700, color, minWidth:34 }}>{value}%</span>
    </div>
  )
}

function TypeChip({ type }) {
  const t = TYPE_STYLE[type] || TYPE_STYLE['Unknown Sound']
  return (
    <span style={{
      padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600,
      background:t.bg, color:t.color, border:`1px solid ${t.color}30`, whiteSpace:'nowrap',
    }}>
      {t.label}
    </span>
  )
}

function WindowChip({ inWindow }) {
  const s = inWindow
    ? { color:'#22c55e', bg:'rgba(34,197,94,.12)',  label:'ในรอบตัด'  }
    : { color:'#ef4444', bg:'rgba(239,68,68,.12)',  label:'นอกรอบตัด' }
  return (
    <span style={{
      padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600,
      background:s.bg, color:s.color, border:`1px solid ${s.color}30`, whiteSpace:'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function EventTable({ events }) {
  return (
    <div className="glass glass-lg ev-table-wrap">
      <table className="ev-table">
        <thead>
          <tr>
            {['เวลา', 'อุปกรณ์', 'ประเภท', 'รอบตัด', 'ความแม่นยำ', 'หมายเหตุ'].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign:'center', padding:48, color:'var(--text-2)', fontSize:13 }}>
                ไม่พบเหตุการณ์ — ลองเปลี่ยนเงื่อนไขการค้นหา
              </td>
            </tr>
          ) : events.map(ev => (
            <tr key={ev.id}>
              <td>
                <div style={{ fontWeight:600, color:'var(--text)', fontSize:13 }}>{formatTime(ev.ts)}</div>
                <div style={{ fontSize:10, color:'var(--text-2)', marginTop:2 }}>{formatDate(ev.ts)}</div>
              </td>
              <td>
                <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'rgba(139,92,246,.1)', color:'var(--accent)' }}>
                  {ev.device}
                </span>
              </td>
              <td><TypeChip type={ev.type} /></td>
              <td><WindowChip inWindow={ev.in_harvest_window} /></td>
              <td><ConfBar value={ev.conf} /></td>
              <td className="ev-table-note">{ev.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EventCard({ ev }) {
  return (
    <div className="glass ev-card">
      <div className="ev-card-ts">
        <div style={{ fontSize:20, fontWeight:700, color:'var(--text)', lineHeight:1 }}>{formatTime(ev.ts)}</div>
        <div style={{ fontSize:10, color:'var(--text-2)', marginTop:4 }}>{formatDate(ev.ts)}</div>
        <div style={{ marginTop:6 }}>
          <span style={{ fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:99, background:'rgba(139,92,246,.1)', color:'var(--accent)' }}>
            {ev.device}
          </span>
        </div>
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
          <TypeChip type={ev.type} />
          <WindowChip inWindow={ev.in_harvest_window} />
          {ev.note && (
            <span style={{ fontSize:12, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {ev.note}
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, color:'var(--text-2)' }}>ความแม่นยำ</span>
          <ConfBar value={ev.conf} />
        </div>
      </div>
    </div>
  )
}

function IconTable() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="14" height="3" rx="1"/>
      <rect x="1" y="6.5" width="14" height="3" rx="1"/>
      <rect x="1" y="12" width="14" height="3" rx="1"/>
    </svg>
  )
}
function IconCard() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1.5"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5"/>
    </svg>
  )
}

export default function Events() {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [typeF, setTypeF]     = useState('All')
  const [page, setPage]       = useState(1)
  const [view, setView]       = useState('table')

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .order('ts', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setEvents(data.map(e => ({ ...e, conf: e.confidence, device: e.device_id })))
        }
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => events.filter(e =>
    (typeF === 'All' || e.type === typeF) &&
    (e.type.toLowerCase().includes(search.toLowerCase()) ||
     e.note.toLowerCase().includes(search.toLowerCase()))
  ), [events, search, typeF])

  const total = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  const today = events.filter(e =>
    new Date(e.ts).toDateString() === new Date().toDateString()
  ).length
  const thisWeek = events.filter(e =>
    (Date.now() - new Date(e.ts)) / 86400000 <= 7
  ).length

  return (
    <AppLayout>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:4 }}>เหตุการณ์</h1>
        <p style={{ fontSize:13, color:'var(--text-2)' }}>บันทึกการตรวจจับเสียงทั้งหมด — ระบบ SAFE-Palm</p>
      </div>

      <div style={{ display:'flex', gap:16, marginBottom:24, flexWrap:'wrap' }}>
        <StatChip label="เหตุการณ์ทั้งหมด" value={events.length} color="#8B5CF6" />
        <StatChip label="วันนี้"            value={today}          color="#06b6d4" />
        <StatChip label="7 วันล่าสุด"       value={thisWeek}       color="#22c55e" />
      </div>

      <div className="glass glass-lg" style={{ padding:'16px 20px', marginBottom:20 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input-glass" placeholder="ค้นหาเหตุการณ์..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ flex:'1 1 180px', minWidth:0 }}
          />
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button className={`btn-glass ${typeF==='All'?'active':''}`}
              onClick={() => { setTypeF('All'); setPage(1) }}>ทั้งหมด</button>
            {EVENT_TYPES.map(t => (
              <button key={t} className={`btn-glass ${typeF===t?'active':''}`}
                onClick={() => { setTypeF(t); setPage(1) }}>{TYPE_FILTER_LABEL[t]}</button>
            ))}
          </div>

          <div className="ev-view-toggle">
            <button className={`btn-glass ${view==='table'?'active':''}`}
              onClick={() => setView('table')}
              style={{ display:'flex', alignItems:'center', gap:6 }}>
              <IconTable /> ตาราง
            </button>
            <button className={`btn-glass ${view==='card'?'active':''}`}
              onClick={() => setView('card')}
              style={{ display:'flex', alignItems:'center', gap:6 }}>
              <IconCard /> การ์ด
            </button>
          </div>

          <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-2)', whiteSpace:'nowrap' }}>
            {filtered.length} รายการ
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass glass-lg" style={{ padding:48, textAlign:'center' }}>
          <div className="skeleton" style={{ width:180, height:14, borderRadius:99, margin:'0 auto 12px' }} />
          <div className="skeleton" style={{ width:120, height:12, borderRadius:99, margin:'0 auto' }} />
        </div>
      )}

      {/* Table view */}
      {!loading && (
        <div className="ev-table-view" style={{ display: view === 'table' ? 'block' : 'none' }}>
          <EventTable events={paged} />
        </div>
      )}

      {/* Card view */}
      {!loading && (
        <div className="ev-card-view" style={{ display: view === 'card' ? 'flex' : 'none', flexDirection:'column', gap:10 }}>
          {paged.length === 0 ? (
            <div className="glass glass-lg" style={{ padding:64, textAlign:'center' }}>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:6 }}>ไม่พบเหตุการณ์</div>
              <div style={{ fontSize:13, color:'var(--text-2)' }}>ลองเปลี่ยนเงื่อนไขการค้นหา</div>
            </div>
          ) : paged.map(ev => <EventCard key={ev.id} ev={ev} />)}
        </div>
      )}

      {total > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:24 }}>
          <button className="btn-glass" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← ก่อนหน้า</button>
          {Array.from({length:total},(_,i)=>i+1).map(p => (
            <button key={p} className={`btn-glass ${page===p?'active':''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="btn-glass" onClick={() => setPage(p => Math.min(total,p+1))} disabled={page===total}>ถัดไป →</button>
        </div>
      )}
    </AppLayout>
  )
}
