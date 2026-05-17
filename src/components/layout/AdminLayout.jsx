import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export default function AdminLayout () {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-800 selection:bg-blue-200 selection:text-slate-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-3 md:p-6 pb-12">
          <Outlet />
        </main>

        <footer className="admin-app-footer h-9 border-t border-slate-200 flex justify-between items-center px-6 text-[11px] bg-white z-50 shrink-0 text-slate-500">
          <div className="flex items-center gap-8">
            <span>Tải hệ thống: 24.8%</span>
            <span>Bộ nhớ: 12.4GB / 32.0GB</span>
            <span>Uptime: 442:12:09</span>
          </div>
          <div className="font-semibold text-blue-700">Admin Console v1.0.42</div>
        </footer>
      </div>
    </div>
  )
}
