import { useEffect, useMemo, useState } from 'react'
import { chatApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'

function toTime (iso) {
  if (!iso) return '--:--'
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

export default function CustomerChat () {
  const [rooms, setRooms] = useState([])
  const [activeId, setActiveId] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState('')

  const activeRoom = useMemo(() => rooms.find((r) => r.id === activeId), [rooms, activeId])

  const loadRooms = async () => {
    try {
      setLoadingRooms(true)
      setError('')
      const data = await chatApi.staffActiveRooms()
      const list = Array.isArray(data) ? data : []
      setRooms(list)
      if (!activeId && list.length) setActiveId(list[0].id)
      if (activeId && !list.find((x) => x.id === activeId)) setActiveId(list[0]?.id || '')
    } catch (err) {
      setError(extractApiError(err, 'Không tải được danh sách phòng chat'))
      setRooms([])
    } finally {
      setLoadingRooms(false)
    }
  }

  const loadMessages = async (roomId) => {
    if (!roomId) return setMessages([])
    try {
      setLoadingMessages(true)
      const data = await chatApi.roomMessages(roomId)
      setMessages(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(extractApiError(err, 'Không tải được lịch sử tin nhắn'))
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  useEffect(() => {
    loadMessages(activeId)
  }, [activeId])

  useEffect(() => {
    const timer = setInterval(() => {
      loadRooms()
      if (activeId) loadMessages(activeId)
    }, 7000)
    return () => clearInterval(timer)
  }, [activeId])

  const assignRoom = async (roomId) => {
    try {
      await chatApi.assignRoom(roomId)
      await loadRooms()
      await loadMessages(roomId)
    } catch (err) {
      setError(extractApiError(err, 'Nhận phòng chat thất bại'))
    }
  }

  const send = async () => {
    if (!activeId || !input.trim()) return
    try {
      setError('')
      await chatApi.staffSend(activeId, { type: 'TEXT', content: input.trim() })
      setInput('')
      await loadMessages(activeId)
      await loadRooms()
    } catch (err) {
      setError(extractApiError(err, 'Gửi tin nhắn thất bại'))
    }
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-170px)] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-4">
      {error && <div className="lg:col-span-4 p-3 bg-red-50 text-red-700 border-b border-red-200 text-sm">{error}</div>}

      <aside className="border-r border-slate-200 lg:col-span-1 overflow-auto">
        <div className="p-4 border-b bg-slate-50 font-semibold text-slate-700 flex justify-between items-center">
          <span>Hội thoại khách hàng</span>
          <button className="text-xs border border-slate-300 rounded px-2 py-1" onClick={loadRooms}>Làm mới</button>
        </div>

        {loadingRooms ? <div className="p-4 text-sm text-slate-500">Đang tải phòng chat...</div> : rooms.map((r) => (
          <button key={r.id} onClick={() => setActiveId(r.id)} className={`w-full text-left p-4 border-b hover:bg-slate-50 ${r.id === activeId ? 'bg-blue-50' : ''}`}>
            <div className="font-medium text-slate-800 flex justify-between items-center">
              <span>Phòng #{r.id?.slice(0, 8) || 'N/A'}</span>
              {r.closed ? <span className="text-[10px] text-red-600">Đã đóng</span> : <span className="text-[10px] text-green-600">Đang mở</span>}
            </div>
            <div className="text-xs text-slate-500">Khách: {r.customerId || 'N/A'}</div>
            <div className="text-xs text-slate-500">Nhân viên: {r.staffId || 'Chưa nhận'}</div>
          </button>
        ))}

        {!loadingRooms && !rooms.length && <div className="p-4 text-sm text-slate-500">Chưa có phòng chat active.</div>}
      </aside>

      <section className="lg:col-span-3 flex flex-col">
        <header className="p-4 border-b bg-slate-50 flex justify-between items-center gap-2">
          <div>
            <div className="font-semibold text-slate-800">{activeRoom ? `Phòng #${activeRoom.id?.slice(0, 8)}` : 'Chưa chọn phòng'}</div>
            <div className="text-xs text-slate-500">Khách: {activeRoom?.customerId || 'N/A'} | Nhân viên: {activeRoom?.staffId || 'Chưa nhận'}</div>
          </div>
          {activeRoom && !activeRoom.staffId && <button className="bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-semibold" onClick={() => assignRoom(activeRoom.id)}>Nhận phòng</button>}
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50/40">
          {loadingMessages ? <div className="text-sm text-slate-500">Đang tải tin nhắn...</div> : messages.map((m) => {
            const mine = activeRoom?.staffId && m.senderId === activeRoom.staffId
            return (
              <div key={m.id} className={`max-w-[78%] rounded-xl px-3 py-2 text-sm ${mine ? 'ml-auto bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                <div className="text-[10px] mb-1 opacity-80">{m.type || 'TEXT'}</div>
                <div>{m.content || m.linkUrl || m.imageUrl || '[Không có nội dung]'}</div>
                <div className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-slate-400'}`}>{toTime(m.sentAt)}</div>
              </div>
            )
          })}
          {!loadingMessages && !messages.length && <div className="text-sm text-slate-500">Chưa có tin nhắn.</div>}
        </div>

        <footer className="p-3 border-t flex gap-2 bg-white">
          <input className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Nhập nội dung trả lời khách hàng..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} disabled={!activeId} />
          <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50" onClick={send} disabled={!activeId || !input.trim()}>Gửi</button>
        </footer>
      </section>
    </div>
  )
}
