import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PlusSquare, PenTool, Trash2, AlertTriangle, Layers, Banknote, ClipboardCheck, Filter, Download } from 'lucide-react'
import api from '../../lib/api'

export default function ProductList () {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/products', {
        params: { size: 50, page: 0 }
      })
      setProducts(res.content || [])
    } catch (err) {
      setError(err.message || 'SYS_FAILURE: Cannot fetch inventory streams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const toggleActive = async (id, currentStatus) => {
    try {
      await api.patch(`/admin/products/${id}/active`, { active: !currentStatus })
      fetchProducts()
    } catch (err) {
      alert('SYS_AUTH_FAILED')
    }
  }

  // Fallbacks if data empty to match visual spec
  const fallbackData = [
    { id: 1, name: 'NEON_GLOW SERUM', slug: 'neon-glow-sk-01', minPrice: 45, maxPrice: 62, totalStock: 1240, active: true, variantsCount: 4, type: 'sizes' },
    { id: 2, name: 'CYBER_LIP GLAZE', slug: 'cyber-lip-mk-22', minPrice: 22, maxPrice: 35, totalStock: 42, active: true, variantsCount: 12, type: 'shades', isLow: true },
    { id: 3, name: 'VOID_MATTE POWDER', slug: 'void-matte-mk-09', minPrice: 38, maxPrice: 38, totalStock: 0, active: false, variantsCount: 3, type: 'tones', isDepleted: true }
  ]

  const displayList = products.length > 0 ? products : (!loading ? fallbackData : [])
  const totalCount = products.length > 0 ? products.length : 892

  return (
    <div className="w-full max-w-6xl mx-auto font-mono tracking-widest selection:bg-primary selection:text-black">
      
      {/* Header Row */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 uppercase">
            STOCK LEDGER
          </h1>
          <p className="text-[10px] text-primary uppercase">
            PATH: ROOT / INVENTORY / <span className="text-muted-foreground">COSMETICS_MASTER</span>
          </p>
        </div>
        
        <Link to="/products/new">
          <button className="bg-primary text-black font-bold uppercase text-xs py-3 px-6 hover:brightness-125 transition-all flex items-center gap-2 crt-scanline-green border border-[#44ff22]">
            <PlusSquare className="w-4 h-4" /> NEW PRODUCT
          </button>
        </Link>
      </div>

      {error && (
        <div className="border border-accent-pink bg-[rgba(255,90,249,0.1)] text-accent-pink p-4 text-xs font-bold mb-6">
          [CRITICAL_ERROR] {error}
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        
        <div className="border border-ghost-border p-5 bg-surface flex flex-col justify-between h-32 relative">
          <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase">
            <span>TOTAL VALUE</span>
            <Banknote className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-bold text-white tracking-wider">
            $1.2M
          </div>
          <div className="text-[8px] text-primary flex items-center gap-1">
            <span className="w-1.5 h-1.5 crt-scanline-green block"></span> +12.4% FROM PREV_CYCLE
          </div>
        </div>

        <div className="border border-ghost-border p-5 bg-surface flex flex-col justify-between h-32">
          <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase">
            <span>ACTIVE SKUS</span>
            <Layers className="w-4 h-4 text-accent-pink" />
          </div>
          <div className="text-3xl font-bold text-white tracking-wider">
            892
          </div>
          <div className="text-[8px] text-accent-pink uppercase">
            STABLE ACROSS 4 NODES
          </div>
        </div>

        <div className="border border-ghost-border p-5 bg-surface flex flex-col justify-between h-32">
          <div className="flex justify-between w-full text-[9px] text-muted-foreground uppercase">
            <span>GLOBAL STOCK</span>
            <ClipboardCheck className="w-4 h-4 text-[#00ffff]" />
          </div>
          <div className="text-3xl font-bold text-white tracking-wider">
            42.5K
          </div>
          <div className="text-[8px] text-[#00ffff] uppercase">
            DISTRIBUTED STORAGE
          </div>
        </div>

        {/* Highlighted Low Alert Card */}
        <div className="border border-[#ff5555] p-5 bg-surface flex flex-col justify-between h-32 shadow-[0_0_15px_rgba(255,85,85,0.15)]">
          <div className="flex justify-between w-full text-[9px] text-[#ff5555] uppercase font-bold">
            <span>LOW ALERT</span>
            <AlertTriangle className="w-4 h-4 text-[#ff5555]" />
          </div>
          <div className="text-3xl font-bold text-white tracking-wider">
            12
          </div>
          <div className="text-[8px] text-[#ff5555] uppercase font-bold">
            IMMEDIATE ACTION REQUIRED
          </div>
        </div>

      </div>

      {/* Main Table Segment */}
      <div className="border border-ghost-border bg-surface flex flex-col">
        
        {/* Table Toolbar */}
        <div className="flex justify-between items-center border-b border-ghost-border p-4 bg-surface">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-primary font-bold uppercase">ACTIVE CATALOG</span>
            <div className="flex gap-2">
              <span className="text-[9px] text-black bg-ghost-border px-2 py-1 font-bold">ALL</span>
              <span className="text-[9px] text-black crt-scanline-green px-2 py-1 font-bold">SKINCARE</span>
              <span className="text-[9px] text-black bg-ghost-border px-2 py-1 font-bold">MAKEUP</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 border border-ghost-border hover:border-white transition-colors text-muted-foreground hover:text-white">
              <Filter className="w-3 h-3" />
            </button>
            <button className="p-2 border border-ghost-border hover:border-white transition-colors text-muted-foreground hover:text-white">
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* Table Contents */}
        <div className="w-full">
          <table className="w-full text-left text-xs">
            <thead className="text-[9px] text-muted-foreground border-b border-ghost-border bg-[#131313]">
              <tr>
                <th className="py-4 px-4 font-normal uppercase">PRODUCT / SLUG</th>
                <th className="py-4 px-4 font-normal uppercase">PRICE RANGE</th>
                <th className="py-4 px-4 font-normal uppercase w-48">TOTAL STOCK</th>
                <th className="py-4 px-4 font-normal uppercase">VARIANTS</th>
                <th className="py-4 px-4 font-normal uppercase">STATUS</th>
                <th className="py-4 px-4 font-normal uppercase text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-muted-foreground uppercase text-[10px]">
                    LOADING_DATASTREAMS...
                  </td>
                </tr>
              ) : displayList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-accent-pink uppercase text-[10px]">
                    NO_RECORDS_FOUND
                  </td>
                </tr>
              ) : (
                displayList.map((p, i) => {
                  const maxStock = 5000;
                  const stock = p.totalStock || 0;
                  const ratio = Math.min((stock / maxStock) * 100, 100);
                  const isLow = p.isLow || (stock > 0 && stock < 100);
                  const isDepleted = p.isDepleted || stock === 0;

                  return (
                    <tr key={p.id || i} className="border-b border-ghost-border hover:bg-surface-container-low transition-colors group">
                      <td className="py-4 px-4 flex items-center gap-4">
                        <div className="w-10 h-10 border border-ghost-border flex items-center justify-center bg-black overflow-hidden relative">
                          <div className="absolute inset-0 bg-blue-500 opacity-20 crt-scanline"></div>
                          <span className="text-[10px] relative z-10 
                            bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            {p.id || 'x'}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-[11px] mb-1 uppercase tracking-widest">{p.name}</div>
                          <div className="text-[9px] text-muted-foreground">slug: {p.slug}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-white font-bold tracking-widest text-[11px]">
                        ${p.minPrice?.toFixed(2)}{p.minPrice !== p.maxPrice ? ` - $${p.maxPrice?.toFixed(2)}` : ''}
                      </td>
                      <td className="py-4 px-4 pr-12">
                        <div className="flex justify-between text-[8px] uppercase mb-1">
                          <span className={isDepleted ? 'text-muted-foreground' : isLow ? 'text-[#ff5555]' : 'text-primary'}>
                            {stock.toLocaleString()} UNIT
                          </span>
                          <span className={isDepleted ? 'text-muted-foreground' : isLow ? 'text-[#ff5555]' : 'text-primary'}>
                            {isDepleted ? 'DEPLETED' : isLow ? 'LOW_VOL' : `${Math.round(ratio)}%`}
                          </span>
                        </div>
                        <div className="h-[4px] border border-ghost-border p-[1px] w-full flex">
                          <div 
                            className={`h-full ${isDepleted ? 'bg-transparent' : isLow ? 'bg-[#ff5555] crt-scanline' : 'crt-scanline-green'}`} 
                            style={{ width: `${ratio}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[10px] text-white font-bold uppercase tracking-wider">
                        {p.variantsCount || p.variants?.length || 0} {p.type || 'VARIANTS'}
                      </td>
                      <td className="py-4 px-4">
                        <button 
                          onClick={() => p.id !== 1 && p.id !== 2 && p.id !== 3 ? toggleActive(p.id, p.active) : null}
                          className={`text-[8px] font-bold uppercase px-3 py-1 cursor-pointer transition-colors ${
                            p.active 
                              ? 'crt-scanline-green text-black border border-primary' 
                              : 'bg-surface-container-low text-muted-foreground border border-ghost-border'
                          }`}
                        >
                          {p.active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end gap-2 text-muted-foreground">
                          <Link to={`/products/${p.id}`} className="block border border-ghost-border p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] hover:text-white transition-colors">
                            <PenTool className="w-3 h-3 text-primary" />
                          </Link>
                          <button className="block border border-ghost-border p-2 bg-[#1a1a1a] hover:bg-[#ff5555]/20 hover:text-[#ff5555] transition-colors">
                            <Trash2 className="w-3 h-3 text-[#ff5555]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer Pagination Segment */}
        <div className="border-t border-ghost-border bg-surface p-4 flex justify-between items-center text-[8px] text-muted-foreground uppercase font-bold tracking-widest">
          <div>SHOWING {displayList.length} OF {totalCount} RECORDS</div>
          <div className="flex gap-2 items-center">
            <span className="cursor-pointer hover:text-white transition-colors">&lt; PREV_BLOCK</span>
            <span className="text-primary border-b border-primary cursor-pointer">01</span>
            <span className="cursor-pointer hover:text-white transition-colors">02</span>
            <span className="cursor-pointer hover:text-white transition-colors">03</span>
            <span>...</span>
            <span className="cursor-pointer hover:text-white transition-colors">89</span>
            <span className="cursor-pointer hover:text-white transition-colors">NEXT_BLOCK &gt;</span>
          </div>
        </div>

      </div>
    </div>
  )
}

