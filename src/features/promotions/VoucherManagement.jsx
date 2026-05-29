import { useEffect, useMemo, useState } from 'react'
import { promotionsApi, usersApi } from '../../lib/adminCatalogApi'
import { extractApiError } from '../../lib/errors'

const ORDER_DISCOUNT_TYPE = 'ORDER_DISCOUNT'

const pad = (value) => String(value).padStart(2, '0')

const toInputDateTime = (date) => {
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

const toLocalDateTimePayload = (value) => {
  if (!value) return value
  return value.length === 16 ? `${value}:00` : value
}

const defaultVoucherForm = () => {
  const start = new Date()
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  return {
    code: '',
    name: 'Voucher hóa đơn',
    discountMode: 'PERCENT',
    discountValue: 10,
    maxDiscountAmount: '',
    minOrderValue: 0,
    startDate: toInputDateTime(start),
    endDate: toInputDateTime(end),
    usageLimit: '',
    active: true,
    targetCustomerIds: []
  }
}

const toList = (value) => Array.isArray(value) ? value : []

const discountLabelOf = (promotion) => {
  const percent = promotion?.config?.discountPercent
  if (percent !== undefined && percent !== null) return `Giảm ${Number(percent)}%`
  const amount = promotion?.config?.discountAmount
  if (amount !== undefined && amount !== null) return `Giảm ${Number(amount).toLocaleString('vi-VN')}đ`
  return 'Voucher'
}

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`

const resolveTargetCustomerIds = (promotion) => {
  const config = promotion?.config || {}
  return toList(config.targetCustomerIds || config.customerIds || config.targetUserIds)
    .map((id) => String(id || '').trim())
    .filter(Boolean)
}

const mapPromotionToForm = (promotion) => {
  const config = promotion?.config || {}
  const isPercent = config.discountPercent !== undefined && config.discountPercent !== null

  return {
    code: promotion?.code || '',
    name: promotion?.name || '',
    discountMode: isPercent ? 'PERCENT' : 'FIXED',
    discountValue: isPercent ? config.discountPercent : config.discountAmount,
    maxDiscountAmount: config.maxDiscountAmount ?? '',
    minOrderValue: config.minOrderValue ?? 0,
    startDate: toInputDateTime(promotion?.startDate),
    endDate: toInputDateTime(promotion?.endDate),
    usageLimit: promotion?.usageLimit ?? '',
    active: Boolean(promotion?.active),
    targetCustomerIds: resolveTargetCustomerIds(promotion)
  }
}

export default function VoucherManagement () {
  const [vouchers, setVouchers] = useState([])
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState(defaultVoucherForm)
  const [editingId, setEditingId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customerKeyword, setCustomerKeyword] = useState('')
  const [error, setError] = useState('')

  const customerById = useMemo(() => {
    const entries = customers.map((customer) => [customer.id, customer])
    return new Map(entries)
  }, [customers])

  const filteredCustomers = useMemo(() => {
    const keyword = customerKeyword.trim().toLowerCase()
    const source = customers.filter((customer) => String(customer.role || '').toUpperCase() === 'CUSTOMER')
    if (!keyword) return source

    return source.filter((customer) =>
      [customer.fullName, customer.email, customer.phone]
        .some((value) => String(value || '').toLowerCase().includes(keyword))
    )
  }, [customerKeyword, customers])

  const loadVouchers = async () => {
    const response = await promotionsApi.list({ type: ORDER_DISCOUNT_TYPE })
    setVouchers(toList(response))
  }

  const loadCustomers = async () => {
    const firstPage = await usersApi.list({ page: 0, size: 100 })
    let content = toList(firstPage?.content)
    const totalPages = Number(firstPage?.totalPages || 1)

    for (let page = 1; page < totalPages; page += 1) {
      const nextPage = await usersApi.list({ page, size: 100 })
      content = content.concat(toList(nextPage?.content))
    }

    setCustomers(content)
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      await Promise.all([loadVouchers(), loadCustomers()])
    } catch (err) {
      setError(extractApiError(err, 'Không tải được danh sách voucher'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleCustomer = (customerId) => {
    setForm((previous) => {
      const nextIds = previous.targetCustomerIds.includes(customerId)
        ? previous.targetCustomerIds.filter((id) => id !== customerId)
        : [...previous.targetCustomerIds, customerId]

      return { ...previous, targetCustomerIds: nextIds }
    })
  }

  const buildPayload = () => {
    const discountValue = Number(form.discountValue)
    const minOrderValue = Number(form.minOrderValue || 0)
    const usageLimit = form.usageLimit === '' ? null : Number(form.usageLimit)
    const maxDiscountAmount = form.maxDiscountAmount === '' ? null : Number(form.maxDiscountAmount)

    if (!form.code.trim() || !form.name.trim()) throw new Error('Vui lòng nhập mã và tên voucher.')
    if (!Number.isFinite(discountValue) || discountValue <= 0) throw new Error('Giá trị giảm phải lớn hơn 0.')
    if (form.discountMode === 'PERCENT' && discountValue > 100) throw new Error('Phần trăm giảm không được vượt quá 100.')
    if (!Number.isFinite(minOrderValue) || minOrderValue < 0) throw new Error('Giá trị đơn tối thiểu không hợp lệ.')
    if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) throw new Error('Giới hạn lượt dùng phải là số nguyên dương.')
    if (maxDiscountAmount !== null && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)) throw new Error('Mức giảm tối đa không hợp lệ.')
    if (!form.startDate || !form.endDate || new Date(form.endDate) <= new Date(form.startDate)) throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu.')
    if (!form.targetCustomerIds.length) throw new Error('Voucher hóa đơn phải được gán cho ít nhất một khách hàng.')

    const config = {
      minOrderValue,
      targetCustomerIds: form.targetCustomerIds
    }

    if (form.discountMode === 'PERCENT') {
      config.discountPercent = discountValue
      if (maxDiscountAmount !== null) config.maxDiscountAmount = maxDiscountAmount
    } else {
      config.discountAmount = discountValue
    }

    return {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      type: ORDER_DISCOUNT_TYPE,
      config,
      startDate: toLocalDateTimePayload(form.startDate),
      endDate: toLocalDateTimePayload(form.endDate),
      usageLimit,
      active: form.active
    }
  }

  const saveVoucher = async () => {
    try {
      setSaving(true)
      setError('')
      const payload = buildPayload()
      if (editingId) {
        await promotionsApi.update(editingId, payload)
      } else {
        await promotionsApi.create(payload)
      }
      setEditingId('')
      setForm(defaultVoucherForm())
      await loadVouchers()
    } catch (err) {
      setError(extractApiError(err, err.message || 'Không lưu được voucher'))
    } finally {
      setSaving(false)
    }
  }

  const editVoucher = (promotion) => {
    setEditingId(promotion.id)
    setForm(mapPromotionToForm(promotion))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deactivateVoucher = async (promotionId) => {
    try {
      setError('')
      await promotionsApi.deactivate(promotionId)
      await loadVouchers()
    } catch (err) {
      setError(extractApiError(err, 'Không ngừng được voucher'))
    }
  }

  const deleteVoucher = async (promotionId) => {
    try {
      setError('')
      await promotionsApi.delete(promotionId)
      await loadVouchers()
    } catch (err) {
      setError(extractApiError(err, 'Không xóa được voucher. Voucher đã dùng sẽ không được xóa.'))
    }
  }

  const resetForm = () => {
    setEditingId('')
    setForm(defaultVoucherForm())
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Voucher hóa đơn</h1>
          <p className="mt-1 text-sm text-slate-500">Tạo voucher theo tổng đơn hàng và gán cho khách hàng được phép sử dụng.</p>
        </div>
        <button className="border border-slate-300 rounded-lg px-3 py-2 text-sm" onClick={loadData} disabled={loading}>
          {loading ? 'Đang tải...' : 'Tải lại'}
        </button>
      </div>

      {error && <div className="border border-red-300 bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
        <section className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">{editingId ? 'Sửa voucher' : 'Tạo voucher'}</h2>
            {editingId && <button className="text-xs font-semibold text-slate-500" onClick={resetForm}>Hủy sửa</button>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase" placeholder="Mã voucher" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Tên voucher" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.discountMode} onChange={(e) => setForm((p) => ({ ...p, discountMode: e.target.value, maxDiscountAmount: e.target.value === 'PERCENT' ? p.maxDiscountAmount : '' }))}>
              <option value="PERCENT">Giảm phần trăm</option>
              <option value="FIXED">Giảm tiền cố định</option>
            </select>
            <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm" type="number" min="0" value={form.discountValue} onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))} />
            <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm" type="number" min="0" placeholder="Đơn tối thiểu" value={form.minOrderValue} onChange={(e) => setForm((p) => ({ ...p, minOrderValue: e.target.value }))} />
            <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm disabled:bg-slate-100" type="number" min="0" placeholder="Giảm tối đa" disabled={form.discountMode !== 'PERCENT'} value={form.maxDiscountAmount} onChange={(e) => setForm((p) => ({ ...p, maxDiscountAmount: e.target.value }))} />
            <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm" type="datetime-local" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm" type="datetime-local" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
            <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm" type="number" min="1" placeholder="Giới hạn lượt dùng" value={form.usageLimit} onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))} />
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
              Đang active
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Khách hàng được dùng</label>
              <span className="text-xs text-slate-500">{form.targetCustomerIds.length} đã chọn</span>
            </div>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Tìm khách hàng" value={customerKeyword} onChange={(e) => setCustomerKeyword(e.target.value)} />
            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
              {filteredCustomers.map((customer) => (
                <label key={customer.id} className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50">
                  <input type="checkbox" className="mt-1" checked={form.targetCustomerIds.includes(customer.id)} onChange={() => toggleCustomer(customer.id)} />
                  <span>
                    <span className="block font-medium text-slate-700">{customer.fullName || customer.email}</span>
                    <span className="block text-xs text-slate-500">{customer.email} · {customer.phone || '-'}</span>
                  </span>
                </label>
              ))}
              {!filteredCustomers.length && <div className="px-3 py-4 text-sm text-slate-500">Không có khách hàng phù hợp</div>}
            </div>
          </div>

          <button className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50" onClick={saveVoucher} disabled={saving}>
            {saving ? 'Đang lưu...' : editingId ? 'Cập nhật voucher' : 'Tạo voucher'}
          </button>
        </section>

        <section className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-3">Danh sách voucher</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b">
                <tr>
                  <th className="py-2">Voucher</th>
                  <th>Giảm</th>
                  <th>Điều kiện</th>
                  <th>Khách hàng</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((promotion) => {
                  const targetIds = resolveTargetCustomerIds(promotion)
                  const targetNames = targetIds
                    .slice(0, 2)
                    .map((id) => customerById.get(id)?.fullName || customerById.get(id)?.email || id)
                    .join(', ')

                  return (
                    <tr key={promotion.id} className="border-b align-top">
                      <td className="py-3">
                        <div className="font-semibold text-slate-800">{promotion.code}</div>
                        <div className="text-xs text-slate-500">{promotion.name}</div>
                      </td>
                      <td className="py-3 text-slate-700">{discountLabelOf(promotion)}</td>
                      <td className="py-3 text-xs text-slate-500">
                        <div>Đơn từ {formatMoney(promotion?.config?.minOrderValue)}</div>
                        {promotion?.config?.maxDiscountAmount ? <div>Tối đa {formatMoney(promotion.config.maxDiscountAmount)}</div> : null}
                        <div>Đã dùng {promotion.usedCount ?? 0}{promotion.usageLimit ? `/${promotion.usageLimit}` : ''}</div>
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        <div>{targetIds.length} khách hàng</div>
                        {targetNames ? <div className="mt-1 max-w-52 truncate">{targetNames}{targetIds.length > 2 ? '...' : ''}</div> : null}
                      </td>
                      <td className="py-3">
                        {promotion.active ? <span className="text-green-600 text-xs font-semibold">Đang chạy</span> : <span className="text-slate-500 text-xs font-semibold">Đã ngừng</span>}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="text-blue-600 text-xs font-semibold" onClick={() => editVoucher(promotion)}>Sửa</button>
                          {promotion.active ? <button className="text-amber-600 text-xs font-semibold" onClick={() => deactivateVoucher(promotion.id)}>Ngừng</button> : null}
                          <button className="text-red-600 text-xs font-semibold" onClick={() => deleteVoucher(promotion.id)}>Xóa</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loading && !vouchers.length && <tr><td className="py-4 text-slate-500" colSpan="6">Chưa có voucher hóa đơn</td></tr>}
                {loading && <tr><td className="py-4 text-slate-500" colSpan="6">Đang tải...</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
