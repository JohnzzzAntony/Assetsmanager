'use client'

import { AppShell } from '@/components/app-shell'
import { useNav } from '@/lib/nav'
import { DashboardView } from '@/components/views/dashboard-view'
import { AssetsListView } from '@/components/views/assets-list-view'
import { AssetDetailView } from '@/components/views/asset-detail-view'
import { AssetFormView } from '@/components/views/asset-form-view'
import { OcrUploadView } from '@/components/views/ocr-upload-view'
import { DepartmentsView } from '@/components/views/departments-view'
import { LocationsView } from '@/components/views/locations-view'
import { PersonsView } from '@/components/views/persons-view'
import { AssetTypesView } from '@/components/views/asset-types-view'
import { ImportView } from '@/components/views/import-view'
import { ReportsView } from '@/components/views/reports-view'
import { MaintenanceView } from '@/components/views/maintenance-view'
import { AuditLogView } from '@/components/views/audit-log-view'
import { LicensesView } from '@/components/views/licenses-view'
import { AssetLabelsView } from '@/components/views/asset-labels-view'
import { CheckoutsView } from '@/components/views/checkouts-view'
import { DepreciationView } from '@/components/views/depreciation-view'
import { NotificationsView } from '@/components/views/notifications-view'
import { VendorsView } from '@/components/views/vendors-view'
import { PurchaseOrdersView } from '@/components/views/purchase-orders-view'
import { DisposalsView } from '@/components/views/disposals-view'
import { TagsView } from '@/components/views/tags-view'
import { BookingsView } from '@/components/views/bookings-view'
import { ExpirationsView } from '@/components/views/expirations-view'
import { UtilizationView } from '@/components/views/utilization-view'
import { AssetMapView } from '@/components/views/asset-map-view'
import { AssetTimelineView } from '@/components/views/asset-timeline-view'
import { useQuery } from '@tanstack/react-query'
import { assetsApi } from '@/lib/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { Database, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

function ViewRouter() {
  const { view, params } = useNav()

  // Seed check: ping the seed endpoint if assets list is empty
  const { data: assetsData, error } = useQuery({
    queryKey: ['assets-seed-check'],
    queryFn: () => assetsApi.list({ pageSize: 1 }),
    retry: false,
  })

  const isEmpty = !error && assetsData && assetsData.total === 0

  useEffect(() => {
    if (isEmpty) {
      // Auto-seed on first load
      fetch('/api/seed', { method: 'POST' })
        .then((r) => r.json())
        .then((res) => {
          if (res.success && !res.skipped) {
            toast.success('Database seeded with demo data!')
            setTimeout(() => window.location.reload(), 800)
          }
        })
        .catch(() => {})
    }
  }, [isEmpty])

  if (error) {
    return (
      <Alert variant="destructive">
        <Database className="h-4 w-4" />
        <AlertTitle>Database connection error</AlertTitle>
        <AlertDescription className="flex items-center gap-3">
          <span>{String(error)}</span>
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  switch (view) {
    case 'dashboard':
      return <DashboardView />
    case 'assets':
      return <AssetsListView />
    case 'asset-detail':
      return <AssetDetailView id={params.id} />
    case 'asset-new':
      return <AssetFormView mode="new" />
    case 'asset-edit':
      return <AssetFormView mode="edit" id={params.id} />
    case 'ocr-upload':
      return <OcrUploadView />
    case 'departments':
      return <DepartmentsView />
    case 'locations':
      return <LocationsView />
    case 'persons':
      return <PersonsView />
    case 'asset-types':
      return <AssetTypesView />
    case 'import':
      return <ImportView />
    case 'reports':
      return <ReportsView />
    case 'maintenance':
      return <MaintenanceView />
    case 'audit-log':
      return <AuditLogView />
    case 'licenses':
      return <LicensesView />
    case 'asset-labels':
      return <AssetLabelsView />
    case 'checkouts':
      return <CheckoutsView />
    case 'depreciation':
      return <DepreciationView />
    case 'notifications':
      return <NotificationsView />
    case 'vendors':
      return <VendorsView />
    case 'purchase-orders':
      return <PurchaseOrdersView />
    case 'disposals':
      return <DisposalsView />
    case 'tags':
      return <TagsView />
    case 'bookings':
      return <BookingsView />
    case 'expirations':
      return <ExpirationsView />
    case 'utilization':
      return <UtilizationView />
    case 'asset-map':
      return <AssetMapView />
    case 'asset-timeline':
      return <AssetTimelineView assetId={params.id} />
    default:
      return <DashboardView />
  }
}

export default function Home() {
  return (
    <AppShell>
      <ViewRouter />
    </AppShell>
  )
}
