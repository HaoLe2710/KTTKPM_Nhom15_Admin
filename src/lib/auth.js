const AUTH_STORAGE_KEY = 'admin_auth_session'

function decodeTokenPayload (token) {
  if (!token || typeof window === 'undefined') return null
  try {
    const raw = String(token).replace(/^Bearer\s+/i, '').trim()
    const [, payload] = raw.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

function normalizeSession (session) {
  if (!session || typeof session !== 'object') return null
  const payload = decodeTokenPayload(session.accessToken)
  return {
    ...session,
    userId: payload?.userId || session.userId,
    role: payload?.role || session.role
  }
}

export function getAuthSession () {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? normalizeSession(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function setAuthSession (session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizeSession(session)))
}

export function clearAuthSession () {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function isAuthenticated () {
  const session = getAuthSession()
  return !!session?.accessToken
}

export function getCurrentRole () {
  return String(getAuthSession()?.role || '').toUpperCase()
}

export function toAuthHeader (session) {
  if (!session?.accessToken) return null
  const raw = String(session.accessToken).trim()
  if (/^Bearer\s+/i.test(raw)) return raw
  const tokenType = (session.tokenType || 'Bearer').trim()
  return `${tokenType} ${raw}`
}
