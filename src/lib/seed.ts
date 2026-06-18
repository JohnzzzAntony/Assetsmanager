// Seed data for IT Asset Manager
import { db, initDb, generateId } from './db'
import { randomUUID } from 'crypto'

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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

  return {
    success: true,
    message: `Seeded ${ASSET_TYPES.length} types, ${DEPARTMENTS.length} departments, ${LOCATIONS.length} locations, ${PERSONS.length} persons, ${ASSETS.length} assets`,
  }
}
