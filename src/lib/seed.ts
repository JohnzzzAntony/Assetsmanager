// Seed data for IT Asset Manager
import { db, initDb, generateId } from './db'

const ASSET_TYPES = [
  { name: 'Desktop', description: 'Desktop computers and workstations', icon: 'Monitor' },
  { name: 'Laptop', description: 'Portable computers', icon: 'Laptop' },
  { name: 'Mobile', description: 'Mobile phones and smartphones', icon: 'Smartphone' },
  { name: 'Tablet', description: 'Tablet devices', icon: 'Tablet' },
  { name: 'Monitor', description: 'Display monitors', icon: 'Display' },
  { name: 'Peripheral', description: 'Keyboards, mice, and other peripherals', icon: 'Mouse' },
  { name: 'Other', description: 'Other IT equipment', icon: 'Package' },
]
const DEPARTMENTS = [
  { name: 'IT', code: 'IT' },
  { name: 'Finance', code: 'FIN' },
  { name: 'Purchase', code: 'PUR' },
  { name: 'Creative', code: 'CRE' },
  { name: 'HR', code: 'HR' },
  { name: 'Operations', code: 'OPS' },
  { name: 'Sales', code: 'SAL' },
  { name: 'Marketing', code: 'MKT' },
]

const LOCATIONS = [
  { name: 'Maylaa HO', address: 'Head Office, Maylaa Building' },
  { name: 'Warehouse', address: 'Central Warehouse, Sector 21' },
  { name: 'Branch - Mumbai', address: 'Mumbai Branch Office' },
  { name: 'Branch - Bangalore', address: 'Bangalore Tech Park' },
  { name: 'Remote', address: 'Work from Home / Remote' },
]

const PERSONS = [
  { fullName: 'Rahul Sharma', email: 'rahul.sharma@maylaa.com', phone: '+91-9876543210', role: 'IT Manager', department: 'IT', location: 'Maylaa HO' },
  { fullName: 'Priya Patel', email: 'priya.patel@maylaa.com', phone: '+91-9876543211', role: 'Finance Lead', department: 'Finance', location: 'Maylaa HO' },
  { fullName: 'Amit Kumar', email: 'amit.kumar@maylaa.com', phone: '+91-9876543212', role: 'Purchase Officer', department: 'Purchase', location: 'Maylaa HO' },
  { fullName: 'Sneha Reddy', email: 'sneha.reddy@maylaa.com', phone: '+91-9876543213', role: 'Creative Director', department: 'Creative', location: 'Maylaa HO' },
  { fullName: 'Vikram Singh', email: 'vikram.singh@maylaa.com', phone: '+91-9876543214', role: 'HR Executive', department: 'HR', location: 'Maylaa HO' },
  { fullName: 'Anjali Gupta', email: 'anjali.gupta@maylaa.com', phone: '+91-9876543215', role: 'Operations Lead', department: 'Operations', location: 'Warehouse' },
  { fullName: 'Rohan Mehta', email: 'rohan.mehta@maylaa.com', phone: '+91-9876543216', role: 'Sales Manager', department: 'Sales', location: 'Branch - Mumbai' },
  { fullName: 'Kavya Nair', email: 'kavya.nair@maylaa.com', phone: '+91-9876543217', role: 'Marketing Specialist', department: 'Marketing', location: 'Branch - Bangalore' },
  { fullName: 'Arjun Verma', email: 'arjun.verma@maylaa.com', phone: '+91-9876543218', role: 'IT Support', department: 'IT', location: 'Maylaa HO' },
  { fullName: 'Deepa Iyer', email: 'deepa.iyer@maylaa.com', phone: '+91-9876543219', role: 'Designer', department: 'Creative', location: 'Remote' },
]

const ASSETS = [
  // Desktops
  { type: 'Desktop', make: 'Dell', model: 'Optiplex 7010', modelNumber: '7010-SFF', serialNumber: 'DLO7010SN001', partNumber: 'TC-000018', status: 'In Use', os: 'Windows 10 PRO', cpu: 'Intel Core i5-3470', ram: '8GB', storage: '512GB SSD', cost: 650, assignedTo: 'Rahul Sharma', monitorMake: 'Dell', monitorModel: 'P2419H', monitorSn: 'DELMON001', monitorSize: '24"' },
  { type: 'Desktop', make: 'HP', model: 'ProDesk 600 G1', modelNumber: 'H6G1-SFF', serialNumber: 'HPP600SN002', status: 'In Use', os: 'WIN 11 PRO', cpu: 'Intel Core i7-4770', ram: '16GB', storage: '1TB HDD', cost: 800, assignedTo: 'Priya Patel', monitorMake: 'HP', monitorModel: 'M24fw', monitorSn: 'HPMON002', monitorSize: '24"' },
  { type: 'Desktop', make: 'Dell', model: 'Optiplex 7040', modelNumber: '7040-SFF', serialNumber: 'DLO7040SN003', status: 'In Stock', os: 'Windows 10 PRO', cpu: 'Intel Core i5-6500', ram: '8GB', storage: '256GB SSD', cost: 700 },
  { type: 'Desktop', make: 'Lenovo', model: 'ThinkCentre M710s', serialNumber: 'LNV710SN004', status: 'Repair', os: 'Windows 10 PRO', cpu: 'Intel Core i3-7100', ram: '8GB', storage: '500GB HDD', cost: 550 },

  // Laptops
  { type: 'Laptop', make: 'Apple', model: 'MacBook Pro 14', modelNumber: 'Z14U', serialNumber: 'C02XJ0JKLM', status: 'In Use', os: 'macOS Sonoma', cpu: 'Apple M3 Pro', ram: '16GB', storage: '512GB SSD', cost: 1999, assignedTo: 'Sneha Reddy' },
  { type: 'Laptop', make: 'Lenovo', model: 'ThinkPad X1 Carbon', serialNumber: 'LNVTX1C005', status: 'In Use', os: 'Windows 11 PRO', cpu: 'Intel Core i7-1260P', ram: '16GB', storage: '512GB SSD', cost: 1600, assignedTo: 'Amit Kumar' },
  { type: 'Laptop', make: 'Dell', model: 'Latitude 5440', serialNumber: 'DLLAT5440006', status: 'In Use', os: 'Windows 11 PRO', cpu: 'Intel Core i5-1335U', ram: '16GB', storage: '256GB SSD', cost: 1200, assignedTo: 'Vikram Singh' },
  { type: 'Laptop', make: 'HP', model: 'EliteBook 840 G8', serialNumber: 'HPEB840G8007', status: 'In Stock', os: 'Windows 11 PRO', cpu: 'Intel Core i5-1135G7', ram: '8GB', storage: '512GB SSD', cost: 1100 },

  // Mobiles
  { type: 'Mobile', make: 'Apple', model: 'iPhone 15 Pro Max', modelNumber: 'A3106', serialNumber: 'F2LW1234ABC', imei1: '356789104567890', imei2: '356789104567901', color: 'Natural Titanium', rom: '256GB', otpMobileNumber: '+91-9000010001', googleAppleAccount: 'sneha.reddy@icloud.com', status: 'In Use', cost: 1199, assignedTo: 'Sneha Reddy' },
  { type: 'Mobile', make: 'Samsung', model: 'Galaxy A32', modelNumber: 'SM-A166P/DS', serialNumber: 'RZ8M1234XYZ', imei1: '356789204567890', imei2: '356789204567901', color: 'Awesome Black', rom: '128GB', ram: '8GB', otpMobileNumber: '+91-9000010002', googleAppleAccount: 'amit.kumar@gmail.com', status: 'In Use', cost: 280, assignedTo: 'Amit Kumar' },
  { type: 'Mobile', make: 'Motorola', model: 'Edge 40', modelNumber: 'XT2308', serialNumber: 'MOTEDG4001', imei1: '356789304567890', color: 'Eclipse Black', rom: '256GB', ram: '8GB', status: 'In Stock', cost: 350 },
  { type: 'Mobile', make: 'Apple', model: 'iPhone 13', modelNumber: 'A2631', serialNumber: 'F2LW5678DEF', imei1: '356789404567890', color: 'Midnight', rom: '128GB', status: 'Repair', cost: 699, assignedTo: 'Rohan Mehta' },
  { type: 'Mobile', make: 'Samsung', model: 'Galaxy S23', modelNumber: 'SM-S911B', serialNumber: 'RZ8M5678UVW', imei1: '356789504567890', color: 'Phantom Black', rom: '256GB', ram: '8GB', status: 'In Use', cost: 799, assignedTo: 'Kavya Nair' },

  // Tablets
  { type: 'Tablet', make: 'Apple', model: 'iPad Air 5', modelNumber: 'A2588', serialNumber: 'DMPGL000001', status: 'In Use', os: 'iPadOS 17', storage: '64GB', cost: 599, assignedTo: 'Deepa Iyer' },
  { type: 'Tablet', make: 'Samsung', model: 'Galaxy Tab S8', serialNumber: 'RZ8TABS8001', status: 'In Stock', os: 'Android 13', storage: '128GB', cost: 699 },

  // Monitors
  { type: 'Monitor', make: 'Dell', model: 'U2723QE', modelNumber: 'U2723QE', serialNumber: 'DELU2723QM01', status: 'In Use', cost: 600 },
  { type: 'Monitor', make: 'LG', model: '27UK850-W', serialNumber: 'LG27UK850M01', status: 'In Stock', cost: 450 },

  // Peripherals
  { type: 'Peripheral', make: 'Logitech', model: 'MX Keys', serialNumber: 'LOGMXK001', status: 'In Use', cost: 120 },
  { type: 'Peripheral', make: 'Logitech', model: 'MX Master 3S', serialNumber: 'LOGMXM3001', status: 'In Use', cost: 100 },
  { type: 'Peripheral', make: 'Keychron', model: 'K2 Wireless', serialNumber: 'KCHK2W001', status: 'In Stock', cost: 90 },
]

function pad(n: number, len = 4) {
  return String(n).padStart(len, '0')
}

export function seedDatabase() {
  initDb()

  // Check if already seeded
  const count = db.prepare('SELECT COUNT(*) as c FROM AssetType').get() as { c: number }
  if (count.c > 0) {
    return { success: true, message: 'Database already seeded', skipped: true }
  }

  const now = new Date().toISOString()
  const typeMap: Record<string, string> = {}
  const deptMap: Record<string, string> = {}
  const locMap: Record<string, string> = {}
  const personMap: Record<string, string> = {}

  // Seed asset types
  const insType = db.prepare(
    `INSERT INTO AssetType (id, name, description, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`
  )
  for (const t of ASSET_TYPES) {
    const id = generateId()
    typeMap[t.name] = id
    insType.run(id, t.name, t.description, t.icon, now, now)
  }

  // Seed departments
  const insDept = db.prepare(
    `INSERT INTO Department (id, name, code, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`
  )
  for (const d of DEPARTMENTS) {
    const id = generateId()
    deptMap[d.name] = id
    insDept.run(id, d.name, d.code, now, now)
  }

  // Seed locations
  const insLoc = db.prepare(
    `INSERT INTO Location (id, name, address, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`
  )
  for (const l of LOCATIONS) {
    const id = generateId()
    locMap[l.name] = id
    insLoc.run(id, l.name, l.address, now, now)
  }

  // Seed persons
  const insPerson = db.prepare(
    `INSERT INTO Person (id, fullName, email, phone, role, departmentId, locationId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const p of PERSONS) {
    const id = generateId()
    personMap[p.fullName] = id
    insPerson.run(
      id,
      p.fullName,
      p.email,
      p.phone,
      p.role,
      p.department ? deptMap[p.department] : null,
      p.location ? locMap[p.location] : null,
      now,
      now
    )
  }

  // Seed assets
  const insAsset = db.prepare(`
    INSERT INTO Asset (
      id, assetTag, assetTypeId, make, model, modelNumber, serialNumber, partNumber,
      status, purchaseDate, cost, currency, warrantyExpiry, os, osKey, officeKey,
      cpu, gpu, ram, storage, color, imei1, imei2, rom, otpMobileNumber, googleAppleAccount,
      monitorMake, monitorModel, monitorSn, monitorSize,
      keyboardMake, keyboardModel, keyboardSn,
      mouseMake, mouseModel, mouseSn,
      assignedToId, departmentId, locationId, comments, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let idx = 0
  for (const a of ASSETS) {
    const id = generateId()
    const assetTag = `TC-${pad(18 + idx, 6)}`
    const typeId = typeMap[a.type]
    const personId = a.assignedTo ? personMap[a.assignedTo] : null
    // Get department/location from the assigned person
    let deptId: string | null = null
    let locId: string | null = null
    if (a.assignedTo) {
      const p = PERSONS.find((x) => x.fullName === a.assignedTo)
      if (p) {
        deptId = p.department ? deptMap[p.department] : null
        locId = p.location ? locMap[p.location] : null
      }
    }
    const purchaseDate = new Date(2023, idx % 12, (idx % 28) + 1).toISOString()
    const warrantyExpiry = new Date(2025, (idx + 6) % 12, (idx % 28) + 1).toISOString()
    insAsset.run(
      id,
      assetTag,
      typeId,
      a.make || null,
      a.model || null,
      a.modelNumber || null,
      a.serialNumber || null,
      a.partNumber || null,
      a.status,
      purchaseDate,
      a.cost ?? null,
      'USD',
      warrantyExpiry,
      a.os || null,
      null,
      null,
      a.cpu || null,
      a.gpu || null,
      a.ram || null,
      a.storage || null,
      a.color || null,
      a.imei1 || null,
      a.imei2 || null,
      a.rom || null,
      a.otpMobileNumber || null,
      a.googleAppleAccount || null,
      a.monitorMake || null,
      a.monitorModel || null,
      a.monitorSn || null,
      a.monitorSize || null,
      null, null, null,
      null, null, null,
      personId,
      deptId,
      locId,
      null,
      now,
      now
    )

    // Create initial assignment history
    if (personId || deptId || locId) {
      const histId = generateId()
      db.prepare(
        `INSERT INTO AssignmentHistory (id, assetId, personId, departmentId, locationId, assignedOn, reason, action, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(histId, id, personId, deptId, locId, purchaseDate, 'Initial assignment', 'Assigned', now)
    }
    idx++
  }

  // ---------- Seed Software Licenses ----------
  const LICENSES = [
    { name: 'Microsoft Office 365 Business', vendor: 'Microsoft', key: 'O365-BUS-XXXXX-XXXXX-XXXXX', seatsTotal: 25, category: 'Productivity', cost: 150, purchaseDate: '2024-01-15', expiryDate: '2025-12-31' },
    { name: 'Windows 11 Pro OEM', vendor: 'Microsoft', key: 'W11P-OEM-YYYYY-YYYYY-YYYYY', seatsTotal: 30, category: 'OS', cost: 199, purchaseDate: '2024-03-10' },
    { name: 'Adobe Creative Cloud All Apps', vendor: 'Adobe', key: 'ACC-TEAM-ZZZZZ-ZZZZZ-ZZZZZ', seatsTotal: 8, category: 'Design', cost: 599, purchaseDate: '2024-02-20', expiryDate: '2025-08-30' },
    { name: 'JetBrains All Products Pack', vendor: 'JetBrains', key: 'JB-ALL-AAAAA-AAAAA-AAAAA', seatsTotal: 5, category: 'Development', cost: 779, purchaseDate: '2024-04-01', expiryDate: '2025-10-01' },
    { name: 'Slack Pro', vendor: 'Slack', key: 'SLACK-PRO-BBBBB-BBBBB-BBBBB', seatsTotal: 50, category: 'Communication', cost: 84, purchaseDate: '2024-01-01', expiryDate: '2025-12-31' },
    { name: 'Zoom Workplace', vendor: 'Zoom', key: 'ZOOM-WP-CCCCC-CCCCC-CCCCC', seatsTotal: 15, category: 'Communication', cost: 149, purchaseDate: '2024-05-01' },
    { name: 'Norton Antivirus Plus', vendor: 'Norton', key: 'NAV-PLUS-DDDDD-DDDDD-DDDDD', seatsTotal: 20, category: 'Security', cost: 59, purchaseDate: '2024-06-01', expiryDate: '2025-06-30' },
  ]
  const insLic = db.prepare(
    `INSERT INTO SoftwareLicense (id, name, vendor, key, seatsTotal, seatsUsed, purchaseDate, expiryDate, cost, currency, category, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const licenseIds: string[] = []
  for (const l of LICENSES) {
    const id = generateId()
    licenseIds.push(id)
    insLic.run(id, l.name, l.vendor, l.key, l.seatsTotal, 0, l.purchaseDate ?? null, l.expiryDate ?? null, l.cost ?? null, 'USD', l.category ?? null, null, now, now)
  }

  // ---------- Seed Maintenance Schedules ----------
  const assetRows = db.prepare('SELECT id, assetTag, make, model FROM Asset').all() as { id: string; assetTag: string; make: string; model: string }[]
  const MAINT_TYPES = ['Preventive', 'Corrective', 'Upgrade', 'Inspection', 'Cleaning']
  const MAINT_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Overdue']
  const insMaint = db.prepare(
    `INSERT INTO MaintenanceSchedule (id, assetId, type, title, description, scheduledFor, completedAt, status, cost, performedBy, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  let maintCount = 0
  for (let i = 0; i < assetRows.length; i++) {
    if (i % 2 !== 0) continue  // schedule for half the assets
    const a = assetRows[i]
    const numMaint = (i % 3) + 1
    for (let j = 0; j < numMaint; j++) {
      const id = generateId()
      const type = MAINT_TYPES[(i + j) % MAINT_TYPES.length]
      const daysOffset = (j * 30) - 60 + (i % 7) * 5
      const schedDate = new Date()
      schedDate.setDate(schedDate.getDate() + daysOffset)
      let status = MAINT_STATUSES[j % MAINT_STATUSES.length]
      if (daysOffset < 0 && status === 'Scheduled') status = 'Overdue'
      const completedAt = status === 'Completed' ? schedDate.toISOString() : null
      const titles: Record<string, string> = {
        Preventive: 'Quarterly preventive maintenance',
        Corrective: 'Hardware repair — fan replacement',
        Upgrade: 'RAM upgrade to 16GB',
        Inspection: 'Annual safety inspection',
        Cleaning: 'Internal dust cleaning',
      }
      insMaint.run(
        id, a.id, type, titles[type] || type,
        `Scheduled for ${a.make} ${a.model} (${a.assetTag})`,
        schedDate.toISOString(),
        completedAt,
        status,
        Math.round((50 + (i * 17 % 200)) * 100) / 100,
        status === 'Completed' ? 'Arjun Verma' : null,
        status === 'Completed' ? 'Service completed successfully. No issues found.' : null,
        now, now
      )
      maintCount++
    }
  }

  // ---------- Seed Audit Log entries ----------
  const AUDIT_ACTIONS = [
    { action: 'asset.created', entity: 'Asset', details: 'Created asset TC-000018' },
    { action: 'asset.updated', entity: 'Asset', details: 'Updated asset hardware specs' },
    { action: 'asset.assigned', entity: 'Asset', details: 'Assigned to Rahul Sharma (IT)' },
    { action: 'asset.unassigned', entity: 'Asset', details: 'Unassigned from previous owner' },
    { action: 'maintenance.created', entity: 'Asset', details: 'Scheduled preventive maintenance' },
    { action: 'maintenance.completed', entity: 'Asset', details: 'Completed RAM upgrade' },
    { action: 'license.allocated', entity: 'Asset', details: 'Allocated Microsoft Office 365 license' },
    { action: 'asset.imported', entity: 'Asset', details: 'Bulk imported 20 assets via CSV' },
  ]
  const insLog = db.prepare(
    `INSERT INTO ActivityLog (id, action, entityType, entityId, details, createdAt) VALUES (?, ?, ?, ?, ?, ?)`
  )
  let logCount = 0
  for (let i = 0; i < 30; i++) {
    const a = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length]
    const asset = assetRows[i % assetRows.length]
    const t = new Date()
    t.setHours(t.getHours() - i * 7)
    insLog.run(generateId(), a.action, a.entity, asset.id, a.details, t.toISOString())
    logCount++
  }

  // ---------- Seed Depreciation Rules ----------
  const typeRows = db.prepare('SELECT id, name FROM AssetType').all() as { id: string; name: string }[]
  const depRules = [
    { name: 'Standard IT Equipment (4yr, 10% salvage)', typeName: 'Laptop', method: 'straight-line', life: 4, salvage: 10 },
    { name: 'Desktop Computers (5yr, 5% salvage)', typeName: 'Desktop', method: 'straight-line', life: 5, salvage: 5 },
    { name: 'Mobile Devices (3yr, 0% salvage)', typeName: 'Mobile', method: 'declining-balance', life: 3, salvage: 0 },
    { name: 'Tablets (3yr, 5% salvage)', typeName: 'Tablet', method: 'straight-line', life: 3, salvage: 5 },
    { name: 'Monitors (6yr, 10% salvage)', typeName: 'Monitor', method: 'straight-line', life: 6, salvage: 10 },
    { name: 'Peripherals (2yr, 0% salvage)', typeName: 'Peripheral', method: 'straight-line', life: 2, salvage: 0 },
    { name: 'Default Rule (4yr, 0% salvage)', typeName: null, method: 'straight-line', life: 4, salvage: 0 },
  ]
  const insDep = db.prepare(
    `INSERT INTO DepreciationRule (id, name, assetTypeId, method, usefulLifeYears, salvageValuePercent, description, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  let depCount = 0
  for (const r of depRules) {
    const id = generateId()
    const typeId = r.typeName ? typeRows.find((t) => t.name === r.typeName)?.id : null
    insDep.run(
      id, r.name, typeId ?? null, r.method, r.life, r.salvage,
      `Auto-created rule for ${r.typeName || 'all asset types'}`,
      1, now, now
    )
    depCount++
  }

  // ---------- Seed Checkout Requests ----------
  const personRows = db.prepare('SELECT id FROM Person').all() as { id: string }[]
  const checkoutStatuses = ['Pending', 'Approved', 'Checked Out', 'Checked In', 'Rejected']
  const insCheckout = db.prepare(
    `INSERT INTO CheckoutRequest (id, assetId, requestedById, requestType, status, reason, requestedStartDate, requestedReturnDate, approvedById, approvedAt, decisionNotes, checkedOutAt, checkedInAt, actualReturnDate, conditionAtReturn, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  let checkoutCount = 0
  for (let i = 0; i < 8; i++) {
    const a = assetRows[i % assetRows.length]
    const requester = personRows[(i + 3) % personRows.length]
    const approver = personRows[0]
    const status = checkoutStatuses[i % checkoutStatuses.length]
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (i * 7))
    const returnDate = new Date(startDate)
    returnDate.setDate(returnDate.getDate() + 14)
    const checkedOutAt = status === 'Checked Out' || status === 'Checked In' ? startDate.toISOString() : null
    const checkedInAt = status === 'Checked In' ? new Date().toISOString() : null
    const actualReturnDate = status === 'Checked In' ? new Date().toISOString() : null
    const approvedAt = status !== 'Pending' ? startDate.toISOString() : null
    const decisionNotes = status === 'Approved' || status === 'Checked Out' || status === 'Checked In'
      ? 'Approved for business use'
      : status === 'Rejected' ? 'Asset currently in use by another team' : null
    insCheckout.run(
      generateId(), a.id, requester.id, 'Checkout', status,
      `Need this asset for ${['client project', 'remote work', 'training session', 'testing', 'travel'][i % 5]}`,
      startDate.toISOString(),
      returnDate.toISOString(),
      status !== 'Pending' ? approver.id : null,
      approvedAt,
      decisionNotes,
      checkedOutAt, checkedInAt, actualReturnDate,
      status === 'Checked In' ? 'Good condition' : null,
      startDate.toISOString(), startDate.toISOString()
    )
    checkoutCount++
  }

  // ---------- Generate system notifications ----------
  let notifCount = 0
  try {
    // Use the repo to generate notifications
    // Inline implementation to avoid circular import issues
    const in30 = new Date(); in30.setDate(in30.getDate() + 60)  // use 60 days for seed to generate some
    const inNow = new Date()
    // Warranty expiring (extend the window for seed)
    const warrantyRows = db.prepare(`
      SELECT id, assetTag, make, model, warrantyExpiry FROM Asset
      WHERE warrantyExpiry IS NOT NULL
    `).all() as any[]
    const insNotif = db.prepare(
      `INSERT INTO Notification (id, type, severity, title, message, entityType, entityId, isRead, actionUrl, actionLabel, createdAt, readAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL)`
    )
    for (const a of warrantyRows.slice(0, 4)) {
      const expDate = new Date(a.warrantyExpiry)
      const diffDays = Math.floor((expDate.getTime() - inNow.getTime()) / (24 * 3600 * 1000))
      if (diffDays < 0) {
        insNotif.run(generateId(), 'warranty_expiring', 'critical', 'Warranty Expired',
          `${a.make} ${a.model} (${a.assetTag}) warranty expired`, 'Asset', a.id, 'asset-detail', 'View Asset', inNow.toISOString())
        notifCount++
      } else if (diffDays < 60) {
        insNotif.run(generateId(), 'warranty_expiring', 'warning', 'Warranty Expiring Soon',
          `${a.make} ${a.model} (${a.assetTag}) warranty expires in ${diffDays} days`, 'Asset', a.id, 'asset-detail', 'View Asset', inNow.toISOString())
        notifCount++
      }
    }
    // Maintenance overdue notifications
    const overdueMaint = db.prepare(`
      SELECT m.title, m.scheduledFor, a.assetTag, a.make, a.model, a.id as assetId
      FROM MaintenanceSchedule m
      LEFT JOIN Asset a ON m.assetId = a.id
      WHERE m.status IN ('Scheduled','In Progress','Overdue') AND m.scheduledFor < ?
    `).all(inNow.toISOString()) as any[]
    for (const m of overdueMaint.slice(0, 3)) {
      insNotif.run(generateId(), 'maintenance_overdue', 'critical', 'Maintenance Overdue',
        `"${m.title}" for ${m.make} ${m.model} (${m.assetTag}) was due ${new Date(m.scheduledFor).toLocaleDateString()}`,
        'Asset', m.assetId, 'maintenance', 'View Maintenance', inNow.toISOString())
      notifCount++
    }
  } catch (e) {
    // ignore notification seed errors
  }

  return {
    success: true,
    message: `Seeded ${ASSET_TYPES.length} types, ${DEPARTMENTS.length} departments, ${LOCATIONS.length} locations, ${PERSONS.length} persons, ${ASSETS.length} assets, ${LICENSES.length} licenses, ${maintCount} maintenance, ${logCount} audit entries, ${depCount} depreciation rules, ${checkoutCount} checkout requests, ${notifCount} notifications`,
  }
}
