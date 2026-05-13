import { useEffect, useMemo, useRef, useState } from 'react'
import { semanticMastersApi, catalogMetadataApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'

const tabs = [
  { key: 'brands', label: 'Thương hiệu' },
  { key: 'ingredients', label: 'Thành phần' },
  { key: 'skinTypes', label: 'Loại da' },
  { key: 'concerns', label: 'Vấn đề da' },
  { key: 'tags', label: 'Nhãn' }
]

function getDefaultPayload (key) {
  if (key === 'brands') return { code: '', name: '', slug: '', description: '', isActive: true, logoFile: null }
  if (key === 'ingredients') return { code: '', name: '', normalizedName: '', inciName: '', description: '', isActive: true }
  return { code: '', name: '', description: '', isActive: true }
}

const fieldLabels = {
  code: 'Mã (code)',
  name: 'Tên hiển thị',
  slug: 'Slug',
  description: 'Mô tả',
  normalizedName: 'Tên chuẩn hóa',
  inciName: 'INCI name'
}

export default function SemanticMasters () {
  const [tab, setTab] = useState('brands')
  const [items, setItems] = useState([])
  const [payload, setPayload] = useState(getDefaultPayload('brands'))
  const [error, setError] = useState('')

  const api = useMemo(() => semanticMastersApi[tab], [tab])
  const logoInputRef = useRef(null)

  const load = async () => {
    try {
      setError('')
      const res = await api.list({ page: 0, size: 100, sort: 'name,asc' })
      setItems(res.content || [])
    } catch (err) {
      setError(extractApiError(err, 'Không tải được danh mục chuẩn'))
    }
  }

  useEffect(() => { setPayload(getDefaultPayload(tab)); load() }, [tab])

  const create = async () => {
    try {
      if (tab === 'brands') {
        const fd = new FormData()
        fd.append('code', payload.code || '')
        fd.append('name', payload.name || '')
        fd.append('slug', payload.slug || '')
        fd.append('description', payload.description || '')
        fd.append('isActive', String(payload.isActive))
        if (payload.logoFile) fd.append('logoFile', payload.logoFile)
        await catalogMetadataApi.createBrandMultipart(fd)
      } else {
        await api.create(payload)
      }
      setPayload(getDefaultPayload(tab))
      await load()
    } catch (err) {
      setError(extractApiError(err, 'Tạo danh mục thất bại'))
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-slate-800">Danh mục chuẩn</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((t) => <button key={t.key} className={`px-3 py-2 text-xs rounded-lg border ${tab === t.key ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-slate-300 text-slate-700 bg-white'}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {error && <div className="border border-red-300 bg-red-50 text-red-700 p-2 rounded text-xs mb-3">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 space-y-2">
          {Object.keys(payload).map((key) => {
            if (key === 'isActive' || key === 'logoFile') return null
            return (
              <div key={key}>
                <label className="block text-[11px] text-slate-600 mb-1">{fieldLabels[key] || key}</label>
                <input
                  className="w-full border border-slate-300 p-2 rounded text-xs"
                  placeholder={fieldLabels[key] || key}
                  value={payload[key]}
                  onChange={(e) => setPayload((p) => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            )
          })}

          {tab === 'brands' && (
            <div className="space-y-2">
              <label className="block text-[11px] text-slate-600">Logo thương hiệu</label>
              <div className="flex items-center gap-2">
                <button type="button" className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100" onClick={() => logoInputRef.current?.click()}>
                  Chọn ảnh logo
                </button>
                <span className="text-xs text-slate-500 truncate">{payload.logoFile?.name || 'Chưa chọn ảnh'}</span>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPayload((p) => ({ ...p, logoFile: e.target.files?.[0] || null }))} />
            </div>
          )}

          <label className="text-xs flex items-center gap-2 text-slate-700"><input type="checkbox" checked={payload.isActive} onChange={(e) => setPayload((p) => ({ ...p, isActive: e.target.checked }))} /> Kích hoạt</label>
          <button className="border border-slate-300 px-3 py-2 text-xs rounded-lg hover:bg-slate-50" onClick={create}>Tạo mới</button>
        </div>

        <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-4 max-h-[32rem] overflow-auto space-y-2">
          {items.map((it) => (
            <div key={it.id} className="border border-slate-200 p-2 text-xs flex items-center justify-between rounded">
              <span className="text-slate-700">{it.name} ({it.code}) - dùng: {it.usageCount}</span>
              <button className="text-blue-600" onClick={() => api.setActive(it.id, !it.active).then(load)}>{it.active ? 'Vô hiệu hóa' : 'Kích hoạt'}</button>
            </div>
          ))}
          {!items.length && <div className="text-xs text-slate-500">Chưa có dữ liệu</div>}
        </div>
      </div>
    </div>
  )
}
