import { useEffect, useMemo, useState } from 'react'
import { subDays } from 'date-fns'
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts'
import { Banknote, CheckCircle2 } from 'lucide-react'
import { dashboardApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'

export default function Dashboard () {
  const [data, setData] = useState(null)
  const [runLogs, setRunLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const range = useMemo(() => {
    const endDate = new Date()
    const startDate = subDays(endDate, 30)
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')
        const [dashRes, runsRes] = await Promise.all([
          dashboardApi.summary({ startDate: range.start, endDate: range.end }),
          dashboardApi.projectionRuns({ page: 0, size: 5, sort: 'startedAt,desc' })
        ])
        setData(dashRes || null)
        setRunLogs(runsRes?.content || [])
      } catch (err) {
        setError(extractApiError(err, 'Không tải được dữ liệu tổng quan'))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [range.start, range.end])

  const chartData = data?.chartData || []
  const logs = runLogs.map((run) => ({
    id: run.id?.substring(0, 8).toUpperCase() || '-',
    type: run.runType,
    status: run.status,
    processed: Number(run.processedCount || 0).toLocaleString('vi-VN')
  }))

  const deltaPct = Number(data?.deltaPct || 0).toFixed(1)
  const deltaLabel = `${deltaPct > 0 ? '+' : ''}${deltaPct}% so với kỳ trước`

  if (loading) return <div className="p-8 text-blue-700 text-sm animate-pulse">Đang tải dữ liệu tổng quan...</div>

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {error && <div className="border border-red-300 bg-red-50 p-3 text-red-700 text-xs rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start text-[11px] text-slate-500 border-b border-slate-200 pb-2 mb-4 uppercase">
            <span>Doanh thu thuần</span>
            <Banknote className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-4xl font-bold text-blue-700 mb-2">{Number(data?.netRevenue || 0).toLocaleString('vi-VN')} đ</div>
          <div className="inline-block border border-blue-600 text-blue-700 text-[11px] px-2 py-1 rounded">{deltaLabel}</div>
        </div>

        <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start text-[11px] text-slate-500 border-b border-slate-200 pb-2 mb-4 uppercase">
            <span>Tỷ lệ thành công</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex justify-between items-end">
            <div className="w-2/3">
              <div className="flex justify-between text-[11px] text-slate-500 mb-2">
                <span>Đơn hoàn tất</span>
                <span>{(Number(data?.successRate || 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(Number(data?.successRate || 0) * 100, 100)}%` }}></div>
              </div>
            </div>
            <div className="text-xl font-bold text-emerald-700 ml-4">{data?.statusLabel || 'FLAT'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm lg:col-span-2 h-80 flex flex-col">
          <div className="flex justify-between text-[11px] text-slate-500 border-b border-slate-200 pb-2 mb-4 uppercase">
            <span>Xu hướng doanh thu</span>
            <span>Dữ liệu 30 ngày</span>
          </div>
          <div className="flex-1 w-full">
            <svg width="0" height="0">
              <defs>
                <pattern id="scanlineGreen" patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="2" fill="#22c55e" />
                  <rect width="4" height="2" y="2" fill="#86efac" />
                </pattern>
                <pattern id="scanlinePink" patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="2" fill="#3b82f6" />
                  <rect width="4" height="2" y="2" fill="#93c5fd" />
                </pattern>
              </defs>
            </svg>

            {chartData.length > 0
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <Bar dataKey="revenue" isAnimationActive={false}>
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.isAccent ? 'url(#scanlinePink)' : 'url(#scanlineGreen)'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                )
              : <div className="text-xs text-slate-500">Chưa có dữ liệu biểu đồ</div>}
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-6 rounded-xl shadow-sm h-80 flex flex-col">
          <div className="text-[11px] text-slate-500 border-b border-slate-200 pb-2 mb-4 uppercase">Tác vụ hệ thống</div>
          <div className="space-y-3 mt-2">
            <button className="w-full bg-emerald-100 text-emerald-700 font-semibold py-3 text-xs rounded opacity-70 cursor-not-allowed">Gợi ý nhập hàng</button>
            <button className="w-full bg-blue-100 text-blue-700 font-semibold py-3 text-xs rounded opacity-70 cursor-not-allowed">Đẩy chiến dịch</button>
            <button className="w-full border border-slate-300 text-slate-500 font-semibold py-3 text-xs rounded opacity-70 cursor-not-allowed">Đặt lại dữ liệu</button>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex justify-between items-center text-[11px] text-slate-500 border-b border-slate-200 p-4 uppercase">
          <span className="text-slate-800 font-semibold">Lịch sử chạy projection</span>
          <span>Tự làm mới: Tắt</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="text-slate-700 border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="p-4 font-medium">Mã chạy</th>
              <th className="p-4 font-medium">Loại chạy</th>
              <th className="p-4 font-medium">Trạng thái</th>
              <th className="p-4 font-medium text-right">Đã xử lý</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4 text-slate-500">{log.id}</td>
                <td className="p-4 text-blue-700 font-semibold">{log.type}</td>
                <td className="p-4"><span className="px-2 py-1 text-[10px] uppercase border border-slate-300 text-slate-700 rounded">{log.status}</span></td>
                <td className="p-4 text-right">{log.processed}</td>
              </tr>
            ))}
            {!logs.length && <tr><td colSpan="4" className="p-4 text-slate-500">Chưa có lịch sử chạy</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
