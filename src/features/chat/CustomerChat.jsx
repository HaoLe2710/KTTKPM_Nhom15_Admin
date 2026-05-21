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

function messageContentOf (message) {
  return message?.content || message?.text || message?.message || message?.linkUrl || message?.imageUrl || '[Không có nội dung]'
}

function messageTimeOf (message) {
  return message?.sentAt || message?.createdAt || message?.timestamp
}

function formatPrice (value) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  return number.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

function messageSummaryOf (message) {
  const legacySummary = messageContentOf(message)
  if (message?.content || message?.text || message?.message) return message.content || message.text || message.message
  if (message?.type === 'IMAGE' || message?.imageUrl) return '[Hinh anh]'
  if (message?.type === 'VIDEO' || message?.videoUrl) return '[Video]'
  if (message?.type === 'PRODUCT_LINK' || message?.linkUrl) return message?.productName || '[Link san pham]'
  return legacySummary
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

function primaryMediaUrlOf (detail) {
  const media = [...(detail?.media || []), ...((detail?.variants || []).flatMap((variant) => variant?.media || []))]
    .filter((item) => item?.url && (!item?.type || String(item.type).toUpperCase() === 'IMAGE'))
  return (media.find((item) => item?.primary || item?.isPrimary) || media[0])?.url || ''
}

function chatProductOf (item, detail) {
  const productId = item?.productId || item?.id || detail?.id || ''
  return {
    productId,
    variantId: detail?.variants?.[0]?.id || '',
    productName: item?.productName || item?.name || detail?.name || '',
    productImageUrl: primaryMediaUrlOf(detail),
    productPrice: item?.minPrice ?? detail?.minPrice ?? detail?.variants?.[0]?.price ?? '',
    linkUrl: productId ? `${window.location.origin}/products/${productId}` : window.location.origin
  }
}

function MessageBody ({ message, mine }) {
  const content = message?.content || message?.text || message?.message || ''
  const textClass = mine ? 'text-white' : 'text-slate-700'

  if (message?.type === 'IMAGE' || message?.imageUrl) {
    return (
      <div className="space-y-2">
        <img src={message.imageUrl} alt={content || 'Anh chat'} className="max-h-72 w-full rounded-lg object-cover" />
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
        {message.productImageUrl && <img src={message.productImageUrl} alt={message.productName || 'Sản phẩm'} className="h-80 max-h-[52vh] w-full rounded-lg border border-slate-200 bg-white object-contain p-3" />}
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

  return <div className="whitespace-pre-wrap break-words">{messageSummaryOf(message)}</div>
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
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [query, setQuery] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [customerProfiles, setCustomerProfiles] = useState({})
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const activeIdRef = useRef('')
  const session = getAuthSession()

  const activeRoom = useMemo(() => rooms.find((room) => roomIdOf(room) === activeId), [rooms, activeId])
  const currentUserId = String(session?.userId || '')
  const activeStaffId = staffIdOf(activeRoom)
  const filteredRooms = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return rooms
    return rooms.filter((room) => {
      const values = [roomIdOf(room), customerLabelOf(room, customerProfiles), room?.customerId, staffIdOf(room)]
      return values.some((value) => String(value || '').toLowerCase().includes(term))
    })
  }, [customerProfiles, rooms, query])

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const loadRooms = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoadingRooms(true)
      setError('')
      const data = await chatApi.staffActiveRooms()
      const list = asList(data)
      const selectedId = activeIdRef.current
      setRooms(list)
      setLastUpdatedAt(new Date())
      if (!selectedId && list.length) setActiveId(roomIdOf(list[0]))
      if (selectedId && !list.find((room) => roomIdOf(room) === selectedId)) setActiveId(roomIdOf(list[0]) || '')
    } catch (err) {
      setError(extractApiError(err, 'Không tải được danh sách phòng chat'))
      setRooms([])
    } finally {
      if (!silent) setLoadingRooms(false)
    }
  }, [])

  const loadMessages = useCallback(async (roomId, { silent = false } = {}) => {
    if (!roomId) return setMessages([])
    try {
      if (!silent) setLoadingMessages(true)
      const data = await chatApi.roomMessages(roomId)
      setMessages(asList(data))
    } catch (err) {
      setError(extractApiError(err, 'Không tải được lịch sử tin nhắn'))
      setMessages([])
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }, [])

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

    Promise.all(
      missingCustomerIds.map(async (customerId) => {
        try {
          const profile = await usersApi.detail(customerId)
          return [customerId, profile]
        } catch {
          return [customerId, null]
        }
      })
    ).then((entries) => {
      if (ignore) return
      setCustomerProfiles((prev) => {
        const next = { ...prev }
        entries.forEach(([customerId, profile]) => {
          next[customerId] = profile || { id: customerId }
        })
        return next
      })
    })

    return () => {
      ignore = true
    }
  }, [customerProfiles, rooms])

  useEffect(() => {
    const timer = setInterval(() => {
      loadRooms({ silent: true })
      if (activeId) loadMessages(activeId, { silent: true })
    }, 5000)
    return () => clearInterval(timer)
  }, [activeId, loadMessages, loadRooms])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, activeId])

  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) window.URL.revokeObjectURL(attachmentPreviewUrl)
    }
  }, [attachmentPreviewUrl])

  const assignRoom = async (roomId) => {
    try {
      await chatApi.assignRoom(roomId)
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
      await chatApi.closeRoom(roomId)
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

  const selectProduct = (product) => {
    setAttachmentDraft({
      imageUrl: '',
      videoUrl: '',
      linkUrl: product.linkUrl || '',
      productId: product.productId || '',
      variantId: product.variantId || '',
      productName: product.productName || '',
      productImageUrl: product.productImageUrl || '',
      productPrice: product.productPrice ?? ''
    })
  }

  const searchProducts = async () => {
    try {
      setSearchingProducts(true)
      const data = await productsApi.publicSearch({ q: productQuery || undefined, page: 0, size: 6, sort: 'relevance' })
      const items = asList(data?.items ? data.items : data)
      const products = await Promise.all(items.map(async (item) => {
        try {
          const detail = await productsApi.publicDetail(item.productId || item.id)
          return chatProductOf(item, detail)
        } catch {
          return chatProductOf(item, null)
        }
      }))
      setProductResults(products)
    } catch (err) {
      setError(extractApiError(err, 'Không tìm được sản phẩm'))
      setProductResults([])
    } finally {
      setSearchingProducts(false)
    }
  }

  const send = async () => {
    if (!activeId || isRoomClosed(activeRoom) || !canSendPayload(messageType, input, attachmentDraft, attachmentFile)) return
    const content = input.trim()
    const shouldAssignBeforeSend = activeRoom && !activeStaffId
    let payload
    let optimisticMessage

    try {
      setError('')
      setSending(true)
      let resolvedDraft = attachmentDraft
      if ((messageType === 'IMAGE' || messageType === 'VIDEO') && attachmentFile) {
        const formData = new FormData()
        formData.append('file', attachmentFile)
        const uploaded = await chatApi.uploadAttachment(formData)
        resolvedDraft = {
          ...attachmentDraft,
          imageUrl: messageType === 'IMAGE' ? uploaded.url : attachmentDraft.imageUrl,
          videoUrl: messageType === 'VIDEO' ? uploaded.url : attachmentDraft.videoUrl
        }
      }
      payload = buildPayload(messageType, content, resolvedDraft)
      optimisticMessage = {
        id: `local-${Date.now()}`,
        ...payload,
        senderId: currentUserId || activeStaffId,
        sentAt: new Date().toISOString(),
        pending: true
      }
      setInput('')
      resetAttachment()
      setMessages((prev) => [...prev, optimisticMessage])
      if (shouldAssignBeforeSend) {
        await chatApi.assignRoom(activeId)
      }
      await chatApi.staffSend(activeId, payload)
      await loadMessages(activeId)
      await loadRooms({ silent: true })
    } catch (err) {
      if (optimisticMessage) setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id))
      setInput(content)
      if (payload) {
        setAttachmentDraft({
          imageUrl: payload.imageUrl || '',
          videoUrl: payload.videoUrl || '',
          linkUrl: payload.linkUrl || '',
          productId: payload.productId || '',
          variantId: payload.variantId || '',
          productName: payload.productName || '',
          productImageUrl: payload.productImageUrl || '',
          productPrice: payload.productPrice ?? ''
        })
      }
      setError(extractApiError(err, 'Gửi tin nhắn thất bại'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto h-full min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-4">
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
            {filteredRooms.length} phòng đang hiển thị
            {lastUpdatedAt ? ` | Cập nhật ${toTime(lastUpdatedAt)}` : ''}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {loadingRooms ? <div className="p-4 text-sm text-slate-500">Đang tải phòng chat...</div> : filteredRooms.map((room) => {
            const roomId = roomIdOf(room)
            const staffId = staffIdOf(room)
            return (
              <button key={roomId} onClick={() => setActiveId(roomId)} className={`w-full text-left p-4 border-b hover:bg-slate-50 ${roomId === activeId ? 'bg-blue-50' : ''}`}>
                <div className="font-medium text-slate-800 flex justify-between items-center gap-2">
                  <span className="truncate">Phòng #{roomId?.slice(0, 8) || 'N/A'}</span>
                  {isRoomClosed(room) ? <span className="text-[10px] text-red-600 shrink-0">Đã đóng</span> : <span className="text-[10px] text-green-600 shrink-0">Đang mở</span>}
                </div>
                <div className="text-xs text-slate-500 truncate">Khách: {customerLabelOf(room, customerProfiles)}</div>
                <div className="text-xs text-slate-500 truncate">Nhân viên: {staffId || 'Chưa nhận'}</div>
              </button>
            )
          })}

          {!loadingRooms && !filteredRooms.length && <div className="p-4 text-sm text-slate-500">{rooms.length ? 'Không tìm thấy phòng phù hợp.' : 'Chưa có phòng chat active.'}</div>}
        </div>
      </aside>

      <section className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
        <header className="p-4 border-b bg-slate-50 flex justify-between items-center gap-2 shrink-0">
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

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 bg-slate-50/40">
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
          {!loadingMessages && !messages.length && <div className="text-sm text-slate-500">Chưa có tin nhắn.</div>}
          <div ref={bottomRef} />
        </div>

        <footer className="shrink-0 max-h-[42vh] overflow-y-auto overscroll-contain p-3 border-t bg-white space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => selectMessageType('TEXT')} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${messageType === 'TEXT' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              <MessageCircle className="h-3 w-3" />
              Text
            </button>
            <button type="button" onClick={() => selectMessageType('IMAGE')} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${messageType === 'IMAGE' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              <ImageIcon className="h-3 w-3" />
              Ảnh
            </button>
            <button type="button" onClick={() => selectMessageType('VIDEO')} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${messageType === 'VIDEO' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              <Video className="h-3 w-3" />
              Video
            </button>
            <button type="button" onClick={() => selectMessageType('PRODUCT_LINK')} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${messageType === 'PRODUCT_LINK' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              <LinkIcon className="h-3 w-3" />
              Sản phẩm
            </button>
          </div>
          {messageType === 'IMAGE' && (
            <div className="space-y-2">
              <input type="file" accept="image/*" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-xs file:text-white" onChange={handleAttachmentFileChange} disabled={!activeId || isRoomClosed(activeRoom) || sending} />
              {attachmentPreviewUrl && <img src={attachmentPreviewUrl} alt="Preview" className="max-h-36 w-full rounded-lg object-cover" />}
            </div>
          )}
          {messageType === 'VIDEO' && (
            <div className="space-y-2">
              <input type="file" accept="video/*" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-xs file:text-white" onChange={handleAttachmentFileChange} disabled={!activeId || isRoomClosed(activeRoom) || sending} />
              {attachmentPreviewUrl && <video src={attachmentPreviewUrl} controls className="max-h-36 w-full rounded-lg bg-black" />}
            </div>
          )}
          {messageType === 'PRODUCT_LINK' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Tìm sản phẩm để gửi cho" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && searchProducts()} disabled={!activeId || isRoomClosed(activeRoom) || sending || searchingProducts} />
                <button type="button" className="border border-slate-300 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50" onClick={searchProducts} disabled={!activeId || isRoomClosed(activeRoom) || sending || searchingProducts}>
                  {searchingProducts ? 'Dang tim' : 'Search'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                {productResults.map((product) => (
                  <button key={product.productId} type="button" onClick={() => selectProduct(product)} className={`flex items-center gap-3 rounded-lg border p-2 text-left hover:bg-slate-50 ${attachmentDraft.productId === product.productId ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                    {product.productImageUrl ? <img src={product.productImageUrl} alt={product.productName} className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-slate-100" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{product.productName}</span>
                      <span className="block text-xs text-slate-500">{formatPrice(product.productPrice)}</span>
                    </span>
                  </button>
                ))}
              </div>
              {attachmentDraft.productName && <div className="text-xs text-slate-500">Đã chọn: {attachmentDraft.productName}</div>}
            </div>
          )}
          <div className="flex gap-2">
          <input className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" placeholder={activeId ? (isRoomClosed(activeRoom) ? 'Phòng chat đã đóng' : 'Nhập nội dung trả lời khách hàng...') : 'Chọn một phòng chat để trả lời'} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} disabled={!activeId || isRoomClosed(activeRoom) || sending} />
          <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 flex items-center gap-2 hover:bg-blue-700" onClick={send} disabled={!activeId || isRoomClosed(activeRoom) || !canSendPayload(messageType, input, attachmentDraft, attachmentFile) || sending}>
            <Send className="w-4 h-4" />
            {sending ? 'Đang gửi' : 'Gửi'}
          </button>
          </div>
        </footer>
      </section>
    </div>
  )
}
