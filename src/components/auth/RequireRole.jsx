import { Navigate, Outlet } from 'react-router-dom'
import { getCurrentRole } from '../../lib/auth'

export default function RequireRole ({ roles = [] }) {
  const role = getCurrentRole()
  if (!roles.includes(role)) {
    return <Navigate to="/chat" replace />
  }
  return <Outlet />
}
