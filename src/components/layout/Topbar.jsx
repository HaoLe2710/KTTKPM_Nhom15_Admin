import { Bell, MonitorCheck } from 'lucide-react'

export function Topbar () {
  return (
    <header className="h-16 border-b border-ghost-border bg-surface flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-8 flex-1">
        <nav className="hidden md:flex items-center gap-8 ml-6 pt-1">
          <a href="#" className="font-mono text-[10px] font-bold text-primary tracking-widest border-b border-primary pb-2 uppercase">
            SEARCH_INDEX_HEALTH
          </a>
          <a href="#" className="font-mono text-[10px] font-bold text-muted-foreground tracking-widest hover:text-white transition-colors pb-2 uppercase border-b border-transparent">
            DATABASE
          </a>
          <a href="#" className="font-mono text-[10px] font-bold text-muted-foreground tracking-widest hover:text-white transition-colors pb-2 uppercase border-b border-transparent">
            NETWORK
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">&gt;</span>
          <input 
            type="text" 
            placeholder="SEARCH_DATABASE..." 
            className="bg-surface-container-lowest border border-ghost-border py-2 pl-8 pr-4 font-mono text-xs text-primary w-64 focus:border-primary transition-colors focus:ring-0 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-4 text-primary">
          <button className="hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="hover:text-white transition-colors">
            <MonitorCheck className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
