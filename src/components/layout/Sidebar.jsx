import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const NAV = [
  { to: '/dashboard',  label: 'แดชบอร์ด',   icon: <IconGrid /> },
  { to: '/events',     label: 'เหตุการณ์',  icon: <IconBell /> },
  { to: '/plantation', label: 'พื้นที่สวน', icon: <IconMap /> },
  { to: '/devices',    label: 'อุปกรณ์',    icon: <IconCpu /> },
  { to: '/harvest',    label: 'เวลาตัดปาล์ม', icon: <IconCalendar /> },
  { to: '/settings',   label: 'การตั้งค่า', icon: <IconSettings /> },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#8B5CF6,#A855F7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(139,92,246,.4)',
          }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M12 2C8 2 4 5 4 9c0 5 8 13 8 13s8-8 8-13c0-4-4-7-8-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.3px' }}>SAFE-Palm</div>
            <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 1 }}>ระบบตรวจสอบ</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 12px', flex: 1 }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 'var(--r-sm)',
            marginBottom: 2, textDecoration: 'none', fontSize: 13, fontWeight: 500,
            color: isActive ? 'var(--accent)' : 'var(--text-2)',
            background: isActive ? 'rgba(139,92,246,.1)' : 'transparent',
            border: isActive ? '1px solid rgba(139,92,246,.2)' : '1px solid transparent',
            transition: 'all .2s',
          })}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            overflow: 'hidden',
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profile?.first_name?.[0] || '?')}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.nickname || profile?.first_name || 'User'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{profile?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function IconGrid()     { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
function IconBell()     { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg> }
function IconMap()      { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> }
function IconMic()      { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg> }
function IconCpu()      { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg> }
function IconCalendar() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function IconSettings() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> }
