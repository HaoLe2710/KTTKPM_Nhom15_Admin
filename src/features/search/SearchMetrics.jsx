import { useState, useEffect } from 'react'
import { Activity, Gauge, Cpu, ArrowUpRight, ArrowRight, ArrowDownRight, AlertTriangle, PenTool } from 'lucide-react'
import api from '../../lib/api'

export default function SearchMetrics () {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [topRes, zeroRes, summaryRes, clickedRes] = await Promise.all([
          api.get('/admin/search/top-queries', { params: { limit: 5 } }).catch(() => []),
          api.get('/admin/search/zero-result-queries', { params: { size: 5, sort: 'occurrenceCount,desc' } }).catch(() => ({ content: [] })),
          api.get('/admin/search/summary').catch(() => null),
          api.get('/admin/search/top-clicked-products', { params: { limit: 4 } }).catch(() => [])
        ])
        setData({ top: topRes, zero: zeroRes?.content || [], summary: summaryRes, clicked: clickedRes })
      } catch (err) {
        console.warn('API error, using fallback data for mock-up', err)
        setData({ top: [], zero: [], summary: null, clicked: [] })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Transform backend data or use fallbacks
  const topQueries = data?.top?.length > 0 ? data.top.map((q, i) => ({
    rank: `#0${i + 1}`,
    keyword: q.queryText || q.queryNormalized,
    hits: q.totalCount.toLocaleString(),
    trend: i % 2 === 0 ? 'up' : 'neutral'
  })) : [
    { rank: '#01', keyword: 'NEON VELVET LIPSTICK', hits: '12,402', trend: 'up' },
    { rank: '#02', keyword: 'GLOW_DUST_HIGHLIGHTER', hits: '9,811', trend: 'up' },
    { rank: '#03', keyword: 'CYBER_CHROME_PALETTE', hits: '7,244', trend: 'neutral' },
    { rank: '#04', keyword: 'MATTE_MATRIX_FOUNDATION', hits: '6,901', trend: 'down' },
  ]

  const zeroAlerts = data?.zero?.length > 0 ? data.zero.map(z => ({
    name: z.queryText,
    reason: 'ZERO_HITS',
    count: z.occurrenceCount,
    resolved: false
  })) : [
    { name: 'BIT_BLUSH', reason: 'MISSING_METADATA_LINK', count: 421 },
    { name: 'HOLOGRAPHIC_MIST', reason: 'OOS_RE-ROUTE_FAILED', count: 308 },
    { name: 'PIXEL_POWDER', reason: 'RESOLVED_AUTO_SYNONYM', count: 12, resolved: true },
  ]

  const defaultBgs = ['from-cyan-900', 'from-purple-900', 'from-blue-900', 'from-pink-900']
  const clickedProducts = data?.clicked?.length > 0 ? data.clicked.map((c, i) => ({
    name: c.productName,
    ctr: `${c.clickCount} CLICKS`,
    price: '$--', // Not in projection API yet
    colors: ['#00ffff'],
    bgClass: `bg-gradient-to-tr ${defaultBgs[i % 4]} to-black`
  })) : [
    { name: 'VELVET_VORTEX_01', ctr: '12.4%', price: '$24.00', colors: ['#8df179', '#ff5af9', '#00ffff'], bgClass: 'bg-gradient-to-tr from-cyan-900 to-black' },
    { name: 'NEON_QUARTZ_PALETTE', ctr: '10.1%', price: '$48.00', colors: ['#ff5af9', '#8df179'], bgClass: 'bg-gradient-to-tr from-purple-900 to-black' },
    { name: 'CYBER_SCENT_V2.0', ctr: '8.9%', price: '$72.00', colors: ['#00ffff'], bgClass: 'bg-gradient-to-tr from-blue-900 to-black' },
    { name: 'DATA_DUST_BRUSH_SET', ctr: '7.2%', price: '$35.00', colors: ['#444444', '#888888'], bgClass: 'bg-gradient-to-tr from-pink-900 to-black' },
  ]
  
  const healthScore = data?.summary?.activeProducts ? 
    (((data.summary.projectedProducts - data.summary.staleProjectionProducts) / data.summary.activeProducts) * 100).toFixed(1) : 
    '99.2';

  if (loading) {
    return <div className="p-8 text-primary font-mono text-sm animate-pulse tracking-widest">INITIALIZING SEARCH METRICS DB...</div>
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-mono tracking-widest selection:bg-primary selection:text-black">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-bold text-primary neon-text-primary tracking-[0.2em] mb-2 uppercase">
            SEARCH_ANALYTICS://04
          </h1>
          <p className="text-xs text-muted-foreground uppercase">
            LAST SYNC: 2023-10-27T14:42:01_UTC
          </p>
        </div>
        <button className="bg-primary text-black font-bold uppercase text-xs py-3 px-6 hover:bg-primary-container transition-colors flex items-center gap-2">
          <PenTool className="w-4 h-4" /> GENERATE SYNONYM RECOMMENDATIONS
        </button>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-36">
        {/* KPI 1 */}
        <div className="border border-ghost-border p-5 flex flex-col justify-between relative bg-surface">
          <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase border-b border-ghost-border pb-2">
            <span>PROJECTION_HEALTH</span>
            <Activity className="w-3 h-3 text-primary" />
          </div>
          <div className="text-5xl font-bold text-primary neon-text-primary">
            {healthScore}%
          </div>
          {/* Progress bar */}
          <div className="absolute bottom-4 left-5 right-5 h-1.5 bg-ghost-border transition-all">
            <div className="h-full bg-primary" style={{ width: `${Math.min(healthScore, 100)}%` }}></div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="border border-ghost-border p-5 flex flex-col justify-between relative bg-surface">
          <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase border-b border-ghost-border pb-2">
            <span>LAT._AVERAGE</span>
            <Gauge className="w-3 h-3 text-accent-pink" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-accent-pink neon-text-pink">14.2</span>
            <span className="text-xl font-bold text-accent-pink">MS</span>
          </div>
          {/* Segmented Progress bar */}
          <div className="absolute bottom-4 left-5 right-5 flex gap-1 h-1.5">
            <div className="h-full bg-accent-pink flex-1 opacity-50"></div>
            <div className="h-full bg-accent-pink flex-1 opacity-70"></div>
            <div className="h-full bg-accent-pink flex-1 opacity-90"></div>
            <div className="h-full bg-accent-pink flex-1 neon-text-pink"></div>
            <div className="h-full bg-ghost-border flex-1"></div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="border border-ghost-border p-5 flex flex-col justify-between bg-surface relative">
          <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase border-b border-ghost-border pb-2">
            <span>CACHE_EFFICIENCY</span>
            <Cpu className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-5xl font-bold text-[#00ffff] drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]">
            88.4%
          </div>
          <div className="text-[8px] text-muted-foreground absolute bottom-4 left-5">
            +2.4% VS PREVIOUS CYCLE
          </div>
        </div>
      </div>

      {/* Middle Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Queries */}
        <div className="border border-ghost-border lg:col-span-2 bg-surface flex flex-col">
          <div className="flex justify-between items-center text-[9px] text-muted-foreground uppercase border-b border-ghost-border py-2 px-4 bg-surface-container-low font-bold">
            <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">TOP_QUERIES_VOLUME</span>
            <span>TOTAL_RECORDS: {data?.top?.length || 1402}</span>
          </div>
          
          <table className="w-full h-full text-xs text-left">
            <thead>
              <tr className="text-[8px] text-muted-foreground border-b border-ghost-border">
                <th className="py-2 px-4 font-normal uppercase">RANK</th>
                <th className="py-2 px-4 font-normal uppercase">KEYWORD_STRING</th>
                <th className="py-2 px-4 font-normal uppercase">HITS_COUNT</th>
                <th className="py-2 px-4 font-normal uppercase text-right">TREND_VECTOR</th>
              </tr>
            </thead>
            <tbody>
              {topQueries.map((q, idx) => (
                <tr key={idx} className="border-b border-ghost-border hover:bg-surface-container-low transition-colors group">
                  <td className="py-5 px-4 text-white text-[10px]">{q.rank}</td>
                  <td className="py-5 px-4 text-primary font-bold neon-text-primary text-[10px] sm:text-xs">{q.keyword}</td>
                  <td className="py-5 px-4 text-white font-bold">{q.hits}</td>
                  <td className="py-5 px-4 text-right">
                    <div className="flex justify-end pr-2">
                      {q.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-primary drop-shadow-[0_0_4px_rgba(141,241,121,0.5)]" />}
                      {q.trend === 'neutral' && <ArrowRight className="w-4 h-4 text-accent-pink" />}
                      {q.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-[#ff5555]" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Zero Results Alerts */}
        <div className="border border-ghost-border bg-surface flex flex-col h-full">
          {/* Striped Header */}
          <div className="flex justify-between items-center text-[10px] text-black font-bold uppercase py-2 px-4" style={{
            background: 'repeating-linear-gradient(45deg, #ff5555, #ff5555 4px, #ff7777 4px, #ff7777 8px)'
          }}>
            <span>ZERO_RESULTS_ALERTS</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          
          <div className="p-4 flex flex-col gap-4 flex-1">
            {zeroAlerts.map((alert, idx) => (
              <div key={idx} className={`border border-ghost-border p-3 flex justify-between items-center ${alert.resolved ? 'opacity-40 grayscale' : ''}`}>
                <div className="flex flex-col gap-1">
                  <span className={`text-[11px] font-bold ${alert.resolved ? 'text-white' : 'text-[#ff6655]'}`}>
                    {alert.name}
                  </span>
                  <span className="text-[7px] text-muted-foreground uppercase">{alert.reason}</span>
                </div>
                <div className="text-right flex flex-col gap-1">
                  <span className={`text-base font-bold ${alert.resolved ? 'text-white' : 'text-[#ff5555] neon-text-pink'}`}>
                    {alert.count}
                  </span>
                  <span className="text-[6px] text-muted-foreground uppercase">
                    {alert.resolved ? 'STABILIZED' : 'MISSED_CONV'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Grid: Clicked Products Engagement */}
      <div className="pt-4">
        <h2 className="text-[13px] font-bold text-[#00ffff] uppercase tracking-widest pl-3 border-l-2 border-[#00ffff] mb-6 shadow-sm">
          TOP_CLICKED_PRODUCTS_ENGAGEMENT
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {clickedProducts.map((prod, idx) => (
            <div key={idx} className="border border-ghost-border bg-surface flex flex-col group relative overflow-hidden">
              
              {/* Fake Image Container with Scanlines */}
              <div className={`h-40 w-full relative border-b border-ghost-border flex items-center justify-center ${prod.bgClass}`}>
                {/* Simulated product visual or CRT noise */}
                <div className="absolute inset-0 opacity-20" style={{ 
                  backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 0, transparent 60%)' 
                }}></div>
                <div className="absolute inset-0 crt-scanline opacity-60"></div>
                
                {/* CTR Tag */}
                <div className="absolute top-2 right-2 bg-[rgba(0,255,255,0.8)] text-black text-[7px] font-bold py-1 px-2 border border-[#00ffff] shadow-[0_0_8px_rgba(0,255,255,0.5)]">
                  CTR: {prod.ctr}
                </div>

                {/* Simulated 8bit product shape placeholder */}
                <div className="w-16 h-20 bg-black/40 border border-[#00ffff]/30 relative z-10 
                  group-hover:drop-shadow-[0_0_15px_rgba(0,255,255,0.6)] transition-all duration-300">
                </div>
              </div>

              {/* Data Rows */}
              <div className="p-3 flex flex-col gap-2">
                <div className="text-[9px] text-[#0088ff] group-hover:text-[#00ffff] font-bold uppercase transition-colors">
                  {prod.name}
                </div>
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] text-muted-foreground">{prod.price}</span>
                  <div className="flex gap-1">
                    {prod.colors.map((c, i) => (
                      <div key={i} className="w-[6px] h-[6px]" style={{ backgroundColor: c }}></div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
