import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { catalogHealthApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'

export default function SearchHealth () {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await catalogHealthApi.get()
      setIssues(res.issues || [])
    } catch (err) {
      setError(extractApiError(err, 'Không tải được sức khỏe catalog'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const total = useMemo(() => issues.reduce((sum, item) => sum + (item.count || 0), 0), [issues])

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
    </div>
  )
}
