import { useEffect, useState } from 'react'
import { catalogDefaultsApi, optionsApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'
import { defaultVariantOptionTemplates } from '../../constants/catalogDefaults'

export default function OptionsRegistry () {
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)
  const [values, setValues] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [defaultTemplates, setDefaultTemplates] = useState(defaultVariantOptionTemplates)
  const [newOption, setNewOption] = useState({ code: '', name: '' })
  const [newValue, setNewValue] = useState({ value: '', sortOrder: 0 })

  const mapDefaultOptionsPayload = (payload) => {
    const mapKey = {
      containerType: { code: 'container_type', name: 'Dạng bao bì' },
      volume: { code: 'volume', name: 'Dung tích' },
      weight: { code: 'weight', name: 'Khối lượng' },
      usageTime: { code: 'usage_time', name: 'Thời điểm sử dụng' },
      skinType: { code: 'skin_type', name: 'Loại da phù hợp' }
    }

    return Object.entries(mapKey)
      .map(([k, meta]) => ({
        code: meta.code,
        name: meta.name,
        values: Array.isArray(payload?.[k]) ? payload[k] : []
      }))
      .filter((x) => x.values.length > 0)
  }

  const loadDefaultOptions = async () => {
    try {
      const res = await catalogDefaultsApi.options()
      const mapped = mapDefaultOptionsPayload(res)
      if (mapped.length) setDefaultTemplates(mapped)
    } catch {
      setDefaultTemplates(defaultVariantOptionTemplates)
    }
  }

  const loadOptions = async () => {
    try {
      setLoading(true)
      const res = await optionsApi.list({ page: 0, size: 100, sort: 'name,asc' })
      const list = res.content || []
      setOptions(list)
      if (!selectedOption && list.length > 0) setSelectedOption(list[0])
    } catch (err) {
      setError(extractApiError(err, 'Không tải được danh sách tùy chọn'))
    } finally {
      setLoading(false)
    }
  }

  const loadValues = async (optionId) => {
    if (!optionId) return
    try {
      const res = await optionsApi.values({ optionId, page: 0, size: 100, sort: 'sortOrder,asc' })
      setValues(res.content || [])
    } catch (err) {
      setError(extractApiError(err, 'Không tải được giá trị tùy chọn'))
    }
  }

  useEffect(() => { loadOptions(); loadDefaultOptions() }, [])
  useEffect(() => { loadValues(selectedOption?.id) }, [selectedOption?.id])

  const createOption = async () => {
    try {
      await optionsApi.create({ code: newOption.code, name: newOption.name, isActive: true, values: [] })
      setNewOption({ code: '', name: '' })
      await loadOptions()
    } catch (err) {
      setError(extractApiError(err, 'Tạo tùy chọn thất bại'))
    }
  }

  const createValue = async () => {
    if (!selectedOption) return
    try {
      await optionsApi.createValue(selectedOption.id, { ...newValue, isActive: true })
      setNewValue({ value: '', sortOrder: 0 })
      await loadValues(selectedOption.id)
    } catch (err) {
      setError(extractApiError(err, 'Tạo giá trị thất bại'))
    }
  }

  const seedDefaultOptions = async () => {
    try {
      setError('')
      const existedCodes = new Set((options || []).map((x) => x.code))
      for (const template of defaultTemplates) {
        if (existedCodes.has(template.code)) continue
        await optionsApi.create({
          code: template.code,
          name: template.name,
          isActive: true,
          values: template.values.map((v, idx) => ({ value: v, sortOrder: idx, isActive: true }))
        })
      }
      await loadOptions()
    } catch (err) {
      setError(extractApiError(err, 'Áp dụng bộ tùy chọn mặc định thất bại'))
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5">
      <h1 className="text-3xl font-bold text-slate-800">Tùy chọn biến thể</h1>
      {error && <div className="border border-red-300 bg-red-50 text-red-700 p-2 rounded text-xs">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-slate-200 bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold mb-3 text-slate-700">Danh sách tùy chọn</h2>
          <button className="mb-3 border border-blue-300 text-blue-700 bg-blue-50 px-3 py-2 text-xs rounded-lg hover:bg-blue-100" onClick={seedDefaultOptions}>
            Áp dụng bộ tùy chọn mặc định
          </button>
          <div className="space-y-2 mb-3 max-h-96 overflow-auto">
            {loading ? <div className="text-xs text-slate-500">Đang tải...</div> : options.map((opt) => (
              <button key={opt.id} className={`w-full text-left border p-2 text-xs rounded ${selectedOption?.id === opt.id ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'}`} onClick={() => setSelectedOption(opt)}>
                <div className="text-slate-800">{opt.name} ({opt.code})</div>
                <div className="text-slate-500">Sử dụng: {opt.usageCount} | Số giá trị: {opt.valueCount}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-3">
            <label className="block text-[11px] text-slate-600">Mã tùy chọn (code)</label>
            <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" placeholder="Ví dụ: size" value={newOption.code} onChange={(e) => setNewOption((p) => ({ ...p, code: e.target.value }))} />
            <label className="block text-[11px] text-slate-600">Tên tùy chọn</label>
            <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" placeholder="Ví dụ: Dung tích" value={newOption.name} onChange={(e) => setNewOption((p) => ({ ...p, name: e.target.value }))} />
            <button className="border border-slate-300 px-3 py-2 text-xs rounded-lg hover:bg-slate-50" onClick={createOption}>Tạo tùy chọn</button>
          </div>
        </div>

        <div className="lg:col-span-2 border border-slate-200 bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold mb-3 text-slate-700">Giá trị của tùy chọn {selectedOption ? `- ${selectedOption.name}` : ''}</h2>
          <div className="space-y-2 mb-3 max-h-96 overflow-auto">
            {values.map((v) => (
              <div key={v.id} className="border border-slate-200 p-2 text-xs flex items-center justify-between rounded">
                <span className="text-slate-700">{v.value} | Thứ tự: {v.sortOrder} | Sử dụng: {v.usageCount}</span>
                <button className="text-blue-600" onClick={() => optionsApi.setValueActive(v.id, !v.active).then(() => loadValues(selectedOption.id))}>{v.active ? 'Vô hiệu hóa' : 'Kích hoạt'}</button>
              </div>
            ))}
            {values.length === 0 && <div className="text-xs text-slate-500">Chưa có giá trị</div>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-t border-slate-200 pt-3">
            <input className="bg-white border border-slate-300 p-2 text-xs rounded" placeholder="Giá trị (ví dụ: 100ml)" value={newValue.value} onChange={(e) => setNewValue((p) => ({ ...p, value: e.target.value }))} />
            <input className="bg-white border border-slate-300 p-2 text-xs rounded" type="number" placeholder="Thứ tự hiển thị" value={newValue.sortOrder} onChange={(e) => setNewValue((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))} />
            <button className="border border-slate-300 px-3 py-2 text-xs rounded-lg hover:bg-slate-50" onClick={createValue}>Thêm giá trị</button>
          </div>
        </div>
      </div>
    </div>
  )
}
