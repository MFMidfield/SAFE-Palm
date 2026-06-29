import { useState, useMemo, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'

const DAY_LABELS = ['อา','จ','อ','พ','พฤ','ศ','ส']

function aggregateDay(events) {
  const buckets = Array.from({length:24}, (_,i) => ({ t:`${String(i).padStart(2,'0')}:00`, v:0 }))
  events.forEach(e => { buckets[new Date(e.ts).getHours()].v++ })
  return buckets
}

function aggregateWeek(events) {
  const buckets = Array.from({length:7}, (_,i) => {
    const d = new Date(Date.now() - (6-i)*86400000)
    d.setHours(0,0,0,0)
    return { t: DAY_LABELS[d.getDay()], v:0, date: d.toDateString() }
  })
  events.forEach(e => {
    const b = buckets.find(b => b.date === new Date(e.ts).toDateString())
    if (b) b.v++
  })
  return buckets.map(({ t, v }) => ({ t, v }))
}

function aggregateMonth(events) {
  const buckets = Array.from({length:30}, (_,i) => {
    const d = new Date(Date.now() - (29-i)*86400000)
    d.setHours(0,0,0,0)
    return { t: String(d.getDate()), v:0, date: d.toDateString() }
  })
  events.forEach(e => {
    const b = buckets.find(b => b.date === new Date(e.ts).toDateString())
    if (b) b.v++
  })
  return buckets.map(({ t, v }) => ({ t, v }))
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass" style={{ padding:'8px 14px', fontSize:12 }}>
      <div style={{ color:'var(--text-2)' }}>{label}</div>
      <div style={{ color:'var(--accent)', fontWeight:700 }}>{payload[0].value} เหตุการณ์</div>
    </div>
  )
}

function useIsMobile(breakpoint = 480) {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= breakpoint)
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return mobile
}

export default function StatsChart() {
  const [range, setRange]       = useState('week')
  const [rawEvents, setRawEvents] = useState([])
  const isMobile = useIsMobile()

  useEffect(() => {
    const now = new Date()
    let from
    if (range === 'day') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (range === 'week') {
      from = new Date(Date.now() - 6 * 86400000)
      from.setHours(0, 0, 0, 0)
    } else {
      from = new Date(Date.now() - 29 * 86400000)
      from.setHours(0, 0, 0, 0)
    }
    supabase.from('events').select('ts').gte('ts', from.toISOString())
      .then(({ data }) => setRawEvents(data ?? []))
  }, [range])

  const data = useMemo(() => {
    if (range === 'day')   return aggregateDay(rawEvents)
    if (range === 'week')  return aggregateWeek(rawEvents)
    return aggregateMonth(rawEvents)
  }, [rawEvents, range])

  return (
    <div className="glass glass-lg db-pad" style={{ height:'100%', minHeight: isMobile ? 260 : 320 }}>
      <div className="chart-header">
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>สถิติการตรวจจับ</div>
          <div style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>จำนวนเหตุการณ์ตามช่วงเวลา</div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {[['day','วัน'],['week','สัปดาห์'],['month','เดือน']].map(([r,th]) => (
            <button key={r} className={`btn-glass ${range===r?'active':''}`} onClick={() => setRange(r)}>
              {th}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={isMobile ? 170 : 220}>
        <LineChart data={data} margin={{ top:4, right:4, bottom:0, left: isMobile ? -30 : -24 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#8B5CF6" stopOpacity={0.4}/>
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.08)" vertical={false} />
          <XAxis dataKey="t" tick={{ fill:'#8892a4', fontSize: isMobile ? 9 : 10 }} axisLine={false} tickLine={false}
            interval={range==='day' ? (isMobile ? 5 : 3) : range==='month' ? (isMobile ? 6 : 4) : 0} />
          <YAxis tick={{ fill:'#8892a4', fontSize:10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke:'rgba(139,92,246,0.3)', strokeWidth:1 }} />
          <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2.5}
            dot={false} activeDot={{ r:5, fill:'var(--accent)', strokeWidth:0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
