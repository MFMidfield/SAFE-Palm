import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">{children}</main>
      <BottomNav />
    </div>
  )
}
