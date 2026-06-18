// API client for fetching data from the backend
import type {
  Asset,
  AssetType,
  Department,
  Location,
  Person,
  DashboardStats,
  OcrResult,
  AssetImage,
  AssignmentHistory,
  MaintenanceSchedule,
  ActivityLog,
  SoftwareLicense,
  AssetLicense,
  CheckoutRequest,
  DepreciationRule,
  DepreciationCalc,
  AppNotification,
  Vendor,
  PurchaseOrder,
  PurchaseOrderItem,
  AssetDisposal,
  AssetTag,
  AssetBooking,
} from './types'

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string> | undefined) }
  // Only set Content-Type: application/json for non-FormData requests that don't already specify one.
  // For FormData, the browser must set the multipart boundary automatically — do NOT override.
  if (!isFormData && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(text || res.statusText, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ---- Dashboard ----
export const dashboardApi = {
  get: () => request<DashboardStats>('/api/dashboard'),
}

// ---- Asset Types ----
export const assetTypesApi = {
  list: () => request<AssetType[]>('/api/asset-types'),
  create: (data: Partial<AssetType>) =>
    request<AssetType>('/api/asset-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<AssetType>) =>
    request<AssetType>(`/api/asset-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/asset-types/${id}`, { method: 'DELETE' }),
}

// ---- Departments ----
export const departmentsApi = {
  list: () => request<Department[]>('/api/departments'),
  create: (data: Partial<Department>) =>
    request<Department>('/api/departments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Department>) =>
    request<Department>(`/api/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/departments/${id}`, { method: 'DELETE' }),
}

// ---- Locations ----
export const locationsApi = {
  list: () => request<Location[]>('/api/locations'),
  create: (data: Partial<Location>) =>
    request<Location>('/api/locations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Location>) =>
    request<Location>(`/api/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/locations/${id}`, { method: 'DELETE' }),
}

// ---- Persons ----
export const personsApi = {
  list: () => request<Person[]>('/api/persons'),
  create: (data: Partial<Person>) =>
    request<Person>('/api/persons', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Person>) =>
    request<Person>(`/api/persons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/persons/${id}`, { method: 'DELETE' }),
}

// ---- Assets ----
export interface AssetQuery {
  search?: string
  assetTypeId?: string
  status?: string
  departmentId?: string
  locationId?: string
  assignedToId?: string
  os?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export const assetsApi = {
  list: (query?: AssetQuery) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
      })
    }
    const qs = params.toString()
    return request<{ data: Asset[]; total: number; page: number; pageSize: number }>(
      `/api/assets${qs ? `?${qs}` : ''}`
    )
  },
  get: (id: string) => request<Asset>(`/api/assets/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Asset>('/api/assets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    request<Asset>(`/api/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/assets/${id}`, { method: 'DELETE' }),
  assign: (id: string, data: { personId?: string; departmentId?: string; locationId?: string; reason?: string; action?: string }) =>
    request<AssignmentHistory>(`/api/assets/${id}/assign`, { method: 'POST', body: JSON.stringify(data) }),
  history: (id: string) => request<AssignmentHistory[]>(`/api/assets/${id}/history`),
  images: (id: string) => request<AssetImage[]>(`/api/assets/${id}/images`),
  deleteImage: (assetId: string, imageId: string) =>
    request<void>(`/api/assets/${assetId}/images/${imageId}`, { method: 'DELETE' }),
}

// ---- OCR ----
export const ocrApi = {
  extract: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<OcrResult>('/api/ocr', { method: 'POST', body: formData })
  },
  reRun: (imageId: string) =>
    request<OcrResult>(`/api/ocr/${imageId}`, { method: 'POST' }),
}

// ---- Maintenance ----
export const maintenanceApi = {
  list: (query?: { assetId?: string; status?: string; type?: string; from?: string; to?: string; limit?: number }) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
      })
    }
    const qs = params.toString()
    return request<MaintenanceSchedule[]>(`/api/maintenance${qs ? `?${qs}` : ''}`)
  },
  create: (data: Partial<MaintenanceSchedule>) =>
    request<MaintenanceSchedule>('/api/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<MaintenanceSchedule>) =>
    request<MaintenanceSchedule>(`/api/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/maintenance/${id}`, { method: 'DELETE' }),
  upcoming: () => request<{ stats: { total: number; scheduled: number; inProgress: number; completed: number; overdue: number }; upcoming: MaintenanceSchedule[] }>('/api/dashboard/maintenance'),
}

// ---- Audit Log ----
export const auditLogApi = {
  list: (query?: { limit?: number; entityType?: string; entityId?: string; action?: string }) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
      })
    }
    const qs = params.toString()
    return request<ActivityLog[]>(`/api/audit-log${qs ? `?${qs}` : ''}`)
  },
}

// ---- Software Licenses ----
export const licensesApi = {
  list: () => request<SoftwareLicense[]>('/api/licenses'),
  create: (data: Partial<SoftwareLicense>) =>
    request<SoftwareLicense>('/api/licenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<SoftwareLicense>) =>
    request<SoftwareLicense>(`/api/licenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/licenses/${id}`, { method: 'DELETE' }),
  allocate: (licenseId: string, assetId: string) =>
    request<AssetLicense>(`/api/licenses/${licenseId}/allocate`, { method: 'POST', body: JSON.stringify({ assetId }) }),
  listForAsset: (assetId: string) => request<AssetLicense[]>(`/api/assets/${assetId}/licenses`),
  deallocate: (assetId: string, assetLicenseId: string) =>
    request<void>(`/api/assets/${assetId}/licenses`, { method: 'DELETE', body: JSON.stringify({ assetLicenseId }) }),
}

// ---- Asset Maintenance & Activity ----
export const assetActivityApi = {
  maintenance: (assetId: string) => request<MaintenanceSchedule[]>(`/api/assets/${assetId}/maintenance`),
  activity: (assetId: string) => request<ActivityLog[]>(`/api/assets/${assetId}/activity`),
  qrUrl: (assetId: string) => `/api/assets/${assetId}/qr`,
}

// ---- Import ----
export const importApi = {
  excel: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<{ imported: number; errors: string[] }>('/api/import/excel', {
      method: 'POST',
      body: formData,
    })
  },
  seed: () => request<{ success: boolean; message: string }>('/api/seed', { method: 'POST' }),
}

// ---- Checkout Requests ----
export const checkoutApi = {
  list: (query?: { assetId?: string; requestedById?: string; status?: string; requestType?: string; limit?: number }) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
      })
    }
    const qs = params.toString()
    return request<CheckoutRequest[]>(`/api/checkouts${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => request<CheckoutRequest>(`/api/checkouts/${id}`),
  create: (data: Partial<CheckoutRequest>) =>
    request<CheckoutRequest>('/api/checkouts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CheckoutRequest>) =>
    request<CheckoutRequest>(`/api/checkouts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/checkouts/${id}`, { method: 'DELETE' }),
  approve: (id: string, approverId: string, notes?: string) =>
    request<CheckoutRequest>(`/api/checkouts/${id}/approve`, { method: 'POST', body: JSON.stringify({ approverId, notes }) }),
  reject: (id: string, approverId: string, notes?: string) =>
    request<CheckoutRequest>(`/api/checkouts/${id}/reject`, { method: 'POST', body: JSON.stringify({ approverId, notes }) }),
  checkOut: (id: string) =>
    request<CheckoutRequest>(`/api/checkouts/${id}/check-out`, { method: 'POST' }),
  checkIn: (id: string, condition?: string) =>
    request<CheckoutRequest>(`/api/checkouts/${id}/check-in`, { method: 'POST', body: JSON.stringify({ condition }) }),
  listForAsset: (assetId: string) => request<CheckoutRequest[]>(`/api/assets/${assetId}/checkouts`),
}

// ---- Depreciation ----
export const depreciationApi = {
  listRules: () => request<DepreciationRule[]>('/api/depreciation/rules'),
  createRule: (data: Partial<DepreciationRule>) =>
    request<DepreciationRule>('/api/depreciation/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, data: Partial<DepreciationRule>) =>
    request<DepreciationRule>(`/api/depreciation/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRule: (id: string) => request<void>(`/api/depreciation/rules/${id}`, { method: 'DELETE' }),
  calculate: (assetId?: string) => {
    const qs = assetId ? `?assetId=${assetId}` : ''
    return request<DepreciationCalc | DepreciationCalc[]>(`/api/depreciation/calculate${qs}`)
  },
  stats: () => request<{ totalAssets: number; totalPurchaseValue: number; totalCurrentValue: number; totalDepreciation: number; fullyDepreciatedCount: number }>('/api/depreciation/calculate?stats=true'),
}

// ---- Notifications ----
export const notificationApi = {
  list: (query?: { limit?: number; unread?: boolean; type?: string }) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
      })
    }
    const qs = params.toString()
    return request<AppNotification[]>(`/api/notifications${qs ? `?${qs}` : ''}`)
  },
  create: (data: Partial<AppNotification>) =>
    request<AppNotification>('/api/notifications', { method: 'POST', body: JSON.stringify(data) }),
  markRead: (id: string) => request<void>(`/api/notifications/${id}`, { method: 'PATCH' }),
  delete: (id: string) => request<void>(`/api/notifications/${id}`, { method: 'DELETE' }),
  markAllRead: () => request<void>('/api/notifications/mark-all-read', { method: 'POST' }),
  regenerate: () => request<{ created: number; cleared: number }>('/api/notifications/regenerate', { method: 'POST' }),
}

export { ApiError }

// ---- Vendors ----
export const vendorsApi = {
  list: () => request<Vendor[]>('/api/vendors'),
  get: (id: string) => request<Vendor & { purchaseOrders: PurchaseOrder[] }>(`/api/vendors/${id}`),
  create: (data: Partial<Vendor>) =>
    request<Vendor>('/api/vendors', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Vendor>) =>
    request<Vendor>(`/api/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/vendors/${id}`, { method: 'DELETE' }),
}

// ---- Purchase Orders ----
export const purchaseOrdersApi = {
  list: (query?: { vendorId?: string; status?: string }) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
      })
    }
    const qs = params.toString()
    return request<PurchaseOrder[]>(`/api/purchase-orders${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => request<PurchaseOrder>(`/api/purchase-orders/${id}`),
  create: (data: Partial<PurchaseOrder> & { items?: Partial<PurchaseOrderItem>[] }) =>
    request<PurchaseOrder>('/api/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<PurchaseOrder> & { items?: Partial<PurchaseOrderItem>[] }) =>
    request<PurchaseOrder>(`/api/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/purchase-orders/${id}`, { method: 'DELETE' }),
}

// ---- Asset Disposals ----
export const disposalsApi = {
  list: (query?: { assetId?: string; method?: string }) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
      })
    }
    const qs = params.toString()
    return request<AssetDisposal[]>(`/api/disposals${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => request<AssetDisposal>(`/api/disposals/${id}`),
  create: (data: Partial<AssetDisposal>) =>
    request<AssetDisposal>('/api/disposals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<AssetDisposal>) =>
    request<AssetDisposal>(`/api/disposals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/disposals/${id}`, { method: 'DELETE' }),
  listForAsset: (assetId: string) => request<AssetDisposal[]>(`/api/assets/${assetId}/disposals`),
}

// ---- Asset Tags ----
export const tagsApi = {
  list: () => request<AssetTag[]>('/api/tags'),
  get: (id: string) => request<AssetTag>(`/api/tags/${id}`),
  create: (data: { name: string; color?: string; description?: string }) =>
    request<AssetTag>('/api/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<AssetTag>) =>
    request<AssetTag>(`/api/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/tags/${id}`, { method: 'DELETE' }),
  listForAsset: (assetId: string) => request<AssetTag[]>(`/api/assets/${assetId}/tags`),
  setAssetTags: (assetId: string, tagIds: string[]) =>
    request<{ success: boolean; tags: AssetTag[] }>(`/api/assets/${assetId}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tagIds }),
    }),
  attachToAsset: (assetId: string, tagId: string) =>
    request<{ success: boolean; tags: AssetTag[] }>(`/api/assets/${assetId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagId }),
    }),
  detachFromAsset: (assetId: string, tagId: string) =>
    request<{ success: boolean; tags: AssetTag[] }>(`/api/assets/${assetId}/tags?tagId=${tagId}`, {
      method: 'DELETE',
    }),
}

// ---- Asset Bookings ----
export const bookingsApi = {
  list: (query?: { assetId?: string; status?: string; bookedById?: string; from?: string; to?: string; limit?: number }) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
      })
    }
    const qs = params.toString()
    return request<AssetBooking[]>(`/api/bookings${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => request<AssetBooking>(`/api/bookings/${id}`),
  create: (data: Partial<AssetBooking>) =>
    request<AssetBooking>('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<AssetBooking>) =>
    request<AssetBooking>(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/bookings/${id}`, { method: 'DELETE' }),
  approve: (id: string, data?: { approvedById?: string; decisionNotes?: string }) =>
    request<AssetBooking>(`/api/bookings/${id}/approve`, { method: 'POST', body: JSON.stringify(data || {}) }),
  reject: (id: string, data?: { approvedById?: string; decisionNotes?: string }) =>
    request<AssetBooking>(`/api/bookings/${id}/reject`, { method: 'POST', body: JSON.stringify(data || {}) }),
  checkOut: (id: string) =>
    request<AssetBooking>(`/api/bookings/${id}/check-out`, { method: 'POST' }),
  checkIn: (id: string, notes?: string) =>
    request<AssetBooking>(`/api/bookings/${id}/check-in`, { method: 'POST', body: JSON.stringify({ notes }) }),
  listForAsset: (assetId: string) => request<AssetBooking[]>(`/api/assets/${assetId}/bookings`),
}

// ---- Export ----
export const exportApi = {
  assets: () => `/api/export/assets`,
  vendors: () => `/api/export/vendors`,
  purchaseOrders: () => `/api/export/purchase-orders`,
  disposals: () => `/api/export/disposals`,
  bookings: () => `/api/export/bookings`,
  download: (url: string) => {
    const a = document.createElement('a')
    a.href = url
    a.click()
  },
}
