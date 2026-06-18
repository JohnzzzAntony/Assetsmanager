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
  }
}
