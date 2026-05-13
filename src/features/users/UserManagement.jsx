import { useEffect, useState } from 'react'
import { usersApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'

export default function UserManagement () {
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })

  const loadUsers = async (targetPage = page) => {
    try {
      setLoading(true)
      setError('')
      const res = await usersApi.list({ keyword: keyword || undefined, page: targetPage, size: 10 })
      setUsers(res?.content || [])
      setPage(res?.number || 0)
      setTotalPages(res?.totalPages || 1)
    } catch (err) {
      setError(extractApiError(err, 'Không tải được danh sách người dùng'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers(0) }, [])

  const createUser = async () => {
    try {
      setError('')
      await usersApi.createStaff({
        email: form.email,
        phone: form.phone,
        password: form.password,
        fullName: form.fullName
      })
      setForm({ fullName: '', email: '', phone: '', password: '' })
      await loadUsers(0)
    } catch (err) {
      setError(extractApiError(err, 'Tạo tài khoản thất bại'))
    }
  }

  const toggleActive = async (id) => {
    try {
      await usersApi.toggleStatus(id)
      await loadUsers(page)
    } catch (err) {
      setError(extractApiError(err, 'Cập nhật trạng thái thất bại'))
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold text-slate-800">Quản lý người dùng</h1>
      {error && <div className="border border-red-300 bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-2">
          <h2 className="font-semibold text-slate-700">Tạo tài khoản nhân viên</h2>
          <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Họ tên" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
          <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" type="password" placeholder="Mật khẩu" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          <button className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold" onClick={createUser}>Tạo tài khoản</button>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="font-semibold text-slate-700">Danh sách tài khoản</h2>
            <div className="flex gap-2">
              <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64" placeholder="Tìm tên/email" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
              <button className="border border-slate-300 rounded-lg px-3 py-2 text-sm" onClick={() => loadUsers(0)}>Lọc</button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr><th className="py-2">Tên</th><th>Email</th><th>SĐT</th><th>Vai trò</th><th>Trạng thái</th><th className="text-right">Thao tác</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-4 text-slate-500" colSpan="6">Đang tải...</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-3 font-medium text-slate-700">{u.fullName}</td>
                  <td className="text-slate-600">{u.email}</td>
                  <td className="text-slate-600">{u.phone || '-'}</td>
                  <td><span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs">{u.role}</span></td>
                  <td>{u.isActive ? <span className="text-green-600 text-xs font-semibold">Đang hoạt động</span> : <span className="text-red-600 text-xs font-semibold">Đã khóa</span>}</td>
                  <td className="text-right"><button className="text-blue-600 text-xs font-semibold" onClick={() => toggleActive(u.id)}>{u.isActive ? 'Khóa' : 'Mở khóa'}</button></td>
                </tr>
              ))}
              {!loading && !users.length && <tr><td className="py-4 text-slate-500" colSpan="6">Không có dữ liệu</td></tr>}
            </tbody>
          </table>

          <div className="mt-3 flex justify-end gap-2">
            <button className="border border-slate-300 rounded px-2 py-1 text-xs disabled:opacity-40" disabled={page <= 0} onClick={() => loadUsers(page - 1)}>Trang trước</button>
            <button className="border border-slate-300 rounded px-2 py-1 text-xs disabled:opacity-40" disabled={page + 1 >= totalPages} onClick={() => loadUsers(page + 1)}>Trang sau</button>
          </div>
        </div>
      </div>
    </div>
  )
}
