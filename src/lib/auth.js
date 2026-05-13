const AUTH_STORAGE_KEY = 'admin_auth_session'

export function getAuthSession () {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setAuthSession (session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
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
