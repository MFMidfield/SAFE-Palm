import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Spinner() {
  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-success" role="status" />
    </div>
  )
}

export function PrivateRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/register" replace />
  return children
}

export function RegisterRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (profile) return <Navigate to="/dashboard" replace />
  return children
}
