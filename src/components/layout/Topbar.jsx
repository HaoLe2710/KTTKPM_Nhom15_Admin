import { Bell, MonitorCheck } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const titleMap = {
  '/dashboard': 'Tổng quan hệ thống',
  '/products': 'Quản lý sản phẩm',
  '/options': 'Tùy chọn biến thể',
  '/masters': 'Danh mục chuẩn',
  '/search': 'Thống kê tìm kiếm',
  '/search-health': 'Sức khỏe catalog',
  '/users': 'Quản lý người dùng',
  '/vouchers': 'Voucher hóa đơn',
  '/chat': 'Chat khách hàng'
}

export function Topbar () {
  const location = useLocation()
  const title = Object.entries(titleMap).find(([k]) => location.pathname.startsWith(k))?.[1] || 'Bảng điều khiển'

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-8 flex-1">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <input type="text" placeholder="Tìm kiếm nhanh..." className="bg-slate-50 border border-slate-300 rounded-lg py-2 pl-3 pr-4 text-sm text-slate-700 w-64 focus:border-blue-500 outline-none" />
        </div>

        <div className="flex items-center gap-2 text-slate-600">
          <button className="hover:text-blue-600 p-2 rounded-lg hover:bg-slate-100"><Bell className="w-5 h-5" /></button>
          <button className="hover:text-blue-600 p-2 rounded-lg hover:bg-slate-100"><MonitorCheck className="w-5 h-5" /></button>
        </div>
      </div>
    </header>
  )
}
