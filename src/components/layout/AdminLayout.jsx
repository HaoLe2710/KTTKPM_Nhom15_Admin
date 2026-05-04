import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Cpu, MemoryStick, Activity, Clock } from 'lucide-react'

export default function AdminLayout () {
  return (
    <div className="flex h-screen overflow-hidden bg-surface text-primary font-mono selection:bg-primary selection:text-black">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-2 md:p-6 pb-20">
          <Outlet />
        </main>
        
        {/* Footer Status Bar */}
        <footer className="h-8 border-t border-ghost-border flex justify-between items-center px-6 text-[8px] tracking-widest bg-surface z-50 shrink-0">
          <div className="flex items-center gap-10 text-muted-foreground uppercase font-bold">
            <span className="flex items-center gap-2">SYS_LOAD: 24.8%</span>
            <span className="flex items-center gap-2">MEM_USED: 12.4GB / 32.0GB</span>
            <span className="flex items-center gap-2">UPTIME: 442:12:09</span>
          </div>
          
          <div className="text-accent-pink font-bold uppercase tracking-widest neon-text-pink">
            VECTOR_ARCADE_84_ADMIN_v1.0.42_STABLE
          </div>
        </footer>
      </div>
    </div>
  )
}
