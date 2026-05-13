import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, PlusSquare } from 'lucide-react'
import { productsApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'

export default function ProductList () {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({ q: '', active: '', sort: 'updatedAt,desc' })

  const fetchProducts = async (targetPage = page) => {
    try {
      setLoading(true)
      setError('')
      const res = await productsApi.list({
        page: targetPage,
        size: 20,
        q: filters.q || undefined,
        active: filters.active === '' ? undefined : filters.active,
        sort: filters.sort
      })
      setItems(res.content || [])
      setPage(res.number || 0)
      setTotalPages(res.totalPages || 1)
    } catch (err) {
      setError(extractApiError(err, 'Không tải được danh sách sản phẩm'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts(0) }, [])

  const toggleActive = async (id, current) => {
    try {
      await productsApi.setActive(id, !current)
      await fetchProducts(page)
    } catch (err) {
      setError(extractApiError(err, 'Cập nhật trạng thái sản phẩm thất bại'))
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý sản phẩm</h1>
        </div>
        <Link to="/products/new" className="bg-blue-600 text-white font-semibold text-sm py-2 px-4 rounded-lg flex items-center gap-2">
          <PlusSquare className="w-4 h-4" /> Tạo sản phẩm
        </Link>
      </div>

      <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="border border-slate-300 rounded-lg p-2 text-sm" placeholder="Tìm theo tên/slug" value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} />
        <select className="border border-slate-300 rounded-lg p-2 text-sm" value={filters.active} onChange={(e) => setFilters((p) => ({ ...p, active: e.target.value }))}>
          <option value="">Tất cả trạng thái</option><option value="true">Đang bán</option><option value="false">Ngừng bán</option>
        </select>
        <select className="border border-slate-300 rounded-lg p-2 text-sm" value={filters.sort} onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value }))}>
          <option value="updatedAt,desc">Cập nhật mới nhất</option><option value="updatedAt,asc">Cập nhật cũ nhất</option><option value="name,asc">Tên A-Z</option><option value="projectionUpdatedAt,desc">Projection mới nhất</option>
        </select>
        <button className="border border-slate-300 rounded-lg p-2 text-sm flex items-center justify-center gap-2 hover:bg-slate-50" onClick={() => fetchProducts(0)}><Filter className="w-4 h-4" /> Lọc</button>
      </div>

      {error && <div className="border border-red-300 bg-red-50 p-3 text-red-700 text-sm rounded-lg">{error}</div>}

      <div className="border border-slate-200 bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-600 border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="py-3 px-3 font-medium">Tên</th>
              <th className="py-3 px-3 font-medium">Slug</th>
              <th className="py-3 px-3 font-medium">Giá</th>
              <th className="py-3 px-3 font-medium">Tồn kho</th>
              <th className="py-3 px-3 font-medium">Projection</th>
              <th className="py-3 px-3 font-medium">Trạng thái</th>
              <th className="py-3 px-3 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan="7" className="py-8 px-3 text-slate-500">Đang tải dữ liệu...</td></tr>
              : items.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-3 text-slate-800 font-medium">{p.name}</td>
                  <td className="py-3 px-3 text-slate-600">{p.slug}</td>
                  <td className="py-3 px-3 text-slate-700">{Number(p.minPrice || 0).toLocaleString('vi-VN')} - {Number(p.maxPrice || 0).toLocaleString('vi-VN')}</td>
                  <td className="py-3 px-3 text-slate-700">{p.totalStock}</td>
                  <td className="py-3 px-3 text-slate-700">{p.projectionStaleness}</td>
                  <td className="py-3 px-3">
                    <button className={`px-2 py-1 text-xs rounded ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`} onClick={() => toggleActive(p.id, p.active)}>
                      {p.active ? 'Đang bán' : 'Ngừng bán'}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right"><Link className="text-blue-600 font-semibold hover:underline" to={`/products/${p.id}`}>Chi tiết</Link></td>
                </tr>
                ))}
            {!loading && items.length === 0 && <tr><td colSpan="7" className="py-8 px-3 text-slate-500">Không có dữ liệu</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
        <span>Trang {page + 1} / {Math.max(totalPages, 1)}</span>
        <div className="flex gap-2">
          <button className="border border-slate-300 px-3 py-1 rounded disabled:opacity-40" disabled={page <= 0} onClick={() => fetchProducts(page - 1)}>Trang trước</button>
          <button className="border border-slate-300 px-3 py-1 rounded disabled:opacity-40" disabled={page + 1 >= totalPages} onClick={() => fetchProducts(page + 1)}>Trang sau</button>
        </div>
      </div>
    </div>
  )
}
