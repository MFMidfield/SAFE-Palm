import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { PrivateRoute, RegisterRoute } from './components/PrivateRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import Plantation from './pages/Plantation'
import Devices from './pages/Devices'
import Harvest from './pages/Harvest'
import Settings from './pages/Settings'

function PRoute({ children }) {
  return <PrivateRoute>{children}</PrivateRoute>
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterRoute><Register /></RegisterRoute>} />
          <Route path="/dashboard"  element={<PRoute><Dashboard /></PRoute>} />
          <Route path="/events"     element={<PRoute><Events /></PRoute>} />
          <Route path="/plantation" element={<PRoute><Plantation /></PRoute>} />
          <Route path="/devices"    element={<PRoute><Devices /></PRoute>} />
          <Route path="/harvest"    element={<PRoute><Harvest /></PRoute>} />
          <Route path="/settings"   element={<PRoute><Settings /></PRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  )
}
