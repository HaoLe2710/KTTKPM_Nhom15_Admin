import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { setAuthSession } from '../../lib/auth'
import { extractApiError } from '../../lib/errors'

const loginPath = '/auth/login'

function normalizeRole (role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : ''
}

function buildLoginPayload (identifier, password) {
  const value = identifier.trim()
  if (!value) return { password }
  if (value.includes('@')) return { email: value.toLowerCase(), password }
  if (/^\d+$/.test(value.replace(/^\+/, ''))) return { phone: value, password }
  return { identifier: value.toLowerCase(), password }
}

export default function Login () {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const target = location.state?.from || '/dashboard'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      const res = await api.post(loginPath, buildLoginPayload(form.identifier, form.password))
      const accessToken = res?.accessToken || res?.token
      const tokenType = res?.tokenType || 'Bearer'
      const role = normalizeRole(res?.role)
      const userId = res?.userId || res?.user?.id

      if (!accessToken) return setError('Đăng nhập thành công nhưng BE không trả accessToken')
      if (!userId) return setError('Đăng nhập thành công nhưng BE không trả userId. Không thể gọi API chat/admin.')
      if (!['ADMIN', 'STAFF', 'EMPLOYEE'].includes(role)) return setError(`Vai trò '${role || 'UNKNOWN'}' không được phép truy cập`) 

      setAuthSession({ accessToken, tokenType, role, userId })
      navigate(target, { replace: true })
    } catch (err) {
      setError(extractApiError(err, 'Đăng nhập thất bại'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md border border-slate-200 p-6 bg-white rounded-xl shadow-sm space-y-3">
        <h1 className="text-2xl font-bold text-blue-700">Đăng nhập hệ thống</h1>
        <p className="text-sm text-slate-500">Nhập email / identifier / số điện thoại và mật khẩu.</p>

        {error && <div className="border border-red-300 text-red-700 bg-red-50 p-2 rounded-lg text-sm">{error}</div>}

        <input className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm" placeholder="Email / Identifier / Phone" value={form.identifier} onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))} autoComplete="username" />
        <input className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm" type="password" placeholder="Mật khẩu" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} autoComplete="current-password" />

        <button disabled={loading} className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg disabled:opacity-50">{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
      </form>
    </div>
  )
}
