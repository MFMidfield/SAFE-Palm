import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const OFFLINE_THRESHOLD = 5 * 60 * 1000   // 5 minutes

export default function BoardStatus({ boardId = 'esp32-01' }) {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetchStatus()

    const channel = supabase
      .channel('board-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_status' },
        (payload) => checkOnline(payload.new)
      )
      .subscribe()

    const interval = setInterval(fetchStatus, 15000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [boardId])

  const fetchStatus = async () => {
    const { data } = await supabase
      .from('board_status')
      .select('*')
      .eq('id', boardId)
      .single()
    if (data) checkOnline(data)
  }

  const checkOnline = (data) => {
    const lastSeen = new Date(data.last_seen).getTime()
    const isOnline = Date.now() - lastSeen < OFFLINE_THRESHOLD
    setStatus({ ...data, isOnline })
  }

  if (status === null) {
    return (
      <div className="d-flex align-items-center gap-2">
        <span className="spinner-border spinner-border-sm text-secondary" />
        <span className="text-muted small">กำลังโหลด...</span>
      </div>
    )
  }

  return (
    <div className="d-flex align-items-center gap-2">
      <span className={`status-dot ${status.isOnline ? 'status-dot--online' : 'status-dot--offline'}`} />
      <span className={`fw-semibold small ${status.isOnline ? 'text-success' : 'text-danger'}`}>
        {status.isOnline ? 'Board Online ✅' : 'Board Offline ❌'}
      </span>
      <span className="text-muted small">
        last seen: {new Date(status.last_seen).toLocaleTimeString('th-TH')}
      </span>
    </div>
  )
}
