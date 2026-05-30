import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BadgePercent, LayoutDashboard, Package, SlidersHorizontal, Shapes, Search, ActivitySquare, LogOut, MessageCircle, Users, UserCircle, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { clearAuthSession, getCurrentRole } from '../../lib/auth'

const adminItems = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/products', label: 'Quản lý sản phẩm', icon: Package },
  { href: '/options', label: 'Tùy chọn biến thể', icon: SlidersHorizontal },
  { href: '/masters', label: 'Danh mục chuẩn', icon: Shapes },
  { href: '/search', label: 'Thống kê tìm kiếm', icon: Search },
  { href: '/event-publications', label: 'Event Publications', icon: ScrollText },
  { href: '/search-health', label: 'Sức khỏe catalog', icon: ActivitySquare },
  { href: '/users', label: 'Quản lý người dùng', icon: Users },
  { href: '/vouchers', label: 'Voucher hóa đơn', icon: BadgePercent }
]

const employeeItems = [{ href: '/chat', label: 'Chat khách hàng', icon: MessageCircle }]

export function Sidebar () {
  const location = useLocation()
  const navigate = useNavigate()
  const role = getCurrentRole()
  const pathname = location.pathname

  const navItems = role === 'ADMIN' ? [...adminItems, ...employeeItems] : employeeItems

  const logout = () => {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-72 border-r border-slate-200 bg-white flex flex-col pt-6 z-10">
      <div className="px-6 mb-8">
        <h1 className="text-xl font-bold text-blue-700 tracking-wide">Bảng điều khiển</h1>
        <p className="text-xs text-slate-500 mt-1">Vai trò: <span className="font-semibold">{role || 'N/A'}</span></p>
      </div>

      <nav className="flex-1 overflow-y-auto w-full px-3">
        <ul className="space-y-2 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <li key={item.href} className="w-full">
                <Link
                  to={item.href}
                  className={cn('flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all w-full', isActive ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-700 hover:bg-slate-100')}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-4 pb-3 mt-3">
        <button className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 text-slate-700 hover:bg-slate-100" onClick={logout}>
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>

      <div className="border-t border-slate-200 p-4 flex items-center gap-3 bg-slate-50">
        <UserCircle className="w-8 h-8 text-blue-600" />
        <span className="text-xs text-slate-700 font-semibold">Tài khoản đang đăng nhập</span>
      </div>
    </aside>
  )
}
