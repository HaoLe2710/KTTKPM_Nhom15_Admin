import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { eventsPublicationsApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'

const defaultFilters = {
  status: '',
  listenerId: '',
  eventType: '',
  outstandingOnly: false,
  publishedFrom: '',
  publishedTo: '',
  sort: 'publicationDate,desc'
}

const statusColors = {
  COMPLETED: '#22c55e',
  FAILED: '#ef4444',
  ERROR: '#ef4444',
  PENDING: '#f59e0b',
  OTHER: '#64748b'
}

export default function EventPublications () {
  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState(defaultFilters)
  const [detail, setDetail] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadSummary = async () => {
    const data = await eventsPublicationsApi.summary()
    setSummary(data || null)
  }

  const loadList = async (targetPage = page) => {
    const params = {
      page: targetPage,
      size: 20,
      sort: filters.sort,
      status: filters.status || undefined,
      listenerId: filters.listenerId || undefined,
      eventType: filters.eventType || undefined,
      outstandingOnly: filters.outstandingOnly ? 'true' : undefined,
      publishedFrom: filters.publishedFrom || undefined,
      publishedTo: filters.publishedTo || undefined
    }
    const res = await eventsPublicationsApi.list(params)
    setItems(res?.content || [])
    setPage(res?.number || 0)
    setTotalPages(res?.totalPages || 1)
  }

  const loadAll = async (targetPage = page) => {
    try {
      setLoading(true)
      setError('')
      await Promise.all([loadSummary(), loadList(targetPage)])
    } catch (err) {
      setError(extractApiError(err, 'Không tải được event publications'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll(0) }, [])

  const openDetail = async (id) => {
    try {
      const data = await eventsPublicationsApi.detail(id)
      setDetail(data || null)
      setDetailOpen(true)
    } catch (err) {
      setError(extractApiError(err, 'Không tải được chi tiết event'))
    }
  }

  const levelFrom = (row) => {
    const s = String(row?.status || '').toUpperCase()
    if (s === 'FAILED' || s === 'ERROR') return 'ERROR'
    if (row?.outstanding) return 'PENDING'
    return 'INFO'
  }

  const shortClassName = (value = '') => {
    const parts = String(value).split('.')
    return parts[parts.length - 1] || value
  }

  const statusChartData = useMemo(() => {
    const map = {}
    items.forEach((x) => {
      const key = String(x.status || '').toUpperCase() || 'OTHER'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [items])

  const attemptsChartData = useMemo(() => items
    .slice(0, 8)
    .map((x) => ({
      name: shortClassName(x.eventType).slice(0, 12),
      attempts: Number(x.completionAttempts || 0)
    })), [items])

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Event Publications</h1>
        <button className="border border-slate-300 rounded-lg px-3 py-2 text-xs" onClick={() => loadAll(page)}>Làm mới</button>
      </div>

      {error && <div className="border border-red-300 bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card label="Tổng" value={summary?.total} />
        <Card label="Đang chờ" value={summary?.outstanding} />
        <Card label="Hoàn tất" value={summary?.completed} />
        <Card label="Lỗi" value={summary?.failed} />
        <Card label="Không rõ trạng thái" value={summary?.withUnknownStatus} />
        <Card label="Mới nhất" value={summary?.latestPublicationDate ? new Date(summary.latestPublicationDate).toLocaleString('vi-VN') : '-'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-slate-200 bg-white rounded-xl p-4 shadow-sm h-64">
          <div className="text-sm font-semibold text-slate-700 mb-2">Phân bố trạng thái (trang hiện tại)</div>
          <ResponsiveContainer width="100%" height="88%">
            <PieChart>
              <Pie data={statusChartData} dataKey="value" nameKey="name" outerRadius={82} label>
                {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={statusColors[entry.name] || '#64748b'} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-slate-200 bg-white rounded-xl p-4 shadow-sm h-64">
          <div className="text-sm font-semibold text-slate-700 mb-2">Số lần attempts theo event</div>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={attemptsChartData}>
              <Bar dataKey="attempts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Tooltip />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border border-slate-200 bg-white rounded-xl p-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <input className="border border-slate-300 rounded px-2 py-2 text-xs" placeholder="status" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} />
        <input className="border border-slate-300 rounded px-2 py-2 text-xs" placeholder="listenerId" value={filters.listenerId} onChange={(e) => setFilters((p) => ({ ...p, listenerId: e.target.value }))} />
        <input className="border border-slate-300 rounded px-2 py-2 text-xs" placeholder="eventType" value={filters.eventType} onChange={(e) => setFilters((p) => ({ ...p, eventType: e.target.value }))} />
        <input className="border border-slate-300 rounded px-2 py-2 text-xs" type="datetime-local" value={filters.publishedFrom} onChange={(e) => setFilters((p) => ({ ...p, publishedFrom: e.target.value }))} />
        <input className="border border-slate-300 rounded px-2 py-2 text-xs" type="datetime-local" value={filters.publishedTo} onChange={(e) => setFilters((p) => ({ ...p, publishedTo: e.target.value }))} />
        <select className="border border-slate-300 rounded px-2 py-2 text-xs" value={filters.sort} onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value }))}>
          <option value="publicationDate,desc">publicationDate desc</option>
          <option value="publicationDate,asc">publicationDate asc</option>
          <option value="completionDate,desc">completionDate desc</option>
          <option value="completionAttempts,desc">completionAttempts desc</option>
        </select>
        <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={filters.outstandingOnly} onChange={(e) => setFilters((p) => ({ ...p, outstandingOnly: e.target.checked }))} /> Chỉ outstanding</label>
        <button className="border border-slate-300 rounded px-3 py-2 text-xs" onClick={() => loadAll(0)}>Lọc</button>
      </div>

      <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-3 text-left">Thời gian</th>
              <th className="p-3 text-left">Event</th>
              <th className="p-3 text-left">Listener</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Level</th>
              <th className="p-3 text-left">Attempts</th>
              <th className="p-3 text-left">Preview</th>
              <th className="p-3 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-3 text-slate-500" colSpan="8">Đang tải...</td></tr>}
            {!loading && items.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3 whitespace-nowrap">{row.publicationDate ? new Date(row.publicationDate).toLocaleString('vi-VN') : '-'}</td>
                <td className="p-3 max-w-[200px]" title={row.eventType}><span className="px-2 py-1 rounded bg-slate-100 text-slate-700">{shortClassName(row.eventType)}</span></td>
                <td className="p-3 max-w-[220px]" title={row.listenerId}><span className="truncate inline-block max-w-[210px] align-bottom">{shortClassName(row.listenerId)}</span></td>
                <td className="p-3">{row.status || '-'}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] ${levelFrom(row) === 'ERROR' ? 'bg-red-100 text-red-700' : levelFrom(row) === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{levelFrom(row)}</span></td>
                <td className="p-3">{row.completionAttempts ?? 0}</td>
                <td className="p-3 max-w-[320px] truncate" title={row.serializedEventPreview}>{row.serializedEventPreview || '-'}</td>
                <td className="p-3 text-right"><button className="text-blue-600" onClick={() => openDetail(row.id)}>Xem</button></td>
              </tr>
            ))}
            {!loading && !items.length && <tr><td className="p-3 text-slate-500" colSpan="8">Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2 text-xs">
        <button className="border border-slate-300 rounded px-2 py-1 disabled:opacity-40" disabled={page <= 0} onClick={() => loadAll(page - 1)}>Trang trước</button>
        <button className="border border-slate-300 rounded px-2 py-1 disabled:opacity-40" disabled={page + 1 >= totalPages} onClick={() => loadAll(page + 1)}>Trang sau</button>
      </div>

      {detailOpen && detail && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Chi tiết publication</h3>
              <button className="text-slate-600" onClick={() => setDetailOpen(false)}>×</button>
            </div>
            <div className="p-4 space-y-2 text-xs">
              <div><b>ID:</b> {detail.id}</div>
              <div><b>Event:</b> {detail.eventType}</div>
              <div><b>Listener:</b> {detail.listenerId}</div>
              <div><b>Status:</b> {detail.status || '-'}</div>
              <div><b>Publication date:</b> {detail.publicationDate || '-'}</div>
              <div><b>Completion date:</b> {detail.completionDate || '-'}</div>
              <div><b>serializedEvent:</b></div>
              <pre className="bg-slate-100 border border-slate-200 rounded p-3 whitespace-pre-wrap break-all max-h-72 overflow-auto">{detail.serializedEvent || '-'}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Card ({ label, value }) {
  return (
    <div className="border border-slate-200 bg-white rounded-xl p-3 shadow-sm">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-800 mt-1">{value ?? 0}</div>
    </div>
  )
}
