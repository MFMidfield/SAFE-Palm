import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const TYPE_STYLE = {
  'Palm Cutting':        { color:'#ef4444', bg:'rgba(239,68,68,.12)',    label:'ตัดปาล์ม'    },
  'Chainsaw Sound':      { color:'#f59e0b', bg:'rgba(245,158,11,.12)',   label:'เลื่อยไฟฟ้า' },
  'Suspicious Activity': { color:'#8B5CF6', bg:'rgba(139,92,246,.12)',  label:'น่าสงสัย'    },
  'Unknown Sound':       { color:'#64748b', bg:'rgba(100,116,139,.12)', label:'ไม่ทราบ'     },
}

const PER_PAGE = 5

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
    ? { color:'#22c55e', bg:'rgba(34,197,94,.12)', label:'ในรอบตัด'  }
    : { color:'#ef4444', bg:'rgba(239,68,68,.12)', label:'นอกรอบตัด' }
  return (
    <span style={{
      padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600,
      background:s.bg, color:s.color, border:`1px solid ${s.color}30`, whiteSpace:'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function ConfidenceBar({ value }) {
  const color = value > 90 ? 'var(--ok)' : value > 75 ? 'var(--warn)' : 'var(--danger)'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ width:44, height:4, borderRadius:99, background:'var(--bg-elevated)', overflow:'hidden' }}>
        <div style={{ width:`${value}%`, height:'100%', borderRadius:99, background:color }} />
      </div>
      <span style={{ fontSize:11, fontWeight:600, color }}>{value}%</span>
    </div>
  )
}

function AlertCard({ ev }) {
  return (
    <div className="glass" style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>
          {new Date(ev.ts).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })}
        </span>
        <span style={{ fontSize:10, color:'var(--text-3)' }}>
          {new Date(ev.ts).toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit' })}
        </span>
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <TypeChip type={ev.type} />
        <WindowChip inWindow={ev.in_harvest_window} />
      </div>
      <ConfidenceBar value={ev.confidence} />
    </div>
  )
}

export default function AlertHistory() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(1)

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .order('ts', { ascending: false })
      .limit(40)
      .then(({ data }) => {
        setEvents(data ?? [])
        setLoading(false)
      })
  }, [])

  const total = Math.ceil(events.length / PER_PAGE)
  const paged = events.slice((page-1)*PER_PAGE, page*PER_PAGE)

  return (
    <div className="glass glass-lg db-pad">
      <div className="chart-header">
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>ประวัติแจ้งเตือน</div>
          <div style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>บันทึกการแจ้งเตือนล่าสุด</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <span className="chip chip-purple">{events.length} รายการ</span>
          <NavLink to="/events" style={{
            fontSize:12, color:'var(--accent)', textDecoration:'none', fontWeight:600,
            padding:'4px 12px', borderRadius:8,
            background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.2)',
          }}>
            ดูทั้งหมด →
          </NavLink>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:44, borderRadius:12 }} />)}
        </div>
      ) : (
        <>
          {/* Desktop: Table */}
          <div className="alert-table-wrap" style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:480 }}>
              <thead>
                <tr>
                  {['เวลา','ประเภท','รอบตัด','ความแม่นยำ','หมายเหตุ'].map(h => (
                    <th key={h} style={{
                      textAlign:'left', padding:'8px 10px', fontSize:10, fontWeight:600,
                      color:'var(--text-label)', textTransform:'uppercase', letterSpacing:'.5px',
                      borderBottom:'1px solid var(--glass-border)', whiteSpace:'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign:'center', padding:32, color:'var(--text-2)', fontSize:13 }}>ไม่พบข้อมูล</td></tr>
                ) : paged.map(ev => (
                  <tr key={ev.id}
                    style={{ borderBottom:'1px solid rgba(139,92,246,0.06)', transition:'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(139,92,246,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px', whiteSpace:'nowrap' }}>
                      <div style={{ fontWeight:600, color:'var(--text)', fontSize:12 }}>
                        {new Date(ev.ts).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })}
                      </div>
                      <div style={{ color:'var(--text-2)', fontSize:10 }}>
                        {new Date(ev.ts).toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'2-digit' })}
                      </div>
                    </td>
                    <td style={{ padding:'10px' }}><TypeChip type={ev.type} /></td>
                    <td style={{ padding:'10px' }}><WindowChip inWindow={ev.in_harvest_window} /></td>
                    <td style={{ padding:'10px' }}><ConfidenceBar value={ev.confidence} /></td>
                    <td style={{ padding:'10px', fontSize:12, color:'var(--text-2)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {ev.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Cards */}
          <div className="alert-card-list">
            {paged.length === 0
              ? <div style={{ textAlign:'center', padding:32, color:'var(--text-2)', fontSize:13 }}>ไม่พบข้อมูล</div>
              : paged.map(ev => <AlertCard key={ev.id} ev={ev} />)
            }
          </div>

          {total > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:16 }}>
              <button className="btn-glass" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← ก่อนหน้า</button>
              {Array.from({length:total},(_,i)=>i+1).map(p => (
                <button key={p} className={`btn-glass ${page===p?'active':''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="btn-glass" onClick={() => setPage(p => Math.min(total,p+1))} disabled={page===total}>ถัดไป →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
