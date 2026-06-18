export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getDashboardStats, maintenanceRepo, licenseRepo, activityLogRepo } from '@/lib/repo'

export async function GET() {
  try {
    const stats = getDashboardStats()
    // Enrich with maintenance + license stats
    const maint = maintenanceRepo.stats()
    const lic = licenseRepo.stats()
    const recentActivityLog = activityLogRepo.recent(8)
    return NextResponse.json({
      ...stats,
      maintenance: maint,
      licenses: lic,
      auditLog: recentActivityLog,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Dashboard error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
