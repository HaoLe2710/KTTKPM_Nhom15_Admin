import { useState } from 'react'
import { Palette, Ruler, Wind, Layers, Trash2, ShieldCheck, History } from 'lucide-react'

export default function OptionsRegistry () {
  const [activeTab, setActiveTab] = useState('COLOR')

  const registry = [
    { id: 'ATTR_0942_COL', name: 'COLOR', vals: '12_VALS', type: 'SWATCH', icon: Palette, active: true },
    { id: 'ATTR_1120_SIZ', name: 'SIZE', vals: '05_VALS', type: 'LABEL', icon: Ruler, active: false },
    { id: 'ATTR_8821_SCT', name: 'SCENT', vals: '08_VALS', type: 'RADIO', icon: Wind, active: false },
    { id: 'ATTR_2234_MAT', name: 'MATERIAL', vals: '03_VALS', type: 'DROPDOWN', icon: Layers, active: false },
  ]

  const colorValues = [
    { sort: '001', name: 'Neon Red', hex: '#FF0000', usage: '1,102' },
    { sort: '002', name: 'Deep Space Blue', hex: '#0000FF', usage: '845' },
    { sort: '003', name: 'Glitch Lime', hex: '#9CFF93', usage: '421' },
    { sort: '004', name: 'Magenta Pulse', hex: '#FF51FA', usage: '390' },
    { sort: '005', name: 'Void Black', hex: '#000000', usage: '83' }
  ]

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 font-mono tracking-widest selection:bg-primary selection:text-black pb-12">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-ghost-border pb-6">
        <div>
          <h1 className="text-5xl font-bold text-[#00ffff] drop-shadow-[0_0_8px_rgba(0,255,255,0.4)] tracking-wider mb-4">
            OPTION_REGISTRY
          </h1>
          <p className="text-[10px] text-primary uppercase flex items-center gap-2">
            <span>&gt;_ /api/v1/admin/options_connected</span>
            <span className="text-muted-foreground">[PORT:8084]</span>
          </p>
        </div>
        
        <div className="flex gap-4">
          <button className="border border-accent-pink text-accent-pink font-bold uppercase text-xs py-3 px-6 hover:bg-[rgba(255,90,249,0.1)] transition-colors shadow-[0_0_10px_rgba(255,90,249,0.2)]">
            ADD_NEW_ATTR
          </button>
          <button className="bg-primary text-black font-bold uppercase text-xs py-3 px-6 hover:brightness-125 transition-all crt-scanline-green border border-transparent shadow-[0_0_15px_rgba(141,241,121,0.3)]">
            SYNC_REGISTRY
          </button>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: MASTER_REGISTRY */}
        <div className="lg:col-span-4 space-y-4 relative">
          <div className="absolute top-[10px] left-0 w-8 border-t border-ghost-border"></div>
          <h3 className="text-[10px] text-primary font-bold uppercase tracking-widest pl-10 mb-6">
            MASTER_REGISTRY
          </h3>
          <div className="border-l border-ghost-border pl-6 space-y-4 relative pt-2 pb-8">
            <div className="absolute top-0 bottom-0 left-0 border-l border-ghost-border hidden"></div>
            
            {registry.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => setActiveTab(item.name)}
                className={`p-4 border cursor-pointer transition-all flex items-center gap-4 ${
                  item.active || activeTab === item.name 
                    ? 'border-accent-pink bg-[rgba(255,90,249,0.05)] shadow-[0_0_15px_rgba(255,90,249,0.15)]' 
                    : 'border-ghost-border hover:border-muted-foreground'
                }`}
              >
                <div className={`p-3 ${item.active || activeTab === item.name ? 'bg-accent-pink text-black' : 'bg-[#1a1a1a] text-muted-foreground'}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-lg font-bold text-white uppercase">{item.name}</span>
                    <span className={`text-[10px] font-bold ${item.active || activeTab === item.name ? 'text-accent-pink' : 'text-muted-foreground'}`}>
                      {item.vals}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[8px] uppercase text-muted-foreground">
                    <span>ID: {item.id}</span>
                    <span>TYPE: {item.type}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* End Marker dashed box */}
            <div className="p-10 border border-dashed border-ghost-border flex items-center justify-center text-[9px] text-muted-foreground uppercase opacity-50 mt-8">
              EO_REGISTRY_END
            </div>
            
          </div>
        </div>

        {/* Right Column: DETAIL_VIEW */}
        <div className="lg:col-span-8 flex flex-col relative">
          <div className="absolute top-[10px] left-0 w-8 border-t border-accent-pink"></div>
          <h3 className="text-[10px] text-accent-pink font-bold uppercase tracking-widest pl-10 mb-6">
            DETAIL_VIEW: ATTR_0942_COL
          </h3>

          <div className="border border-accent-pink bg-surface p-8 shadow-[0_0_20px_rgba(255,90,249,0.1)] flex-1 flex flex-col relative">
            
            {/* Detail Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-4xl font-bold text-white tracking-widest mb-4 uppercase">
                  OPTION: COLOR
                </h2>
                <div className="flex gap-6 text-[10px] font-mono font-bold tracking-widest">
                  <span className="text-primary">[VISIBLE: TRUE]</span>
                  <span className="text-accent-pink">[REQUIRED: TRUE]</span>
                  <span className="text-[#00ffff]">[SEARCHABLE: TRUE]</span>
                </div>
              </div>
              
              <div className="border border-ghost-border p-4 text-center min-w-[120px]">
                <div className="text-[8px] text-muted-foreground uppercase mb-1 drop-shadow-none">USAGE_TOTAL</div>
                <div className="text-3xl font-bold text-accent-pink neon-text-pink">2,841</div>
              </div>
            </div>

            {/* Value Registry Table */}
            <table className="w-full text-left text-xs mb-10">
              <thead className="text-[9px] text-muted-foreground border-b border-ghost-border">
                <tr>
                  <th className="py-3 px-2 font-normal uppercase">SORT</th>
                  <th className="py-3 px-2 font-normal uppercase">VALUE_NAME</th>
                  <th className="py-3 px-2 font-normal uppercase">SPECIFIER (HEX)</th>
                  <th className="py-3 px-2 font-normal uppercase text-right">USAGE</th>
                  <th className="py-3 px-2 font-normal uppercase w-10"></th>
                </tr>
              </thead>
              <tbody>
                {colorValues.map((v, i) => (
                  <tr key={i} className="border-b border-ghost-border/50 hover:bg-[#111] transition-colors group">
                    <td className="py-4 px-2 text-primary">{v.sort}</td>
                    <td className="py-4 px-2 font-bold text-white flex items-center gap-3">
                      <span className="w-3 h-3 block border border-white/20" style={{ backgroundColor: v.hex }}></span>
                      {v.name}
                    </td>
                    <td className="py-4 px-2 text-muted-foreground">{v.hex}</td>
                    <td className="py-4 px-2 text-right text-[#00ffff]">{v.usage}</td>
                    <td className="py-4 px-2 text-right">
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-[#ff5555] cursor-pointer inline-block opacity-50 group-hover:opacity-100 transition-all" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* New Value Input Block */}
            <div className="mt-auto pt-6 border-t border-dashed border-ghost-border/50">
              <h4 className="text-[9px] text-primary font-bold uppercase mb-3 drop-shadow-none">NEW_VALUE_INPUT</h4>
              <div className="flex flex-col gap-4">
                <input 
                  type="text" 
                  placeholder="LABEL" 
                  className="bg-[#1a1a1a] border border-ghost-border p-3 w-full font-mono text-xs text-white uppercase focus:border-primary focus:ring-0 outline-none transition-colors crt-scanline"
                />
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="SPECIFIER (#HEX)" 
                    className="bg-[#1a1a1a] border border-ghost-border p-3 flex-1 font-mono text-xs text-white uppercase focus:border-primary focus:ring-0 outline-none transition-colors crt-scanline"
                  />
                  <button className="bg-accent-pink text-black font-bold text-xs uppercase px-8 crt-scanline-pink hover:brightness-125 transition-all">
                    PUSH_VALUE
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Footer Dashboards */}
      <div className="flex flex-col md:flex-row gap-6 mt-12 pt-6 border-t border-ghost-border border-dashed">
        
        <div className="border border-ghost-border p-4 flex items-center gap-4 flex-1">
          <History className="w-10 h-10 text-muted-foreground" />
          <div>
            <div className="text-[8px] text-muted-foreground uppercase mb-1 tracking-widest">LAST_MODIFIED</div>
            <div className="text-sm font-bold text-white tracking-wider">2023.10.24 - 14:22:01</div>
          </div>
        </div>

        <div className="border border-ghost-border p-4 flex items-center gap-4 flex-1">
          <ShieldCheck className="w-10 h-10 text-primary" />
          <div>
            <div className="text-[8px] text-muted-foreground uppercase mb-1 tracking-widest">COMMIT_BY</div>
            <div className="text-sm font-bold text-white tracking-wider">SYS_ADMIN_01</div>
          </div>
        </div>

      </div>

    </div>
  )
}
