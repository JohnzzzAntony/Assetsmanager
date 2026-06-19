// Database layer using Node.js built-in SQLite (node:sqlite)
// This avoids the need for prisma engine binaries
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'

const DB_PATH = process.env.DATABASE_FILE || '/home/z/my-project/db/assets.db'

let _db: DatabaseSync | null = null

function getDb(): DatabaseSync {
  if (_db) return _db
  // Ensure the directory exists
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  _db = new DatabaseSync(DB_PATH)
  _db.exec('PRAGMA journal_mode = WAL;')
  _db.exec('PRAGMA foreign_keys = ON;')
  return _db
}

export const db = {
  get raw() {
    return getDb()
  },
  exec(sql: string) {
    return getDb().exec(sql)
  },
  prepare(sql: string) {
    return getDb().prepare(sql)
  },
}

// Schema initialization
export function initDb() {
  const d = getDb()
  d.exec(`
    CREATE TABLE IF NOT EXISTS AssetType (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Department (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      code TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Location (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      address TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Person (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT,
      departmentId TEXT REFERENCES Department(id) ON DELETE SET NULL,
      locationId TEXT REFERENCES Location(id) ON DELETE SET NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Asset (
      id TEXT PRIMARY KEY,
      assetTag TEXT UNIQUE,
      assetTypeId TEXT NOT NULL REFERENCES AssetType(id),
      make TEXT,
      model TEXT,
      modelNumber TEXT,
      serialNumber TEXT,
      partNumber TEXT,
      status TEXT NOT NULL DEFAULT 'In Stock',
      purchaseDate TEXT,
      cost REAL,
      currency TEXT NOT NULL DEFAULT 'USD',
      warrantyExpiry TEXT,
      os TEXT,
      osKey TEXT,
      officeKey TEXT,
      cpu TEXT,
      gpu TEXT,
      ram TEXT,
      storage TEXT,
      color TEXT,
      imei1 TEXT,
      imei2 TEXT,
      rom TEXT,
      otpMobileNumber TEXT,
      googleAppleAccount TEXT,
      monitorMake TEXT,
      monitorModel TEXT,
      monitorSn TEXT,
      monitorSize TEXT,
      keyboardMake TEXT,
      keyboardModel TEXT,
      keyboardSn TEXT,
      mouseMake TEXT,
      mouseModel TEXT,
      mouseSn TEXT,
      monitorPartNumber TEXT,
      mousePartNumber TEXT,
      manufactureYear TEXT,
      ipAddress TEXT,
      tonerModel TEXT,
      androidVersion TEXT,
      gmailLogin TEXT,
      deviceType TEXT,
      qty INTEGER,
      barcodeScannerModel TEXT,
      barcodeScannerSn TEXT,
      hdd TEXT,
      hddInstalledDate TEXT,
      routerType TEXT,
      fixedAssetsNumber TEXT,
      storeName TEXT,
      deliveryDate TEXT,
      handoverDate TEXT,
      assignedToId TEXT REFERENCES Person(id) ON DELETE SET NULL,
      departmentId TEXT REFERENCES Department(id) ON DELETE SET NULL,
      locationId TEXT REFERENCES Location(id) ON DELETE SET NULL,
      comments TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS AssignmentHistory (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES Asset(id) ON DELETE CASCADE,
      personId TEXT REFERENCES Person(id) ON DELETE SET NULL,
      departmentId TEXT REFERENCES Department(id) ON DELETE SET NULL,
      locationId TEXT REFERENCES Location(id) ON DELETE SET NULL,
      assignedOn TEXT NOT NULL DEFAULT (datetime('now')),
      unassignedOn TEXT,
      reason TEXT,
      action TEXT NOT NULL DEFAULT 'Assigned',
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS AssetImage (
      id TEXT PRIMARY KEY,
      assetId TEXT REFERENCES Asset(id) ON DELETE CASCADE,
      fileName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      processedText TEXT,
      ocrStatus TEXT NOT NULL DEFAULT 'Pending',
      ocrEngine TEXT,
      parsedFields TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      processedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS ActivityLog (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      details TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS MaintenanceSchedule (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES Asset(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'Preventive',
      title TEXT NOT NULL,
      description TEXT,
      scheduledFor TEXT NOT NULL,
      completedAt TEXT,
      status TEXT NOT NULL DEFAULT 'Scheduled',
      cost REAL,
      performedBy TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS SoftwareLicense (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      vendor TEXT,
      key TEXT,
      seatsTotal INTEGER NOT NULL DEFAULT 1,
      seatsUsed INTEGER NOT NULL DEFAULT 0,
      purchaseDate TEXT,
      expiryDate TEXT,
      cost REAL,
      currency TEXT NOT NULL DEFAULT 'USD',
      category TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS AssetLicense (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES Asset(id) ON DELETE CASCADE,
      licenseId TEXT NOT NULL REFERENCES SoftwareLicense(id) ON DELETE CASCADE,
      assignedAt TEXT NOT NULL DEFAULT (datetime('now')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_maint_asset ON MaintenanceSchedule(assetId);
    CREATE INDEX IF NOT EXISTS idx_maint_status ON MaintenanceSchedule(status);
    CREATE INDEX IF NOT EXISTS idx_maint_sched ON MaintenanceSchedule(scheduledFor);
    CREATE INDEX IF NOT EXISTS idx_activity_entity ON ActivityLog(entityType, entityId);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON ActivityLog(createdAt);
    CREATE INDEX IF NOT EXISTS idx_license_name ON SoftwareLicense(name);
    CREATE INDEX IF NOT EXISTS idx_assetlicense_asset ON AssetLicense(assetId);
    CREATE INDEX IF NOT EXISTS idx_assetlicense_lic ON AssetLicense(licenseId);
    CREATE INDEX IF NOT EXISTS idx_asset_type ON Asset(assetTypeId);
    CREATE INDEX IF NOT EXISTS idx_asset_dept ON Asset(departmentId);
    CREATE INDEX IF NOT EXISTS idx_asset_loc ON Asset(locationId);
    CREATE INDEX IF NOT EXISTS idx_asset_assigned ON Asset(assignedToId);
    CREATE INDEX IF NOT EXISTS idx_asset_serial ON Asset(serialNumber);
    CREATE INDEX IF NOT EXISTS idx_history_asset ON AssignmentHistory(assetId);
    CREATE INDEX IF NOT EXISTS idx_images_asset ON AssetImage(assetId);

    CREATE TABLE IF NOT EXISTS CheckoutRequest (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES Asset(id) ON DELETE CASCADE,
      requestedById TEXT NOT NULL REFERENCES Person(id) ON DELETE CASCADE,
      requestType TEXT NOT NULL DEFAULT 'Checkout',
      status TEXT NOT NULL DEFAULT 'Pending',
      reason TEXT,
      requestedStartDate TEXT NOT NULL,
      requestedReturnDate TEXT,
      approvedById TEXT REFERENCES Person(id) ON DELETE SET NULL,
      approvedAt TEXT,
      decisionNotes TEXT,
      checkedOutAt TEXT,
      checkedInAt TEXT,
      actualReturnDate TEXT,
      conditionAtReturn TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS DepreciationRule (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      assetTypeId TEXT REFERENCES AssetType(id) ON DELETE SET NULL,
      method TEXT NOT NULL DEFAULT 'straight-line',
      usefulLifeYears INTEGER NOT NULL DEFAULT 4,
      salvageValuePercent REAL NOT NULL DEFAULT 0,
      description TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Notification (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      entityType TEXT,
      entityId TEXT,
      isRead INTEGER NOT NULL DEFAULT 0,
      actionUrl TEXT,
      actionLabel TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      readAt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_checkout_asset ON CheckoutRequest(assetId);
    CREATE INDEX IF NOT EXISTS idx_checkout_requester ON CheckoutRequest(requestedById);
    CREATE INDEX IF NOT EXISTS idx_checkout_status ON CheckoutRequest(status);
    CREATE INDEX IF NOT EXISTS idx_deprule_type ON DepreciationRule(assetTypeId);
    CREATE INDEX IF NOT EXISTS idx_notif_type ON Notification(type);
    CREATE INDEX IF NOT EXISTS idx_notif_unread ON Notification(isRead, createdAt);

    -- ============ Vendor / Supplier ============
    CREATE TABLE IF NOT EXISTS Vendor (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      contactPerson TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      address TEXT,
      taxId TEXT,
      paymentTerms TEXT,
      rating INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============ Purchase Order ============
    CREATE TABLE IF NOT EXISTS PurchaseOrder (
      id TEXT PRIMARY KEY,
      poNumber TEXT UNIQUE NOT NULL,
      vendorId TEXT NOT NULL REFERENCES Vendor(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'Draft',
      orderDate TEXT NOT NULL,
      expectedDate TEXT,
      receivedDate TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      taxRate REAL NOT NULL DEFAULT 0,
      taxAmount REAL NOT NULL DEFAULT 0,
      shippingCost REAL NOT NULL DEFAULT 0,
      totalAmount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      requestedById TEXT REFERENCES Person(id) ON DELETE SET NULL,
      approvedById TEXT REFERENCES Person(id) ON DELETE SET NULL,
      approvedAt TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS PurchaseOrderItem (
      id TEXT PRIMARY KEY,
      poId TEXT NOT NULL REFERENCES PurchaseOrder(id) ON DELETE CASCADE,
      assetTypeId TEXT REFERENCES AssetType(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unitPrice REAL NOT NULL DEFAULT 0,
      totalPrice REAL NOT NULL DEFAULT 0,
      receivedQuantity INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============ Asset Disposal ============
    CREATE TABLE IF NOT EXISTS AssetDisposal (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES Asset(id) ON DELETE RESTRICT,
      disposalNumber TEXT UNIQUE,
      method TEXT NOT NULL DEFAULT 'Sold',
      reason TEXT,
      disposalDate TEXT NOT NULL,
      residualValue REAL NOT NULL DEFAULT 0,
      disposalCost REAL NOT NULL DEFAULT 0,
      netProceeds REAL NOT NULL DEFAULT 0,
      buyerRecipient TEXT,
      conditionAtDisposal TEXT,
      environmentalCompliant INTEGER NOT NULL DEFAULT 1,
      certificateNumber TEXT,
      approvedById TEXT REFERENCES Person(id) ON DELETE SET NULL,
      approvedAt TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_vendor_name ON Vendor(name);
    CREATE INDEX IF NOT EXISTS idx_vendor_active ON Vendor(isActive);
    CREATE INDEX IF NOT EXISTS idx_po_vendor ON PurchaseOrder(vendorId);
    CREATE INDEX IF NOT EXISTS idx_po_status ON PurchaseOrder(status);
    CREATE INDEX IF NOT EXISTS idx_po_date ON PurchaseOrder(orderDate);
    CREATE INDEX IF NOT EXISTS idx_poitem_po ON PurchaseOrderItem(poId);
    CREATE INDEX IF NOT EXISTS idx_disposal_asset ON AssetDisposal(assetId);
    CREATE INDEX IF NOT EXISTS idx_disposal_date ON AssetDisposal(disposalDate);
    CREATE INDEX IF NOT EXISTS idx_disposal_method ON AssetDisposal(method);

    -- ============ Asset Tag ============
    CREATE TABLE IF NOT EXISTS AssetTag (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL DEFAULT 'slate',
      description TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS AssetTagLink (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES Asset(id) ON DELETE CASCADE,
      tagId TEXT NOT NULL REFERENCES AssetTag(id) ON DELETE CASCADE,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tag_name ON AssetTag(name);
    CREATE INDEX IF NOT EXISTS idx_taglink_asset ON AssetTagLink(assetId);
    CREATE INDEX IF NOT EXISTS idx_taglink_tag ON AssetTagLink(tagId);

    -- ============ Asset Booking / Reservation ============
    CREATE TABLE IF NOT EXISTS AssetBooking (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL REFERENCES Asset(id) ON DELETE CASCADE,
      bookedById TEXT NOT NULL REFERENCES Person(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      purpose TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      requestedById TEXT REFERENCES Person(id) ON DELETE SET NULL,
      approvedById TEXT REFERENCES Person(id) ON DELETE SET NULL,
      approvedAt TEXT,
      decisionNotes TEXT,
      checkedOutAt TEXT,
      checkedInAt TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_booking_asset ON AssetBooking(assetId);
    CREATE INDEX IF NOT EXISTS idx_booking_booker ON AssetBooking(bookedById);
    CREATE INDEX IF NOT EXISTS idx_booking_status ON AssetBooking(status);
    CREATE INDEX IF NOT EXISTS idx_booking_dates ON AssetBooking(startDate, endDate);

    -- ============ Saved Reports (Round 5) ============
    CREATE TABLE IF NOT EXISTS SavedReport (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      section TEXT,
      config TEXT NOT NULL DEFAULT '{}',
      createdBy TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_saved_report_name ON SavedReport(name);
    CREATE INDEX IF NOT EXISTS idx_saved_report_section ON SavedReport(section);

    -- ============ Round 9: Asset Audit / Physical Inventory ============
    -- An AssetAudit represents a periodic physical inventory check.
    -- Each audit covers a scope (all assets, a location, a department, or an asset type)
    -- and produces a list of AssetAuditItem rows — one per expected asset plus any "Extra"
    -- assets scanned that weren't on the expected list.
    CREATE TABLE IF NOT EXISTS AssetAudit (
      id TEXT PRIMARY KEY,
      auditNumber TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'all',
      scopeId TEXT,
      status TEXT NOT NULL DEFAULT 'Open',
      startedAt TEXT,
      completedAt TEXT,
      startedById TEXT REFERENCES Person(id) ON DELETE SET NULL,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS AssetAuditItem (
      id TEXT PRIMARY KEY,
      auditId TEXT NOT NULL REFERENCES AssetAudit(id) ON DELETE CASCADE,
      assetId TEXT REFERENCES Asset(id) ON DELETE CASCADE,
      assetTag TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      -- Expected: was this asset on the expected list (true) or scanned as Extra (false)?
      expected INTEGER NOT NULL DEFAULT 1,
      scannedAt TEXT,
      scannedByName TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_number ON AssetAudit(auditNumber);
    CREATE INDEX IF NOT EXISTS idx_audit_status ON AssetAudit(status);
    CREATE INDEX IF NOT EXISTS idx_audit_scope ON AssetAudit(scope, scopeId);
    CREATE INDEX IF NOT EXISTS idx_audititem_audit ON AssetAuditItem(auditId);
    CREATE INDEX IF NOT EXISTS idx_audititem_asset ON AssetAuditItem(assetId);
    CREATE INDEX IF NOT EXISTS idx_audititem_status ON AssetAuditItem(status);
  `)

  // ============ Migrations for new Asset columns (added in Round 10) ============
  // These columns may already exist on a fresh DB (added to CREATE TABLE above),
  // but existing DBs need ALTER TABLE. Wrapped in try/catch since duplicate add errors.
  const newAssetCols: [string, string][] = [
    ['monitorPartNumber', 'TEXT'],
    ['mousePartNumber', 'TEXT'],
    ['manufactureYear', 'TEXT'],
    ['ipAddress', 'TEXT'],
    ['tonerModel', 'TEXT'],
    ['androidVersion', 'TEXT'],
    ['gmailLogin', 'TEXT'],
    ['deviceType', 'TEXT'],
    ['qty', 'INTEGER'],
    ['barcodeScannerModel', 'TEXT'],
    ['barcodeScannerSn', 'TEXT'],
    ['hdd', 'TEXT'],
    ['hddInstalledDate', 'TEXT'],
    ['routerType', 'TEXT'],
    ['fixedAssetsNumber', 'TEXT'],
    ['storeName', 'TEXT'],
    ['deliveryDate', 'TEXT'],
    ['handoverDate', 'TEXT'],
  ]
  for (const [col, type] of newAssetCols) {
    try { d.exec(`ALTER TABLE Asset ADD COLUMN ${col} ${type}`) } catch {}
  }
}

// Helper to generate IDs
export function generateId(prefix = ''): string {
  return prefix ? `${prefix}_${randomUUID()}` : randomUUID()
}
