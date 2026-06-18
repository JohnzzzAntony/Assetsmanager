export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { initDb } from '@/lib/db'
import { seedDatabase } from '@/lib/seed'

export async function POST(req: NextRequest) {
  try {
    initDb()
    const sp = req.nextUrl.searchParams
    const force = sp.get('force') === 'true'
    const result = seedDatabase({ force })
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Seed error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    initDb()
    const sp = req.nextUrl.searchParams
    const force = sp.get('force') === 'true'
    const result = seedDatabase({ force })
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
