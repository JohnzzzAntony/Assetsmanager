// Seed data for IT Asset Manager
// Round 10: complete rewrite — wipes all tables and re-seeds from the uploaded
// Excel file at /home/z/my-project/scripts/excel_data.json (461 rows across 14 sheets).
import { db, initDb, generateId } from './db'
import fs from 'node:fs'
import path from 'node:path'

// Hard-coded absolute path so the seed works regardless of the Next.js cwd.
const EXCEL_JSON_PATH = path.join(process.cwd(), 'scripts', 'excel_data.json')

// Sheet name → canonical AssetType name + tag prefix + icon.
const SHEET_CONFIG: Record<
  string,
  { typeName: string; tagPrefix: string; icon: string }
> = {
  Desktop: { typeName: 'Desktop', tagPrefix: 'DSK', icon: 'Monitor' },
  Laptop: { typeName: 'Laptop', tagPrefix: 'LAP', icon: 'Laptop' },
  MobileTablet: { typeName: 'Mobile', tagPrefix: 'MOB', icon: 'Smartphone' },
  PrinterScanner: { typeName: 'Printer', tagPrefix: 'PRT', icon: 'Printer' },
  PDT: { typeName: 'PDT', tagPrefix: 'PDT', icon: 'Smartphone' },
  Other: { typeName: 'Other', tagPrefix: 'OTH', icon: 'Package' },
  POS: { typeName: 'POS', tagPrefix: 'POS', icon: 'Monitor' },
  'Bill printer': { typeName: 'Bill Printer', tagPrefix: 'BPR', icon: 'Printer' },
  'Weighing Scale': { typeName: 'Weighing Scale', tagPrefix: 'WSC', icon: 'Scale' },
  Biometric: { typeName: 'Biometric', tagPrefix: 'BIO', icon: 'Fingerprint' },
  NVR: { typeName: 'NVR', tagPrefix: 'NVR', icon: 'HardDrive' },
  Firewall: { typeName: 'Firewall', tagPrefix: 'FWL', icon: 'Shield' },
  Router: { typeName: 'Router', tagPrefix: 'RTR', icon: 'Router' },
  Switch: { typeName: 'Switch', tagPrefix: 'SWT', icon: 'Network' },
}

interface ExcelSheet {
  assetType: string
  headers: string[]
  rows: Array<Record<string, unknown>>
}

interface ExcelData {
  [sheetName: string]: ExcelSheet
}

function pad(n: number, len = 4): string {
  return String(n).padStart(len, '0')
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') {
    const t = v.trim()
    return t.length === 0 ? null : t
  }
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Math.trunc(v)
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function toDate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  const s = typeof v === 'string' ? v.trim() : String(v)
  if (s.length === 0) return null
  // Excel strings look like "2023-05-15 00:00:00" — Date can parse that.
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in row && row[k] !== null && row[k] !== undefined && row[k] !== '') return row[k]
  }
  return null
}

function mapWeighingStatus(raw: string | null): string {
  if (!raw) return 'In Use'
  const s = raw.toLowerCase().trim()
  if (s === 'working' || s === 'ok' || s === 'active') return 'In Use'
  if (s === 'not working' || s === 'broken' || s === 'faulty') return 'Repair'
  if (s === 'disposed' || s === 'sold') return 'Retired'
  if (s === 'lost' || s === 'missing') return 'Lost'
  // Unknown values default to In Use
  return 'In Use'
}

export function seedDatabase(opts: { force?: boolean } = {}) {
  initDb()

  // Round 10 seed is IDEMPOTENT: always wipe + re-insert from Excel.
  // (We ignore `force` and `skipped` since we want the data to always reflect Excel.)
  const tableNames = [
    'AssetAuditItem', 'AssetAudit', 'AssetTagLink', 'AssetTag', 'AssetBooking',
    'AssetImage', 'AssignmentHistory', 'ActivityLog', 'MaintenanceSchedule',
    'AssetLicense', 'SoftwareLicense', 'CheckoutRequest', 'DepreciationRule',
    'Notification', 'PurchaseOrderItem', 'PurchaseOrder', 'Vendor',
    'AssetDisposal', 'SavedReport',
    'Asset', 'Person', 'Department', 'Location', 'AssetType',
  ]
  for (const t of tableNames) {
    try { db.exec(`DELETE FROM ${t}`) } catch {}
  }

  if (!fs.existsSync(EXCEL_JSON_PATH)) {
    return {
      success: false,
      error: `Excel data file not found at ${EXCEL_JSON_PATH}`,
    }
  }

  const raw = fs.readFileSync(EXCEL_JSON_PATH, 'utf8')
  const excelData = JSON.parse(raw) as ExcelData

  const now = new Date().toISOString()
  const typeMap: Record<string, string> = {}
  const deptMap: Record<string, string> = {}
  const locMap: Record<string, string> = {}
  const personMap: Record<string, string> = {}

  // ============ Insert AssetTypes (all 14 sheet types + Mobile already covered by MobileTablet) ============
  const insType = db.prepare(
    `INSERT INTO AssetType (id, name, description, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`
  )
  for (const sheetName of Object.keys(excelData)) {
    const cfg = SHEET_CONFIG[sheetName]
    if (!cfg) continue
    const desc = `${cfg.typeName} assets imported from Excel`
    const id = generateId()
    typeMap[cfg.typeName] = id
    insType.run(id, cfg.typeName, desc, cfg.icon, now, now)
  }

  // ============ Department / Location / Person lookup helpers (created on demand) ============
  const insDept = db.prepare(
    `INSERT INTO Department (id, name, code, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`
  )
  function ensureDept(name: string | null): string | null {
    if (!name) return null
    const n = name.trim()
    if (n.length === 0) return null
    if (deptMap[n]) return deptMap[n]
    const id = generateId()
    const code = n.substring(0, 3).toUpperCase()
    insDept.run(id, n, code, now, now)
    deptMap[n] = id
    return id
  }

  const insLoc = db.prepare(
    `INSERT INTO Location (id, name, address, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`
  )
  function ensureLoc(name: string | null): string | null {
    if (!name) return null
    const n = name.trim()
    if (n.length === 0) return null
    if (locMap[n]) return locMap[n]
    const id = generateId()
    insLoc.run(id, n, null, now, now)
    locMap[n] = id
    return id
  }

  const insPerson = db.prepare(
    `INSERT INTO Person (id, fullName, email, phone, role, departmentId, locationId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  function ensurePerson(fullName: string | null, deptId: string | null, locId: string | null): string | null {
    if (!fullName) return null
    const n = fullName.trim()
    if (n.length === 0) return null
    const key = `${n}::${deptId || ''}::${locId || ''}`
    if (personMap[key]) return personMap[key]
    const id = generateId()
    insPerson.run(id, n, null, null, null, deptId, locId, now, now)
    personMap[key] = id
    return id
  }

  // ============ Asset insert (prepared statement with all 18 new fields) ============
  const insAsset = db.prepare(`
    INSERT INTO Asset (
      id, assetTag, assetTypeId, make, model, modelNumber, serialNumber, partNumber,
      status, purchaseDate, cost, currency, warrantyExpiry, os, osKey, officeKey,
      cpu, gpu, ram, storage, color, imei1, imei2, rom, otpMobileNumber, googleAppleAccount,
      monitorMake, monitorModel, monitorSn, monitorSize,
      keyboardMake, keyboardModel, keyboardSn,
      mouseMake, mouseModel, mouseSn,
      monitorPartNumber, mousePartNumber, manufactureYear, ipAddress, tonerModel,
      androidVersion, gmailLogin, deviceType, qty,
      barcodeScannerModel, barcodeScannerSn, hdd, hddInstalledDate, routerType,
      fixedAssetsNumber, storeName, deliveryDate, handoverDate,
      assignedToId, departmentId, locationId, comments, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insHistory = db.prepare(
    `INSERT INTO AssignmentHistory (id, assetId, personId, departmentId, locationId, assignedOn, reason, action, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const insActivity = db.prepare(
    `INSERT INTO ActivityLog (id, action, entityType, entityId, details, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
  )

  let assetCount = 0
  let deptCount = 0
  let locCount = 0
  let personCount = 0

  // Track used asset tags to ensure uniqueness (Excel has duplicate Computer Names)
  const usedTags = new Set<string>()
  function uniqueTag(base: string): string {
    if (!usedTags.has(base)) {
      usedTags.add(base)
      return base
    }
    let i = 2
    while (usedTags.has(`${base}-${i}`)) i++
    const tag = `${base}-${i}`
    usedTags.add(tag)
    return tag
  }

  for (const sheetName of Object.keys(excelData)) {
    const cfg = SHEET_CONFIG[sheetName]
    if (!cfg) continue
    const sheet = excelData[sheetName]
    const rows = sheet.rows || []
    const typeId = typeMap[cfg.typeName]
    if (!typeId) continue

    // Per-type serial counter for asset tags
    let typeSerial = 0

    for (const row of rows) {
      typeSerial += 1
      const id = generateId()

      // ---------- Common fields ----------
      const userRaw = toStr(pick(row, ['User']))
      const deptRaw = toStr(pick(row, ['Department']))
      const computerName = toStr(pick(row, ['Computer Name']))

      // Location varies per sheet — try multiple column names
      const locRaw =
        toStr(pick(row, ['Location', 'Location/Dept', 'Store Name'])) || null

      const deptId = ensureDept(deptRaw)
      // For Biometric sheet, Store Name also becomes the Location
      const locId = ensureLoc(locRaw)

      // Person lookup — only create if user is present and not a placeholder
      const isPlaceholderUser =
        userRaw &&
        ['ALL', 'Reserved', 'N/A', '-', 'None'].includes(userRaw.toUpperCase())
      const personId = isPlaceholderUser ? null : ensurePerson(userRaw, deptId, locId)

      // ---------- Asset tag ----------
      let baseTag: string
      if (computerName && computerName.trim().length > 0) {
        baseTag = computerName.trim()
      } else {
        baseTag = `${cfg.tagPrefix}-${pad(typeSerial)}`
      }
      const assetTag = uniqueTag(baseTag)

      // ---------- Status ----------
      let status: string
      const explicitStatus = toStr(pick(row, ['Status', 'STATUS']))
      if (sheetName === 'Weighing Scale' && explicitStatus) {
        status = mapWeighingStatus(explicitStatus)
      } else if (sheetName === 'Biometric' && explicitStatus) {
        // Biometric STATUS column has values like "Installed" / "Configured"
        // → treat as "In Use" if Installed/Configured, otherwise leave In Use
        const s = explicitStatus.toLowerCase()
        if (s.includes('installed') || s.includes('configured') || s.includes('active')) {
          status = 'In Use'
        } else if (s.includes('repair') || s.includes('faulty')) {
          status = 'Repair'
        } else if (s.includes('disposed') || s.includes('sold') || s.includes('retired')) {
          status = 'Retired'
        } else {
          status = 'In Use'
        }
      } else if (userRaw && !isPlaceholderUser) {
        status = 'In Use'
      } else {
        status = 'In Stock'
      }

      // ---------- Make / Model / serialNumber / partNumber / modelNumber ----------
      let make: string | null
      let model: string | null
      let modelNumber: string | null
      let serialNumber: string | null
      let partNumber: string | null

      if (sheetName === 'Biometric') {
        // No Make/Model in sheet — synthesise per spec
        make = 'Biometric'
        model = toStr(pick(row, ['Store Name']))
        modelNumber = toStr(pick(row, ['Model Number']))
        serialNumber = toStr(pick(row, ['S/N']))
        partNumber = null
      } else {
        make = toStr(pick(row, ['Make']))
        model = toStr(pick(row, ['Model']))
        modelNumber = toStr(pick(row, ['Model Number']))
        serialNumber = toStr(pick(row, ['S/N', 'Service Tag(S/N)']))
        partNumber = toStr(pick(row, ['Part Number', 'Part #']))
      }

      // ---------- Dates ----------
      const purchaseDate = toDate(pick(row, ['Purchase date', 'Purchase Date']))
      const deliveryDate = toDate(pick(row, ['Delivery Date']))
      const handoverDate = toDate(pick(row, ['Handover Date']))

      // ---------- CPU / RAM / Storage / OS ----------
      const cpu = toStr(pick(row, ['CPU', 'Processor']))
      const ram = toStr(pick(row, ['RAM']))
      const storage = toStr(pick(row, ['Storage']))
      const os = toStr(pick(row, ['OS']))
      const osKey = toStr(pick(row, ['OS Key']))
      const officeKey = toStr(pick(row, ['Office Key']))
      const gpu = toStr(pick(row, ['GPU']))

      // ---------- Mobile / Tablet ----------
      const imei1 = toStr(pick(row, ['IMEI1', 'IMEI(if 4G)']))
      const imei2 = toStr(pick(row, ['IMEI2']))
      const rom = toStr(pick(row, ['ROM']))
      const otpMobileNumber = toStr(pick(row, ['OTP Mobile Number']))
      const color = toStr(pick(row, ['Color']))
      const googleAppleAccount = toStr(pick(row, ['Google/Apple Account']))

      // ---------- Monitor ----------
      const monitorMake = toStr(pick(row, ['Monitor Make']))
      const monitorModel = toStr(pick(row, ['Monitor Model']))
      const monitorSn = toStr(pick(row, ['Monitor S/N']))
      const monitorSize = toStr(pick(row, ['Monitor Size']))
      const monitorPartNumber = toStr(pick(row, ['Monitor Part #']))

      // ---------- Keyboard ----------
      const keyboardMake = toStr(pick(row, ['Keyboard Make']))
      const keyboardModel = toStr(pick(row, ['Keyboard Model']))
      const keyboardSn = toStr(pick(row, ['Keyboard S/N']))

      // ---------- Mouse ----------
      const mouseMake = toStr(pick(row, ['Mouse Make']))
      const mouseModel = toStr(pick(row, ['Mouse Model']))
      const mouseSn = toStr(pick(row, ['Mouse S/N']))
      const mousePartNumber = toStr(pick(row, ['Mouse P/N']))

      // ---------- New per-type fields ----------
      const manufactureYear = toStr(pick(row, ['Manufacture Year']))
      const ipAddress = toStr(pick(row, ['IP Address', 'Scale Machine IP Address']))
      const tonerModel = toStr(pick(row, ['Toners Model']))
      const androidVersion = toStr(pick(row, ['Android']))
      const gmailLogin = toStr(pick(row, ['Gmail Login']))
      const deviceType = toStr(pick(row, ['Device Type']))
      const qty = toInt(pick(row, ['QTY']))
      const barcodeScannerModel = toStr(pick(row, ['Barcode Scanner Model']))
      const barcodeScannerSn = toStr(pick(row, ['Barcode Scanner S/N']))
      const hdd = toStr(pick(row, ['HDD']))
      // HDD Installed Date may be split across two columns — concatenate
      const hddDate1 = toStr(pick(row, ['HDD Installed Date']))
      const hddDate2 = toStr(pick(row, ['HDD Installed Date 01']))
      const hddInstalledDate = hddDate1 && hddDate2
        ? `${hddDate1} / ${hddDate2}`
        : hddDate1 || hddDate2
      const routerType = toStr(pick(row, ['Type']))
      const fixedAssetsNumber = toStr(pick(row, ['Fixed Assets Number']))
      const storeName = toStr(pick(row, ['Store Name']))
      const comments = toStr(pick(row, ['Comments', 'Remarks']))

      insAsset.run(
        id,
        assetTag,
        typeId,
        make,
        model,
        modelNumber,
        serialNumber,
        partNumber,
        status,
        purchaseDate,
        null, // cost
        'USD',
        null, // warrantyExpiry
        os,
        osKey,
        officeKey,
        cpu,
        gpu,
        ram,
        storage,
        color,
        imei1,
        imei2,
        rom,
        otpMobileNumber,
        googleAppleAccount,
        monitorMake,
        monitorModel,
        monitorSn,
        monitorSize,
        keyboardMake,
        keyboardModel,
        keyboardSn,
        mouseMake,
        mouseModel,
        mouseSn,
        monitorPartNumber,
        mousePartNumber,
        manufactureYear,
        ipAddress,
        tonerModel,
        androidVersion,
        gmailLogin,
        deviceType,
        qty,
        barcodeScannerModel,
        barcodeScannerSn,
        hdd,
        hddInstalledDate,
        routerType,
        fixedAssetsNumber,
        storeName,
        deliveryDate,
        handoverDate,
        personId,
        deptId,
        locId,
        comments,
        now,
        now
      )

      // Initial assignment history if assigned to a person/dept/loc
      if (personId || deptId || locId) {
        insHistory.run(
          generateId(),
          id,
          personId,
          deptId,
          locId,
          now,
          'Initial assignment from Excel import',
          'Assigned',
          now
        )
      }

      insActivity.run(
        generateId(),
        'asset.created',
        'Asset',
        id,
        `Imported ${cfg.typeName} asset ${assetTag}${userRaw ? ` (assigned to ${userRaw})` : ''}`,
        now
      )

      assetCount += 1
    }
  }

  deptCount = Object.keys(deptMap).length
  locCount = Object.keys(locMap).length
  personCount = Object.keys(personMap).length

  return {
    success: true,
    message: `Seeded ${Object.keys(typeMap).length} asset types, ${deptCount} departments, ${locCount} locations, ${personCount} persons, ${assetCount} assets from Excel (14 sheets).`,
    stats: {
      assetTypes: Object.keys(typeMap).length,
      departments: deptCount,
      locations: locCount,
      persons: personCount,
      assets: assetCount,
    },
  }
}
