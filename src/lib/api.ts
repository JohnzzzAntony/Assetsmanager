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
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
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

export { ApiError }
