export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { assetRepo, assetTypeRepo, departmentRepo, locationRepo, personRepo } from '@/lib/repo'

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') {
        cur.push(field)
        field = ''
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++
        cur.push(field)
        rows.push(cur)
        cur = []
        field = ''
      } else {
        field += c
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field)
    rows.push(cur)
  }
  return rows.filter((r) => r.some((c) => c.trim()))
}

const FIELD_ALIASES: Record<string, string> = {
  srno: 'serialNumber',
  serial: 'serialNumber',
  'serial number': 'serialNumber',
  's/n': 'serialNumber',
  sn: 'serialNumber',
  make: 'make',
  brand: 'make',
  model: 'model',
  'model number': 'modelNumber',
  modelno: 'modelNumber',
  type: 'assetTypeId',
  assettype: 'assetTypeId',
  'asset type': 'assetTypeId',
  status: 'status',
  os: 'os',
  cpu: 'cpu',
  ram: 'ram',
  storage: 'storage',
  imei: 'imei1',
  imei1: 'imei1',
  imei2: 'imei2',
  user: 'assignedToId',
  assignedto: 'assignedToId',
  department: 'departmentId',
  dept: 'departmentId',
  location: 'locationId',
  cost: 'cost',
  purchase: 'purchaseDate',
  'purchase date': 'purchaseDate',
  purchasedate: 'purchaseDate',
  assettag: 'assetTag',
  'asset tag': 'assetTag',
  tag: 'assetTag',
  comments: 'comments',
  notes: 'comments',
  warranty: 'warrantyExpiry',
  'warranty expiry': 'warrantyExpiry',
  color: 'color',
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 })
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/[_-]/g, ''))
    const dataRows = rows.slice(1)

    const types = assetTypeRepo.list()
    const depts = departmentRepo.list()
    const locs = locationRepo.list()
    const persons = personRepo.list()

    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      try {
        const data: Record<string, unknown> = {}
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j]
          const field = FIELD_ALIASES[header] || header
          const val = row[j]?.trim()
          if (!val) continue

          // Resolve references
          if (field === 'assetTypeId') {
            const t = types.find((x) => x.name.toLowerCase() === val.toLowerCase())
            if (t) data.assetTypeId = t.id
            else {
              const nt = assetTypeRepo.create({ name: val })
              types.push(nt)
              data.assetTypeId = nt.id
            }
          } else if (field === 'departmentId') {
            let d = depts.find((x) => x.name.toLowerCase() === val.toLowerCase())
            if (!d) {
              d = departmentRepo.create({ name: val })
              depts.push(d)
            }
            data.departmentId = d.id
          } else if (field === 'locationId') {
            let l = locs.find((x) => x.name.toLowerCase() === val.toLowerCase())
            if (!l) {
              l = locationRepo.create({ name: val })
              locs.push(l)
            }
            data.locationId = l.id
          } else if (field === 'assignedToId') {
            let p = persons.find((x) => x.fullName.toLowerCase() === val.toLowerCase())
            if (!p) {
              p = personRepo.create({ fullName: val })
              persons.push(p)
            }
            data.assignedToId = p.id
          } else if (field === 'cost') {
            const n = parseFloat(val.replace(/[^0-9.]/g, ''))
            if (!isNaN(n)) data.cost = n
          } else if (field === 'purchaseDate' || field === 'warrantyExpiry') {
            const d = new Date(val)
            if (!isNaN(d.getTime())) data[field] = d.toISOString()
          } else {
            data[field] = val
          }
        }

        if (!data.assetTypeId) {
          // default to "Other"
          const other = types.find((t) => t.name === 'Other') || assetTypeRepo.create({ name: 'Other' })
          data.assetTypeId = other.id
        }

        assetRepo.create(data)
        imported++
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({ imported, errors })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
