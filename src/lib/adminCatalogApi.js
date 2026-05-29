import api from './api'

export const catalogHealthApi = {
  get: () => api.get('/admin/catalog/health')
}

export const catalogDefaultsApi = {
  options: () => api.get('/admin/catalog/default-options')
}

export const dashboardApi = {
  summary: (params) => api.get('/analytics/dashboard', { params }),
  projectionRuns: (params) => api.get('/admin/search/projection-runs', { params })
}

export const searchMetricsApi = {
  topQueries: (params) => api.get('/admin/search/top-queries', { params }),
  zeroResultQueries: (params) => api.get('/admin/search/zero-result-queries', { params }),
  topClickedProducts: (params) => api.get('/admin/search/top-clicked-products', { params }),
  summary: () => api.get('/admin/search/summary'),
  synonymRecommendations: (params) => api.post('/admin/search/synonyms/recommendations', null, { params }),
  rebuildProjection: (productId) => api.post(`/admin/search/projections/rebuild/${productId}`),
  rebuildAllProjections: () => api.post('/admin/search/projections/rebuild-all'),
  projectionTasks: (params) => api.get('/admin/search/projection-tasks', { params }),
  projectionFailures: (params) => api.get('/admin/search/projection-failures', { params }),
  retryProjectionFailure: (productId) => api.post(`/admin/search/projection-failures/${productId}/retry`),
  resolveProjectionFailure: (productId, payload) => api.post(`/admin/search/projection-failures/${productId}/resolve`, payload || {}),
  projectionRuns: (params) => api.get('/admin/search/projection-runs', { params })
}

export const usersApi = {
  list: (params) => api.get('/users', { params }),
  detail: (id) => api.get(`/users/${id}`),
  createStaff: (payload) => api.post('/admin/staffs', payload),
  update: (id, payload) => api.put(`/users/${id}`, payload),
  delete: (id) => api.delete(`/users/${id}`),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`)
}

export const chatApi = {
  customerActiveRoom: () => api.get('/chat/customer/rooms/active'),
  customerCreateRoom: () => api.post('/chat/customer/rooms'),
  customerSend: (payload) => api.post('/chat/customer/messages', payload),
  staffActiveRooms: () => api.get('/chat/staff/rooms/active'),
  assignRoom: (roomId) => api.patch(`/chat/staff/rooms/${roomId}/assign`),
  closeRoom: (roomId) => api.patch(`/chat/staff/rooms/${roomId}/close`),
  staffSend: (roomId, payload) => api.post(`/chat/staff/rooms/${roomId}/messages`, payload),
  roomMessages: (roomId) => api.get(`/chat/rooms/${roomId}/messages`),
  sendToRoom: (roomId, payload) => api.post(`/chat/rooms/${roomId}/messages`, payload),
  uploadAttachment: (formData) => api.post('/chat/attachments', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export const productsApi = {
  list: (params) => api.get('/admin/products', { params }),
  publicSearch: (params) => api.get('/products/search', { params }),
  publicDetail: (id) => api.get(`/products/${id}`),
  detail: (id) => api.get(`/admin/products/${id}`),
  create: (payload) => api.post('/admin/products', payload),
  update: (id, payload) => api.put(`/admin/products/${id}`, payload),
  setActive: (id, active) => api.patch(`/admin/products/${id}/active`, { active }),
  searchStatus: (id) => api.get(`/admin/products/${id}/search-status`),
  mediaList: (productId) => api.get(`/admin/products/${productId}/media`),
  mediaItem: (productId, mediaId) => api.get(`/admin/products/${productId}/media/${mediaId}`),
  uploadMedia: (productId, formData) => api.post(`/admin/products/${productId}/media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateMedia: (productId, mediaId, formData) => api.put(`/admin/products/${productId}/media/${mediaId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteMedia: (productId, mediaId) => api.delete(`/admin/products/${productId}/media/${mediaId}`),
  setPrimaryMedia: (productId, mediaId) => api.patch(`/admin/products/${productId}/media/${mediaId}/primary`)
}

export const variantsApi = {
  create: (payload) => api.post('/admin/variants', payload),
  update: (id, payload) => api.put(`/admin/variants/${id}`, payload),
  setStock: (id, stockQuantity) => api.patch(`/admin/variants/${id}/stock`, { stockQuantity }),
  setActive: (id, active) => api.patch(`/admin/variants/${id}/active`, { active }),
  mediaList: (variantId) => api.get(`/admin/variants/${variantId}/media`),
  uploadMedia: (variantId, formData) => api.post(`/admin/variants/${variantId}/media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateMedia: (variantId, mediaId, formData) => api.put(`/admin/variants/${variantId}/media/${mediaId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteMedia: (variantId, mediaId) => api.delete(`/admin/variants/${variantId}/media/${mediaId}`),
  setPrimaryMedia: (variantId, mediaId) => api.patch(`/admin/variants/${variantId}/media/${mediaId}/primary`)
}

export const promotionsApi = {
  list: (params) => api.get('/promotions', { params }),
  active: (params) => api.get('/promotions/active', { params }),
  create: (payload) => api.post('/promotions', payload),
  update: (id, payload) => api.put(`/promotions/${id}`, payload),
  deactivate: (id) => api.post(`/promotions/${id}/deactivate`),
  delete: (id) => api.delete(`/promotions/${id}`)
}

export const optionsApi = {
  list: (params) => api.get('/admin/options', { params }),
  create: (payload) => api.post('/admin/options', payload),
  update: (id, payload) => api.put(`/admin/options/${id}`, payload),
  values: (params) => api.get('/admin/option-values', { params }),
  createValue: (optionId, payload) => api.post(`/admin/options/${optionId}/values`, payload),
  updateValue: (id, payload) => api.put(`/admin/option-values/${id}`, payload),
  setValueActive: (id, active) => api.patch(`/admin/option-values/${id}/active`, { active })
}

const semanticResourceApi = (resource) => ({
  list: (params) => api.get(`/admin/${resource}`, { params }),
  create: (payload) => api.post(`/admin/${resource}`, payload),
  update: (id, payload) => api.put(`/admin/${resource}/${id}`, payload),
  setActive: (id, active) => api.patch(`/admin/${resource}/${id}/active`, { active })
})

export const semanticMastersApi = {
  brands: semanticResourceApi('brands'),
  ingredients: semanticResourceApi('ingredients'),
  skinTypes: semanticResourceApi('skin-types'),
  concerns: semanticResourceApi('concerns'),
  tags: semanticResourceApi('tags')
}

export const catalogMetadataApi = {
  productTypes: (params) => api.get('/admin/product-types', { params }),
  createProductType: (payload) => api.post('/admin/product-types', payload),
  updateProductType: (id, payload) => api.put(`/admin/product-types/${id}`, payload),
  deleteProductType: (id) => api.delete(`/admin/product-types/${id}`),

  brands: (params) => api.get('/admin/brands', { params }),
  createBrand: (payload) => api.post('/admin/brands', payload),
  createBrandMultipart: (formData) => api.post('/admin/brands', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateBrand: (id, payload) => api.put(`/admin/brands/${id}`, payload),
  updateBrandMultipart: (id, formData) => api.put(`/admin/brands/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  toggleBrandActive: (id, active) => api.patch(`/admin/brands/${id}/active`, { active }),

  ingredients: (params) => api.get('/admin/ingredients', { params }),
  skinTypes: (params) => api.get('/admin/skin-types', { params }),
  concerns: (params) => api.get('/admin/concerns', { params }),
  tags: (params) => api.get('/admin/tags', { params }),
  options: (params) => api.get('/admin/options', { params }),
  optionValues: (params) => api.get('/admin/option-values', { params })
}
