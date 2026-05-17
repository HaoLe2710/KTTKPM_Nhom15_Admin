import axios from 'axios'
import { clearAuthSession, getAuthSession, toAuthHeader } from './auth'

const apiOrigin = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '')
if (!apiOrigin) {
  throw new Error('Thiếu VITE_API_ORIGIN trong file .env')
}

const api = axios.create({
  baseURL: `${apiOrigin}/api/v1`,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const session = getAuthSession()
  if (session?.role) config.headers['X-User-Role'] = String(session.role).toUpperCase()
  if (session?.userId) config.headers['X-User-Id'] = session.userId
  const authHeader = toAuthHeader(session)
  if (authHeader) config.headers.Authorization = authHeader
  return config
})

api.interceptors.response.use(
  (response) => {
    const payload = response?.data
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if (Object.prototype.hasOwnProperty.call(payload, 'data') && Object.prototype.hasOwnProperty.call(payload, 'success')) {
        return payload.data
      }
    }
    return payload
  },
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthSession()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
