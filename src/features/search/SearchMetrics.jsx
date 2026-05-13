import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Activity, Gauge, Cpu, ArrowUpRight, ArrowRight, ArrowDownRight, AlertTriangle, PenTool } from 'lucide-react'
import { searchMetricsApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'

export default function SearchMetrics () {
  const [data, setData] = useState({ top: [], zero: [], summary: null, clicked: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recs, setRecs] = useState([])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [topRes, zeroRes, summaryRes, clickedRes] = await Promise.all([
        searchMetricsApi.topQueries({ limit: 5 }),
        searchMetricsApi.zeroResultQueries({ page: 0, size: 5, sort: 'occurrenceCount,desc' }),
        searchMetricsApi.summary(),
        searchMetricsApi.topClickedProducts({ limit: 4 })
      ])

      setData({
        top: Array.isArray(topRes) ? topRes : [],
        zero: zeroRes?.content || [],
        summary: summaryRes || null,
        clicked: Array.isArray(clickedRes) ? clickedRes : []
      })
    } catch (err) {
      setError(extractApiError(err, 'Không tải được thống kê tìm kiếm'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const getTrend = (trend) => {
    const value = String(trend || '').toUpperCase()
    if (value.includes('UP')) return 'up'
    if (value.includes('DOWN')) return 'down'
    return 'neutral'
  }

  const topQueries = data.top.map((q, i) => ({
    rank: `#${String(i + 1).padStart(2, '0')}`,
    keyword: q.queryText || q.queryNormalized,
    hits: Number(q.totalCount || 0).toLocaleString('vi-VN'),
    trend: getTrend(q.trend)
  }))

  const zeroAlerts = data.zero.map((z) => ({
    name: z.queryText,
    reason: z.reasonCode || 'NO_MATCH',
    count: z.occurrenceCount,
    resolved: !!z.resolved
  }))

  const clickedProducts = data.clicked.map((c) => ({
    name: c.productName,
    ctr: `${c.clickCount} lượt`,
    price: c.price == null ? 'N/A' : `${Number(c.price).toLocaleString('vi-VN')} đ`,
    image: c.thumbnailUrl
  }))

  const healthScore = data.summary?.activeProducts
    ? (((data.summary.projectedProducts - data.summary.staleProjectionProducts) / data.summary.activeProducts) * 100).toFixed(1)
    : '0.0'

  const runRecommendations = async () => {
    try {
      const result = await searchMetricsApi.synonymRecommendations({ locale: 'vi', limit: 10 })
      setRecs(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(extractApiError(err, 'Không tạo được gợi ý từ đồng nghĩa'))
    }
  }

  if (loading) return <div className="p-8 text-blue-700 text-sm animate-pulse">Đang tải thống kê tìm kiếm...</div>

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {error && <div className="border border-red-300 bg-red-50 text-red-700 p-3 text-xs rounded-lg">{error}</div>}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Thống kê tìm kiếm</h1>
          <p className="text-xs text-slate-500">Đồng bộ gần nhất: {data.summary?.lastSyncAt ? format(new Date(data.summary.lastSyncAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}</p>
        </div>
        <button onClick={runRecommendations} className="bg-blue-600 text-white font-semibold text-xs py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <PenTool className="w-4 h-4" /> Tạo gợi ý từ đồng nghĩa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-slate-200 p-4 bg-white rounded-xl shadow-sm">
          <div className="flex justify-between text-xs text-slate-500 mb-3"><span>Sức khỏe projection</span><Activity className="w-4 h-4 text-blue-600" /></div>
          <div className="text-3xl font-bold text-blue-700">{healthScore}%</div>
        </div>

        <div className="border border-slate-200 p-4 bg-white rounded-xl shadow-sm">
          <div className="flex justify-between text-xs text-slate-500 mb-3"><span>Độ trễ trung bình</span><Gauge className="w-4 h-4 text-emerald-600" /></div>
          <div className="text-3xl font-bold text-emerald-700">{data.summary?.avgLatencyMs ?? 'N/A'} <span className="text-base">ms</span></div>
        </div>

        <div className="border border-slate-200 p-4 bg-white rounded-xl shadow-sm">
          <div className="flex justify-between text-xs text-slate-500 mb-3"><span>Hiệu quả cache</span><Cpu className="w-4 h-4 text-cyan-600" /></div>
          <div className="text-3xl font-bold text-cyan-700">{data.summary?.cacheEfficiency != null ? `${Number(data.summary.cacheEfficiency).toFixed(1)}%` : 'N/A'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-slate-200 lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-200 py-2 px-4">
            <span className="font-semibold text-slate-700">Top từ khóa tìm kiếm</span>
            <span>Tổng: {topQueries.length}</span>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200 bg-slate-50">
                <th className="py-2 px-4">Hạng</th>
                <th className="py-2 px-4">Từ khóa</th>
                <th className="py-2 px-4">Lượt tìm</th>
                <th className="py-2 px-4 text-right">Xu hướng</th>
              </tr>
            </thead>
            <tbody>
              {topQueries.map((q, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-700">{q.rank}</td>
                  <td className="py-3 px-4 text-blue-700 font-semibold">{q.keyword}</td>
                  <td className="py-3 px-4 text-slate-700">{q.hits}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end pr-2">
                      {q.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-600" />}
                      {q.trend === 'neutral' && <ArrowRight className="w-4 h-4 text-slate-500" />}
                      {q.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-600" />}
                    </div>
                  </td>
                </tr>
              ))}
              {!topQueries.length && <tr><td className="p-4 text-slate-500" colSpan="4">Không có dữ liệu từ khóa</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex justify-between items-center text-xs text-red-700 font-semibold py-2 px-4 bg-red-50 border-b border-red-100">
            <span>Từ khóa không có kết quả</span><AlertTriangle className="w-4 h-4" />
          </div>
          <div className="p-4 flex flex-col gap-3">
            {zeroAlerts.map((alert, idx) => (
              <div key={idx} className={`border border-slate-200 p-3 rounded-lg flex justify-between ${alert.resolved ? 'opacity-50' : ''}`}>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{alert.name}</div>
                  <div className="text-[11px] text-slate-500">{alert.reason}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-red-600">{alert.count}</div>
                  <div className="text-[11px] text-slate-500">{alert.resolved ? 'Đã xử lý' : 'Chưa xử lý'}</div>
                </div>
              </div>
            ))}
            {!zeroAlerts.length && <div className="text-xs text-slate-500">Không có từ khóa lỗi</div>}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Sản phẩm được click nhiều</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {clickedProducts.map((prod, idx) => (
            <div key={idx} className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="h-36 w-full bg-slate-100 flex items-center justify-center">
                {prod.image ? <img src={prod.image} alt={prod.name} className="h-full w-full object-cover" /> : <div className="text-xs text-slate-500">Không có ảnh</div>}
              </div>
              <div className="p-3 space-y-1">
                <div className="text-sm text-slate-800 font-semibold">{prod.name}</div>
                <div className="text-xs text-slate-500">{prod.ctr}</div>
                <div className="text-xs text-blue-700 font-medium">{prod.price}</div>
              </div>
            </div>
          ))}
          {!clickedProducts.length && <div className="text-xs text-slate-500">Không có dữ liệu click sản phẩm</div>}
        </div>
      </div>

      <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold mb-2 text-slate-700">Gợi ý từ đồng nghĩa</h3>
        {recs.length
          ? recs.map((r, idx) => <div key={idx} className="text-xs border-b border-slate-100 py-2">{r.keyword} - {r.suggestedCode} ({Number(r.confidence || 0).toFixed(1)}%)</div>)
          : <div className="text-xs text-slate-500">Chưa tải gợi ý. Bấm nút tạo gợi ý để chạy.</div>}
      </div>
    </div>
  )
}
