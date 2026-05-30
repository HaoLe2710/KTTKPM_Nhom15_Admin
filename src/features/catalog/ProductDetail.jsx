import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { catalogMetadataApi, productsApi, promotionsApi, variantsApi } from '../../lib/adminCatalogApi'
import { extractApiErrorDetails } from '../../lib/errors'
import { getCurrentRole } from '../../lib/auth'

const emptyForm = { typeId: '', name: '', slug: '', descriptionMd: '', shortDescription: '', brandId: '', isCustomizable: false, isActive: true, ingredientIds: [], skinTypeIds: [], concernIds: [], tagIds: [] }
const emptyVariant = { sku: '', price: 0, stockQuantity: 0, isActive: true, options: [] }
const toList = (res) => (Array.isArray(res) ? res : (res?.content || []))

function slugify (s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function toggleId (arr, id) { return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] }
function translateValidationMessage (raw) {
  const s = String(raw || '')
  const lower = s.toLowerCase()
  if (lower.includes('must not be blank')) return 'không được để trống'
  if (lower.includes('must not be null')) return 'không được để trống'
  if (lower.includes('size must be between')) return 'độ dài không hợp lệ'
  if (lower.includes('must be greater than or equal to 0')) return 'phải lớn hơn hoặc bằng 0'
  return s
}
function translateFieldName (raw) {
  const f = String(raw || '')
  const map = {
    typeId: 'Loại sản phẩm',
    name: 'Tên sản phẩm',
    slug: 'Slug',
    brandId: 'Thương hiệu',
    descriptionMd: 'Mô tả chi tiết',
    shortDescription: 'Mô tả ngắn',
    isCustomizable: 'Tùy biến',
    isActive: 'Trạng thái',
    sku: 'SKU',
    price: 'Giá bán',
    stockQuantity: 'Tồn kho'
  }
  if (map[f]) return map[f]
  if (f.includes('variants[0].sku')) return 'SKU biến thể đầu tiên'
  if (f.includes('variants[0].price')) return 'Giá biến thể đầu tiên'
  if (f.includes('variants[0].stockQuantity')) return 'Tồn kho biến thể đầu tiên'
  return f
}
function prettyFieldError (line) {
  const [left, ...rest] = String(line || '').split(':')
  if (!rest.length) return translateValidationMessage(line)
  const field = translateFieldName(left.trim())
  const msg = translateValidationMessage(rest.join(':').trim())
  return `${field}: ${msg}`
}
function codePart (s, max = 4) {
  const cleaned = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return cleaned.slice(0, max) || 'NA'
}
function buildSku ({ brandCode, typeCode, productName, optionCodes, serial }) {
  const nameCode = codePart(slugify(productName).replace(/-/g, ''), 4)
  const optionPart = optionCodes.length ? optionCodes.map((x) => codePart(x, 3)).join('') : 'STD'
  const serialPart = String(serial).padStart(3, '0')
  return `${codePart(brandCode)}-${codePart(typeCode)}-${nameCode}-${optionPart}-${serialPart}`
}

const PRODUCT_DISCOUNT_TYPE = 'PRODUCT_DISCOUNT'
const DAY_IN_MS = 24 * 60 * 60 * 1000

function formatPrice (value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`
}

function toDateTimeInputValue (date) {
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toLocalDateTimePayload (value) {
  return value && value.length === 16 ? `${value}:00` : value
}

function defaultPromotionDraft (productName = '') {
  const now = new Date()
  return {
    code: '',
    name: productName ? `Khuyến mãi ${productName}` : 'Khuyến mãi sản phẩm',
    discountMode: 'PERCENT',
    discountValue: 10,
    startDate: toDateTimeInputValue(now),
    endDate: toDateTimeInputValue(new Date(now.getTime() + 7 * DAY_IN_MS)),
    usageLimit: '',
    variantIds: []
  }
}

function promotionVariantIds (promotion) {
  const ids = promotion?.config?.variantIds
  return Array.isArray(ids) ? ids.map((id) => String(id)) : []
}

function promotionAppliesToProduct (promotion, variants = []) {
  const productVariantIds = new Set(variants.map((variant) => String(variant.id)))
  return promotionVariantIds(promotion).some((variantId) => productVariantIds.has(variantId))
}

function discountLabelOf (promotion) {
  const percent = promotion?.config?.discountPercent
  if (percent !== undefined && percent !== null) return `-${Number(percent)}%`
  const amount = promotion?.config?.discountAmount
  return amount !== undefined && amount !== null ? `-${formatPrice(amount)}` : 'Đang giảm'
}

function MultiSelectChecklist ({ title, items, values, onChange }) {
  return (
    <div className="border border-slate-200 p-3 bg-white rounded-lg">
      <div className="text-xs text-slate-800 font-semibold">{title}</div>
      <div className="mb-2"></div>
      <div className="max-h-28 overflow-auto space-y-1">
        {items.map((it) => (
          <label key={it.id} className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={values.includes(it.id)} onChange={() => onChange(toggleId(values, it.id))} />
            <span>{it.name} ({it.code})</span>
          </label>
        ))}
        {!items.length && <div className="text-xs text-slate-500">Chưa có dữ liệu</div>}
      </div>
    </div>
  )
}

function VariantEditor ({ draft, setDraft, options, optionValues, onSubmit, submitLabel, skuPreview }) {
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [selectedValueId, setSelectedValueId] = useState('')

  const valuesForOption = optionValues.filter((v) => v.optionId === selectedOptionId)

  const addOptionPair = () => {
    if (!selectedOptionId || !selectedValueId) return
    if (draft.options.some((x) => x.optionId === selectedOptionId)) return
    setDraft((p) => ({ ...p, options: [...p.options, { optionId: selectedOptionId, valueId: selectedValueId }] }))
    setSelectedOptionId('')
    setSelectedValueId('')
  }

  const removeOptionPair = (optionId) => {
    setDraft((p) => ({ ...p, options: p.options.filter((x) => x.optionId !== optionId) }))
  }

  const optionName = (id) => options.find((o) => o.id === id)?.name || id
  const valueName = (id) => optionValues.find((v) => v.id === id)?.value || id

  return (
    <div className="border border-blue-200 p-3 space-y-2 bg-blue-50/40 rounded-lg">
      <div className="text-xs font-bold text-blue-700">Thông tin biến thể</div>
      <div>
        <label className="block text-[11px] text-slate-600 mb-1">SKU (tự sinh)</label>
        <input className="w-full bg-slate-100 border border-slate-300 p-2 text-xs rounded" placeholder="SKU tự sinh" value={skuPreview || ''} disabled readOnly />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-slate-600 mb-1">Giá bán</label>
          <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" type="number" min="0" value={draft.price} onChange={(e) => setDraft((p) => ({ ...p, price: Number(e.target.value) || 0 }))} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-600 mb-1">Tồn kho</label>
          <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" type="number" min="0" value={draft.stockQuantity} onChange={(e) => setDraft((p) => ({ ...p, stockQuantity: Number(e.target.value) || 0 }))} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select className="bg-white border border-slate-300 p-2 text-xs rounded" value={selectedOptionId} onChange={(e) => { setSelectedOptionId(e.target.value); setSelectedValueId('') }}>
          <option value="">Chọn nhóm tùy chọn</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select className="bg-white border border-slate-300 p-2 text-xs rounded" value={selectedValueId} onChange={(e) => setSelectedValueId(e.target.value)}>
          <option value="">Chọn giá trị</option>
          {valuesForOption.map((v) => <option key={v.id} value={v.id}>{v.value}</option>)}
        </select>
        <button className="border border-slate-300 px-2 py-1 text-xs rounded hover:bg-slate-50" onClick={addOptionPair}>Thêm tùy chọn</button>
      </div>

      <div className="space-y-1">
        {draft.options.map((x) => (
          <div key={x.optionId} className="text-xs border border-slate-200 p-2 rounded flex justify-between items-center">
            <span>{optionName(x.optionId)}: {valueName(x.valueId)}</span>
            <button className="text-red-600" onClick={() => removeOptionPair(x.optionId)}>Xóa</button>
          </div>
        ))}
        {!draft.options.length && <div className="text-xs text-slate-500">Chưa chọn tùy chọn biến thể</div>}
      </div>

      <button className="border border-slate-300 px-3 py-2 text-xs rounded hover:bg-slate-50" onClick={onSubmit}>{submitLabel}</button>
    </div>
  )
}

export default function ProductDetail () {
  const { id } = useParams()
  const isNew = id === 'new'
  const canEdit = getCurrentRole() === 'ADMIN'

  const [form, setForm] = useState(emptyForm)
  const [newVariant, setNewVariant] = useState(emptyVariant)
  const [addVariantDraft, setAddVariantDraft] = useState(emptyVariant)
  const [quickTypeName, setQuickTypeName] = useState('')
  const [quickBrandName, setQuickBrandName] = useState('')

  const [product, setProduct] = useState(null)
  const [media, setMedia] = useState([])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [productPromotions, setProductPromotions] = useState([])
  const [promotionDraft, setPromotionDraft] = useState(defaultPromotionDraft())
  const [promotionSaving, setPromotionSaving] = useState(false)

  const [meta, setMeta] = useState({ productTypes: [], brands: [], ingredients: [], skinTypes: [], concerns: [], tags: [], options: [], optionValues: [] })

  const variantPayloadBase = useMemo(() => ({ sku: '', price: 0, stockQuantity: 0, isActive: true, options: [] }), [])
  const nextSerial = (product?.variants?.length || 0) + 1
  const currentBrand = meta.brands.find((x) => x.id === form.brandId)
  const currentType = meta.productTypes.find((x) => (x.id || x.code) === form.typeId)
  const optionCodeById = (id) => meta.options.find((x) => x.id === id)?.code || meta.options.find((x) => x.id === id)?.name || id
  const skuForVariant = (variantDraft, serial) => buildSku({
    brandCode: currentBrand?.code || currentBrand?.name || 'BR',
    typeCode: currentType?.code || currentType?.name || 'TP',
    productName: form.name || form.slug || 'product',
    optionCodes: (variantDraft.options || []).map((x) => optionCodeById(x.optionId)),
    serial
  })
  const createVariantSkuPreview = skuForVariant(newVariant, 1)
  const addVariantSkuPreview = skuForVariant(addVariantDraft, nextSerial)

  const fileInputRef = useRef(null)

  const handleApiError = (err, fallback) => {
    const parsed = extractApiErrorDetails(err, fallback)
    setError(parsed.summary)
    setFieldErrors(parsed.fieldErrors)
  }

  const loadMetadata = async () => {
    const [productTypes, brands, ingredients, skinTypes, concerns, tags, options, optionValues] = await Promise.all([
      catalogMetadataApi.productTypes({ page: 0, size: 100, sort: 'name,asc' }).catch(() => ({ content: [] })),
      catalogMetadataApi.brands({ page: 0, size: 100, sort: 'name,asc' }).catch(() => ({ content: [] })),
      catalogMetadataApi.ingredients({ page: 0, size: 100, sort: 'name,asc' }).catch(() => ({ content: [] })),
      catalogMetadataApi.skinTypes({ page: 0, size: 100, sort: 'name,asc' }).catch(() => ({ content: [] })),
      catalogMetadataApi.concerns({ page: 0, size: 100, sort: 'name,asc' }).catch(() => ({ content: [] })),
      catalogMetadataApi.tags({ page: 0, size: 100, sort: 'name,asc' }).catch(() => ({ content: [] })),
      catalogMetadataApi.options({ page: 0, size: 100, sort: 'name,asc' }).catch(() => ({ content: [] })),
      catalogMetadataApi.optionValues({ page: 0, size: 100, sort: 'sortOrder,asc' }).catch(() => ({ content: [] }))
    ])

    setMeta({
      productTypes: toList(productTypes), brands: toList(brands), ingredients: toList(ingredients), skinTypes: toList(skinTypes), concerns: toList(concerns), tags: toList(tags),
      options: toList(options), optionValues: toList(optionValues)
    })
  }

  const loadDetail = async () => {
    if (isNew) return
    try {
      setLoading(true)
      const [detail, mediaList, activePromotions] = await Promise.all([
        productsApi.detail(id),
        productsApi.mediaList(id).catch(() => []),
        promotionsApi.active({ type: PRODUCT_DISCOUNT_TYPE }).catch(() => [])
      ])
      const variants = detail?.variants || []
      setProduct(detail)
      setMedia(Array.isArray(mediaList) ? mediaList : [])
      setProductPromotions(toList(activePromotions).filter((promotion) => promotionAppliesToProduct(promotion, variants)))
      setPromotionDraft((previousDraft) => {
        const validVariantIds = new Set(variants.map((variant) => String(variant.id)))
        const selectedVariantIds = previousDraft.variantIds.filter((variantId) => validVariantIds.has(String(variantId)))
        return {
          ...previousDraft,
          name: previousDraft.name || defaultPromotionDraft(detail.name).name,
          variantIds: selectedVariantIds.length ? selectedVariantIds : variants.filter((variant) => variant.active !== false).map((variant) => variant.id)
        }
      })
      setForm({
        typeId: detail.typeId || '', name: detail.name || '', slug: detail.slug || '', descriptionMd: detail.descriptionMd || '', shortDescription: detail.shortDescription || '',
        brandId: detail.brandId || '', isCustomizable: !!detail.customizable, isActive: !!detail.active,
        ingredientIds: (detail.ingredients || []).map((x) => x.id), skinTypeIds: (detail.skinTypes || []).map((x) => x.id), concernIds: (detail.concerns || []).map((x) => x.id), tagIds: (detail.tags || []).map((x) => x.id)
      })
    } catch (err) {
      handleApiError(err, 'Không tải được chi tiết sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMetadata() }, [])
  useEffect(() => { loadDetail() }, [id])

  useEffect(() => {
    setForm((prev) => ({ ...prev, slug: slugify(prev.name) }))
  }, [form.name])

  const save = async () => {
    if (!canEdit) return
    try {
      setError('')
      setFieldErrors([])
      const payload = { ...form, ingredientIds: form.ingredientIds || [], skinTypeIds: form.skinTypeIds || [], concernIds: form.concernIds || [], tagIds: form.tagIds || [] }

      if (isNew) {
        await productsApi.create({
          ...payload,
          variants: [{
            ...newVariant,
            sku: createVariantSkuPreview,
            price: Number(newVariant.price) || 0,
            stockQuantity: Number(newVariant.stockQuantity) || 0,
            isActive: true
          }]
        })
        setError('Tạo sản phẩm thành công')
      } else {
        await productsApi.update(id, payload)
        await loadDetail()
      }
    } catch (err) {
      handleApiError(err, 'Lưu sản phẩm thất bại')
    }
  }

  const createQuickType = async () => {
    if (!canEdit) return
    try {
      setError(''); setFieldErrors([])
      const name = quickTypeName.trim()
      if (!name) return setFieldErrors(['type.name: must not be blank'])
      await catalogMetadataApi.createProductType({ code: slugify(name), name, isActive: true })
      setQuickTypeName('')
      await loadMetadata()
    } catch (err) {
      handleApiError(err, 'Tạo loại sản phẩm thất bại')
    }
  }

  const createQuickBrand = async () => {
    if (!canEdit) return
    try {
      setError(''); setFieldErrors([])
      const name = quickBrandName.trim()
      if (!name) return setFieldErrors(['brand.name: must not be blank'])
      const code = slugify(name)
      const fd = new FormData()
      fd.append('code', code)
      fd.append('name', name)
      fd.append('slug', code)
      fd.append('description', '')
      fd.append('isActive', 'true')
      await catalogMetadataApi.createBrandMultipart(fd)
      setQuickBrandName('')
      await loadMetadata()
    } catch (err) {
      handleApiError(err, 'Tạo thương hiệu thất bại')
    }
  }

  const addVariant = async () => {
    if (!canEdit) return
    if (isNew) return setError('Vui lòng tạo sản phẩm trước khi thêm biến thể')
    try {
      setError(''); setFieldErrors([])
      await variantsApi.create({ ...variantPayloadBase, ...addVariantDraft, sku: addVariantSkuPreview, productId: id, price: Number(addVariantDraft.price) || 0, stockQuantity: Number(addVariantDraft.stockQuantity) || 0 })
      setAddVariantDraft(emptyVariant)
      await loadDetail()
    } catch (err) {
      handleApiError(err, 'Tạo biến thể thất bại')
    }
  }

  const togglePromotionVariant = (variantId) => {
    setPromotionDraft((previousDraft) => ({
      ...previousDraft,
      variantIds: toggleId(previousDraft.variantIds, variantId)
    }))
  }

  const createProductPromotion = async () => {
    if (!canEdit) return
    if (isNew) return setError('Vui lòng tạo sản phẩm trước khi thêm khuyến mãi')
    if (!promotionDraft.variantIds.length) return setFieldErrors(['promotion.variantIds: chọn ít nhất một biến thể'])

    const discountValue = Number(promotionDraft.discountValue)
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return setFieldErrors(['promotion.discountValue: giá trị giảm phải lớn hơn 0'])
    }
    if (promotionDraft.discountMode === 'PERCENT' && discountValue > 100) {
      return setFieldErrors(['promotion.discountValue: phần trăm giảm không được vượt quá 100'])
    }
    if (!promotionDraft.startDate || !promotionDraft.endDate) {
      return setFieldErrors(['promotion.date: thời gian khuyến mãi không được để trống'])
    }

    const fallbackCode = `SALE-${slugify(form.name || product?.name || 'product')}-${Date.now().toString().slice(-6)}`
    const config = {
      variantIds: promotionDraft.variantIds
    }
    if (promotionDraft.discountMode === 'PERCENT') {
      config.discountPercent = discountValue
    } else {
      config.discountAmount = discountValue
    }

    try {
      setPromotionSaving(true)
      setError('')
      setFieldErrors([])
      await promotionsApi.create({
        code: (promotionDraft.code || fallbackCode).trim().toUpperCase(),
        name: (promotionDraft.name || `Khuyến mãi ${form.name || product?.name || 'sản phẩm'}`).trim(),
        type: PRODUCT_DISCOUNT_TYPE,
        config,
        startDate: toLocalDateTimePayload(promotionDraft.startDate),
        endDate: toLocalDateTimePayload(promotionDraft.endDate),
        usageLimit: promotionDraft.usageLimit === '' ? null : Number(promotionDraft.usageLimit),
        active: true
      })
      setPromotionDraft(defaultPromotionDraft(form.name || product?.name || ''))
      setError('Đã tạo khuyến mãi sản phẩm thành công')
      await loadDetail()
    } catch (err) {
      handleApiError(err, 'Tạo khuyến mãi sản phẩm thất bại')
    } finally {
      setPromotionSaving(false)
    }
  }

  const deactivateProductPromotion = async (promotionId) => {
    if (!canEdit) return
    try {
      setError('')
      setFieldErrors([])
      await promotionsApi.deactivate(promotionId)
      await loadDetail()
    } catch (err) {
      handleApiError(err, 'Ngừng khuyến mãi thất bại')
    }
  }

  const onUpload = async (file) => {
    if (!canEdit) return
    if (!file || isNew) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'IMAGE')
    fd.append('primary', 'false')
    try {
      await productsApi.uploadMedia(id, fd)
      await loadDetail()
    } catch (err) {
      handleApiError(err, 'Tải ảnh thất bại')
    }
  }

  const optionName = (id) => meta.options.find((o) => o.id === id)?.name || id
  const valueName = (id) => meta.optionValues.find((v) => v.id === id)?.value || id
  const imageMedia = media.filter((m) => m.type === 'IMAGE' && m.url)

  const openViewer = (index) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }

  const prevImage = () => {
    if (!imageMedia.length) return
    setViewerIndex((p) => (p - 1 + imageMedia.length) % imageMedia.length)
  }

  const nextImage = () => {
    if (!imageMedia.length) return
    setViewerIndex((p) => (p + 1) % imageMedia.length)
  }

  const deleteImage = async (mediaId) => {
    if (!canEdit) return
    try {
      await productsApi.deleteMedia(id, mediaId)
      await loadDetail()
    } catch (err) {
      handleApiError(err, 'Xóa ảnh thất bại')
    }
  }

  const togglePrimaryInViewer = async () => {
    if (!canEdit) return
    if (!imageMedia.length) return
    const current = imageMedia[viewerIndex]
    if (!current) return

    try {
      setError('')
      setFieldErrors([])
      if (!current.primary) {
        await productsApi.setPrimaryMedia(id, current.id)
        await loadDetail()
        return
      }

      const candidateIndex = imageMedia.findIndex((m, idx) => idx !== viewerIndex)
      if (candidateIndex < 0) {
        setError('Không thể gỡ ảnh chính khi sản phẩm chỉ có một ảnh.')
        return
      }
      const candidate = imageMedia[candidateIndex]
      await productsApi.setPrimaryMedia(id, candidate.id)
      await loadDetail()
      setViewerIndex(candidateIndex)
    } catch (err) {
      handleApiError(err, 'Cập nhật ảnh chính thất bại')
    }
  }

  useEffect(() => {
    if (!imageMedia.length) {
      setViewerOpen(false)
      setViewerIndex(0)
      return
    }
    if (viewerIndex >= imageMedia.length) setViewerIndex(imageMedia.length - 1)
  }, [imageMedia.length, viewerIndex])

  useEffect(() => {
    if (viewerOpen) {
      document.body.classList.add('image-viewer-open')
    } else {
      document.body.classList.remove('image-viewer-open')
    }

    return () => {
      document.body.classList.remove('image-viewer-open')
    }
  }, [viewerOpen])

  if (isNew && !canEdit) {
    return (
      <div className="w-full max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-6">
        <h1 className="text-xl font-bold text-slate-800 mb-2">Không có quyền tạo sản phẩm</h1>
        <p className="text-sm text-slate-600 mb-4">Tài khoản STAFF chỉ có thể xem thông tin sản phẩm.</p>
        <Link to="/products" className="text-blue-700 text-sm font-semibold hover:underline">Quay lại danh sách sản phẩm</Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-slate-800">{isNew ? 'Tạo sản phẩm' : 'Chi tiết sản phẩm'}</h1>
        <div className="flex gap-2">
          <Link to="/products" className="border border-slate-300 px-3 py-2 rounded-lg text-xs">Quay lại</Link>
          {canEdit && <button className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold" onClick={save}>Lưu sản phẩm</button>}
        </div>
      </div>

      {error && <div className="border border-red-300 bg-red-50 text-red-700 p-2 rounded text-xs mb-3">{error}</div>}
      {!!fieldErrors.length && <ul className="border border-red-300 bg-red-50 text-red-700 p-3 text-xs mb-4 list-disc pl-5 rounded">{fieldErrors.map((e, i) => <li key={i}>{prettyFieldError(e)}</li>)}</ul>}
      {loading && <div className="mb-4 text-xs text-slate-500">Đang tải dữ liệu...</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-slate-200 p-4 space-y-3 bg-white rounded-xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Loại sản phẩm</label>
              <select className="w-full bg-white border border-slate-300 p-2 text-xs rounded" value={form.typeId} onChange={(e) => setForm((p) => ({ ...p, typeId: e.target.value }))}><option value="">Chọn loại sản phẩm</option>{meta.productTypes.map((x) => <option key={x.id || x.code} value={x.id || x.code}>{x.name || x.code}</option>)}</select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Thương hiệu</label>
              <select className="w-full bg-white border border-slate-300 p-2 text-xs rounded" value={form.brandId} onChange={(e) => setForm((p) => ({ ...p, brandId: e.target.value }))}><option value="">Chọn thương hiệu</option>{meta.brands.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            </div>
          </div>

          {isNew && canEdit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-slate-200 p-3 bg-slate-50 rounded-lg">
              <div className="space-y-2"><div className="text-xs text-blue-700 font-semibold">Tạo nhanh loại sản phẩm</div><input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" placeholder="Ví dụ: Sữa rửa mặt" value={quickTypeName} onChange={(e) => setQuickTypeName(e.target.value)} /><button className="border border-slate-300 px-2 py-1 text-xs rounded" onClick={createQuickType}>Tạo loại</button></div>
              <div className="space-y-2"><div className="text-xs text-blue-700 font-semibold">Tạo nhanh thương hiệu</div><input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" placeholder="Ví dụ: CeraVe" value={quickBrandName} onChange={(e) => setQuickBrandName(e.target.value)} /><button className="border border-slate-300 px-2 py-1 text-xs rounded" onClick={createQuickBrand}>Tạo thương hiệu</button></div>
            </div>
          )}

          <div>
            <label className="block text-[11px] text-slate-600 mb-1">Tên sản phẩm</label>
            <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" placeholder="Nhập tên sản phẩm" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 mb-1">Slug (tự sinh theo tên)</label>
            <input className="w-full bg-slate-100 border border-slate-300 p-2 text-xs rounded" placeholder="slug-tu-dong" value={form.slug} readOnly disabled />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 mb-1">Mô tả ngắn</label>
            <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" placeholder="Mô tả ngắn hiển thị trên danh sách sản phẩm" value={form.shortDescription} onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[11px] text-slate-600 mb-1">Mô tả chi tiết</label>
            <textarea className="w-full bg-white border border-slate-300 p-2 text-xs min-h-28 rounded" placeholder="Nội dung mô tả chi tiết (markdown)" value={form.descriptionMd} onChange={(e) => setForm((p) => ({ ...p, descriptionMd: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <MultiSelectChecklist title="Thành phần" items={meta.ingredients} values={form.ingredientIds} onChange={(next) => setForm((p) => ({ ...p, ingredientIds: next }))} />
            <MultiSelectChecklist title="Loại da" items={meta.skinTypes} values={form.skinTypeIds} onChange={(next) => setForm((p) => ({ ...p, skinTypeIds: next }))} />
            <MultiSelectChecklist title="Vấn đề da" items={meta.concerns} values={form.concernIds} onChange={(next) => setForm((p) => ({ ...p, concernIds: next }))} />
            <MultiSelectChecklist title="Nhãn" items={meta.tags} values={form.tagIds} onChange={(next) => setForm((p) => ({ ...p, tagIds: next }))} />
          </div>

          {isNew && canEdit && <VariantEditor draft={newVariant} setDraft={setNewVariant} options={meta.options} optionValues={meta.optionValues} onSubmit={() => {}} submitLabel="Biến thể này sẽ dùng khi tạo sản phẩm" skuPreview={createVariantSkuPreview} />}
        </div>

        <div className="border border-slate-200 p-4 bg-white rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-bold text-slate-700">Biến thể ({product?.variants?.length || 0})</h2></div>
          {!isNew && canEdit && <VariantEditor draft={addVariantDraft} setDraft={setAddVariantDraft} options={meta.options} optionValues={meta.optionValues} onSubmit={addVariant} submitLabel="Tạo biến thể" skuPreview={addVariantSkuPreview} />}

          <div className="space-y-2 mb-4">
            {(product?.variants || []).map((v) => {
              const variantPromotions = productPromotions.filter((promotion) => promotionVariantIds(promotion).includes(String(v.id)))
              return (
                <div key={v.id} className="border border-slate-200 p-2 text-xs rounded">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-700">{v.sku} | {formatPrice(v.price)} | tồn {v.stockQuantity}</span>
                    {canEdit && <button className="text-blue-600" onClick={() => variantsApi.setActive(v.id, !v.active).then(loadDetail)}>{v.active ? 'Ngừng bán' : 'Bật bán lại'}</button>}
                  </div>
                  {!!variantPromotions.length && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {variantPromotions.map((promotion) => (
                        <span key={promotion.id} className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
                          {promotion.code} {discountLabelOf(promotion)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 text-slate-500">
                    {(v.options || []).map((op, idx) => <div key={idx}>{optionName(op.optionId)}: {optionName(op.optionId) && op.optionValueLabel ? op.optionValueLabel : valueName(op.optionValueId || op.valueId)}</div>)}
                  </div>
                </div>
              )
            })}
            {!product?.variants?.length && <div className="text-xs text-slate-500">Chưa có biến thể</div>}
          </div>

          {!isNew && canEdit && (
            <div className="border border-rose-200 bg-rose-50/40 p-3 rounded-lg space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-700">Khuyến mãi sản phẩm</h2>
                {!!productPromotions.length && <span className="rounded-full bg-rose-600 px-2 py-1 text-[10px] font-semibold text-white">{productPromotions.length} đang chạy</span>}
              </div>

              <div className="space-y-2">
                {productPromotions.map((promotion) => (
                  <div key={promotion.id} className="rounded border border-rose-200 bg-white p-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800">{promotion.name}</div>
                        <div className="mt-1 text-slate-500">{promotion.code} · {discountLabelOf(promotion)} · đã dùng {promotion.usedCount ?? 0}{promotion.usageLimit ? `/${promotion.usageLimit}` : ''}</div>
                      </div>
                      <button type="button" className="text-rose-700" onClick={() => deactivateProductPromotion(promotion.id)}>Ngừng</button>
                    </div>
                  </div>
                ))}
                {!productPromotions.length && <div className="text-xs text-slate-500">Sản phẩm chưa có khuyến mãi đang hoạt động.</div>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Mã khuyến mãi</label>
                  <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded uppercase" placeholder="Tự sinh nếu bỏ trống" value={promotionDraft.code} onChange={(e) => setPromotionDraft((p) => ({ ...p, code: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Tên hiển thị</label>
                  <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" value={promotionDraft.name} onChange={(e) => setPromotionDraft((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Kiểu giảm</label>
                  <select className="w-full bg-white border border-slate-300 p-2 text-xs rounded" value={promotionDraft.discountMode} onChange={(e) => setPromotionDraft((p) => ({ ...p, discountMode: e.target.value }))}>
                    <option value="PERCENT">Giảm theo %</option>
                    <option value="FIXED">Giảm số tiền</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Giá trị giảm</label>
                  <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" type="number" min="0" value={promotionDraft.discountValue} onChange={(e) => setPromotionDraft((p) => ({ ...p, discountValue: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Bắt đầu</label>
                  <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" type="datetime-local" value={promotionDraft.startDate} onChange={(e) => setPromotionDraft((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Kết thúc</label>
                  <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" type="datetime-local" value={promotionDraft.endDate} onChange={(e) => setPromotionDraft((p) => ({ ...p, endDate: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-slate-600 mb-1">Giới hạn lượt dùng</label>
                  <input className="w-full bg-white border border-slate-300 p-2 text-xs rounded" type="number" min="1" placeholder="Không giới hạn nếu bỏ trống" value={promotionDraft.usageLimit} onChange={(e) => setPromotionDraft((p) => ({ ...p, usageLimit: e.target.value }))} />
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold text-slate-600">Biến thể áp dụng</div>
                <div className="max-h-32 overflow-auto space-y-1 rounded border border-rose-100 bg-white p-2">
                  {(product?.variants || []).map((variant) => (
                    <label key={variant.id} className="flex items-center gap-2 text-xs text-slate-700">
                      <input type="checkbox" checked={promotionDraft.variantIds.includes(variant.id)} onChange={() => togglePromotionVariant(variant.id)} />
                      <span>{variant.sku} · {formatPrice(variant.price)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="button" className="w-full rounded bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={promotionSaving || !(product?.variants || []).length} onClick={createProductPromotion}>
                {promotionSaving ? 'Đang tạo khuyến mãi...' : 'Tạo khuyến mãi cho sản phẩm'}
              </button>
            </div>
          )}

          <h2 className="text-sm font-bold mb-2 text-slate-700">Hình ảnh sản phẩm ({media.length})</h2>
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100" onClick={() => fileInputRef.current?.click()}>Chọn ảnh từ máy</button>
            <span className="text-xs text-slate-500">Định dạng khuyến nghị: JPG/PNG</span>
          </div>
          {!canEdit && <div className="text-xs text-amber-700">Tài khoản STAFF chỉ có quyền xem, không thể tạo/sửa/xóa sản phẩm.</div>}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => onUpload(e.target.files?.[0])} className="hidden" />

          <div className="space-y-2">
            {!!imageMedia.length && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {imageMedia.map((m, idx) => (
                  <div key={m.id} className="group relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 h-36">
                    <img src={m.url} alt={`media-${idx}`} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    {m.primary && <span className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full bg-emerald-500 text-white">Ảnh chính</span>}
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                      <div className="w-full p-2 flex items-center justify-center gap-2 whitespace-nowrap">
                        <button type="button" className="px-2 py-1 rounded bg-white text-slate-700 text-[10px] font-medium" onClick={() => openViewer(idx)}>Xem trước</button>
                        {canEdit && <button type="button" className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-medium" onClick={() => deleteImage(m.id)}>Xóa</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!!media.length && media.some((m) => m.type !== 'IMAGE') && (
              <div className="space-y-2">
                {media.filter((m) => m.type !== 'IMAGE').map((m) => (
                  <div key={m.id} className="border border-slate-200 rounded-lg p-2 flex items-center justify-between">
                    <span className="text-xs text-slate-600">{m.type}</span>
                    <div className="flex items-center gap-2">
                      {canEdit && <button type="button" className="text-blue-600 text-xs" onClick={() => productsApi.setPrimaryMedia(id, m.id).then(loadDetail)}>Đặt chính</button>}
                      {canEdit && <button type="button" className="text-red-600 text-xs" onClick={() => productsApi.deleteMedia(id, m.id).then(loadDetail)}>Xóa</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!media.length && <div className="text-xs text-slate-500">Chưa có hình ảnh</div>}
          </div>
        </div>
      </div>

      {viewerOpen && !!imageMedia.length && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl">
            <div className="p-4 border-b border-slate-200 grid grid-cols-3 items-center text-xs text-slate-600">
              <span>Xem ảnh sản phẩm</span>
              <span className="text-center font-semibold">{viewerIndex + 1} / {imageMedia.length}</span>
              <div className="text-right">
                <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-100" onClick={() => setViewerOpen(false)}>×</button>
              </div>
            </div>
            <div className="relative p-4 flex items-center justify-center bg-slate-100 min-h-[420px]">
              <button type="button" className="absolute left-4 top-1/2 -translate-y-1/2 px-3 py-2 border border-slate-300 rounded bg-white/90 text-sm" onClick={prevImage}>‹</button>
              <img src={imageMedia[viewerIndex]?.url} alt="preview" className="max-h-[70vh] w-auto object-contain rounded" />
              <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-2 border border-slate-300 rounded bg-white/90 text-sm" onClick={nextImage}>›</button>
            </div>
            {canEdit && (
              <div className="p-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  className={`px-3 py-2 rounded text-xs font-medium ${imageMedia[viewerIndex]?.primary ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-blue-600 text-white'}`}
                  onClick={togglePrimaryInViewer}
                >
                  {imageMedia[viewerIndex]?.primary ? 'Gỡ đặt chính' : 'Đặt làm ảnh chính'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
