'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { assetMapApi } from '@/lib/api'
import type { AssetLocationMapReport, LocationAssetSummary } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import {
  Map as MapIcon,
  MapPin,
  Package,
  Building2,
  TrendingUp,
  DollarSign,
  Gauge,
  AlertCircle,
  Navigation,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { useNav } from '@/lib/nav'

// ---- Utilization color helpers ----
function rateColor(rate: number): string {
  if (rate >= 0.75) return '#10b981' // emerald
  if (rate >= 0.5) return '#0ea5e9' // sky
  if (rate >= 0.25) return '#f59e0b' // amber
  return '#f43f5e' // rose
}

function rateTextClass(rate: number): string {
  if (rate >= 0.75) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 0.5) return 'text-sky-600 dark:text-sky-400'
  if (rate >= 0.25) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

// ---- KPI tile ----
interface KPITileProps {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
  hint?: string
}

function KPITile({ label, value, icon: Icon, color, hint }: KPITileProps) {
  return (
    <Card className="stat-tile-gradient card-hover-lift overflow-hidden border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="animate-count-pop mt-1 text-2xl font-bold tracking-tight tabular-nums" style={{ color }}>
              {value}
            </p>
            {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}1a` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Mini stat (inside location card) ----
function MiniStat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/60 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className="mt-0.5 text-base font-bold tabular-nums"
        style={{ color: accent ?? 'var(--foreground)' }}
      >
        {value}
      </p>
    </div>
  )
}

// ---- Location card ----
function LocationCard({ loc }: { loc: LocationAssetSummary }) {
  const navigate = useNav((s) => s.navigate)
  const pct = Math.round(loc.utilizationRate * 100)
  const color = rateColor(loc.utilizationRate)
  const topTypes = loc.byType.slice(0, 3)
  const topAssets = loc.topAssets.slice(0, 3)

  return (
    <Card className="map-tile card-hover-lift overflow-hidden">
      <CardContent className="relative p-4">
        {/* Top: pin + name + address */}
        <div className="flex items-start gap-3">
          <div className="location-pin mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground" title={loc.locationName}>
              {loc.locationName}
            </h3>
            {loc.address && (
              <p className="truncate text-xs text-muted-foreground" title={loc.address}>
                {loc.address}
              </p>
            )}
          </div>
        </div>

        {/* Middle: 2x2 mini stats */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStat label="Total" value={loc.totalAssets} />
          <MiniStat label="In Use" value={loc.inUse} accent="#10b981" />
          <MiniStat label="In Stock" value={loc.inStock} accent="#0ea5e9" />
          <MiniStat label="Repair" value={loc.repair} accent="#f59e0b" />
        </div>

        {/* Utilization bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="font-medium uppercase tracking-wide text-muted-foreground">Utilization</span>
            <span className={`font-semibold tabular-nums ${rateTextClass(loc.utilizationRate)}`}>{pct}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="util-bar-fill progress-fill-anim h-full rounded-full"
              style={{ width: `${Math.max(pct, 2)}%`, background: color }}
            />
          </div>
        </div>

        {/* Total value */}
        <div className="mt-3 flex items-center justify-between rounded-md border border-border/60 bg-card/60 px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            Total Value
          </span>
          <span className="text-sm font-bold tabular-nums text-foreground">
            {formatCurrency(loc.totalValue)}
          </span>
        </div>

        {/* Asset types */}
        {topTypes.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Asset Types
            </p>
            <div className="flex flex-wrap gap-1">
              {topTypes.map((t) => (
                <Badge key={t.assetType} variant="outline" className="text-[10px] font-normal">
                  {t.assetType}: <span className="ml-0.5 font-semibold text-foreground">{t.count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top assets */}
        {topAssets.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Top Assets
            </p>
            <div className="space-y-1">
              {topAssets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => navigate('asset-detail', { id: a.id })}
                  className="group flex w-full items-center justify-between gap-2 rounded-md border border-border/40 bg-card/40 px-2 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground" title={a.name}>
                      {a.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {a.assetTag ?? '—'} · {a.assetType}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {a.status}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View location button */}
        <Button
          variant="outline"
          size="sm"
          className="btn-press mt-3 w-full"
          onClick={() => navigate('locations')}
        >
          <Navigation className="mr-2 h-3.5 w-3.5" />
          View Location
        </Button>
      </CardContent>
    </Card>
  )
}

// ---- Chart tooltip ----
interface ChartDatum {
  name: string
  totalAssets: number
  utilizationRate: number
  totalValue: number
  locationId: string
}

function ChartTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload?: ChartDatum }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  const pct = Math.round(d.utilizationRate * 100)
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="mt-0.5 text-muted-foreground">
        Total assets: <span className="font-medium text-foreground">{d.totalAssets}</span>
      </p>
      <p className="text-muted-foreground">
        Utilization: <span className="font-medium" style={{ color: rateColor(d.utilizationRate) }}>{pct}%</span>
      </p>
      <p className="text-muted-foreground">
        Value: <span className="font-medium text-foreground">{formatCurrency(d.totalValue)}</span>
      </p>
    </div>
  )
}

// ---- Loading skeleton ----
function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-l-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-12" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((__, j) => (
                  <Skeleton key={j} className="h-12 w-full rounded-md" />
                ))}
              </div>
              <Skeleton className="mt-3 h-2 w-full rounded-full" />
              <Skeleton className="mt-3 h-8 w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---- Main view ----
export function AssetMapView() {
  const navigate = useNav((s) => s.navigate)
  const { data, isLoading, isError } = useQuery<AssetLocationMapReport>({
    queryKey: ['asset-map'],
    queryFn: () => assetMapApi.report(),
  })

  const locations = data?.locations
  const chartData = useMemo<ChartDatum[]>(() => {
    if (!locations) return []
    return [...locations]
      .sort((a, b) => b.totalAssets - a.totalAssets)
      .map((l) => ({
        name: l.locationName,
        totalAssets: l.totalAssets,
        utilizationRate: l.utilizationRate,
        totalValue: l.totalValue,
        locationId: l.locationId,
      }))
  }, [locations])

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Asset Location Map</h2>
            <span className="live-dot" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Live data
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize asset distribution across your locations
          </p>
        </div>
        <Button variant="outline" className="btn-press self-start" onClick={() => navigate('locations')}>
          <MapIcon className="mr-2 h-4 w-4" />
          Manage Locations
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="empty-state-icon mb-4">
              <AlertCircle className="h-7 w-7 text-rose-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Couldn&apos;t load asset map</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Something went wrong while fetching the location distribution report. Please try again later.
            </p>
          </CardContent>
        </Card>
      ) : data.locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="empty-state-icon mb-4">
              <MapPin className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No locations yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add locations to start grouping and visualizing your asset distribution on the map.
            </p>
            <Button className="btn-press mt-4" onClick={() => navigate('locations')}>
              <MapPin className="mr-2 h-4 w-4" />
              Add a location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid gap-3 sm:grid-cols-3">
            <KPITile
              label="Total Locations"
              value={data.totals.totalLocations}
              icon={Building2}
              color="#64748b"
              hint="Distinct sites tracked"
            />
            <KPITile
              label="Total Assets"
              value={data.totals.totalAssets}
              icon={Package}
              color="#0ea5e9"
              hint="Across all locations"
            />
            <KPITile
              label="Avg Utilization"
              value={`${Math.round(data.totals.avgUtilization * 100)}%`}
              icon={Gauge}
              color="#10b981"
              hint="In-use vs available"
            />
          </div>

          {/* Divider between KPI tiles and locations grid */}
          <div className="gradient-divider-strong" aria-hidden />

          {/* Unassigned banner */}
          {data.unassigned.count > 0 && (
            <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100">
              <AlertCircle className="text-amber-600" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">
                {data.unassigned.count} assets have no location assigned
              </AlertTitle>
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {formatCurrency(data.unassigned.value)} in asset value is currently unmapped.
                    Assign a location to improve tracking and utilization analytics.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="btn-press border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
                    onClick={() => navigate('assets')}
                  >
                    <Package className="mr-2 h-3.5 w-3.5" />
                    View Assets
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Locations grid */}
          <div>
            <div className="section-accent-bar dot-pattern-bg mb-3 rounded-lg px-3 py-2">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Layers className="h-5 w-5 text-violet-600" />
                Locations
                <Badge variant="secondary" className="ml-1">{data.locations.length}</Badge>
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Asset distribution and utilization per site · click an asset to view details
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.locations.map((loc) => (
                <LocationCard key={loc.locationId} loc={loc} />
              ))}
            </div>
          </div>

          {/* Bottom bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-sky-600" />
                Assets by Location
              </CardTitle>
              <CardDescription>
                Bar color reflects utilization rate (green ≥75%, blue ≥50%, amber ≥25%, rose &lt;25%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 48)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 24, left: 8, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={130}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'oklch(0.7 0.01 240 / 0.08)' }} />
                  <Bar dataKey="totalAssets" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.locationId} fill={rateColor(entry.utilizationRate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
