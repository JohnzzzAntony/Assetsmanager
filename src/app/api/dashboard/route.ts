export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import {
  getDashboardStats,
  maintenanceRepo,
  licenseRepo,
  activityLogRepo,
  checkoutRepo,
  depreciationRepo,
  notificationRepo,
} from '@/lib/repo'

export async function GET() {
  try {
    const stats = getDashboardStats()
    // Enrich with maintenance + license stats
    const maint = maintenanceRepo.stats()
    const lic = licenseRepo.stats()
    const recentActivityLog = activityLogRepo.recent(8)
    const checkoutStats = checkoutRepo.stats()
    const depStats = depreciationRepo.stats()
    const notifCount = notificationRepo.count({ onlyUnread: true })
    const allNotif = notificationRepo.list({ limit: 200 })
    return NextResponse.json({
      ...stats,
      maintenance: maint,
      licenses: lic,
      auditLog: recentActivityLog,
      checkouts: {
        total: checkoutStats.total,
        pending: checkoutStats.pending,
        checkedOut: checkoutStats.checkedOut,
        overdue: checkoutStats.overdue,
      },
      depreciation: depStats,
      notifications: {
        total: allNotif.length,
        unread: notifCount,
        critical: allNotif.filter((n: any) => n.severity === 'critical').length,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Dashboard error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
