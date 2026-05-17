import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { catalogHealthApi, searchMetricsApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'

export default function SearchHealth () {
  const [issues, setIssues] = useState([])
  const [logs, setLogs] = useState([])
  const [tasks, setTasks] = useState([])
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await catalogHealthApi.get()
      setIssues(res.issues || [])

      const failures = await searchMetricsApi.projectionFailures({ state: 'OPEN', page: 0, size: 20, sort: 'failedAt,desc' })
      const mappedLogs = (failures?.content || []).map((x) => ({
        productId: x.productId,
        timestamp: x.failedAt,
        code: x.eventType || x.state,
        severity: x.state === 'OPEN' ? 'ERROR' : (x.state === 'RETRY_QUEUED' ? 'WARN' : 'INFO'),
        message: x.errorMessage,
        state: x.state
      }))
      setLogs(mappedLogs)

      const taskRes = await searchMetricsApi.projectionTasks({ page: 0, size: 10, sort: 'nextAttemptAt,asc' })
      setTasks(taskRes?.content || [])

      const runRes = await searchMetricsApi.projectionRuns({ page: 0, size: 10, sort: 'startedAt,desc' })
      setRuns(runRes?.content || [])
    } catch (err) {
      setError(extractApiError(err, 'Không tải được sức khỏe catalog'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const total = useMemo(() => issues.reduce((sum, item) => sum + (item.count || 0), 0), [issues])

  const retryFailure = async (productId) => {
    if (!productId) return
    try {
      await searchMetricsApi.retryProjectionFailure(productId)
      await load()
    } catch (err) {
      setError(extractApiError(err, 'Retry lỗi projection thất bại'))
    }
  }

  const resolveFailure = async (productId) => {
    if (!productId) return
    try {
      await searchMetricsApi.resolveProjectionFailure(productId, { resolutionNote: 'Xử lý thủ công từ Admin FE' })
      await load()
    } catch (err) {
      setError(extractApiError(err, 'Resolve lỗi projection thất bại'))
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sức khỏe catalog</h1>
        </div>
        <button className="border border-slate-300 px-3 py-2 text-xs rounded-lg hover:bg-slate-50" onClick={load}>Làm mới</button>
      </div>

      {error && <div className="border border-red-300 bg-red-50 text-red-700 p-3 text-xs mb-4 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="border border-slate-200 bg-white rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500">Tổng loại lỗi</div>
          <div className="text-3xl font-bold text-slate-800">{issues.length}</div>
        </div>
        <div className="border border-slate-200 bg-white rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500">Tổng số lỗi</div>
          <div className="text-3xl font-bold text-red-600">{total}</div>
        </div>
        <div className="border border-slate-200 bg-white rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500">Trạng thái</div>
          <div className="text-lg font-bold text-blue-700">{total === 0 ? 'Ổn định' : 'Cần xử lý'}</div>
        </div>
      </div>

      <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center gap-2 text-slate-700 font-semibold">
          <AlertTriangle className="w-4 h-4 text-red-600" /> Danh sách lỗi
        </div>
        {loading
          ? <div className="p-4 text-xs text-slate-500">Đang tải...</div>
          : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr><th className="p-3">Mã lỗi</th><th className="p-3">Số lượng</th></tr>
              </thead>
              <tbody>
                {issues.map((it) => <tr key={it.issueCode} className="border-b border-slate-100"><td className="p-3">{it.issueCode}</td><td className="p-3">{it.count}</td></tr>)}
                {!issues.length && <tr><td className="p-3 text-slate-500" colSpan="2">Không có lỗi</td></tr>}
              </tbody>
            </table>
            )}
      </div>

      <div className="mt-4 border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-200 text-slate-700 font-semibold">
          Nhật ký lỗi hệ thống
        </div>
        {loading
          ? <div className="p-4 text-xs text-slate-500">Đang tải...</div>
          : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Sản phẩm</th>
                  <th className="p-3">Sự kiện</th>
                  <th className="p-3">Mức độ</th>
                  <th className="p-3">Nội dung</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={`${log.code || 'log'}-${idx}`} className="border-b border-slate-100">
                    <td className="p-3">{log.timestamp || '-'}</td>
                    <td className="p-3">{log.productId || '-'}</td>
                    <td className="p-3">{log.code || '-'}</td>
                    <td className="p-3">{log.severity || '-'}</td>
                    <td className="p-3">{log.message || '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-blue-600 text-[11px]" onClick={() => retryFailure(log.productId)}>Retry</button>
                        <button className="text-emerald-600 text-[11px]" onClick={() => resolveFailure(log.productId)}>Resolve</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!logs.length && <tr><td className="p-3 text-slate-500" colSpan="6">Chưa có log lỗi từ BE</td></tr>}
              </tbody>
            </table>
            )}
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200 text-slate-700 font-semibold">Projection tasks</div>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr><th className="p-3">productId</th><th className="p-3">status</th><th className="p-3">nextAttemptAt</th></tr>
            </thead>
            <tbody>
              {tasks.map((t, idx) => <tr key={`${t.productId || 'task'}-${idx}`} className="border-b border-slate-100"><td className="p-3">{t.productId || '-'}</td><td className="p-3">{t.status || '-'}</td><td className="p-3">{t.nextAttemptAt || '-'}</td></tr>)}
              {!tasks.length && <tr><td className="p-3 text-slate-500" colSpan="3">Không có task</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200 text-slate-700 font-semibold">Projection runs</div>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr><th className="p-3">runType</th><th className="p-3">status</th><th className="p-3">startedAt</th></tr>
            </thead>
            <tbody>
              {runs.map((r, idx) => <tr key={`${r.id || 'run'}-${idx}`} className="border-b border-slate-100"><td className="p-3">{r.runType || '-'}</td><td className="p-3">{r.status || '-'}</td><td className="p-3">{r.startedAt || '-'}</td></tr>)}
              {!runs.length && <tr><td className="p-3 text-slate-500" colSpan="3">Không có run</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
