import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/* ─── ช่วงเวลาตัด (advance) ─── */
const TIME_SLOTS = [
  { value: 'all_day',   label: 'ทั้งวัน',   range: '00:00 - 23:59' },
  { value: 'dawn',      label: 'หัวรุ่ง',   range: '03:00 - 05:59' },
  { value: 'morning',   label: 'เช้า',      range: '06:00 - 11:59' },
  { value: 'afternoon', label: 'บ่าย',      range: '12:00 - 15:59' },
  { value: 'evening',   label: 'เย็น',      range: '16:00 - 18:59' },
  { value: 'night',     label: 'กลางคืน',   range: '19:00 - 23:59' },
  { value: 'midnight',  label: 'เที่ยงคืน', range: '00:00 - 02:59' },
]
const SLOT_META = Object.fromEntries(TIME_SLOTS.map(s => [s.value, s]))

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

const DEFAULT_SCHEDULE = {
  cycle_months: 1,
  anchor_date: new Date().toISOString().slice(0, 10),
  rounds: [{ day: 1, time_slot: 'all_day', duration_days: 1 }],
}

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate() }

/* เดือนที่แสดงอยู่ในรอบตัดหรือไม่ (อิง anchor_date + cycle_months) */
function isActiveCycleMonth(year, month, schedule) {
  const anchor = new Date(schedule.anchor_date)
  const diff = (year - anchor.getFullYear()) * 12 + (month - anchor.getMonth())
  const cyc = schedule.cycle_months || 1
  return ((diff % cyc) + cyc) % cyc === 0
}

/* day-of-month -> [{ time_slot }] ของเดือนที่แสดง (รวม duration_days) */
function buildDayMap(year, month, schedule) {
  const map = {}
  if (!isActiveCycleMonth(year, month, schedule)) return map
  const dim = daysInMonth(year, month)
  for (const r of schedule.rounds) {
    const span = Math.max(1, r.duration_days || 1)
    for (let i = 0; i < span; i++) {
      const d = r.day + i
      if (d < 1 || d > dim) continue
      if (!map[d]) map[d] = []
      map[d].push({ time_slot: r.time_slot, isStart: i === 0 })
    }
  }
  return map
}

/* ═══════════ Modal ═══════════ */
function Modal({ title, onClose, children, maxWidth = 520 }) {
  return createPortal(
    <div className="hv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass glass-lg hv-modal-box" style={{ maxWidth }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div className="hv-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  )
}

/* ═══════════ Modal ตั้งค่ารอบตัด ═══════════ */
function ScheduleModal({ schedule, onSave, onClose }) {
  const [cycleMonths, setCycleMonths] = useState(schedule.cycle_months || 1)
  // selectedDays: { [day]: { time_slot, duration_days } }
  const [selectedDays, setSelectedDays] = useState(() => {
    const o = {}
    for (const r of schedule.rounds) o[r.day] = { time_slot: r.time_slot || 'all_day', duration_days: r.duration_days || 1 }
    return o
  })
  const [showAdvance, setShowAdvance] = useState(false)
  const [err, setErr] = useState('')

  const dayList = useMemo(() => Object.keys(selectedDays).map(Number).sort((a, b) => a - b), [selectedDays])

  function toggleDay(d) {
    setSelectedDays(prev => {
      const next = { ...prev }
      if (next[d]) delete next[d]
      else next[d] = { time_slot: 'all_day', duration_days: 1 }
      return next
    })
    setErr('')
  }
  function setDayProp(d, key, val) {
    setSelectedDays(prev => ({ ...prev, [d]: { ...prev[d], [key]: val } }))
  }

  function handleSave() {
    if (dayList.length === 0) { setErr('กรุณาเลือกวันตัดอย่างน้อย 1 วัน'); return }
    const rounds = dayList.map(d => ({
      day: d,
      time_slot: selectedDays[d].time_slot || 'all_day',
      duration_days: Math.max(1, Number(selectedDays[d].duration_days) || 1),
    }))
    onSave({ cycle_months: Number(cycleMonths) || 1, rounds })
  }

  return (
    <Modal title="ตั้งค่ารอบตัดปาล์ม" onClose={onClose} maxWidth={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* กี่เดือนต่อรอบ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.4px' }}>รอบตัดกี่เดือนต่อรอบ *</label>
          <select className="input-glass" value={cycleMonths} onChange={e => setCycleMonths(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>ทุก {m} เดือน</option>
            ))}
          </select>
        </div>

        {/* รอบนึงวันไหนบ้าง (บังคับ) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.4px' }}>รอบนึงตัดวันไหนบ้าง * (เลือกวันที่ของเดือน)</label>
          <div className="hv-daygrid">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
              const on = !!selectedDays[d]
              return (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={'hv-daybtn' + (on ? ' on' : '')}>
                  {d}
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
            เลือกแล้ว {dayList.length} วัน{dayList.length > 0 ? ` (วันที่ ${dayList.join(', ')})` : ''}
          </div>
        </div>

        {/* Advance */}
        <div>
          <button type="button" onClick={() => setShowAdvance(s => !s)} className="btn-glass"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ transform: showAdvance ? 'rotate(90deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>›</span>
            ตั้งค่าขั้นสูง (เวลาตัด / จำนวนวันต่อรอบ)
          </button>

          {showAdvance && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dayList.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-2)', padding: '10px 0' }}>เลือกวันตัดก่อน เพื่อปรับเวลาและจำนวนวัน</div>
              ) : dayList.map(d => (
                <div key={d} className="hv-advrow">
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 64 }}>วันที่ {d}</span>
                  <select className="input-glass" value={selectedDays[d].time_slot}
                    onChange={e => setDayProp(d, 'time_slot', e.target.value)} style={{ flex: '1 1 120px' }}>
                    {TIME_SLOTS.map(s => <option key={s.value} value={s.value}>{s.label} ({s.range})</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input className="input-glass" type="number" min={1} max={28}
                      value={selectedDays[d].duration_days}
                      onChange={e => setDayProp(d, 'duration_days', e.target.value)}
                      style={{ width: 64 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>วัน</span>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>ค่าเริ่มต้น: เวลาตัด "ทั้งวัน", รอบละ 1 วัน</div>
            </div>
          )}
        </div>

        {err && <div style={{ fontSize: 12, color: 'var(--danger)', padding: '8px 12px', background: 'rgba(239,68,68,.08)', borderRadius: 8 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-glass">ยกเลิก</button>
          <button onClick={handleSave} className="btn-accent">บันทึก</button>
        </div>
      </div>
    </Modal>
  )
}

/* ═══════════ ปฏิทิน ═══════════ */
function Calendar({ schedule }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const dayMap = useMemo(() => buildDayMap(year, month, schedule), [year, month, schedule])
  const active = isActiveCycleMonth(year, month, schedule)
  const dim = daysInMonth(year, month)
  const firstDow = new Date(year, month, 1).getDay()

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(d)

  return (
    <div className="glass glass-lg" style={{ padding: 20 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prev} className="btn-glass" style={{ padding: '6px 12px' }}>‹</button>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', minWidth: 150, textAlign: 'center' }}>
            {MONTHS_TH[month]} {year + 543}
          </div>
          <button onClick={next} className="btn-glass" style={{ padding: '6px 12px' }}>›</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={'hv-badge ' + (active ? 'on' : 'off')}>
            {active ? 'เดือนนี้มีรอบตัด' : 'เดือนนี้ไม่มีรอบตัด'}
          </span>
        </div>
      </div>

      {/* weekday header */}
      <div className="hv-calgrid" style={{ marginBottom: 6 }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', padding: '4px 0' }}>{w}</div>
        ))}
      </div>

      {/* days */}
      <div className="hv-calgrid">
        {cells.map((d, i) => {
          if (d === null) return <div key={'e' + i} />
          const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const slots = dayMap[d] || []
          const isCut = slots.length > 0
          const slotLabels = [...new Set(slots.map(s => (SLOT_META[s.time_slot] || SLOT_META.all_day).label))]
          return (
            <div key={d} className={'hv-cell' + (isCut ? ' cut' : '') + (isToday ? ' today' : '')}>
              <div className="hv-cell-num">{d}</div>
              {isCut && (
                <div className="hv-cell-slot">
                  {slotLabels[0]}{slotLabels.length > 1 ? ` +${slotLabels.length - 1}` : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 14, height: 14, borderRadius: 5, background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.35)', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>วันรอบตัด (มีป้ายช่วงเวลา)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 14, height: 14, borderRadius: 5, background: 'transparent', border: '1.5px solid var(--accent)', boxShadow: '0 0 0 1px var(--accent) inset', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: 'var(--text-2)' }}>วันนี้</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ MAIN ═══════════ */
export default function Harvest() {
  const { user } = useAuth()
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchSchedule = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('harvest_schedules').select('*').eq('user_id', user.id).maybeSingle()
    setLoading(false)
    if (error) { setDbError(true); setSchedule(DEFAULT_SCHEDULE); return }
    if (data) {
      setSchedule({
        cycle_months: data.cycle_months,
        anchor_date: data.anchor_date,
        rounds: Array.isArray(data.rounds) ? data.rounds : DEFAULT_SCHEDULE.rounds,
      })
    } else {
      setSchedule(DEFAULT_SCHEDULE)
    }
  }, [user])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  async function handleSave({ cycle_months, rounds }) {
    const anchor_date = schedule?.anchor_date || DEFAULT_SCHEDULE.anchor_date
    const next = { cycle_months, anchor_date, rounds }
    setSchedule(next)
    setShowModal(false)
    if (dbError) return
    const { error } = await supabase.from('harvest_schedules').upsert(
      { user_id: user.id, cycle_months, anchor_date, rounds, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    if (error) { alert('บันทึกไม่สำเร็จ: ' + error.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const summary = useMemo(() => {
    if (!schedule) return ''
    const days = [...schedule.rounds].map(r => r.day).sort((a, b) => a - b)
    return `ทุก ${schedule.cycle_months} เดือน · ${schedule.rounds.length} วันต่อรอบ (วันที่ ${days.join(', ')})`
  }, [schedule])

  return (
    <AppLayout>
      <style>{`
        .hv-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,.78); backdrop-filter: blur(6px);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 20px 16px 32px; overflow-y: auto;
        }
        .hv-modal-box { width: 100%; flex-shrink: 0; display: flex; flex-direction: column; background: var(--bg-elevated) !important; }
        [data-theme="light"] .hv-modal-box { background: var(--bg-surface) !important; }
        .hv-modal-body { padding: 20px 22px; }

        .hv-daygrid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .hv-daybtn {
          aspect-ratio: 1; border-radius: 8px; cursor: pointer;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          color: var(--text-2); font-size: 13px; font-weight: 600;
          transition: all .15s;
        }
        .hv-daybtn:hover { border-color: rgba(139,92,246,.45); color: var(--text); }
        .hv-daybtn.on {
          background: rgba(139,92,246,.18); border-color: var(--accent); color: var(--accent);
        }

        .hv-advrow {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 10px 12px; border-radius: 10px;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
        }

        .hv-calgrid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .hv-cell {
          aspect-ratio: 1; border-radius: 10px; padding: 6px;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          display: flex; flex-direction: column; justify-content: space-between;
          min-height: 0;
        }
        .hv-cell-num { font-size: 13px; font-weight: 600; color: var(--text-2); }
        .hv-cell.cut { background: rgba(139,92,246,.12); border-color: rgba(139,92,246,.35); }
        .hv-cell.cut .hv-cell-num { color: var(--text); }
        .hv-cell.today { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
        .hv-cell.today .hv-cell-num { color: var(--accent); font-weight: 800; }
        .hv-cell-slot {
          font-size: 9px; font-weight: 700; line-height: 1.2;
          color: var(--accent); letter-spacing: -.2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 100%;
        }

        .hv-badge { font-size: 11px; font-weight: 600; padding: 5px 12px; border-radius: 99px; }
        .hv-badge.on  { background: rgba(34,197,94,.12);  color: #22c55e; border: 1px solid rgba(34,197,94,.3); }
        .hv-badge.off { background: rgba(100,116,139,.12); color: var(--text-2); border: 1px solid var(--glass-border); }

        @media (max-width: 540px) {
          .hv-modal-body { padding: 16px 14px; }
          .hv-overlay { padding: 12px 10px 24px; }
          .hv-daybtn { font-size: 12px; }
          .hv-cell { padding: 4px; border-radius: 8px; }
          .hv-cell-num { font-size: 11px; }
          .hv-cell-slot { font-size: 8px; }
        }
      `}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>เวลาตัดปาล์ม</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>กำหนดรอบตัดปาล์ม — ระบบจะแจ้งเตือนเฉพาะเสียงที่เกิดนอกช่วงเก็บเกี่ยว</p>
      </div>

      {dbError && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', fontSize: 12, color: 'var(--warn)' }}>
          ยังไม่ได้สร้างตาราง harvest_schedules — รัน SQL ใน claude/SQL-harvest.sql (ตอนนี้แสดงค่าตัวอย่าง ยังบันทึกไม่ได้)
        </div>
      )}

      {loading || !schedule ? (
        <div className="skeleton" style={{ height: 420, borderRadius: 16 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 740 }}>
          {/* summary + edit */}
          <div className="glass glass-lg" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>รอบตัดปัจจุบัน</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{summary}</div>
            </div>
            <button onClick={() => setShowModal(true)} className="btn-accent" style={{ flexShrink: 0 }}>
              {saved ? 'บันทึกแล้ว' : 'ตั้งค่ารอบตัด'}
            </button>
          </div>

          <Calendar schedule={schedule} />
        </div>
      )}

      {showModal && schedule && (
        <ScheduleModal schedule={schedule} onSave={handleSave} onClose={() => setShowModal(false)} />
      )}
    </AppLayout>
  )
}
