import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Image as ImageIcon, Link as LinkIcon, MessageCircle, RefreshCw, Search, Send, UserCheck, Video, XCircle } from 'lucide-react'
import { chatApi, productsApi, usersApi } from '../../lib/adminCatalogApi'
import { getAuthSession } from '../../lib/auth'
import { extractApiError } from '../../lib/errors'

function toTime (iso) {
  if (!iso) return '--:--'
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

function asList (data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  return []
}

function roomIdOf (room) {
  return room?.id || room?.roomId || room?.chatRoomId || ''
}

function customerIdOf (room) {
  return room?.customerId || room?.userId || ''
}

function messageIdOf (message, index) {
  return message?.id || message?.messageId || `${message?.sentAt || 'message'}-${index}`
}

function customerLabelOf (room, customerProfiles = {}) {
  const customerId = room?.customerId || ''
  const profile = customerProfiles[customerId]
  if (profile?.fullName) return profile.fullName
  if (profile?.email) return profile.email
  if (profile?.phone) return profile.phone
  return room?.customerName || room?.customerEmail || room?.customerPhone || room?.customerId || 'Khách hàng'
}

function staffIdOf (room) {
  return room?.staffId || room?.assignedStaffId || room?.employeeId || ''
}

function isRoomClosed (room) {
  return Boolean(room?.isClosed ?? room?.closed)
}

function messageSenderIdOf (message) {
  return message?.senderId || message?.userId || message?.staffId || message?.customerId || ''
}

function messageTimeOf (message) {
  return message?.sentAt || message?.createdAt || message?.timestamp
}

function timeValueOf (iso) {
  if (!iso) return 0
  const value = new Date(iso).getTime()
  return Number.isNaN(value) ? 0 : value
}

function isCustomerMessage (message, room) {
  const senderId = String(messageSenderIdOf(message) || '')
  const customerId = String(customerIdOf(room) || '')
  return Boolean(senderId && customerId && senderId === customerId)
}

function latestCustomerMessageAt (messages, room) {
  return messages.reduce((latest, message) => {
    if (!isCustomerMessage(message, room)) return latest
    return Math.max(latest, timeValueOf(messageTimeOf(message)))
  }, 0)
}

function formatPrice (value) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  return number.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

function emptyAttachmentDraft () {
  return {
    imageUrl: '',
    videoUrl: '',
    linkUrl: '',
    productId: '',
    variantId: '',
    productName: '',
    productImageUrl: '',
    productPrice: ''
  }
}

function buildPayload (type, content, draft) {
  const trimmedContent = content.trim()
  const payload = { type }
  if (trimmedContent) payload.content = trimmedContent
  if (type === 'IMAGE') payload.imageUrl = draft.imageUrl.trim()
  if (type === 'VIDEO') payload.videoUrl = draft.videoUrl.trim()
  if (type === 'PRODUCT_LINK') {
    payload.linkUrl = draft.linkUrl.trim()
    if (draft.productId) payload.productId = draft.productId
    if (draft.variantId) payload.variantId = draft.variantId
    payload.productName = draft.productName.trim()
    if (draft.productImageUrl.trim()) payload.productImageUrl = draft.productImageUrl.trim()
    if (draft.productPrice !== '') payload.productPrice = Number(draft.productPrice)
  }
  return payload
}

function canSendPayload (type, content, draft, file) {
  if (type === 'TEXT') return Boolean(content.trim())
  if (type === 'IMAGE') return Boolean(file || draft.imageUrl.trim())
  if (type === 'VIDEO') return Boolean(file || draft.videoUrl.trim())
  if (type === 'PRODUCT_LINK') return Boolean(draft.linkUrl.trim() && draft.productName.trim())
  return false
}

function MessageBody ({ message, mine }) {
  const content = message?.content || message?.text || message?.message || ''
  const textClass = mine ? 'text-white' : 'text-slate-700'

  if (message?.type === 'IMAGE' || message?.imageUrl) {
    return (
      <div className="space-y-2">
        <img src={message.imageUrl} alt={content || 'Ảnh chat'} className="max-h-72 w-full rounded-lg object-cover" />
        {content && <div className={`whitespace-pre-wrap break-words ${textClass}`}>{content}</div>}
      </div>
    )
  }

  if (message?.type === 'VIDEO' || message?.videoUrl) {
    return (
      <div className="space-y-2">
        <video src={message.videoUrl} controls className="max-h-72 w-full rounded-lg bg-black" />
        {content && <div className={`whitespace-pre-wrap break-words ${textClass}`}>{content}</div>}
      </div>
    )
  }

  if (message?.type === 'PRODUCT_LINK' || message?.linkUrl) {
    return (
      <div className={`space-y-2 rounded-lg ${mine ? 'bg-white/10' : 'bg-slate-50'} p-2`}>
        {message.productImageUrl && <img src={message.productImageUrl} alt={message.productName || 'Sản phẩm'} className="h-64 w-full rounded-lg border border-slate-200 bg-white object-contain p-3" />}
        <div className="font-semibold">{message.productName || 'Sản phẩm'}</div>
        {message.productPrice !== null && message.productPrice !== undefined && <div className={mine ? 'text-blue-100' : 'text-slate-500'}>{formatPrice(message.productPrice)}</div>}
        {content && <div className="whitespace-pre-wrap break-words">{content}</div>}
        <a className={`inline-flex items-center gap-1 text-xs font-semibold underline ${mine ? 'text-white' : 'text-blue-600'}`} href={message.linkUrl} target="_blank" rel="noreferrer">
          <LinkIcon className="h-3 w-3" />
          Xem sản phẩm
        </a>
      </div>
    )
  }

  return <div className="whitespace-pre-wrap break-words">{content || '[Không có nội dung]'}</div>
}

export default function CustomerChat () {
  const [rooms, setRooms] = useState([])
  const [activeId, setActiveId] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [messageType, setMessageType] = useState('TEXT')
  const [attachmentDraft, setAttachmentDraft] = useState(emptyAttachmentDraft)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState([])
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [customerProfiles, setCustomerProfiles] = useState({})
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [error, setError] = useState('')
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [roomMessageMeta, setRoomMessageMeta] = useState({})
  const [seenCustomerMessageAt, setSeenCustomerMessageAt] = useState({})

  const messagesWrapRef = useRef(null)
  const activeIdRef = useRef('')
  const session = getAuthSession()
  const currentUserId = String(session?.userId || '')
  const seenStorageKey = `admin-chat-seen-${currentUserId || 'anonymous'}`

  const activeRoom = useMemo(() => rooms.find((room) => roomIdOf(room) === activeId), [rooms, activeId])
  const activeStaffId = staffIdOf(activeRoom)
  const canReply = Boolean(activeId && activeStaffId && !isRoomClosed(activeRoom))
  const filteredRooms = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return rooms
    return rooms.filter((room) => {
      const values = [roomIdOf(room), customerLabelOf(room, customerProfiles), room?.customerId, staffIdOf(room)]
      return values.some((value) => String(value || '').toLowerCase().includes(term))
    })
  }, [customerProfiles, query, rooms])

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(seenStorageKey)
      setSeenCustomerMessageAt(stored ? JSON.parse(stored) : {})
    } catch {
      setSeenCustomerMessageAt({})
    }
  }, [seenStorageKey])

  const markRoomSeen = useCallback((roomId, latestAt) => {
    if (!roomId || !latestAt) return
    setSeenCustomerMessageAt((prev) => {
      if ((prev[roomId] || 0) >= latestAt) return prev
      const next = { ...prev, [roomId]: latestAt }
      try {
        window.localStorage.setItem(seenStorageKey, JSON.stringify(next))
      } catch {
        // localStorage can be unavailable in private or restricted browser modes.
      }
      return next
    })
  }, [seenStorageKey])

  const refreshRoomMessageMeta = useCallback(async (roomList) => {
    const openRooms = roomList.filter((room) => !isRoomClosed(room))
    if (!openRooms.length) {
      setRoomMessageMeta({})
      return
    }

    const entries = await Promise.all(openRooms.map(async (room) => {
      const roomId = roomIdOf(room)
      try {
        const roomMessages = asList(await chatApi.roomMessages(roomId, currentUserId || undefined))
        return [roomId, { latestCustomerAt: latestCustomerMessageAt(roomMessages, room) }]
      } catch {
        return [roomId, { latestCustomerAt: 0 }]
      }
    }))
    setRoomMessageMeta(Object.fromEntries(entries))
  }, [currentUserId])

  const loadRooms = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoadingRooms(true)
      setError('')
      const data = await chatApi.staffActiveRooms(currentUserId || undefined)
      const list = asList(data)
      const selectedId = activeIdRef.current
      setRooms(list)
      refreshRoomMessageMeta(list)
      setLastUpdatedAt(new Date())
      if (!selectedId && list.length) setActiveId(roomIdOf(list[0]))
      if (selectedId && !list.find((room) => roomIdOf(room) === selectedId)) setActiveId(roomIdOf(list[0]) || '')
    } catch (err) {
      setError(extractApiError(err, 'Không tải được danh sách phòng chat'))
      setRooms([])
    } finally {
      if (!silent) setLoadingRooms(false)
    }
  }, [currentUserId, refreshRoomMessageMeta])

  const loadMessages = useCallback(async (roomId, { silent = false } = {}) => {
    if (!roomId) {
      setMessages([])
      return
    }
    try {
      if (!silent) setLoadingMessages(true)
      const data = await chatApi.roomMessages(roomId, currentUserId || undefined)
      setMessages(asList(data))
    } catch (err) {
      setError(extractApiError(err, 'Không tải được lịch sử tin nhắn'))
      setMessages([])
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }, [currentUserId])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  useEffect(() => {
    loadMessages(activeId)
  }, [activeId, loadMessages])

  useEffect(() => {
    const missingCustomerIds = [...new Set(rooms.map((room) => room?.customerId).filter(Boolean))]
      .filter((customerId) => !customerProfiles[customerId])
    if (!missingCustomerIds.length) return
    let ignore = false
    Promise.all(missingCustomerIds.map(async (customerId) => {
      try {
        const profile = await usersApi.detail(customerId)
        return [customerId, profile]
      } catch {
        return [customerId, null]
      }
    })).then((entries) => {
      if (ignore) return
      setCustomerProfiles((prev) => {
        const next = { ...prev }
        entries.forEach(([customerId, profile]) => { next[customerId] = profile || { id: customerId } })
        return next
      })
    })
    return () => { ignore = true }
  }, [customerProfiles, rooms])

  useEffect(() => {
    const timer = setInterval(() => {
      loadRooms({ silent: true })
      if (activeId) loadMessages(activeId, { silent: true })
    }, 5000)
    return () => clearInterval(timer)
  }, [activeId, loadMessages, loadRooms])

  useEffect(() => {
    const el = messagesWrapRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (atBottom || messages.length < 3) el.scrollTop = el.scrollHeight
  }, [messages, activeId])

  useEffect(() => {
    if (!activeRoom || !messages.length) return
    markRoomSeen(roomIdOf(activeRoom), latestCustomerMessageAt(messages, activeRoom))
  }, [activeRoom, markRoomSeen, messages])

  useEffect(() => () => {
    if (attachmentPreviewUrl) window.URL.revokeObjectURL(attachmentPreviewUrl)
  }, [attachmentPreviewUrl])

  const assignRoom = async (roomId) => {
    if (!currentUserId) return setError('Thiếu userId phiên đăng nhập. Vui lòng đăng nhập lại.')
    try {
      setError('')
      await chatApi.assignRoom(roomId, currentUserId)
      await loadRooms()
      await loadMessages(roomId)
    } catch (err) {
      setError(extractApiError(err, 'Nhận phòng chat thất bại'))
    }
  }

  const closeRoom = async (roomId) => {
    if (!roomId) return
    try {
      setError('')
      await chatApi.closeRoom(roomId, currentUserId || undefined)
      await loadRooms()
      setMessages([])
    } catch (err) {
      setError(extractApiError(err, 'Đóng phòng chat thất bại'))
    }
  }

  const resetAttachment = () => {
    if (attachmentPreviewUrl) window.URL.revokeObjectURL(attachmentPreviewUrl)
    setAttachmentDraft(emptyAttachmentDraft())
    setAttachmentFile(null)
    setAttachmentPreviewUrl('')
  }

  const selectMessageType = (type) => {
    setMessageType(type)
    resetAttachment()
  }

  const handleAttachmentFileChange = (event) => {
    const file = event.target.files?.[0] || null
    if (attachmentPreviewUrl) window.URL.revokeObjectURL(attachmentPreviewUrl)
    setAttachmentFile(file)
    setAttachmentPreviewUrl(file ? window.URL.createObjectURL(file) : '')
  }

  const searchProducts = async () => {
    try {
      setSearchingProducts(true)
      const data = await productsApi.publicSearch({ q: productQuery || undefined, page: 0, size: 6, sort: 'relevance' })
      const items = asList(data?.items ? data.items : data)
      setProductResults(items.map((item) => ({
        productId: item?.productId || item?.id || '',
        productName: item?.productName || item?.name || '',
        productImageUrl: item?.thumbnailUrl || '',
        productPrice: item?.price ?? item?.minPrice ?? '',
        linkUrl: `${window.location.origin}/products/${item?.productId || item?.id || ''}`
      })))
    } catch (err) {
      setError(extractApiError(err, 'Không tìm được sản phẩm'))
      setProductResults([])
    } finally {
      setSearchingProducts(false)
    }
  }

  const send = async () => {
    if (!canReply || !canSendPayload(messageType, input, attachmentDraft, attachmentFile)) return
    let draft = attachmentDraft
    let payload
    const content = input.trim()
    try {
      setError('')
      setSending(true)
      if ((messageType === 'IMAGE' || messageType === 'VIDEO') && attachmentFile) {
        const formData = new FormData()
        formData.append('file', attachmentFile)
        const uploaded = await chatApi.uploadAttachment(formData, currentUserId || undefined)
        draft = {
          ...draft,
          imageUrl: messageType === 'IMAGE' ? (uploaded?.url || '') : draft.imageUrl,
          videoUrl: messageType === 'VIDEO' ? (uploaded?.url || '') : draft.videoUrl
        }
      }
      payload = buildPayload(messageType, content, draft)
      await chatApi.staffSend(activeId, payload, currentUserId || undefined)
      setInput('')
      resetAttachment()
      await loadMessages(activeId)
      await loadRooms({ silent: true })
    } catch (err) {
      setError(extractApiError(err, 'Gửi tin nhắn thất bại'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-230px)] min-h-[520px] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-4">
      {error && <div className="lg:col-span-4 p-3 bg-red-50 text-red-700 border-b border-red-200 text-sm">{error}</div>}

      <aside className="border-r border-slate-200 lg:col-span-1 overflow-hidden flex flex-col min-h-0">
        <div className="p-4 border-b bg-slate-50 space-y-3">
          <div className="font-semibold text-slate-700 flex justify-between items-center">
            <span>Hội thoại khách hàng</span>
            <button className="text-xs border border-slate-300 rounded-lg px-2 py-1 flex items-center gap-1 hover:bg-white disabled:opacity-50" onClick={() => loadRooms()} disabled={loadingRooms}>
              <RefreshCw className={`w-3 h-3 ${loadingRooms ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
          <label className="relative block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Tìm khách hoặc mã phòng" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="text-[11px] text-slate-500">
            {filteredRooms.length} phòng đang hiển thị{lastUpdatedAt ? ` | Cập nhật ${toTime(lastUpdatedAt)}` : ''}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {loadingRooms ? <div className="p-4 text-sm text-slate-500">Đang tải phòng chat...</div> : filteredRooms.map((room) => {
            const roomId = roomIdOf(room)
            const staffId = staffIdOf(room)
            const needsPickup = !staffId && !isRoomClosed(room)
            const latestCustomerAt = roomMessageMeta[roomId]?.latestCustomerAt || 0
            const hasUnreadCustomerMessage = Boolean(staffId && latestCustomerAt > (seenCustomerMessageAt[roomId] || 0))
            const attentionClass = needsPickup
              ? 'bg-amber-50 border-l-4 border-l-amber-500 hover:bg-amber-100'
              : hasUnreadCustomerMessage
                ? 'bg-cyan-50 border-l-4 border-l-cyan-500 hover:bg-cyan-100'
                : 'hover:bg-slate-50'
            return (
              <button key={roomId} onClick={() => setActiveId(roomId)} className={`w-full text-left p-4 border-b ${attentionClass} ${roomId === activeId ? 'bg-blue-50' : ''}`}>
                <div className="font-medium text-slate-800 flex justify-between items-center gap-2">
                  <span className="truncate">Phòng #{roomId?.slice(0, 8) || 'N/A'}</span>
                  {needsPickup ? <span className="text-[10px] font-semibold text-amber-700 shrink-0">Chưa nhận</span> : hasUnreadCustomerMessage ? <span className="text-[10px] font-semibold text-cyan-700 shrink-0">Tin mới</span> : isRoomClosed(room) ? <span className="text-[10px] text-red-600 shrink-0">Đã đóng</span> : <span className="text-[10px] text-green-600 shrink-0">Đang mở</span>}
                </div>
                <div className="text-xs text-slate-500 truncate">Khách: {customerLabelOf(room, customerProfiles)}</div>
                <div className="text-xs text-slate-500 truncate">Nhân viên: {staffId || 'Chưa nhận'}</div>
              </button>
            )
          })}
        </div>
      </aside>

      <section className="lg:col-span-3 flex flex-col min-h-0">
        <header className="p-4 border-b bg-slate-50 flex justify-between items-center gap-2">
          <div>
            <div className="font-semibold text-slate-800 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              {activeRoom ? `Phòng #${roomIdOf(activeRoom)?.slice(0, 8)}` : 'Chưa chọn phòng'}
            </div>
            <div className="text-xs text-slate-500">Khách: {activeRoom ? customerLabelOf(activeRoom, customerProfiles) : 'N/A'} | Nhân viên: {activeStaffId || 'Chưa nhận'}</div>
          </div>
          <div className="flex items-center gap-2">
            {activeRoom && !activeStaffId && !isRoomClosed(activeRoom) && <button className="bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-blue-700" onClick={() => assignRoom(roomIdOf(activeRoom))}><UserCheck className="w-4 h-4" />Nhận phòng</button>}
            {activeRoom && activeStaffId && !isRoomClosed(activeRoom) && <button className="border border-red-200 text-red-600 bg-white rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-red-50" onClick={() => closeRoom(roomIdOf(activeRoom))}><XCircle className="w-4 h-4" />Đóng phòng</button>}
          </div>
        </header>

        <div ref={messagesWrapRef} className="flex-1 min-h-0 overflow-auto p-4 space-y-3 bg-slate-50/40">
          {loadingMessages ? <div className="text-sm text-slate-500">Đang tải tin nhắn...</div> : messages.map((message, index) => {
            const senderId = String(messageSenderIdOf(message))
            const mine = senderId && (senderId === String(activeStaffId) || senderId === currentUserId)
            return (
              <div key={messageIdOf(message, index)} className={`max-w-[78%] rounded-xl px-3 py-2 text-sm ${mine ? 'ml-auto bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                <div className="text-[10px] mb-1 opacity-80">{mine ? 'Nhân viên' : 'Khách hàng'} | {message.type || 'TEXT'}</div>
                <MessageBody message={message} mine={mine} />
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'text-blue-100 justify-end' : 'text-slate-400'}`}>
                  {message.pending && <Check className="w-3 h-3" />}
                  {message.pending ? 'Đang gửi' : toTime(messageTimeOf(message))}
                </div>
              </div>
            )
          })}
        </div>

        <footer className="shrink-0 max-h-[42vh] overflow-y-auto p-3 border-t bg-white space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => selectMessageType('TEXT')} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${messageType === 'TEXT' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}><MessageCircle className="h-3 w-3" />Text</button>
            <button type="button" onClick={() => selectMessageType('IMAGE')} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${messageType === 'IMAGE' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}><ImageIcon className="h-3 w-3" />Ảnh</button>
            <button type="button" onClick={() => selectMessageType('VIDEO')} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${messageType === 'VIDEO' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}><Video className="h-3 w-3" />Video</button>
            <button type="button" onClick={() => selectMessageType('PRODUCT_LINK')} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${messageType === 'PRODUCT_LINK' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}><LinkIcon className="h-3 w-3" />Sản phẩm</button>
          </div>

          {messageType === 'IMAGE' && <input type="file" accept="image/*" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-xs file:text-white" onChange={handleAttachmentFileChange} />}
          {messageType === 'VIDEO' && <input type="file" accept="video/*" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-xs file:text-white" onChange={handleAttachmentFileChange} />}
          {attachmentPreviewUrl && messageType === 'IMAGE' && <img src={attachmentPreviewUrl} alt="preview" className="max-h-36 w-full rounded-lg object-cover" />}
          {attachmentPreviewUrl && messageType === 'VIDEO' && <video src={attachmentPreviewUrl} controls className="max-h-36 w-full rounded-lg bg-black" />}

          {messageType === 'PRODUCT_LINK' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Tìm sản phẩm để gửi cho khách" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} />
                <button type="button" className="border border-slate-300 rounded-lg px-3 py-2 text-sm hover:bg-slate-50" onClick={searchProducts} disabled={searchingProducts}>{searchingProducts ? 'Đang tìm' : 'Tìm'}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                {productResults.map((product) => (
                  <button key={product.productId} type="button" onClick={() => setAttachmentDraft((prev) => ({ ...prev, ...product }))} className={`flex items-center gap-3 rounded-lg border p-2 text-left hover:bg-slate-50 ${attachmentDraft.productId === product.productId ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                    {product.productImageUrl ? <img src={product.productImageUrl} alt={product.productName} className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-slate-100" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{product.productName}</span>
                      <span className="block text-xs text-slate-500">{formatPrice(product.productPrice)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" placeholder={activeId ? (isRoomClosed(activeRoom) ? 'Phòng chat đã đóng' : (activeStaffId ? 'Nhập nội dung trả lời khách hàng...' : 'Nhấn Nhận phòng để trả lời khách hàng...')) : 'Chọn một phòng chat để trả lời'} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} disabled={!canReply || sending} />
            <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2 hover:bg-blue-700" onClick={send} disabled={!canReply || !canSendPayload(messageType, input, attachmentDraft, attachmentFile) || sending}>
              <Send className="w-4 h-4" />
              {sending ? 'Đang gửi' : 'Gửi'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
