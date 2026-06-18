// Data Access Layer - thin helpers around node:sqlite
import { db, initDb, generateId } from './db'
import type {
  Asset,
  AssetType,
  Department,
  Location,
  Person,
  AssignmentHistory,
  AssetImage,
  DashboardStats,
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
} from './types'

// Ensure DB is initialized before any query
function ensure() {
  initDb()
}

function row<T = Record<string, unknown>>(r: unknown): T | null {
  if (!r) return null
  return r as T
}

function rows<T = Record<string, unknown>>(r: unknown[]): T[] {
  return (r || []) as T[]
}

function toBool(v: unknown) {
  return v != null && v !== 0 && v !== 'false' && v !== ''
}

// ============ Asset Types ============
export const assetTypeRepo = {
  list(): AssetType[] {
    ensure()
    const r = db.prepare(`
      SELECT at.*, (SELECT COUNT(*) FROM Asset a WHERE a.assetTypeId = at.id) as _count_assets
      FROM AssetType at ORDER BY at.name
    `).all()
    return rows<AssetType & { _count_assets: number }>(r).map((t) => ({
      ...t,
      _count: { assets: t._count_assets },
    }))
  },
  get(id: string): AssetType | null {
    ensure()
    return row<AssetType>(db.prepare('SELECT * FROM AssetType WHERE id = ?').get(id))
  },
  create(data: Partial<AssetType>): AssetType {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO AssetType (id, name, description, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, data.name, data.description ?? null, data.icon ?? null, now, now)
    return this.get(id)!
  },
  update(id: string, data: Partial<AssetType>): AssetType | null {
    ensure()
    const now = new Date().toISOString()
    const cur = this.get(id)
    if (!cur) return null
    db.prepare(
      'UPDATE AssetType SET name = ?, description = ?, icon = ?, updatedAt = ? WHERE id = ?'
    ).run(data.name ?? cur.name, data.description ?? cur.description, data.icon ?? cur.icon, now, id)
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM AssetType WHERE id = ?').run(id)
  },
}

// ============ Departments ============
export const departmentRepo = {
  list(): Department[] {
    ensure()
    const r = db.prepare(`
      SELECT d.*,
        (SELECT COUNT(*) FROM Asset a WHERE a.departmentId = d.id) as _count_assets,
        (SELECT COUNT(*) FROM Person p WHERE p.departmentId = d.id) as _count_persons
      FROM Department d ORDER BY d.name
    `).all()
    return rows<Department & { _count_assets: number; _count_persons: number }>(r).map((d) => ({
      ...d,
      _count: { assets: d._count_assets, persons: d._count_persons },
    }))
  },
  get(id: string): Department | null {
    ensure()
    return row<Department>(db.prepare('SELECT * FROM Department WHERE id = ?').get(id))
  },
  create(data: Partial<Department>): Department {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO Department (id, name, code, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
    ).run(id, data.name, data.code ?? null, now, now)
    return this.get(id)!
  },
  update(id: string, data: Partial<Department>): Department | null {
    ensure()
    const now = new Date().toISOString()
    const cur = this.get(id)
    if (!cur) return null
    db.prepare('UPDATE Department SET name = ?, code = ?, updatedAt = ? WHERE id = ?').run(
      data.name ?? cur.name,
      data.code ?? cur.code,
      now,
      id
    )
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM Department WHERE id = ?').run(id)
  },
}

// ============ Locations ============
export const locationRepo = {
  list(): Location[] {
    ensure()
    const r = db.prepare(`
      SELECT l.*,
        (SELECT COUNT(*) FROM Asset a WHERE a.locationId = l.id) as _count_assets,
        (SELECT COUNT(*) FROM Person p WHERE p.locationId = l.id) as _count_persons
      FROM Location l ORDER BY l.name
    `).all()
    return rows<Location & { _count_assets: number; _count_persons: number }>(r).map((l) => ({
      ...l,
      _count: { assets: l._count_assets, persons: l._count_persons },
    }))
  },
  get(id: string): Location | null {
    ensure()
    return row<Location>(db.prepare('SELECT * FROM Location WHERE id = ?').get(id))
  },
  create(data: Partial<Location>): Location {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      'INSERT INTO Location (id, name, address, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
    ).run(id, data.name, data.address ?? null, now, now)
    return this.get(id)!
  },
  update(id: string, data: Partial<Location>): Location | null {
    ensure()
    const now = new Date().toISOString()
    const cur = this.get(id)
    if (!cur) return null
    db.prepare('UPDATE Location SET name = ?, address = ?, updatedAt = ? WHERE id = ?').run(
      data.name ?? cur.name,
      data.address ?? cur.address,
      now,
      id
    )
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM Location WHERE id = ?').run(id)
  },
}

// ============ Persons ============
export const personRepo = {
  list(): Person[] {
    ensure()
    const r = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM Asset a WHERE a.assignedToId = p.id) as _count_assets
      FROM Person p ORDER BY p.fullName
    `).all()
    const depts = departmentRepo.list()
    const locs = locationRepo.list()
    return rows<Person & { _count_assets: number }>(r).map((p) => ({
      ...p,
      department: depts.find((d) => d.id === p.departmentId) || null,
      location: locs.find((l) => l.id === p.locationId) || null,
      _count: { assets: p._count_assets },
    }))
  },
  get(id: string): Person | null {
    ensure()
    const p = row<Person>(db.prepare('SELECT * FROM Person WHERE id = ?').get(id))
    if (!p) return null
    return p
  },
  create(data: Partial<Person>): Person {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO Person (id, fullName, email, phone, role, departmentId, locationId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.fullName,
      data.email ?? null,
      data.phone ?? null,
      data.role ?? null,
      data.departmentId ?? null,
      data.locationId ?? null,
      now,
      now
    )
    return this.get(id)!
  },
  update(id: string, data: Partial<Person>): Person | null {
    ensure()
    const now = new Date().toISOString()
    const cur = this.get(id)
    if (!cur) return null
    db.prepare(
      `UPDATE Person SET fullName = ?, email = ?, phone = ?, role = ?, departmentId = ?, locationId = ?, updatedAt = ? WHERE id = ?`
    ).run(
      data.fullName ?? cur.fullName,
      data.email ?? cur.email,
      data.phone ?? cur.phone,
      data.role ?? cur.role,
      data.departmentId ?? cur.departmentId,
      data.locationId ?? cur.locationId,
      now,
      id
    )
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM Person WHERE id = ?').run(id)
  },
}

// ============ Assets ============
export interface AssetQueryOpts {
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

const SORT_COLUMNS: Record<string, string> = {
  assetTag: 'a.assetTag',
  make: 'a.make',
  model: 'a.model',
  serialNumber: 'a.serialNumber',
  status: 'a.status',
  createdAt: 'a.createdAt',
  updatedAt: 'a.updatedAt',
  purchaseDate: 'a.purchaseDate',
  cost: 'a.cost',
  type: 't.name',
  department: 'd.name',
  location: 'l.name',
  person: 'p.fullName',
}

function attachAssetRelations<T extends Asset>(asset: T): T {
  if (!asset) return asset
  const types = assetTypeRepo.list()
  const depts = departmentRepo.list()
  const locs = locationRepo.list()
  const persons = personRepo.list()
  asset.assetType = types.find((t) => t.id === asset.assetTypeId) || undefined
  asset.department = depts.find((d) => d.id === asset.departmentId) || null
  asset.location = locs.find((l) => l.id === asset.locationId) || null
  asset.assignedTo = persons.find((p) => p.id === asset.assignedToId) || null
  return asset
}

export const assetRepo = {
  list(opts: AssetQueryOpts = {}): { data: Asset[]; total: number; page: number; pageSize: number } {
    ensure()
    const page = opts.page || 1
    const pageSize = Math.min(opts.pageSize || 20, 100)
    const offset = (page - 1) * pageSize
    const sortCol = SORT_COLUMNS[opts.sortBy || 'createdAt'] || 'a.createdAt'
    const sortDir = opts.sortDir === 'asc' ? 'ASC' : 'DESC'

    const where: string[] = []
    const params: unknown[] = []
    if (opts.search) {
      where.push(
        `(a.assetTag LIKE ? OR a.make LIKE ? OR a.model LIKE ? OR a.modelNumber LIKE ? OR a.serialNumber LIKE ? OR a.imei1 LIKE ? OR a.imei2 LIKE ? OR p.fullName LIKE ?)`
      )
      const s = `%${opts.search}%`
      params.push(s, s, s, s, s, s, s, s)
    }
    if (opts.assetTypeId) {
      where.push('a.assetTypeId = ?')
      params.push(opts.assetTypeId)
    }
    if (opts.status) {
      where.push('a.status = ?')
      params.push(opts.status)
    }
    if (opts.departmentId) {
      where.push('a.departmentId = ?')
      params.push(opts.departmentId)
    }
    if (opts.locationId) {
      where.push('a.locationId = ?')
      params.push(opts.locationId)
    }
    if (opts.assignedToId) {
      where.push('a.assignedToId = ?')
      params.push(opts.assignedToId)
    }
    if (opts.os) {
      where.push('a.os LIKE ?')
      params.push(`%${opts.os}%`)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const countRow = db
      .prepare(
        `SELECT COUNT(*) as c FROM Asset a
         LEFT JOIN Person p ON a.assignedToId = p.id
         ${whereSql}`
      )
      .get(...params) as { c: number }
    const total = countRow?.c || 0

    const r = db
      .prepare(
        `SELECT a.*, t.name as typeName, d.name as deptName, l.name as locName, p.fullName as personName
         FROM Asset a
         LEFT JOIN AssetType t ON a.assetTypeId = t.id
         LEFT JOIN Department d ON a.departmentId = d.id
         LEFT JOIN Location l ON a.locationId = l.id
         LEFT JOIN Person p ON a.assignedToId = p.id
         ${whereSql}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, offset)

    const assets = rows<Asset & { typeName?: string; deptName?: string; locName?: string; personName?: string }>(
      r
    ).map((a) => {
      const { typeName, deptName, locName, personName, ...rest } = a
      return attachAssetRelations({
        ...rest,
        assetType: typeName ? ({ id: rest.assetTypeId, name: typeName } as AssetType) : undefined,
        department: deptName ? ({ id: rest.departmentId!, name: deptName } as Department) : null,
        location: locName ? ({ id: rest.locationId!, name: locName } as Location) : null,
        assignedTo: personName ? ({ id: rest.assignedToId!, fullName: personName } as Person) : null,
      } as Asset)
    })

    return { data: assets, total, page, pageSize }
  },

  get(id: string): Asset | null {
    ensure()
    const a = row<Asset>(db.prepare('SELECT * FROM Asset WHERE id = ?').get(id))
    if (!a) return null
    attachAssetRelations(a)
    a.images = imageRepo.listForAsset(id)
    a.history = historyRepo.listForAsset(id)
    a._count = { images: a.images.length, history: a.history.length }
    return a
  },

  create(data: Record<string, unknown>): Asset {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    const cols = [
      'id', 'assetTag', 'assetTypeId', 'make', 'model', 'modelNumber', 'serialNumber', 'partNumber',
      'status', 'purchaseDate', 'cost', 'currency', 'warrantyExpiry', 'os', 'osKey', 'officeKey',
      'cpu', 'gpu', 'ram', 'storage', 'color', 'imei1', 'imei2', 'rom', 'otpMobileNumber', 'googleAppleAccount',
      'monitorMake', 'monitorModel', 'monitorSn', 'monitorSize',
      'keyboardMake', 'keyboardModel', 'keyboardSn',
      'mouseMake', 'mouseModel', 'mouseSn',
      'assignedToId', 'departmentId', 'locationId', 'comments', 'createdAt', 'updatedAt',
    ]
    const vals = [
      id,
      data.assetTag ?? null,
      data.assetTypeId,
      data.make ?? null,
      data.model ?? null,
      data.modelNumber ?? null,
      data.serialNumber ?? null,
      data.partNumber ?? null,
      data.status ?? 'In Stock',
      data.purchaseDate ?? null,
      data.cost != null ? Number(data.cost) : null,
      data.currency ?? 'USD',
      data.warrantyExpiry ?? null,
      data.os ?? null,
      data.osKey ?? null,
      data.officeKey ?? null,
      data.cpu ?? null,
      data.gpu ?? null,
      data.ram ?? null,
      data.storage ?? null,
      data.color ?? null,
      data.imei1 ?? null,
      data.imei2 ?? null,
      data.rom ?? null,
      data.otpMobileNumber ?? null,
      data.googleAppleAccount ?? null,
      data.monitorMake ?? null,
      data.monitorModel ?? null,
      data.monitorSn ?? null,
      data.monitorSize ?? null,
      data.keyboardMake ?? null,
      data.keyboardModel ?? null,
      data.keyboardSn ?? null,
      data.mouseMake ?? null,
      data.mouseModel ?? null,
      data.mouseSn ?? null,
      data.assignedToId ?? null,
      data.departmentId ?? null,
      data.locationId ?? null,
      data.comments ?? null,
      now,
      now,
    ]
    const placeholders = cols.map(() => '?').join(', ')
    db.prepare(`INSERT INTO Asset (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals)

    // If assigned, create history
    if (data.assignedToId || data.departmentId || data.locationId) {
      const histId = generateId()
      db.prepare(
        `INSERT INTO AssignmentHistory (id, assetId, personId, departmentId, locationId, assignedOn, reason, action, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        histId,
        id,
        data.assignedToId ?? null,
        data.departmentId ?? null,
        data.locationId ?? null,
        now,
        'Initial assignment',
        'Assigned',
        now
      )
    }
    logAssetActivity('asset.created', id, `Created asset ${data.assetTag || data.serialNumber || id.slice(0, 8)}`)
    return this.get(id)!
  },

  update(id: string, data: Record<string, unknown>): Asset | null {
    ensure()
    const cur = this.get(id)
    if (!cur) return null
    const now = new Date().toISOString()
    const updatable: Record<string, string> = {
      assetTag: 'assetTag',
      assetTypeId: 'assetTypeId',
      make: 'make',
      model: 'model',
      modelNumber: 'modelNumber',
      serialNumber: 'serialNumber',
      partNumber: 'partNumber',
      status: 'status',
      purchaseDate: 'purchaseDate',
      cost: 'cost',
      currency: 'currency',
      warrantyExpiry: 'warrantyExpiry',
      os: 'os',
      osKey: 'osKey',
      officeKey: 'officeKey',
      cpu: 'cpu',
      gpu: 'gpu',
      ram: 'ram',
      storage: 'storage',
      color: 'color',
      imei1: 'imei1',
      imei2: 'imei2',
      rom: 'rom',
      otpMobileNumber: 'otpMobileNumber',
      googleAppleAccount: 'googleAppleAccount',
      monitorMake: 'monitorMake',
      monitorModel: 'monitorModel',
      monitorSn: 'monitorSn',
      monitorSize: 'monitorSize',
      keyboardMake: 'keyboardMake',
      keyboardModel: 'keyboardModel',
      keyboardSn: 'keyboardSn',
      mouseMake: 'mouseMake',
      mouseModel: 'mouseModel',
      mouseSn: 'mouseSn',
      assignedToId: 'assignedToId',
      departmentId: 'departmentId',
      locationId: 'locationId',
      comments: 'comments',
    }
    const sets: string[] = []
    const vals: unknown[] = []
    for (const [k, col] of Object.entries(updatable)) {
      if (k in data) {
        sets.push(`${col} = ?`)
        vals.push(data[k] ?? null)
      }
    }
    if (sets.length === 0) return cur
    sets.push('updatedAt = ?')
    vals.push(now, id)
    db.prepare(`UPDATE Asset SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    return this.get(id)
  },

  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM Asset WHERE id = ?').run(id)
  },

  assign(
    id: string,
    data: { personId?: string; departmentId?: string; locationId?: string; reason?: string; action?: string }
  ): AssignmentHistory | null {
    ensure()
    const now = new Date().toISOString()
    // Close any open assignment
    db.prepare(
      `UPDATE AssignmentHistory SET unassignedOn = ? WHERE assetId = ? AND unassignedOn IS NULL`
    ).run(now, id)
    const histId = generateId()
    db.prepare(
      `INSERT INTO AssignmentHistory (id, assetId, personId, departmentId, locationId, assignedOn, reason, action, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      histId,
      id,
      data.personId ?? null,
      data.departmentId ?? null,
      data.locationId ?? null,
      now,
      data.reason ?? null,
      data.action ?? 'Assigned',
      now
    )
    // Update asset assignment
    db.prepare(
      `UPDATE Asset SET assignedToId = ?, departmentId = ?, locationId = ?, updatedAt = ? WHERE id = ?`
    ).run(data.personId ?? null, data.departmentId ?? null, data.locationId ?? null, now, id)
    return historyRepo.get(histId)
  },
}

// ============ Assignment History ============
export const historyRepo = {
  listForAsset(assetId: string): AssignmentHistory[] {
    ensure()
    const r = db
      .prepare(
        `SELECT h.*, p.fullName as personName, d.name as deptName, l.name as locName
         FROM AssignmentHistory h
         LEFT JOIN Person p ON h.personId = p.id
         LEFT JOIN Department d ON h.departmentId = d.id
         LEFT JOIN Location l ON h.locationId = l.id
         WHERE h.assetId = ? ORDER BY h.assignedOn DESC`
      )
      .all(assetId)
    return rows<AssignmentHistory & { personName?: string; deptName?: string; locName?: string }>(r).map(
      (h) => ({
        ...h,
        person: h.personName ? ({ id: h.personId!, fullName: h.personName } as Person) : null,
        department: h.deptName ? ({ id: h.departmentId!, name: h.deptName } as Department) : null,
        location: h.locName ? ({ id: h.locationId!, name: h.locName } as Location) : null,
      })
    )
  },
  get(id: string): AssignmentHistory | null {
    ensure()
    return row<AssignmentHistory>(db.prepare('SELECT * FROM AssignmentHistory WHERE id = ?').get(id))
  },
  recent(limit = 10): (AssignmentHistory & {
    asset?: { id: string; assetTag?: string | null; make?: string | null; model?: string | null }
  })[] {
    ensure()
    const r = db
      .prepare(
        `SELECT h.*, p.fullName as personName, a.id as assetId, a.assetTag, a.make, a.model
         FROM AssignmentHistory h
         LEFT JOIN Person p ON h.personId = p.id
         LEFT JOIN Asset a ON h.assetId = a.id
         ORDER BY h.assignedOn DESC LIMIT ?`
      )
      .all(limit)
    return rows<any>(r).map((h) => ({
      ...h,
      person: h.personName ? ({ id: h.personId, fullName: h.personName } as Person) : null,
      asset: { id: h.assetId, assetTag: h.assetTag, make: h.make, model: h.model },
    }))
  },
}

// ============ Asset Images ============
export const imageRepo = {
  listForAsset(assetId: string): AssetImage[] {
    ensure()
    return rows<AssetImage>(
      db.prepare('SELECT * FROM AssetImage WHERE assetId = ? ORDER BY createdAt DESC').all(assetId)
    )
  },
  get(id: string): AssetImage | null {
    ensure()
    return row<AssetImage>(db.prepare('SELECT * FROM AssetImage WHERE id = ?').get(id))
  },
  create(data: Partial<AssetImage>): AssetImage {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO AssetImage (id, assetId, fileName, filePath, mimeType, fileSize, processedText, ocrStatus, ocrEngine, parsedFields, createdAt, processedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.assetId ?? null,
      data.fileName,
      data.filePath,
      data.mimeType,
      data.fileSize,
      data.processedText ?? null,
      data.ocrStatus ?? 'Pending',
      data.ocrEngine ?? null,
      data.parsedFields ?? null,
      now,
      data.processedAt ?? null
    )
    return this.get(id)!
  },
  update(id: string, data: Partial<AssetImage>): AssetImage | null {
    ensure()
    const cur = this.get(id)
    if (!cur) return null
    const now = new Date().toISOString()
    db.prepare(
      `UPDATE AssetImage SET processedText = ?, ocrStatus = ?, ocrEngine = ?, parsedFields = ?, processedAt = ? WHERE id = ?`
    ).run(
      data.processedText ?? cur.processedText,
      data.ocrStatus ?? cur.ocrStatus,
      data.ocrEngine ?? cur.ocrEngine,
      data.parsedFields ?? cur.parsedFields,
      data.processedAt ?? now,
      id
    )
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM AssetImage WHERE id = ?').run(id)
  },
}

// ============ Dashboard ============
export function getDashboardStats(): DashboardStats {
  ensure()
  const totalRow = db.prepare('SELECT COUNT(*) as c FROM Asset').get() as { c: number }
  const totalAssets = totalRow.c

  const statusRows = db
    .prepare(
      `SELECT status, COUNT(*) as c FROM Asset GROUP BY status`
    )
    .all() as { status: string; c: number }[]
  const statusMap: Record<string, number> = {}
  for (const r of statusRows) statusMap[r.status] = r.c

  const typeRows = db
    .prepare(
      `SELECT t.name, COUNT(a.id) as count FROM AssetType t LEFT JOIN Asset a ON a.assetTypeId = t.id GROUP BY t.id ORDER BY count DESC`
    )
    .all() as { name: string; count: number }[]
  const deptRows = db
    .prepare(
      `SELECT d.name, COUNT(a.id) as count FROM Department d LEFT JOIN Asset a ON a.departmentId = d.id GROUP BY d.id ORDER BY count DESC`
    )
    .all() as { name: string; count: number }[]
  const locRows = db
    .prepare(
      `SELECT l.name, COUNT(a.id) as count FROM Location l LEFT JOIN Asset a ON a.locationId = l.id GROUP BY l.id ORDER BY count DESC`
    )
    .all() as { name: string; count: number }[]

  const valueRow = db.prepare('SELECT COALESCE(SUM(cost), 0) as v FROM Asset').get() as { v: number }
  const personsRow = db.prepare('SELECT COUNT(*) as c FROM Person').get() as { c: number }
  const deptsRow = db.prepare('SELECT COUNT(*) as c FROM Department').get() as { c: number }
  const locsRow = db.prepare('SELECT COUNT(*) as c FROM Location').get() as { c: number }

  // Warranty expiring in 30 days
  const in30 = new Date()
  in30.setDate(in30.getDate() + 30)
  const in30Str = in30.toISOString()
  const warrantyRow = db
    .prepare(
      `SELECT COUNT(*) as c FROM Asset WHERE warrantyExpiry IS NOT NULL AND warrantyExpiry <= ? AND warrantyExpiry > ?`
    )
    .get(in30Str, new Date().toISOString()) as { c: number }

  return {
    totalAssets,
    inUse: statusMap['In Use'] || 0,
    inStock: statusMap['In Stock'] || 0,
    repair: statusMap['Repair'] || 0,
    retired: statusMap['Retired'] || 0,
    lost: statusMap['Lost'] || 0,
    byType: typeRows.filter((r) => r.count > 0),
    byDepartment: deptRows.filter((r) => r.count > 0),
    byLocation: locRows.filter((r) => r.count > 0),
    byStatus: statusRows.map((r) => ({ status: r.status, count: r.c })),
    recentActivity: historyRepo.recent(10),
    totalValue: valueRow.v,
    totalPersons: personsRow.c,
    totalDepartments: deptsRow.c,
    totalLocations: locsRow.c,
    warrantyExpiringSoon: warrantyRow.c,
    vendors: vendorRepo.stats(),
    procurement: purchaseOrderRepo.stats(),
    disposals: disposalRepo.stats(),
  }
}

// ============ Activity Log / Audit Log ============
export const activityLogRepo = {
  log(action: string, entityType: string, entityId: string, details?: string, meta?: Record<string, unknown>): void {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO ActivityLog (id, action, entityType, entityId, details, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, action, entityType, entityId, details ?? null, now)
  },
  list(opts: { limit?: number; entityType?: string; entityId?: string; action?: string } = {}): ActivityLog[] {
    ensure()
    const limit = Math.min(opts.limit || 100, 500)
    const where: string[] = []
    const params: unknown[] = []
    if (opts.entityType) { where.push('entityType = ?'); params.push(opts.entityType) }
    if (opts.entityId) { where.push('entityId = ?'); params.push(opts.entityId) }
    if (opts.action) { where.push('action = ?'); params.push(opts.action) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const r = db.prepare(
      `SELECT * FROM ActivityLog ${whereSql} ORDER BY createdAt DESC LIMIT ?`
    ).all(...params, limit)
    return rows<ActivityLog>(r)
  },
  listForEntity(entityType: string, entityId: string): ActivityLog[] {
    return this.list({ entityType, entityId, limit: 50 })
  },
  recent(limit = 20): ActivityLog[] {
    return this.list({ limit })
  },
  count(): number {
    ensure()
    const r = db.prepare('SELECT COUNT(*) as c FROM ActivityLog').get() as { c: number }
    return r.c
  },
}

// ============ Maintenance Schedule ============
export interface MaintenanceQuery {
  assetId?: string
  status?: string
  type?: string
  from?: string
  to?: string
  limit?: number
}

export const maintenanceRepo = {
  list(opts: MaintenanceQuery = {}): MaintenanceSchedule[] {
    ensure()
    const limit = Math.min(opts.limit || 100, 500)
    const where: string[] = []
    const params: unknown[] = []
    if (opts.assetId) { where.push('m.assetId = ?'); params.push(opts.assetId) }
    if (opts.status) { where.push('m.status = ?'); params.push(opts.status) }
    if (opts.type) { where.push('m.type = ?'); params.push(opts.type) }
    if (opts.from) { where.push('m.scheduledFor >= ?'); params.push(opts.from) }
    if (opts.to) { where.push('m.scheduledFor <= ?'); params.push(opts.to) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const r = db.prepare(
      `SELECT m.*, a.assetTag, a.make, a.model, a.serialNumber, t.name as typeName
       FROM MaintenanceSchedule m
       LEFT JOIN Asset a ON m.assetId = a.id
       LEFT JOIN AssetType t ON a.assetTypeId = t.id
       ${whereSql}
       ORDER BY m.scheduledFor DESC LIMIT ?`
    ).all(...params, limit)
    return rows<MaintenanceSchedule & { assetTag?: string; make?: string; model?: string; serialNumber?: string; typeName?: string }>(r).map((m) => ({
      ...m,
      asset: {
        id: m.assetId,
        assetTag: (m as any).assetTag ?? null,
        make: (m as any).make ?? null,
        model: (m as any).model ?? null,
        serialNumber: (m as any).serialNumber ?? null,
        assetType: (m as any).typeName ? { id: '', name: (m as any).typeName } : undefined,
      } as Asset,
    }))
  },
  listForAsset(assetId: string): MaintenanceSchedule[] {
    return this.list({ assetId, limit: 50 })
  },
  get(id: string): MaintenanceSchedule | null {
    ensure()
    return row<MaintenanceSchedule>(db.prepare('SELECT * FROM MaintenanceSchedule WHERE id = ?').get(id))
  },
  create(data: Partial<MaintenanceSchedule>): MaintenanceSchedule {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO MaintenanceSchedule (id, assetId, type, title, description, scheduledFor, completedAt, status, cost, performedBy, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.assetId,
      data.type ?? 'Preventive',
      data.title,
      data.description ?? null,
      data.scheduledFor,
      data.completedAt ?? null,
      data.status ?? 'Scheduled',
      data.cost != null ? Number(data.cost) : null,
      data.performedBy ?? null,
      data.notes ?? null,
      now,
      now
    )
    activityLogRepo.log('maintenance.created', 'Asset', data.assetId!, `Scheduled maintenance: ${data.title}`)
    return this.get(id)!
  },
  update(id: string, data: Partial<MaintenanceSchedule>): MaintenanceSchedule | null {
    ensure()
    const cur = this.get(id)
    if (!cur) return null
    const now = new Date().toISOString()
    db.prepare(
      `UPDATE MaintenanceSchedule SET type = ?, title = ?, description = ?, scheduledFor = ?, completedAt = ?, status = ?, cost = ?, performedBy = ?, notes = ?, updatedAt = ? WHERE id = ?`
    ).run(
      data.type ?? cur.type,
      data.title ?? cur.title,
      data.description ?? cur.description,
      data.scheduledFor ?? cur.scheduledFor,
      data.completedAt ?? cur.completedAt,
      data.status ?? cur.status,
      data.cost != null ? Number(data.cost) : cur.cost,
      data.performedBy ?? cur.performedBy,
      data.notes ?? cur.notes,
      now,
      id
    )
    if (data.status && data.status !== cur.status) {
      activityLogRepo.log('maintenance.updated', 'Asset', cur.assetId, `Maintenance "${cur.title}" status: ${cur.status} → ${data.status}`)
    }
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    const m = this.get(id)
    db.prepare('DELETE FROM MaintenanceSchedule WHERE id = ?').run(id)
    if (m) activityLogRepo.log('maintenance.deleted', 'Asset', m.assetId, `Deleted maintenance: ${m.title}`)
  },
  upcoming(days = 30): MaintenanceSchedule[] {
    ensure()
    const now = new Date()
    const future = new Date(); future.setDate(now.getDate() + days)
    const r = db.prepare(
      `SELECT m.*, a.assetTag, a.make, a.model
       FROM MaintenanceSchedule m
       LEFT JOIN Asset a ON m.assetId = a.id
       WHERE m.status IN ('Scheduled','In Progress','Overdue')
       AND m.scheduledFor <= ?
       ORDER BY m.scheduledFor ASC LIMIT 50`
    ).all(future.toISOString())
    return rows<MaintenanceSchedule & { assetTag?: string; make?: string; model?: string }>(r).map((m) => ({
      ...m,
      asset: { id: m.assetId, assetTag: (m as any).assetTag, make: (m as any).make, model: (m as any).model } as Asset,
    }))
  },
  stats(): { total: number; scheduled: number; inProgress: number; completed: number; overdue: number } {
    ensure()
    const total = (db.prepare('SELECT COUNT(*) as c FROM MaintenanceSchedule').get() as { c: number }).c
    const scheduled = (db.prepare(`SELECT COUNT(*) as c FROM MaintenanceSchedule WHERE status='Scheduled'`).get() as { c: number }).c
    const inProgress = (db.prepare(`SELECT COUNT(*) as c FROM MaintenanceSchedule WHERE status='In Progress'`).get() as { c: number }).c
    const completed = (db.prepare(`SELECT COUNT(*) as c FROM MaintenanceSchedule WHERE status='Completed'`).get() as { c: number }).c
    const now = new Date().toISOString()
    const overdue = (db.prepare(`SELECT COUNT(*) as c FROM MaintenanceSchedule WHERE status IN ('Scheduled','In Progress') AND scheduledFor < ?`).get(now) as { c: number }).c
    return { total, scheduled, inProgress, completed, overdue }
  },
}

// ============ Software Licenses ============
export const licenseRepo = {
  list(): SoftwareLicense[] {
    ensure()
    const r = db.prepare(`
      SELECT sl.*,
        (SELECT COUNT(*) FROM AssetLicense al WHERE al.licenseId = sl.id) as _count_alloc
      FROM SoftwareLicense sl ORDER BY sl.name
    `).all()
    return rows<SoftwareLicense & { _count_alloc: number }>(r).map((l) => ({
      ...l,
      _count: { allocations: l._count_alloc },
      availableSeats: Math.max(0, l.seatsTotal - l.seatsUsed),
    }))
  },
  get(id: string): SoftwareLicense | null {
    ensure()
    return row<SoftwareLicense>(db.prepare('SELECT * FROM SoftwareLicense WHERE id = ?').get(id))
  },
  create(data: Partial<SoftwareLicense>): SoftwareLicense {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO SoftwareLicense (id, name, vendor, key, seatsTotal, seatsUsed, purchaseDate, expiryDate, cost, currency, category, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, data.name, data.vendor ?? null, data.key ?? null,
      Number(data.seatsTotal ?? 1), Number(data.seatsUsed ?? 0),
      data.purchaseDate ?? null, data.expiryDate ?? null,
      data.cost != null ? Number(data.cost) : null,
      data.currency ?? 'USD', data.category ?? null, data.notes ?? null,
      now, now
    )
    return this.get(id)!
  },
  update(id: string, data: Partial<SoftwareLicense>): SoftwareLicense | null {
    ensure()
    const cur = this.get(id)
    if (!cur) return null
    const now = new Date().toISOString()
    db.prepare(
      `UPDATE SoftwareLicense SET name = ?, vendor = ?, key = ?, seatsTotal = ?, seatsUsed = ?, purchaseDate = ?, expiryDate = ?, cost = ?, currency = ?, category = ?, notes = ?, updatedAt = ? WHERE id = ?`
    ).run(
      data.name ?? cur.name, data.vendor ?? cur.vendor, data.key ?? cur.key,
      data.seatsTotal != null ? Number(data.seatsTotal) : cur.seatsTotal,
      data.seatsUsed != null ? Number(data.seatsUsed) : cur.seatsUsed,
      data.purchaseDate ?? cur.purchaseDate, data.expiryDate ?? cur.expiryDate,
      data.cost != null ? Number(data.cost) : cur.cost,
      data.currency ?? cur.currency, data.category ?? cur.category, data.notes ?? cur.notes,
      now, id
    )
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM SoftwareLicense WHERE id = ?').run(id)
  },
  allocate(licenseId: string, assetId: string): AssetLicense {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO AssetLicense (id, assetId, licenseId, assignedAt, createdAt) VALUES (?, ?, ?, ?, ?)`
    ).run(id, assetId, licenseId, now, now)
    db.prepare(
      `UPDATE SoftwareLicense SET seatsUsed = (SELECT COUNT(*) FROM AssetLicense WHERE licenseId = ?), updatedAt = ? WHERE id = ?`
    ).run(licenseId, now, licenseId)
    activityLogRepo.log('license.allocated', 'Asset', assetId, `License allocated to asset`)
    return row<AssetLicense>(db.prepare('SELECT * FROM AssetLicense WHERE id = ?').get(id))!
  },
  deallocate(assetLicenseId: string): void {
    ensure()
    const al = row<AssetLicense>(db.prepare('SELECT * FROM AssetLicense WHERE id = ?').get(assetLicenseId))
    if (!al) return
    db.prepare('DELETE FROM AssetLicense WHERE id = ?').run(assetLicenseId)
    const now = new Date().toISOString()
    db.prepare(
      `UPDATE SoftwareLicense SET seatsUsed = (SELECT COUNT(*) FROM AssetLicense WHERE licenseId = ?), updatedAt = ? WHERE id = ?`
    ).run(al.licenseId, now, al.licenseId)
    activityLogRepo.log('license.deallocated', 'Asset', al.assetId, `License removed from asset`)
  },
  listForAsset(assetId: string): AssetLicense[] {
    ensure()
    const r = db.prepare(
      `SELECT al.*, sl.name as licName, sl.vendor as licVendor, sl.key as licKey, sl.category as licCategory, sl.expiryDate as licExpiry
       FROM AssetLicense al
       LEFT JOIN SoftwareLicense sl ON al.licenseId = sl.id
       WHERE al.assetId = ? ORDER BY al.assignedAt DESC`
    ).all(assetId)
    return rows<AssetLicense & { licName?: string; licVendor?: string; licKey?: string; licCategory?: string; licExpiry?: string }>(r).map((al) => ({
      ...al,
      license: al.licName ? {
        id: al.licenseId,
        name: al.licName,
        vendor: al.licVendor,
        key: al.licKey,
        category: al.licCategory,
        expiryDate: al.licExpiry,
      } as SoftwareLicense : undefined,
    }))
  },
  stats(): { total: number; totalSeats: number; usedSeats: number; expiringSoon: number; totalValue: number } {
    ensure()
    const r = db.prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(seatsTotal), 0) as totalSeats,
        COALESCE(SUM(seatsUsed), 0) as usedSeats,
        COALESCE(SUM(cost), 0) as totalValue
      FROM SoftwareLicense
    `).get() as { total: number; totalSeats: number; usedSeats: number; totalValue: number }
    const in30 = new Date(); in30.setDate(in30.getDate() + 30)
    const expRow = db.prepare(
      `SELECT COUNT(*) as c FROM SoftwareLicense WHERE expiryDate IS NOT NULL AND expiryDate <= ? AND expiryDate > ?`
    ).get(in30.toISOString(), new Date().toISOString()) as { c: number }
    return {
      total: r.total,
      totalSeats: r.totalSeats,
      usedSeats: r.usedSeats,
      totalValue: r.totalValue,
      expiringSoon: expRow.c,
    }
  },
}

// Hook activity logging into key asset operations
export function logAssetActivity(action: string, assetId: string, details?: string) {
  try {
    activityLogRepo.log(action, 'Asset', assetId, details)
  } catch {}
}

// ============ Checkout Requests ============
export interface CheckoutQuery {
  assetId?: string
  requestedById?: string
  status?: string
  requestType?: string
  limit?: number
}

export const checkoutRepo = {
  list(opts: CheckoutQuery = {}): CheckoutRequest[] {
    ensure()
    const limit = Math.min(opts.limit || 200, 500)
    const where: string[] = []
    const params: unknown[] = []
    if (opts.assetId) { where.push('c.assetId = ?'); params.push(opts.assetId) }
    if (opts.requestedById) { where.push('c.requestedById = ?'); params.push(opts.requestedById) }
    if (opts.status) { where.push('c.status = ?'); params.push(opts.status) }
    if (opts.requestType) { where.push('c.requestType = ?'); params.push(opts.requestType) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const r = db.prepare(
      `SELECT c.*,
        a.assetTag, a.make, a.model, a.serialNumber, t.name as typeName,
        p.fullName as requesterName, p.email as requesterEmail,
        ap.fullName as approverName
       FROM CheckoutRequest c
       LEFT JOIN Asset a ON c.assetId = a.id
       LEFT JOIN AssetType t ON a.assetTypeId = t.id
       LEFT JOIN Person p ON c.requestedById = p.id
       LEFT JOIN Person ap ON c.approvedById = ap.id
       ${whereSql}
       ORDER BY c.createdAt DESC LIMIT ?`
    ).all(...params, limit)
    return rows<CheckoutRequest & {
      assetTag?: string; make?: string; model?: string; serialNumber?: string; typeName?: string
      requesterName?: string; requesterEmail?: string; approverName?: string
    }>(r).map((c) => ({
      ...c,
      asset: c.assetTag ? {
        id: c.assetId,
        assetTag: (c as any).assetTag,
        make: (c as any).make,
        model: (c as any).model,
        serialNumber: (c as any).serialNumber,
        assetType: (c as any).typeName ? { id: '', name: (c as any).typeName } : undefined,
      } as Asset : undefined,
      requestedBy: c.requesterName ? {
        id: c.requestedById,
        fullName: (c as any).requesterName,
        email: (c as any).requesterEmail,
      } as Person : undefined,
      approvedBy: (c as any).approverName ? {
        id: c.approvedById!,
        fullName: (c as any).approverName,
      } as Person : null,
    }))
  },
  listForAsset(assetId: string): CheckoutRequest[] {
    return this.list({ assetId, limit: 50 })
  },
  get(id: string): CheckoutRequest | null {
    ensure()
    return row<CheckoutRequest>(db.prepare('SELECT * FROM CheckoutRequest WHERE id = ?').get(id))
  },
  create(data: Partial<CheckoutRequest>): CheckoutRequest {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO CheckoutRequest (id, assetId, requestedById, requestType, status, reason, requestedStartDate, requestedReturnDate, approvedById, approvedAt, decisionNotes, checkedOutAt, checkedInAt, actualReturnDate, conditionAtReturn, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.assetId,
      data.requestedById,
      data.requestType ?? 'Checkout',
      data.status ?? 'Pending',
      data.reason ?? null,
      data.requestedStartDate ?? now,
      data.requestedReturnDate ?? null,
      data.approvedById ?? null,
      data.approvedAt ?? null,
      data.decisionNotes ?? null,
      data.checkedOutAt ?? null,
      data.checkedInAt ?? null,
      data.actualReturnDate ?? null,
      data.conditionAtReturn ?? null,
      now,
      now
    )
    activityLogRepo.log('checkout.created', 'Asset', data.assetId!, `New ${data.requestType || 'Checkout'} request`)
    return this.get(id)!
  },
  update(id: string, data: Partial<CheckoutRequest>): CheckoutRequest | null {
    ensure()
    const cur = this.get(id)
    if (!cur) return null
    const now = new Date().toISOString()
    db.prepare(
      `UPDATE CheckoutRequest SET status = ?, reason = ?, requestedReturnDate = ?, approvedById = ?, approvedAt = ?, decisionNotes = ?, checkedOutAt = ?, checkedInAt = ?, actualReturnDate = ?, conditionAtReturn = ?, updatedAt = ? WHERE id = ?`
    ).run(
      data.status ?? cur.status,
      data.reason ?? cur.reason,
      data.requestedReturnDate ?? cur.requestedReturnDate,
      data.approvedById ?? cur.approvedById,
      data.approvedAt ?? cur.approvedAt,
      data.decisionNotes ?? cur.decisionNotes,
      data.checkedOutAt ?? cur.checkedOutAt,
      data.checkedInAt ?? cur.checkedInAt,
      data.actualReturnDate ?? cur.actualReturnDate,
      data.conditionAtReturn ?? cur.conditionAtReturn,
      now,
      id
    )
    if (data.status && data.status !== cur.status) {
      activityLogRepo.log('checkout.updated', 'Asset', cur.assetId, `Checkout request status: ${cur.status} → ${data.status}`)
    }
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM CheckoutRequest WHERE id = ?').run(id)
  },
  approve(id: string, approverId: string, notes?: string): CheckoutRequest | null {
    return this.update(id, {
      status: 'Approved',
      approvedById: approverId,
      approvedAt: new Date().toISOString(),
      decisionNotes: notes,
    })
  },
  reject(id: string, approverId: string, notes?: string): CheckoutRequest | null {
    return this.update(id, {
      status: 'Rejected',
      approvedById: approverId,
      approvedAt: new Date().toISOString(),
      decisionNotes: notes,
    })
  },
  checkOut(id: string): CheckoutRequest | null {
    return this.update(id, {
      status: 'Checked Out',
      checkedOutAt: new Date().toISOString(),
    })
  },
  checkIn(id: string, condition?: string): CheckoutRequest | null {
    return this.update(id, {
      status: 'Checked In',
      checkedInAt: new Date().toISOString(),
      actualReturnDate: new Date().toISOString(),
      conditionAtReturn: condition,
    })
  },
  stats(): { total: number; pending: number; approved: number; checkedOut: number; overdue: number; rejected: number } {
    ensure()
    const total = (db.prepare('SELECT COUNT(*) as c FROM CheckoutRequest').get() as { c: number }).c
    const pending = (db.prepare(`SELECT COUNT(*) as c FROM CheckoutRequest WHERE status='Pending'`).get() as { c: number }).c
    const approved = (db.prepare(`SELECT COUNT(*) as c FROM CheckoutRequest WHERE status='Approved'`).get() as { c: number }).c
    const checkedOut = (db.prepare(`SELECT COUNT(*) as c FROM CheckoutRequest WHERE status='Checked Out'`).get() as { c: number }).c
    const rejected = (db.prepare(`SELECT COUNT(*) as c FROM CheckoutRequest WHERE status='Rejected'`).get() as { c: number }).c
    const now = new Date().toISOString()
    const overdue = (db.prepare(
      `SELECT COUNT(*) as c FROM CheckoutRequest WHERE status='Checked Out' AND requestedReturnDate IS NOT NULL AND requestedReturnDate < ?`
    ).get(now) as { c: number }).c
    return { total, pending, approved, checkedOut, overdue, rejected }
  },
}

// ============ Depreciation Rules & Calculations ============
export const depreciationRepo = {
  list(): DepreciationRule[] {
    ensure()
    const r = db.prepare(`
      SELECT d.*, t.name as typeName
      FROM DepreciationRule d
      LEFT JOIN AssetType t ON d.assetTypeId = t.id
      ORDER BY d.name
    `).all()
    return rows<DepreciationRule & { typeName?: string }>(r).map((d) => ({
      ...d,
      isActive: Boolean((d as any).isActive),
      assetType: (d as any).typeName ? { id: d.assetTypeId!, name: (d as any).typeName } : null,
    }))
  },
  get(id: string): DepreciationRule | null {
    ensure()
    const r = row<DepreciationRule & { typeName?: string }>(db.prepare(`
      SELECT d.*, t.name as typeName FROM DepreciationRule d
      LEFT JOIN AssetType t ON d.assetTypeId = t.id WHERE d.id = ?
    `).get(id))
    if (!r) return null
    return { ...r, isActive: Boolean((r as any).isActive), assetType: (r as any).typeName ? { id: r.assetTypeId!, name: (r as any).typeName } : null }
  },
  findByAssetType(assetTypeId: string): DepreciationRule | null {
    ensure()
    // Look for asset-type-specific rule first, then fall back to global
    let r = row<DepreciationRule & { typeName?: string }>(db.prepare(`
      SELECT d.*, t.name as typeName FROM DepreciationRule d
      LEFT JOIN AssetType t ON d.assetTypeId = t.id
      WHERE d.assetTypeId = ? AND d.isActive = 1
    `).get(assetTypeId))
    if (!r) {
      r = row<DepreciationRule & { typeName?: string }>(db.prepare(`
        SELECT d.*, NULL as typeName FROM DepreciationRule d
        WHERE d.assetTypeId IS NULL AND d.isActive = 1
        ORDER BY d.createdAt ASC LIMIT 1
      `).get())
    }
    if (!r) return null
    return { ...r, isActive: Boolean((r as any).isActive), assetType: (r as any).typeName ? { id: r.assetTypeId!, name: (r as any).typeName } : null }
  },
  create(data: Partial<DepreciationRule>): DepreciationRule {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO DepreciationRule (id, name, assetTypeId, method, usefulLifeYears, salvageValuePercent, description, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, data.name, data.assetTypeId ?? null, data.method ?? 'straight-line',
      Number(data.usefulLifeYears ?? 4), Number(data.salvageValuePercent ?? 0),
      data.description ?? null, data.isActive === false ? 0 : 1, now, now
    )
    return this.get(id)!
  },
  update(id: string, data: Partial<DepreciationRule>): DepreciationRule | null {
    ensure()
    const cur = this.get(id)
    if (!cur) return null
    const now = new Date().toISOString()
    db.prepare(
      `UPDATE DepreciationRule SET name = ?, assetTypeId = ?, method = ?, usefulLifeYears = ?, salvageValuePercent = ?, description = ?, isActive = ?, updatedAt = ? WHERE id = ?`
    ).run(
      data.name ?? cur.name, data.assetTypeId ?? cur.assetTypeId,
      data.method ?? cur.method,
      data.usefulLifeYears != null ? Number(data.usefulLifeYears) : cur.usefulLifeYears,
      data.salvageValuePercent != null ? Number(data.salvageValuePercent) : cur.salvageValuePercent,
      data.description ?? cur.description,
      data.isActive != null ? (data.isActive ? 1 : 0) : (cur.isActive ? 1 : 0),
      now, id
    )
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM DepreciationRule WHERE id = ?').run(id)
  },
  calculate(asset: Asset): DepreciationCalc | null {
    if (asset.cost == null || asset.cost <= 0 || !asset.purchaseDate) {
      return null
    }
    const rule = this.findByAssetType(asset.assetTypeId)
    const usefulLifeYears = rule?.usefulLifeYears ?? 4
    const salvagePercent = rule?.salvageValuePercent ?? 0
    const method = rule?.method ?? 'straight-line'

    const purchaseCost = asset.cost
    const salvageValue = purchaseCost * (salvagePercent / 100)
    const depreciableAmount = purchaseCost - salvageValue

    const purchaseDate = new Date(asset.purchaseDate)
    const now = new Date()
    const yearsElapsed = Math.max(0, (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 3600 * 1000))
    const yearsElapsedRounded = Math.floor(yearsElapsed)
    const yearsRemaining = Math.max(0, usefulLifeYears - yearsElapsedRounded)

    let currentValue = purchaseCost
    let annualDepreciation = 0
    let depreciationPercent = 0

    if (method === 'straight-line') {
      annualDepreciation = depreciableAmount / usefulLifeYears
      const depreciation = Math.min(depreciableAmount, annualDepreciation * yearsElapsed)
      currentValue = purchaseCost - depreciation
      depreciationPercent = (depreciation / purchaseCost) * 100
    } else if (method === 'declining-balance') {
      // Double declining balance
      const rate = (2 / usefulLifeYears)
      let bookValue = purchaseCost
      let year = 0
      while (year < yearsElapsedRounded && bookValue > salvageValue) {
        const dep = Math.max(0, bookValue * rate)
        bookValue = Math.max(salvageValue, bookValue - dep)
        year++
      }
      currentValue = bookValue
      annualDepreciation = currentValue * rate
      depreciationPercent = ((purchaseCost - currentValue) / purchaseCost) * 100
    } else {
      // units-of-production: treat years as "units" (fallback simple straight-line)
      annualDepreciation = depreciableAmount / usefulLifeYears
      const depreciation = Math.min(depreciableAmount, annualDepreciation * yearsElapsed)
      currentValue = purchaseCost - depreciation
      depreciationPercent = (depreciation / purchaseCost) * 100
    }

    const depreciation = purchaseCost - currentValue
    const isFullyDepreciated = currentValue <= salvageValue || yearsElapsedRounded >= usefulLifeYears

    return {
      asset,
      rule,
      purchaseCost,
      currentValue: Math.round(currentValue * 100) / 100,
      depreciation: Math.round(depreciation * 100) / 100,
      depreciationPercent: Math.round(depreciationPercent * 100) / 100,
      yearsElapsed: Math.round(yearsElapsed * 100) / 100,
      yearsRemaining,
      annualDepreciation: Math.round(annualDepreciation * 100) / 100,
      salvageValue: Math.round(salvageValue * 100) / 100,
      method,
      isFullyDepreciated,
    }
  },
  calculateForAll(): DepreciationCalc[] {
    ensure()
    const assets = db.prepare(`
      SELECT a.*, t.name as typeName FROM Asset a
      LEFT JOIN AssetType t ON a.assetTypeId = t.id
      WHERE a.cost IS NOT NULL AND a.cost > 0 AND a.purchaseDate IS NOT NULL
      ORDER BY a.assetTag
    `).all() as any[]
    const results: DepreciationCalc[] = []
    for (const a of assets) {
      const asset: Asset = {
        ...a,
        assetType: a.typeName ? { id: a.assetTypeId, name: a.typeName } : undefined,
      } as Asset
      const calc = this.calculate(asset)
      if (calc) results.push(calc)
    }
    return results
  },
  stats(): { totalAssets: number; totalPurchaseValue: number; totalCurrentValue: number; totalDepreciation: number; fullyDepreciatedCount: number } {
    const calcs = this.calculateForAll()
    return {
      totalAssets: calcs.length,
      totalPurchaseValue: Math.round(calcs.reduce((s, c) => s + c.purchaseCost, 0) * 100) / 100,
      totalCurrentValue: Math.round(calcs.reduce((s, c) => s + c.currentValue, 0) * 100) / 100,
      totalDepreciation: Math.round(calcs.reduce((s, c) => s + c.depreciation, 0) * 100) / 100,
      fullyDepreciatedCount: calcs.filter((c) => c.isFullyDepreciated).length,
    }
  },
}

// ============ Notifications ============
export const notificationRepo = {
  list(opts: { limit?: number; onlyUnread?: boolean; type?: string } = {}): AppNotification[] {
    ensure()
    const limit = Math.min(opts.limit || 100, 500)
    const where: string[] = []
    const params: unknown[] = []
    if (opts.onlyUnread) { where.push('isRead = 0') }
    if (opts.type) { where.push('type = ?'); params.push(opts.type) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const r = db.prepare(
      `SELECT * FROM Notification ${whereSql} ORDER BY createdAt DESC LIMIT ?`
    ).all(...params, limit)
    return rows<AppNotification>(r).map((n) => ({ ...n, isRead: Boolean((n as any).isRead) }))
  },
  create(data: Partial<AppNotification>): AppNotification {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO Notification (id, type, severity, title, message, entityType, entityId, isRead, actionUrl, actionLabel, createdAt, readAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL)`
    ).run(
      id, data.type, data.severity ?? 'info', data.title, data.message,
      data.entityType ?? null, data.entityId ?? null,
      data.actionUrl ?? null, data.actionLabel ?? null, now
    )
    return row<AppNotification>(db.prepare('SELECT * FROM Notification WHERE id = ?').get(id))!
  },
  markRead(id: string): void {
    ensure()
    db.prepare('UPDATE Notification SET isRead = 1, readAt = ? WHERE id = ?')
      .run(new Date().toISOString(), id)
  },
  markAllRead(): void {
    ensure()
    db.prepare('UPDATE Notification SET isRead = 1, readAt = ? WHERE isRead = 0')
      .run(new Date().toISOString())
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM Notification WHERE id = ?').run(id)
  },
  clearAll(): void {
    ensure()
    db.prepare('DELETE FROM Notification').run()
  },
  count(opts: { onlyUnread?: boolean } = {}): number {
    ensure()
    const sql = opts.onlyUnread ? `SELECT COUNT(*) as c FROM Notification WHERE isRead = 0` : `SELECT COUNT(*) as c FROM Notification`
    return (db.prepare(sql).get() as { c: number }).c
  },
  // Generate notifications from system state (warranty, maintenance overdue, license expiring)
  regenerateSystemNotifications(): { created: number; cleared: number } {
    ensure()
    // Clear existing system notifications
    const cleared = (db.prepare(`DELETE FROM Notification WHERE type IN ('warranty_expiring','maintenance_overdue','license_expiring','license_expired','low_stock')`).run() as any).changes || 0
    let created = 0
    const now = new Date()
    const in30 = new Date(); in30.setDate(now.getDate() + 30)
    const in7 = new Date(); in7.setDate(now.getDate() + 7)

    // Warranty expiring
    const warrantyRows = db.prepare(`
      SELECT id, assetTag, make, model, warrantyExpiry FROM Asset
      WHERE warrantyExpiry IS NOT NULL AND warrantyExpiry > ? AND warrantyExpiry <= ?
    `).all(now.toISOString(), in30.toISOString()) as any[]
    for (const a of warrantyRows) {
      this.create({
        type: 'warranty_expiring',
        severity: 'warning',
        title: 'Warranty Expiring Soon',
        message: `${a.make} ${a.model} (${a.assetTag}) warranty expires soon`,
        entityType: 'Asset',
        entityId: a.id,
        actionUrl: 'asset-detail',
        actionLabel: 'View Asset',
      })
      created++
    }

    // Maintenance overdue
    const overdueMaint = db.prepare(`
      SELECT m.id, m.title, m.scheduledFor, a.assetTag, a.make, a.model, a.id as assetId
      FROM MaintenanceSchedule m
      LEFT JOIN Asset a ON m.assetId = a.id
      WHERE m.status IN ('Scheduled','In Progress') AND m.scheduledFor < ?
    `).all(now.toISOString()) as any[]
    for (const m of overdueMaint) {
      this.create({
        type: 'maintenance_overdue',
        severity: 'critical',
        title: 'Maintenance Overdue',
        message: `"${m.title}" for ${m.make} ${m.model} (${m.assetTag}) was due ${new Date(m.scheduledFor).toLocaleDateString()}`,
        entityType: 'Asset',
        entityId: m.assetId,
        actionUrl: 'maintenance',
        actionLabel: 'View Maintenance',
      })
      created++
    }

    // License expiring soon
    const expiringLic = db.prepare(`
      SELECT id, name, vendor, expiryDate FROM SoftwareLicense
      WHERE expiryDate IS NOT NULL AND expiryDate > ? AND expiryDate <= ?
    `).all(now.toISOString(), in30.toISOString()) as any[]
    for (const l of expiringLic) {
      this.create({
        type: 'license_expiring',
        severity: 'warning',
        title: 'License Expiring Soon',
        message: `${l.name} (${l.vendor || 'vendor'}) expires ${new Date(l.expiryDate).toLocaleDateString()}`,
        entityType: 'License',
        entityId: l.id,
        actionUrl: 'licenses',
        actionLabel: 'View Licenses',
      })
      created++
    }

    // License already expired
    const expiredLic = db.prepare(`
      SELECT id, name, vendor, expiryDate FROM SoftwareLicense
      WHERE expiryDate IS NOT NULL AND expiryDate < ?
    `).all(now.toISOString()) as any[]
    for (const l of expiredLic) {
      this.create({
        type: 'license_expired',
        severity: 'critical',
        title: 'License Expired',
        message: `${l.name} (${l.vendor || 'vendor'}) expired ${new Date(l.expiryDate).toLocaleDateString()}`,
        entityType: 'License',
        entityId: l.id,
        actionUrl: 'licenses',
        actionLabel: 'View Licenses',
      })
      created++
    }

    return { created, cleared }
  },
}

// ============ Vendors ============
export const vendorRepo = {
  list(): Vendor[] {
    ensure()
    const r = db.prepare(`
      SELECT v.*,
        (SELECT COUNT(*) FROM PurchaseOrder po WHERE po.vendorId = v.id) as _count_purchaseOrders,
        COALESCE((SELECT SUM(po.totalAmount) FROM PurchaseOrder po WHERE po.vendorId = v.id AND po.status NOT IN ('Draft','Cancelled')), 0) as _sum_totalSpent
      FROM Vendor v
      ORDER BY v.name
    `).all()
    return rows<Vendor & { _count_purchaseOrders: number; _sum_totalSpent: number }>(r).map((v) => ({
      ...v,
      isActive: toBool(v.isActive),
      rating: Number(v.rating) || 0,
      _count: { purchaseOrders: v._count_purchaseOrders },
      _sum: { totalSpent: v._sum_totalSpent },
    }))
  },
  get(id: string): Vendor | null {
    ensure()
    const r = row<Vendor>(db.prepare('SELECT * FROM Vendor WHERE id = ?').get(id))
    if (!r) return null
    return { ...r, isActive: toBool(r.isActive), rating: Number(r.rating) || 0 }
  },
  create(data: Partial<Vendor>): Vendor {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO Vendor (id, name, category, contactPerson, email, phone, website, address, taxId, paymentTerms, rating, isActive, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, data.name, data.category ?? null, data.contactPerson ?? null, data.email ?? null,
      data.phone ?? null, data.website ?? null, data.address ?? null, data.taxId ?? null,
      data.paymentTerms ?? null, data.rating ?? 0, data.isActive === false ? 0 : 1,
      data.notes ?? null, now, now
    )
    return this.get(id)!
  },
  update(id: string, data: Partial<Vendor>): Vendor | null {
    ensure()
    const cur = this.get(id)
    if (!cur) return null
    const now = new Date().toISOString()
    db.prepare(
      `UPDATE Vendor SET name = ?, category = ?, contactPerson = ?, email = ?, phone = ?, website = ?, address = ?, taxId = ?, paymentTerms = ?, rating = ?, isActive = ?, notes = ?, updatedAt = ? WHERE id = ?`
    ).run(
      data.name ?? cur.name, data.category ?? cur.category, data.contactPerson ?? cur.contactPerson,
      data.email ?? cur.email, data.phone ?? cur.phone, data.website ?? cur.website,
      data.address ?? cur.address, data.taxId ?? cur.taxId, data.paymentTerms ?? cur.paymentTerms,
      data.rating ?? cur.rating, data.isActive === false ? 0 : 1, data.notes ?? cur.notes, now, id
    )
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM Vendor WHERE id = ?').run(id)
  },
  stats() {
    ensure()
    const total = (db.prepare('SELECT COUNT(*) as c FROM Vendor').get() as { c: number }).c
    const active = (db.prepare('SELECT COUNT(*) as c FROM Vendor WHERE isActive = 1').get() as { c: number }).c
    return { total, active }
  },
}

// ============ Purchase Orders ============
export const purchaseOrderRepo = {
  _attachRelations(po: PurchaseOrder): PurchaseOrder {
    if (!po) return po
    const vendor = row<Vendor>(db.prepare('SELECT * FROM Vendor WHERE id = ?').get(po.vendorId))
    const requestedBy = po.requestedById
      ? row<Person>(db.prepare('SELECT * FROM Person WHERE id = ?').get(po.requestedById))
      : null
    const approvedBy = po.approvedById
      ? row<Person>(db.prepare('SELECT * FROM Person WHERE id = ?').get(po.approvedById))
      : null
    const items = rows<PurchaseOrderItem>(
      db.prepare(`
        SELECT poi.*, at.name as _at_name, at.icon as _at_icon, at.description as _at_desc
        FROM PurchaseOrderItem poi
        LEFT JOIN AssetType at ON poi.assetTypeId = at.id
        WHERE poi.poId = ?
        ORDER BY poi.createdAt
      `).all(po.id)
    ).map((it: any) => ({
      ...it,
      assetType: it._at_name ? { id: it.assetTypeId, name: it._at_name, icon: it._at_icon, description: it._at_desc } : null,
    })) as PurchaseOrderItem[]
    return {
      ...po,
      vendor: vendor ? { ...vendor, isActive: toBool(vendor.isActive), rating: Number(vendor.rating) || 0 } : undefined,
      requestedBy: requestedBy || null,
      approvedBy: approvedBy || null,
      items,
      _count: { items: items.length },
    }
  },
  list(): PurchaseOrder[] {
    ensure()
    const r = rows<PurchaseOrder>(
      db.prepare('SELECT * FROM PurchaseOrder ORDER BY orderDate DESC, createdAt DESC').all()
    )
    return r.map((po) => this._attachRelations(po))
  },
  get(id: string): PurchaseOrder | null {
    ensure()
    const po = row<PurchaseOrder>(db.prepare('SELECT * FROM PurchaseOrder WHERE id = ?').get(id))
    if (!po) return null
    return this._attachRelations(po)
  },
  create(data: Partial<PurchaseOrder> & { items?: Partial<PurchaseOrderItem>[] }): PurchaseOrder {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    const poNumber = data.poNumber || `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
    const orderDate = data.orderDate || now
    const subtotal = (data.items || []).reduce((s, it) => s + (Number(it.totalPrice) || (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)), 0)
    const taxRate = Number(data.taxRate) || 0
    const taxAmount = (subtotal * taxRate) / 100
    const shippingCost = Number(data.shippingCost) || 0
    const totalAmount = subtotal + taxAmount + shippingCost
    db.prepare(
      `INSERT INTO PurchaseOrder (id, poNumber, vendorId, status, orderDate, expectedDate, receivedDate, subtotal, taxRate, taxAmount, shippingCost, totalAmount, currency, requestedById, approvedById, approvedAt, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, poNumber, data.vendorId, data.status || 'Draft', orderDate,
      data.expectedDate ?? null, data.receivedDate ?? null, subtotal, taxRate, taxAmount, shippingCost,
      totalAmount, data.currency || 'USD', data.requestedById ?? null, data.approvedById ?? null,
      data.approvedAt ?? null, data.notes ?? null, now, now
    )
    // Insert items
    if (data.items && data.items.length > 0) {
      const insItem = db.prepare(
        `INSERT INTO PurchaseOrderItem (id, poId, assetTypeId, description, quantity, unitPrice, totalPrice, receivedQuantity, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      for (const it of data.items) {
        const qty = Number(it.quantity) || 1
        const unit = Number(it.unitPrice) || 0
        insItem.run(
          generateId(), id, it.assetTypeId ?? null, it.description || 'Item',
          qty, unit, Number(it.totalPrice) || qty * unit, Number(it.receivedQuantity) || 0,
          it.notes ?? null, now
        )
      }
    }
    return this.get(id)!
  },
  update(id: string, data: Partial<PurchaseOrder> & { items?: Partial<PurchaseOrderItem>[] }): PurchaseOrder | null {
    ensure()
    const cur = this.get(id)
    if (!cur) return null
    const now = new Date().toISOString()
    const items = data.items !== undefined ? data.items : cur.items
    const subtotal = (items || []).reduce((s, it) => s + (Number(it.totalPrice) || (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)), 0)
    const taxRate = data.taxRate !== undefined ? Number(data.taxRate) : cur.taxRate
    const taxAmount = (subtotal * taxRate) / 100
    const shippingCost = data.shippingCost !== undefined ? Number(data.shippingCost) : cur.shippingCost
    const totalAmount = subtotal + taxAmount + shippingCost
    db.prepare(
      `UPDATE PurchaseOrder SET vendorId = ?, status = ?, orderDate = ?, expectedDate = ?, receivedDate = ?, subtotal = ?, taxRate = ?, taxAmount = ?, shippingCost = ?, totalAmount = ?, currency = ?, requestedById = ?, approvedById = ?, approvedAt = ?, notes = ?, updatedAt = ? WHERE id = ?`
    ).run(
      data.vendorId ?? cur.vendorId, data.status ?? cur.status, data.orderDate ?? cur.orderDate,
      data.expectedDate ?? cur.expectedDate, data.receivedDate ?? cur.receivedDate,
      subtotal, taxRate, taxAmount, shippingCost, totalAmount,
      data.currency ?? cur.currency, data.requestedById ?? cur.requestedById,
      data.approvedById ?? cur.approvedById, data.approvedAt ?? cur.approvedAt,
      data.notes ?? cur.notes, now, id
    )
    if (data.items !== undefined) {
      db.prepare('DELETE FROM PurchaseOrderItem WHERE poId = ?').run(id)
      const insItem = db.prepare(
        `INSERT INTO PurchaseOrderItem (id, poId, assetTypeId, description, quantity, unitPrice, totalPrice, receivedQuantity, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      for (const it of data.items) {
        const qty = Number(it.quantity) || 1
        const unit = Number(it.unitPrice) || 0
        insItem.run(
          generateId(), id, it.assetTypeId ?? null, it.description || 'Item',
          qty, unit, Number(it.totalPrice) || qty * unit, Number(it.receivedQuantity) || 0,
          it.notes ?? null, now
        )
      }
    }
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM PurchaseOrder WHERE id = ?').run(id)
  },
  listForVendor(vendorId: string): PurchaseOrder[] {
    ensure()
    const r = rows<PurchaseOrder>(
      db.prepare('SELECT * FROM PurchaseOrder WHERE vendorId = ? ORDER BY orderDate DESC').all(vendorId)
    )
    return r.map((po) => this._attachRelations(po))
  },
  stats() {
    ensure()
    const total = (db.prepare('SELECT COUNT(*) as c FROM PurchaseOrder').get() as { c: number }).c
    const pendingApproval = (db.prepare(`SELECT COUNT(*) as c FROM PurchaseOrder WHERE status = 'Pending Approval'`).get() as { c: number }).c
    const open = (db.prepare(`SELECT COUNT(*) as c FROM PurchaseOrder WHERE status IN ('Draft','Pending Approval','Approved','Ordered','Partially Received')`).get() as { c: number }).c
    const received = (db.prepare(`SELECT COUNT(*) as c FROM PurchaseOrder WHERE status IN ('Received','Closed')`).get() as { c: number }).c
    const spent = (db.prepare(`SELECT COALESCE(SUM(totalAmount), 0) as s FROM PurchaseOrder WHERE status NOT IN ('Draft','Cancelled')`).get() as { s: number }).s
    return { totalPOs: total, pendingApproval, open, received, totalSpent: spent }
  },
}

// ============ Asset Disposals ============
export const disposalRepo = {
  _attachRelations(d: AssetDisposal): AssetDisposal {
    if (!d) return d
    const asset = row<Asset>(
      db.prepare(`
        SELECT a.*, at.name as _at_name, at.icon as _at_icon
        FROM Asset a LEFT JOIN AssetType at ON a.assetTypeId = at.id
        WHERE a.id = ?
      `).get(d.assetId)
    ) as any
    if (asset) {
      asset.assetType = asset._at_name ? { id: asset.assetTypeId, name: asset._at_name, icon: asset._at_icon } : null
    }
    const approvedBy = d.approvedById
      ? row<Person>(db.prepare('SELECT * FROM Person WHERE id = ?').get(d.approvedById))
      : null
    return {
      ...d,
      environmentalCompliant: toBool(d.environmentalCompliant),
      residualValue: Number(d.residualValue) || 0,
      disposalCost: Number(d.disposalCost) || 0,
      netProceeds: Number(d.netProceeds) || 0,
      asset: asset || undefined,
      approvedBy: approvedBy || null,
    }
  },
  list(): AssetDisposal[] {
    ensure()
    const r = rows<AssetDisposal>(
      db.prepare('SELECT * FROM AssetDisposal ORDER BY disposalDate DESC, createdAt DESC').all()
    )
    return r.map((d) => this._attachRelations(d))
  },
  get(id: string): AssetDisposal | null {
    ensure()
    const d = row<AssetDisposal>(db.prepare('SELECT * FROM AssetDisposal WHERE id = ?').get(id))
    if (!d) return null
    return this._attachRelations(d)
  },
  listForAsset(assetId: string): AssetDisposal[] {
    ensure()
    const r = rows<AssetDisposal>(
      db.prepare('SELECT * FROM AssetDisposal WHERE assetId = ? ORDER BY disposalDate DESC').all(assetId)
    )
    return r.map((d) => this._attachRelations(d))
  },
  create(data: Partial<AssetDisposal>): AssetDisposal {
    ensure()
    const id = generateId()
    const now = new Date().toISOString()
    const disposalNumber = data.disposalNumber || `DISP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
    const residualValue = Number(data.residualValue) || 0
    const disposalCost = Number(data.disposalCost) || 0
    const netProceeds = residualValue - disposalCost
    db.prepare(
      `INSERT INTO AssetDisposal (id, assetId, disposalNumber, method, reason, disposalDate, residualValue, disposalCost, netProceeds, buyerRecipient, conditionAtDisposal, environmentalCompliant, certificateNumber, approvedById, approvedAt, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, data.assetId, disposalNumber, data.method || 'Sold', data.reason ?? null,
      data.disposalDate || now, residualValue, disposalCost, netProceeds,
      data.buyerRecipient ?? null, data.conditionAtDisposal ?? null,
      data.environmentalCompliant === false ? 0 : 1, data.certificateNumber ?? null,
      data.approvedById ?? null, data.approvedAt ?? null, data.notes ?? null, now, now
    )
    // Mark asset as Retired
    db.prepare("UPDATE Asset SET status = 'Retired', updatedAt = ? WHERE id = ?").run(now, data.assetId!)
    return this.get(id)!
  },
  update(id: string, data: Partial<AssetDisposal>): AssetDisposal | null {
    ensure()
    const cur = this.get(id)
    if (!cur) return null
    const now = new Date().toISOString()
    const residualValue = data.residualValue !== undefined ? Number(data.residualValue) : cur.residualValue
    const disposalCost = data.disposalCost !== undefined ? Number(data.disposalCost) : cur.disposalCost
    const netProceeds = residualValue - disposalCost
    db.prepare(
      `UPDATE AssetDisposal SET method = ?, reason = ?, disposalDate = ?, residualValue = ?, disposalCost = ?, netProceeds = ?, buyerRecipient = ?, conditionAtDisposal = ?, environmentalCompliant = ?, certificateNumber = ?, approvedById = ?, approvedAt = ?, notes = ?, updatedAt = ? WHERE id = ?`
    ).run(
      data.method ?? cur.method, data.reason ?? cur.reason, data.disposalDate ?? cur.disposalDate,
      residualValue, disposalCost, netProceeds,
      data.buyerRecipient ?? cur.buyerRecipient, data.conditionAtDisposal ?? cur.conditionAtDisposal,
      data.environmentalCompliant === false ? 0 : 1, data.certificateNumber ?? cur.certificateNumber,
      data.approvedById ?? cur.approvedById, data.approvedAt ?? cur.approvedAt,
      data.notes ?? cur.notes, now, id
    )
    return this.get(id)
  },
  delete(id: string): void {
    ensure()
    db.prepare('DELETE FROM AssetDisposal WHERE id = ?').run(id)
  },
  stats() {
    ensure()
    const total = (db.prepare('SELECT COUNT(*) as c FROM AssetDisposal').get() as { c: number }).c
    const recovered = (db.prepare(`SELECT COALESCE(SUM(netProceeds), 0) as s FROM AssetDisposal WHERE method IN ('Sold','Trade-in','Recycled')`).get() as { s: number }).s
    const cost = (db.prepare(`SELECT COALESCE(SUM(disposalCost), 0) as s FROM AssetDisposal`).get() as { s: number }).s
    const pending = (db.prepare(`SELECT COUNT(*) as c FROM AssetDisposal WHERE approvedById IS NULL`).get() as { c: number }).c
    return { total, totalRecovered: recovered, totalCost: cost, pendingApproval: pending }
  },
}
