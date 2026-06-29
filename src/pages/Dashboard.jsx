import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import SummaryCards from '../components/dashboard/SummaryCards'
import StatsChart from '../components/dashboard/StatsChart'
import PlantationMap from '../components/dashboard/PlantationMap'
import AlertHistory from '../components/dashboard/AlertHistory'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

function NoDevicesBanner({ userId }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('devices').select('id', { count:'exact', head:true }).eq('user_id', userId)
      .then(({ count }) => { if (count === 0) setShow(true) })
  }, [userId])

  if (!show) return null

  return (
    <div style={{
      marginBottom: 20,
      padding: '14px 18px',
      borderRadius: 14,
      background: 'rgba(139,92,246,.07)',
      border: '1px solid rgba(139,92,246,.2)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{
          width:38, height:38, borderRadius:10, flexShrink:0,
          background:'rgba(139,92,246,.15)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8B5CF6" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
            <rect x="9" y="9" width="6" height="6"/>
            <line x1="9" y1="1" x2="9" y2="4"/>
            <line x1="15" y1="1" x2="15" y2="4"/>
            <line x1="9" y1="20" x2="9" y2="23"/>
            <line x1="15" y1="20" x2="15" y2="23"/>
            <line x1="20" y1="9" x2="23" y2="9"/>
            <line x1="20" y1="14" x2="23" y2="14"/>
            <line x1="1" y1="9" x2="4" y2="9"/>
            <line x1="1" y1="14" x2="4" y2="14"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:2 }}>
            ยังไม่ได้เพิ่มอุปกรณ์
          </div>
          <div style={{ fontSize:12, color:'var(--text-2)' }}>
            เพิ่ม ESP32 Node เพื่อเริ่มตรวจจับเสียงการตัดปาล์ม
          </div>
        </div>
      </div>
      <NavLink to="/settings" style={{
        padding:'8px 16px', borderRadius:9, fontSize:12, fontWeight:600,
        background:'rgba(139,92,246,.15)', border:'1px solid rgba(139,92,246,.3)',
        color:'var(--accent)', textDecoration:'none', whiteSpace:'nowrap',
        transition:'all .2s',
      }}
        onMouseEnter={e => e.currentTarget.style.background='rgba(139,92,246,.25)'}
        onMouseLeave={e => e.currentTarget.style.background='rgba(139,92,246,.15)'}>
        ไปที่การตั้งค่า →
      </NavLink>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <AppLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 className="dash-title">แดชบอร์ด</h1>
        <p className="dash-subtitle">ภาพรวมระบบ SAFE-Palm — การติดตามแบบเรียลไทม์</p>
      </div>

      <NoDevicesBanner userId={user?.id} />

      <div className="bento-grid" style={{ rowGap: 24 }}>
        <div className="bento-col-4"><SummaryCards /></div>
        <div className="bento-col-2 dash-panel"><StatsChart /></div>
        <div className="bento-col-2 dash-panel"><PlantationMap /></div>
        <div className="bento-col-4"><AlertHistory /></div>
      </div>
    </AppLayout>
  )
}
