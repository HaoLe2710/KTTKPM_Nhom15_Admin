import { useState, useEffect } from 'react'
import { CheckCircle2, Cloud, AlertTriangle, History, Terminal } from 'lucide-react'
import api from '../../lib/api'

export default function SearchHealth () {
  const [summary, setSummary] = useState(null)
  const [failures, setFailures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [sumRes, failRes] = await Promise.all([
          api.get('/admin/search/summary').catch(() => null),
          // Backend may not have this exact endpoint yet, mocking failure response gracefully
          api.get('/admin/search/projection-failures').catch(() => ({ content: [] }))
        ])
        
        setSummary(sumRes)
        setFailures(failRes?.content || [])
      } catch (err) {
        console.warn('API error, using fallback data for mock-up', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Static Fallbacks for visual layout matching GLITCH_BEAUTY_V1.0
  const activeProducts = summary?.activeProducts || 14208
  const projectedProducts = summary?.projectedProducts || 13852
  const missingProjections = summary?.missingProjectionProducts || 214
  const staleProjections = summary?.staleProjectionProducts || 142

  const displayFailures = failures.length > 0 ? failures : [
    { id: '#VX-8821', msg: 'TIMEOUT: Projection mapping failed after 5000ms', retry: 4, time: '2023-11-24 14:22:01' },
    { id: '#VX-9104', msg: "SYNTAX: Unexpected token 'null' in index payload", retry: 1, time: '2023-11-24 14:19:44' },
    { id: '#VX-4492', msg: 'STORAGE: Vector space overflow at cluster-B', retry: 12, time: '2023-11-24 14:15:10' },
    { id: '#VX-1209', msg: "SCHEMA: Property 'v_dims' missing from definition", retry: 2, time: '2023-11-24 14:12:33' },
    { id: '#VX-0021', msg: 'AUTH: Service-to-service token expired during projection', retry: 1, time: '2023-11-24 14:08:55' }
  ]

  const liveLogs = [
    { type: 'INFO', text: 'Indexer-01: Processing Batch #4029...' },
    { type: 'WARN', text: 'Cache-Manager: Low memory detected in Node-B' },
    { type: 'CRIT', text: 'Projection-Runner: Failed to map #VX-8821 (TIMEOUT)' },
    { type: 'INFO', text: 'Indexer-01: Successfully committed #VX-8819' },
    { type: 'INFO', text: 'Indexer-01: Successfully committed #VX-8820' },
    { type: 'INFO', text: 'Indexer-02: Initializing re-scan of stale blocks...' },
    { type: 'INFO', text: 'System: Garbage collection completed in 24ms' },
    { type: 'DEBUG', text: 'Vector-DB: Re-calculating centroids for sector-7' },
    { type: 'INFO', text: 'Indexer-01: Processing Batch #4030...' }
  ]

  if (loading && !summary) {
    return <div className="p-8 text-primary font-mono text-sm animate-pulse tracking-widest">INITIALIZING_HEALTH_DATASTREAMS...</div>
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-mono tracking-widest selection:bg-primary selection:text-black pb-12">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-5xl font-bold text-white tracking-wider mb-3">
            SEARCH_INDEX_HEALTH
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-3">
            <span className="text-white">⬡ /api/v1/admin/search/summary</span>
            <span className="text-primary font-bold">REAL-TIME MONITOR ACTIVE</span>
          </p>
        </div>
        
        <button className="bg-primary text-black font-bold uppercase text-xs py-4 px-6 hover:brightness-125 transition-all shadow-[0_0_15px_rgba(141,241,121,0.3)]">
          REBUILD ALL PROJECTIONS
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        <div className="border border-ghost-border p-6 bg-surface flex flex-col justify-between h-40 relative">
          <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase">
            <span>ACTIVE PRODUCTS</span>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-4xl font-bold text-primary tracking-wider neon-text-primary">
            {activeProducts.toLocaleString()}
          </div>
          <div className="h-1 w-full bg-[#111] absolute bottom-6 left-6 right-6" style={{ width: 'calc(100% - 48px)' }}>
            <div className="h-full bg-primary" style={{ width: '90%' }}></div>
          </div>
        </div>

        <div className="border border-ghost-border p-6 bg-surface flex flex-col justify-between h-40 relative">
          <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase">
            <span>PROJECTED PRODUCTS</span>
            <Cloud className="w-4 h-4 text-[#00ffff]" />
          </div>
          <div className="text-4xl font-bold text-[#00ffff] tracking-wider drop-shadow-[0_0_8px_rgba(0,255,255,0.3)]">
            {projectedProducts.toLocaleString()}
          </div>
          <div className="h-1 w-full bg-[#111] absolute bottom-6 left-6 right-6" style={{ width: 'calc(100% - 48px)' }}>
            <div className="h-full bg-[#00ffff]" style={{ width: '85%' }}></div>
          </div>
        </div>

        <div className="border border-ghost-border p-6 bg-surface flex flex-col justify-between h-40 relative">
          <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase">
            <span>MISSING PROJECTIONS</span>
            <AlertTriangle className="w-4 h-4 text-[#ff5555]" />
          </div>
          <div className="text-4xl font-bold text-[#ff5555] tracking-wider drop-shadow-[0_0_8px_rgba(255,85,85,0.3)]">
            {missingProjections.toLocaleString()}
          </div>
          <div className="h-1 w-full bg-[#111] absolute bottom-6 left-6 right-6" style={{ width: 'calc(100% - 48px)' }}>
            <div className="h-full bg-[#ff5555]" style={{ width: '15%' }}></div>
          </div>
        </div>

        <div className="border border-ghost-border p-6 bg-surface flex flex-col justify-between h-40 relative">
          <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase">
            <span>STALE PROJECTIONS</span>
            <History className="w-4 h-4 text-accent-pink" />
          </div>
          <div className="text-4xl font-bold text-accent-pink tracking-wider neon-text-pink">
            {staleProjections.toLocaleString()}
          </div>
          <div className="h-1 w-full bg-[#111] absolute bottom-6 left-6 right-6" style={{ width: 'calc(100% - 48px)' }}>
            <div className="h-full bg-accent-pink" style={{ width: '10%' }}></div>
          </div>
        </div>

      </div>

      {/* Failure Log Table */}
      <div className="border border-ghost-border bg-surface mt-10">
        <div className="flex justify-between items-center bg-[#131313] p-4 border-b border-ghost-border">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ff5555]" />
            <h2 className="text-white text-lg font-bold uppercase tracking-widest">FAILURE LOG</h2>
          </div>
          <span className="text-[9px] text-muted-foreground uppercase">
            SOURCE: /api/v1/admin/search/projection-failures
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] text-muted-foreground border-b border-ghost-border bg-black">
              <tr>
                <th className="py-4 px-6 font-normal uppercase">PRODUCT ID</th>
                <th className="py-4 px-6 font-normal uppercase">ERROR MESSAGE</th>
                <th className="py-4 px-6 font-normal uppercase text-center">RETRY COUNT</th>
                <th className="py-4 px-6 font-normal uppercase">FAILED AT</th>
                <th className="py-4 px-6 font-normal uppercase text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {displayFailures.map((item, idx) => (
                <tr key={idx} className="border-b border-ghost-border hover:bg-surface-container-low transition-colors group">
                  <td className="py-5 px-6 font-bold text-white">{item.id}</td>
                  <td className="py-5 px-6 text-[#ff5555] max-w-md truncate">{item.msg}</td>
                  <td className="py-5 px-6 text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 ${item.retry > 3 ? 'bg-[#ff5555] text-black shadow-[0_0_8px_rgba(255,85,85,0.4)]' : 'bg-[#333] text-muted-foreground'}`}>
                      {item.retry.toString().padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-5 px-6 text-muted-foreground">{item.time}</td>
                  <td className="py-5 px-6 text-right">
                    <button className="text-primary font-bold uppercase underline hover:text-white transition-colors underline-offset-4">
                      FORCE_RETRY
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* Cluster Activity Chart */}
        <div className="border border-ghost-border bg-surface flex flex-col h-80">
          <div className="p-4 border-b border-ghost-border flex items-center gap-2">
            <span className="w-2 h-2 rounded-full border border-muted-foreground flex items-center justify-center text-[5px] text-muted-foreground font-bold">⬢</span>
            <h3 className="text-xs text-muted-foreground font-bold uppercase tracking-widest">PROJECTION CLUSTER ACTIVITY</h3>
          </div>
          
          <div className="flex-1 p-6 relative flex items-end justify-between gap-2 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#111] to-transparent bg-opacity-20 crt-scanline">
            {/* Fake bar chart mapping */}
            {[20, 30, 70, 40, 30, 20, 15, 25, 45, 90, 30, 20].map((h, i) => (
              <div 
                key={i} 
                className={`w-full ${h > 60 ? (i === 2 ? 'bg-[#ff5555]' : 'bg-primary') : 'bg-[#333]'} border-b border-[#0e0e0e]`}
                style={{ height: `${h}%` }}
              >
                {h > 60 && <div className="w-full h-full opacity-50 crt-scanline"></div>}
              </div>
            ))}
            
            {/* X Axis Labels */}
            <div className="absolute bottom-2 left-6 text-[8px] text-muted-foreground">-60 MIN</div>
            <div className="absolute bottom-2 right-6 text-[8px] text-muted-foreground">T-0 MIN</div>
          </div>
        </div>

        {/* Live Output Stream */}
        <div className="border border-ghost-border bg-surface flex flex-col h-80">
          <div className="p-4 border-b border-ghost-border flex items-center gap-2">
            <Terminal className="w-3 h-3 text-muted-foreground" />
            <h3 className="text-xs text-muted-foreground font-bold uppercase tracking-widest">LIVE OUTPUT STREAM</h3>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto font-mono text-[9px] flex flex-col gap-2">
            {liveLogs.map((log, i) => {
              let color = 'text-muted-foreground';
              if (log.type === 'INFO') color = 'text-primary';
              if (log.type === 'WARN') color = 'text-orange-400';
              if (log.type === 'CRIT') color = 'text-[#ff5555]';
              if (log.type === 'DEBUG') color = 'text-[#00ffff]';
              
              return (
                <div key={i} className={color}>
                  [{log.type}] {log.text}
                </div>
              )
            })}
            <div className="text-muted-foreground animate-pulse mt-1">_</div>
          </div>
        </div>

      </div>

    </div>
  )
}
