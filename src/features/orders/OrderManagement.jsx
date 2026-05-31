import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ordersApi } from '../../lib/adminCatalogApi'
import { getCurrentRole } from '../../lib/auth'
import { extractApiError } from '../../lib/errors'

const statusList = ['', 'CREATED', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED']
const paymentList = ['', 'UNPAID', 'PAID']

function toMoney (v) {
  return Number(v || 0).toLocaleString('vi-VN')
}

function sanitizeOrderId (raw) {
  return String(raw || '').trim().replace(/[^\w-]/g, '')
}

function withServerHint (err, fallback) {
  const status = err?.response?.status
  const beMessage = err?.response?.data?.message || err?.response?.data?.error
  if (status >= 500) {
    return `Không thể tải thông tin đơn hàng này do sự cố hệ thống.${beMessage ? ` | BE: ${beMessage}` : ''}`
  }
  return extractApiError(err, fallback)
}

export default function OrderManagement () {
  const navigate = useNavigate()
  const { id: routeOrderId } = useParams()
  const normalizedRouteId = sanitizeOrderId(routeOrderId)

  const role = getCurrentRole()
  const isAdmin = role === 'ADMIN'
  const isStaff = role === 'STAFF' || role === 'EMPLOYEE'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({ q: '', status: '', paymentStatus: '', sort: 'createdAt,desc' })
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const selected = useMemo(
    () => items.find((x) => sanitizeOrderId(x.id) === sanitizeOrderId(selectedId)),
    [items, selectedId]
  )

  const load = async (targetPage = page) => {
    try {
      setLoading(true)
      setError('')
      const res = await ordersApi.list({
        q: filters.q || undefined,
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        page: targetPage,
        size: 20,
        sort: filters.sort
      })
      setItems(Array.isArray(res?.content) ? res.content : [])
      setPage(res?.number || 0)
      setTotalPages(res?.totalPages || 1)
    } catch (err) {
      setError(withServerHint(err, 'Không tải được danh sách đơn hàng'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const loadDetail = async (orderId) => {
    const safeOrderId = sanitizeOrderId(orderId)
    if (!safeOrderId) return
    try {
      setDetailLoading(true)
      setError('')
      const res = await ordersApi.detail(safeOrderId)
      setDetail(res || null)
    } catch (err) {
      setError(withServerHint(err, 'Không tải được chi tiết đơn hàng'))
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => { load(0) }, [])
  useEffect(() => {
    if (!normalizedRouteId) return
    setSelectedId(normalizedRouteId)
    loadDetail(normalizedRouteId)
  }, [normalizedRouteId])
  useEffect(() => {
    if (!selectedId || selectedId === normalizedRouteId) return
    loadDetail(selectedId)
  }, [selectedId])

  const runAction = async (fn, fallback) => {
    const safeOrderId = sanitizeOrderId(selectedId)
    if (!safeOrderId) return
    try {
      setError('')
      await fn(safeOrderId)
      await load(page)
      await loadDetail(safeOrderId)
    } catch (err) {
      setError(withServerHint(err, fallback))
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý đơn hàng</h1>
        <Link to="/products" className="text-sm text-blue-700 hover:underline">Xem sản phẩm</Link>
      </div>

      <div className="border border-slate-200 bg-white rounded-xl p-3 grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className="border border-slate-300 rounded px-3 py-2 text-sm" placeholder="Tìm mã đơn / khách hàng / SĐT" value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} />
        <select className="border border-slate-300 rounded px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>{statusList.map((s) => <option key={s || 'ALL'} value={s}>{s || 'Tất cả trạng thái'}</option>)}</select>
        <select className="border border-slate-300 rounded px-3 py-2 text-sm" value={filters.paymentStatus} onChange={(e) => setFilters((p) => ({ ...p, paymentStatus: e.target.value }))}>{paymentList.map((s) => <option key={s || 'ALL'} value={s}>{s || 'Tất cả thanh toán'}</option>)}</select>
        <select className="border border-slate-300 rounded px-3 py-2 text-sm" value={filters.sort} onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value }))}>
          <option value="createdAt,desc">Mới nhất</option>
          <option value="createdAt,asc">Cũ nhất</option>
          <option value="totalAmount,desc">Tổng tiền cao nhất</option>
        </select>
        <button className="border border-slate-300 rounded px-3 py-2 text-sm hover:bg-slate-50" onClick={() => load(0)}>Lọc</button>
      </div>

      {error && <div className="border border-red-300 bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 border border-slate-200 bg-white rounded-xl overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-3 text-left">Mã đơn</th>
                <th className="p-3 text-left">Khách hàng</th>
                <th className="p-3 text-left">Trạng thái</th>
                <th className="p-3 text-left">Thanh toán</th>
                <th className="p-3 text-right">Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="5" className="p-4 text-slate-500">Đang tải...</td></tr>}
              {!loading && !items.length && <tr><td colSpan="5" className="p-4 text-slate-500">Chưa có đơn hàng</td></tr>}
              {!loading && items.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${sanitizeOrderId(selectedId) === sanitizeOrderId(row.id) ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    const safeId = sanitizeOrderId(row.id)
                    setSelectedId(safeId)
                    navigate(`/orders/${safeId}`)
                  }}
                >
                  <td className="p-3 font-medium">{row.orderNo || row.id || '-'}</td>
                  <td className="p-3">{row.customerName || row.userId || '-'}</td>
                  <td className="p-3">{row.status || '-'}</td>
                  <td className="p-3">{row.paymentStatus || '-'}</td>
                  <td className="p-3 text-right">{toMoney(row.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 flex items-center justify-between text-xs text-slate-600">
            <span>Trang {page + 1}/{Math.max(totalPages, 1)}</span>
            <div className="flex gap-2">
              <button className="border border-slate-300 rounded px-2 py-1 disabled:opacity-40" disabled={page <= 0} onClick={() => load(page - 1)}>Trước</button>
              <button className="border border-slate-300 rounded px-2 py-1 disabled:opacity-40" disabled={page + 1 >= totalPages} onClick={() => load(page + 1)}>Sau</button>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-700">Chi tiết đơn hàng</div>
          {!selectedId && <div className="text-xs text-slate-500">Chọn một đơn hàng để xem chi tiết.</div>}
          {detailLoading && <div className="text-xs text-slate-500">Đang tải chi tiết...</div>}
          {!detailLoading && detail && (
            <>
              <div className="text-xs text-slate-600">Mã đơn: <span className="font-semibold text-slate-800">{detail.orderNo || detail.id || '-'}</span></div>
              <div className="text-xs text-slate-600">Trạng thái: <span className="font-semibold text-slate-800">{detail.status || '-'}</span></div>
              <div className="text-xs text-slate-600">Thanh toán: <span className="font-semibold text-slate-800">{detail.paymentStatus || '-'}</span></div>
              <div className="text-xs text-slate-600">Tổng tiền: <span className="font-semibold text-slate-800">{toMoney(detail.totalAmount)}</span></div>
              <div className="text-xs text-slate-600">Khách hàng: <span className="font-semibold text-slate-800">{detail.customerName || detail.userName || detail.userId || '-'}</span></div>
              <div className="text-xs text-slate-600">Số điện thoại: <span className="font-semibold text-slate-800">{detail.phone || detail.receiverPhone || detail.shippingAddress?.phone || '-'}</span></div>
              <div className="text-xs text-slate-600">Địa chỉ: <span className="font-semibold text-slate-800">{detail.shippingAddress?.fullAddress || detail.shippingAddress?.addressLine || detail.address || '-'}</span></div>

              <div className="border border-slate-200 rounded-lg p-2 max-h-44 overflow-auto space-y-1">
                {(detail.items || []).map((item) => (
                  <div key={item.id || `${item.productId || 'p'}-${item.variantId || 'v'}-${item.productName || 'i'}`} className="text-xs text-slate-700 border-b border-slate-100 pb-1">
                    <div className="font-medium">{item.productName || item.variantName || item.productId || '-'}</div>
                    <div>SL: {item.quantity || 0} | Giá: {toMoney(item.unitPrice || item.price)}</div>
                  </div>
                ))}
                {!detail.items?.length && <div className="text-xs text-slate-500">Không có item</div>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="border border-slate-300 rounded px-2 py-2 text-xs hover:bg-slate-50 disabled:opacity-40" disabled={!isAdmin && !isStaff} onClick={() => runAction((id) => ordersApi.confirm(id), 'Xác nhận đơn thất bại')}>Xác nhận</button>
                <button className="border border-slate-300 rounded px-2 py-2 text-xs hover:bg-slate-50 disabled:opacity-40" disabled={!isAdmin && !isStaff} onClick={() => runAction((id) => ordersApi.ship(id), 'Chuyển giao thất bại')}>Giao hàng</button>
                <button className="border border-slate-300 rounded px-2 py-2 text-xs hover:bg-slate-50 disabled:opacity-40" disabled={!isAdmin && !isStaff} onClick={() => runAction((id) => ordersApi.complete(id), 'Hoàn tất đơn thất bại')}>Hoàn tất</button>
                <button className="border border-red-300 text-red-700 rounded px-2 py-2 text-xs hover:bg-red-50 disabled:opacity-40" disabled={!isAdmin} onClick={() => runAction((id) => ordersApi.cancel(id, { reason: 'Hủy từ quản trị' }), 'Hủy đơn thất bại')}>Hủy đơn</button>
              </div>
              {!isAdmin && <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Tài khoản STAFF chỉ có quyền xử lý quy trình cơ bản, không có quyền hủy đơn.</div>}
            </>
          )}
          {selected && !detailLoading && !detail && <div className="text-xs text-slate-500">Không tải được chi tiết đơn.</div>}
        </div>
      </div>
    </div>
  )
}
