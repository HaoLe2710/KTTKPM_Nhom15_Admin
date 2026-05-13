export function extractApiError (err, fallback = 'Request failed') {
  const parsed = extractApiErrorDetails(err, fallback)
  return parsed.summary
}

function mapBackendErrorToFriendlyMessage (rawMessage, fallback) {
  const msg = String(rawMessage || '')
  const lower = msg.toLowerCase()

  if (lower.includes('option code already exists') || lower.includes('duplicate') || lower.includes('already exists')) {
    return 'Mã đã tồn tại. Vui lòng dùng mã khác.'
  }

  if (lower.includes('null value in column "product_id" of relation "media"') || lower.includes('constraint [product_id" of relation "media')) {
    return 'Tải ảnh thất bại. Vui lòng lưu sản phẩm hợp lệ trước rồi thử lại.'
  }

  if (lower.includes('null value in column "variant_id" of relation "media"')) {
    return 'Tải ảnh thất bại. Vui lòng kiểm tra biến thể trước rồi thử lại.'
  }

  if (lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('jwt')) {
    return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
  }

  if (lower.includes('must not be blank') || lower.includes('must not be null')) {
    return 'Vui lòng nhập đầy đủ các trường bắt buộc.'
  }

  if (lower.includes('could not execute statement') || lower.includes('jdbc exception') || lower.includes(' sql ') || lower.startsWith('sql')) {
    return 'Hệ thống đang lỗi xử lý dữ liệu. Vui lòng thử lại sau.'
  }

  if (lower.includes('loi may chu') || lower.includes('lỗi máy chủ')) {
    return 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.'
  }

  return msg || fallback
}

export function extractApiErrorDetails (err, fallback = 'Request failed') {
  const body = err?.response?.data

  const rawMessage =
    body?.message ||
    body?.error ||
    body?.detail ||
    (typeof body === 'string' ? body : '') ||
    err?.message ||
    fallback

  const baseMessage = mapBackendErrorToFriendlyMessage(rawMessage, fallback)

  const fieldErrors = []

  const violations = body?.violations || body?.errors || body?.fieldErrors
  if (Array.isArray(violations)) {
    violations.forEach((v) => {
      const field = v?.field || v?.path || v?.property || v?.name
      const msg = v?.message || v?.defaultMessage || v?.error || v?.reason
      if (field && msg) fieldErrors.push(`${field}: ${msg}`)
      else if (msg) fieldErrors.push(msg)
    })
  }

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    Object.entries(body).forEach(([k, v]) => {
      if (k === 'message' || k === 'error' || k === 'detail' || k === 'timestamp' || k === 'status') return
      if (typeof v === 'string' && /must|blank|null|invalid|required|size|length/i.test(v)) {
        fieldErrors.push(`${k}: ${v}`)
      }
    })
  }

  const summary = baseMessage
  return { summary, fieldErrors }
}
