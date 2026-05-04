import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Activity, Box, Database, Settings, UserCircle, Layers, List, BarChart2, TrendingUp } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'CMD_CENTER', icon: Activity },
  { href: '/products', label: 'INVENTORY', icon: Box },
  { href: '/options', label: 'OPTIONS', icon: List },
  { href: '/search', label: 'SEARCH METRICS', icon: BarChart2 },
  { href: '/search-health', label: 'SEARCH HEALTH', icon: TrendingUp },
]

export function Sidebar () {
  const location = useLocation()

  return (
    <aside className="w-64 border-r border-ghost-border bg-surface flex flex-col pt-6 z-10">
      <div className="px-6 mb-10">
        <h1 className="text-xl font-bold font-mono text-primary neon-text-primary tracking-widest">GLITCH_BEAUTY_V1.0</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto w-full">
        <ul className="space-y-4 w-full px-0">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href) || 
                             (item.href === '/dashboard' && location.pathname === '/')
            
            return (
              <li key={item.href} className="w-full">
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-4 px-6 py-4 font-mono text-sm tracking-widest transition-all w-full',
                    isActive 
                      ? 'crt-scanline-green font-bold text-primary' 
                      : 'text-muted-foreground hover:bg-surface-container-low border-y border-transparent hover:border-ghost-border hover:text-primary'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Rebuild Index Action */}
      <div className="px-6 py-4 mt-auto">
        <button className="w-full bg-[#ff5af9] text-black font-bold uppercase text-xs py-3 border border-transparent hover:border-white transition-all crt-scanline-pink tracking-widest shadow-[0_0_15px_rgba(255,90,249,0.3)]">
          REBUILD INDEX
        </button>
      </div>

      {/* Bottom Profile */}
      <div className="border-t border-b border-ghost-border p-4 flex items-center gap-3">
        <UserCircle className="w-8 h-8 text-primary" />
        <span className="font-mono text-[10px] text-primary tracking-widest font-bold">ROOT_ADMIN</span>
      </div>
    </aside>
  )
}
