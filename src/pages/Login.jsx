import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { user, profile, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate(profile ? '/dashboard' : '/register', { replace: true })
    }
  }, [user, profile, loading, navigate])

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid dots */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(139,92,246,.07) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: '-200px', left: '-200px', width: 560, height: 560,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(139,92,246,.28) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-160px', right: '-160px', width: 480, height: 480,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(99,102,241,.22) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '15%', width: 260, height: 260,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(168,85,247,.14) 0%, transparent 70%)',
        transform: 'translateY(-50%)',
      }} />

      {/* Card */}
      <div className="glass glass-lg" style={{
        width: '100%', maxWidth: 400,
        padding: '44px 36px 36px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', zIndex: 1, textAlign: 'center',
      }}>

        {/* Logo mark */}
        <div style={{ marginBottom: 28, position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: -14, borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(139,92,246,.25) 0%, transparent 70%)',
          }} />
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 60%, #6366f1 100%)',
            boxShadow: '0 8px 36px rgba(139,92,246,.55), inset 0 1px 0 rgba(255,255,255,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <LogoIcon />
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 32, fontWeight: 800, letterSpacing: '-0.6px', marginBottom: 6,
          background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #c084fc 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          SAFE-Palm
        </h1>

        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
          ระบบตรวจจับเสียงตัดปาล์มน้ำมัน
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 32, letterSpacing: '.2px' }}>
          Sound-based AI for Early Palm-theft Detection
        </p>

        {/* Feature badges */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
          {FEATURES.map(f => (
            <span key={f.text} style={{
              padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.2)',
              color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {f.icon} {f.text}
            </span>
          ))}
        </div>

        {/* Google sign-in */}
        <button onClick={signInWithGoogle} className="login-google-btn" style={{
          width: '100%', padding: '13px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          borderRadius: 13, border: '1px solid var(--glass-border)',
          background: 'var(--glass-bg)',
          color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          transition: 'all .2s',
        }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(139,92,246,.12)'
            e.currentTarget.style.borderColor = 'rgba(139,92,246,.45)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(139,92,246,.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--glass-bg)'
            e.currentTarget.style.borderColor = 'var(--glass-border)'
            e.currentTarget.style.boxShadow = 'none'
          }}>
          <GoogleIcon />
          เข้าสู่ระบบด้วย Google
        </button>

        {/* Divider */}
        <div style={{ width: '100%', height: 1, background: 'var(--glass-border)', marginBottom: 18 }} />

        {/* Footer */}
        <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
          โครงการ SAFE-Palm &nbsp;·&nbsp; Surat Thani<br />
          <span style={{ opacity: .7 }}>ม.ปลาย · ESP32 + Supabase + AI</span>
        </p>
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: '🔊', text: 'Real-time AI' },
  { icon: '📍', text: 'แผนที่สวน' },
  { icon: '📱', text: 'LINE Alert' },
]

function LogoIcon() {
  return (
    <svg viewBox="0 0 44 44" width="42" height="42" fill="none">
      {/* Mic body */}
      <rect x="16" y="6" width="12" height="20" rx="6" fill="white" opacity=".95" />
      {/* Mic arc */}
      <path d="M11 22c0 6.075 4.925 11 11 11s11-4.925 11-11" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      {/* Stem */}
      <line x1="22" y1="33" x2="22" y2="38" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="17" y1="38" x2="27" y2="38" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      {/* Sound waves */}
      <path d="M7 19.5a15.5 15.5 0 000 5" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity=".45" />
      <path d="M37 19.5a15.5 15.5 0 010 5" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity=".45" />
      <path d="M4 17.5a19 19 0 000 9" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity=".22" />
      <path d="M40 17.5a19 19 0 010 9" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity=".22" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}
