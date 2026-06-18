// IT Asset Manager - Core Types

export type AssetStatus = 'In Use' | 'In Stock' | 'Repair' | 'Retired' | 'Lost'

export const ASSET_STATUSES: AssetStatus[] = [
  'In Use',
  'In Stock',
  'Repair',
  'Retired',
  'Lost',
]

export const STATUS_CONFIG: Record<
  AssetStatus,
  { label: string; color: string; bg: string; text: string; dot: string }
> = {
  'In Use': {
    label: 'In Use',
    color: 'emerald',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  'In Stock': {
    label: 'In Stock',
    color: 'slate',
    bg: 'bg-slate-500/10',
    text: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  Repair: {
    label: 'Repair',
    color: 'amber',
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  Retired: {
    label: 'Retired',
    color: 'rose',
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  Lost: {
    label: 'Lost',
    color: 'red',
    bg: 'bg-red-500/10',
    text: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
}

export const ASSET_TYPE_ICONS: Record<string, string> = {
  Desktop: 'Monitor',
  Laptop: 'Laptop',
  Mobile: 'Smartphone',
  Tablet: 'Tablet',
  Monitor: 'Display',
  Peripheral: 'Mouse',
  Other: 'Package',
}

export interface AssetType {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  _count?: { assets: number }
}

export interface Department {
  id: string
  name: string
  code?: string | null
  _count?: { assets: number; persons: number }
}

export interface Location {
  id: string
  name: string
  address?: string | null
  _count?: { assets: number; persons: number }
}

export interface Person {
  id: string
  fullName: string
  email?: string | null
  phone?: string | null
  role?: string | null
  departmentId?: string | null
  locationId?: string | null
  department?: Department | null
  location?: Location | null
  _count?: { assets: number }
}

export interface Asset {
  id: string
  assetTag?: string | null
  assetTypeId: string
  make?: string | null
  model?: string | null
  modelNumber?: string | null
  serialNumber?: string | null
  partNumber?: string | null
  status: string
  purchaseDate?: string | null
  cost?: number | null
  currency: string
  warrantyExpiry?: string | null
  os?: string | null
  osKey?: string | null
  officeKey?: string | null
  cpu?: string | null
  gpu?: string | null
  ram?: string | null
  storage?: string | null
  color?: string | null
  imei1?: string | null
  imei2?: string | null
  rom?: string | null
  otpMobileNumber?: string | null
  googleAppleAccount?: string | null
  monitorMake?: string | null
  monitorModel?: string | null
  monitorSn?: string | null
  monitorSize?: string | null
  keyboardMake?: string | null
  keyboardModel?: string | null
  keyboardSn?: string | null
  mouseMake?: string | null
  mouseModel?: string | null
  mouseSn?: string | null
  assignedToId?: string | null
  departmentId?: string | null
  locationId?: string | null
  comments?: string | null
  createdAt: string
  updatedAt: string
  assetType?: AssetType
  assignedTo?: Person | null
  department?: Department | null
  location?: Location | null
  images?: AssetImage[]
  history?: AssignmentHistory[]
  _count?: { images: number; history: number }
}

export interface AssetImage {
  id: string
  assetId?: string | null
  fileName: string
  filePath: string
  mimeType: string
  fileSize: number
  processedText?: string | null
  ocrStatus: string
  ocrEngine?: string | null
  parsedFields?: string | null
  createdAt: string
  processedAt?: string | null
}

export interface AssignmentHistory {
  id: string
  assetId: string
  personId?: string | null
  departmentId?: string | null
  locationId?: string | null
  assignedOn: string
  unassignedOn?: string | null
  reason?: string | null
  action: string
  notes?: string | null
  person?: Person | null
  department?: Department | null
  location?: Location | null
}

export interface DashboardStats {
  totalAssets: number
  inUse: number
  inStock: number
  repair: number
  retired: number
  lost: number
  byType: { name: string; count: number }[]
  byDepartment: { name: string; count: number }[]
  byLocation: { name: string; count: number }[]
  byStatus: { status: string; count: number }[]
  recentActivity: (AssignmentHistory & {
    asset?: { id: string; assetTag?: string | null; make?: string | null; model?: string | null }
  })[]
  totalValue: number
  totalPersons: number
  totalDepartments: number
  totalLocations: number
  warrantyExpiringSoon: number
  maintenance?: {
    total: number
    scheduled: number
    inProgress: number
    completed: number
    overdue: number
  }
  licenses?: {
    total: number
    totalSeats: number
    usedSeats: number
    expiringSoon: number
    totalValue: number
  }
  auditLog?: ActivityLog[]
}

export interface OcrResult {
  rawText: string
  parsed: {
    make?: string
    model?: string
    modelNumber?: string
    serialNumber?: string
    imei1?: string
    imei2?: string
    os?: string
    assetType?: string
  }
  imageId?: string
}

// ============ Maintenance Schedule ============
export type MaintenanceType = 'Preventive' | 'Corrective' | 'Upgrade' | 'Inspection' | 'Cleaning'
export type MaintenanceStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue' | 'Cancelled'

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  'Preventive',
  'Corrective',
  'Upgrade',
  'Inspection',
  'Cleaning',
]

export const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  'Scheduled',
  'In Progress',
  'Completed',
  'Overdue',
  'Cancelled',
]

export const MAINTENANCE_STATUS_CONFIG: Record<
  MaintenanceStatus,
  { bg: string; text: string; dot: string }
> = {
  Scheduled: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
  'In Progress': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  Completed: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  Overdue: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  Cancelled: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-700 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
}

export interface MaintenanceSchedule {
  id: string
  assetId: string
  type: MaintenanceType | string
  title: string
  description?: string | null
  scheduledFor: string
  completedAt?: string | null
  status: MaintenanceStatus | string
  cost?: number | null
  performedBy?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  asset?: Asset
}

// ============ Audit Log / Activity Log ============
export interface ActivityLog {
  id: string
  action: string
  entityType: string
  entityId: string
  details?: string | null
  createdAt: string
  meta?: Record<string, unknown>
}

// ============ Software License ============
export interface SoftwareLicense {
  id: string
  name: string
  vendor?: string | null
  key?: string | null
  seatsTotal: number
  seatsUsed: number
  purchaseDate?: string | null
  expiryDate?: string | null
  cost?: number | null
  currency: string
  category?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  _count?: { allocations: number }
  availableSeats?: number
}

export interface AssetLicense {
  id: string
  assetId: string
  licenseId: string
  assignedAt: string
  createdAt: string
  license?: SoftwareLicense
  asset?: Asset
}
