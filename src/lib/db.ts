// Database layer using Node.js built-in SQLite (node:sqlite)
// This avoids the need for prisma engine binaries
import { DatabaseSync } from 'node:sqlite'

const DB_PATH = process.env.DATABASE_FILE || '/home/z/my-project/db/assets.db'

let _db: DatabaseSync | null = null

function getDb(): DatabaseSync {
  if (_db) return _db
  // Ensure the directory exists
  const path = require('path')
  const fs = require('fs')
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

    CREATE INDEX IF NOT EXISTS idx_asset_status ON Asset(status);
    CREATE INDEX IF NOT EXISTS idx_asset_type ON Asset(assetTypeId);
    CREATE INDEX IF NOT EXISTS idx_asset_dept ON Asset(departmentId);
    CREATE INDEX IF NOT EXISTS idx_asset_loc ON Asset(locationId);
    CREATE INDEX IF NOT EXISTS idx_asset_assigned ON Asset(assignedToId);
    CREATE INDEX IF NOT EXISTS idx_asset_serial ON Asset(serialNumber);
    CREATE INDEX IF NOT EXISTS idx_history_asset ON AssignmentHistory(assetId);
    CREATE INDEX IF NOT EXISTS idx_images_asset ON AssetImage(assetId);
  `)
}

// Helper to generate IDs
export function generateId(prefix = ''): string {
  const { randomUUID } = require('crypto')
  return prefix ? `${prefix}_${randomUUID()}` : randomUUID()
}
