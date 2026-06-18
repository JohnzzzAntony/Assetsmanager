export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/repo'

export async function GET() {
  try {
    const stats = getDashboardStats()
    return NextResponse.json(stats)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Dashboard error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
