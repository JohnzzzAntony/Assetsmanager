'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { utilizationApi } from '@/lib/api'
import type { UtilizationByBucket, IdleAsset } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  AlertCircle,
  Building2,
  Layers,
  Activity,
  Timer,
} from 'lucide-react'
import { formatDate } from '@/lib/format'
import { useNav } from '@/lib/nav'

// ---- KPI tile ----
interface KPITileProps {
  label: string
  value: React.ReactNode
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

// Returns bar color by utilization rate
function rateColor(rate: number): string {
  if (rate >= 0.75) return '#10b981' // emerald
  if (rate >= 0.5) return '#0ea5e9' // sky
  if (rate >= 0.25) return '#f59e0b' // amber
  return '#f43f5e' // rose
}

function rateLabel(rate: number): { text: string; className: string } {
  const pct = Math.round(rate * 100)
  if (rate >= 0.75) return { text: `${pct}%`, className: 'text-emerald-600 dark:text-emerald-400' }
  if (rate >= 0.5) return { text: `${pct}%`, className: 'text-sky-600 dark:text-sky-400' }
  if (rate >= 0.25) return { text: `${pct}%`, className: 'text-amber-600 dark:text-amber-400' }
  return { text: `${pct}%`, className: 'text-rose-600 dark:text-rose-400' }
}

// ---- Bucket list (below chart) ----
function BucketList({ buckets }: { buckets: UtilizationByBucket[] }) {
  if (buckets.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">No buckets to display.</p>
    )
  }
  return (
    <div className="space-y-2">
      {buckets.map((b) => {
        const pct = Math.round(b.utilizationRate * 100)
        const label = rateLabel(b.utilizationRate)
        return (
          <div
            key={b.bucketId}
            className="grid grid-cols-12 items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs"
          >
            <div className="col-span-12 truncate font-medium text-foreground sm:col-span-4" title={b.bucketName}>
              {b.bucketName}
            </div>
            <div className="col-span-3 text-center tabular-nums text-muted-foreground sm:col-span-2">
              <span className="font-medium text-foreground">{b.total}</span> total
            </div>
            <div className="col-span-3 text-center tabular-nums sm:col-span-2">
              <span className="font-medium text-foreground">{b.inUse}</span>{' '}
              <span className="text-muted-foreground">in use</span>
            </div>
            <div className={`col-span-2 text-right font-semibold tabular-nums sm:col-span-2 ${label.className}`}>
              {label.text}
            </div>
            <div className="col-span-4 sm:col-span-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="util-bar-fill progress-fill-anim h-full rounded-full"
                  style={{ width: `${pct}%`, background: rateColor(b.utilizationRate) }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Bucket section (header + chart + list) ----
interface BucketSectionProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  buckets: UtilizationByBucket[]
  chartHeight?: number
}

function BucketSection({ title, description, icon: Icon, iconColor, buckets, chartHeight = 280 }: BucketSectionProps) {
  const chartData = useMemo(
    () =>
      [...buckets]
        .sort((a, b) => b.utilizationRate - a.utilizationRate)
        .map((b) => ({
          name: b.bucketName,
          rate: Math.round(b.utilizationRate * 100),
          total: b.total,
          inUse: b.inUse,
          bucketId: b.bucketId,
        })),
    [buckets],
  )

  return (
    <div className="space-y-3">
      <div className="section-accent-bar dot-pattern-bg rounded-lg px-3 py-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Utilization Rate by Bucket</CardTitle>
          <CardDescription>Bars colored by rate (green ≥75%, blue ≥50%, amber ≥25%, rose &lt;25%)</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }}
                  formatter={(value: number, _name, props) => {
                    const payload = props?.payload as { inUse?: number; total?: number } | undefined
                    return [
                      `${value}% (${payload?.inUse ?? 0} of ${payload?.total ?? 0} in use)`,
                      'Utilization',
                    ]
                  }}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.bucketId} fill={rateColor(entry.rate / 100)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <BucketList buckets={buckets} />
    </div>
  )
}

// ---- Idle asset row ----
function idleBadge(days: number): { text: string; className: string } {
  if (days > 180) return { text: `${days}d`, className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' }
  if (days > 90) return { text: `${days}d`, className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' }
  return { text: `${days}d`, className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' }
}

function IdleAssetsTable({ assets }: { assets: IdleAsset[] }) {
  const navigate = useNav((s) => s.navigate)
  const sorted = useMemo(() => [...assets].sort((a, b) => b.daysIdle - a.daysIdle), [assets])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Idle Assets
          <Badge variant="secondary" className="ml-1">{sorted.length}</Badge>
        </CardTitle>
        <CardDescription>Assets in stock for more than 30 days · sorted by days idle (desc)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Days Idle</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((a) => {
                const badge = idleBadge(a.daysIdle)
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{a.name}</div>
                      {a.assetTag && (
                        <div className="text-[11px] text-muted-foreground">{a.assetTag}</div>
                      )}
                      {a.purchaseDate && (
                        <div className="text-[10px] text-muted-foreground/70">
                          Purchased {formatDate(a.purchaseDate)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {a.serialNumber || '—'}
                    </TableCell>
                    <TableCell>{a.departmentName || '—'}</TableCell>
                    <TableCell>{a.locationName || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={badge.className}>
                        <Clock className="mr-1 h-3 w-3" />
                        {badge.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="btn-press h-7 px-2 text-xs"
                        onClick={() => navigate('asset-detail', { id: a.id })}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export function UtilizationView() {
  const { data, isLoading } = useQuery({
    queryKey: ['utilization'],
    queryFn: () => utilizationApi.report(),
  })

  const overall = data?.overall

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Asset Utilization</h2>
        <p className="text-sm text-muted-foreground">
          Track how effectively your asset pool is being used across departments and types.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && data && overall && (
        <>
          {/* KPI tiles */}
          <div className="grid gap-3 sm:grid-cols-3">
            <KPITile
              label="Overall Utilization Rate"
              value={
                <span className="gradient-text-shine">
                  {Math.round(overall.utilizationRate * 100)}%
                </span>
              }
              icon={Gauge}
              color="#10b981"
              hint="In-use / available assets"
            />
            <KPITile
              label="In Use vs Available"
              value={`${overall.inUse} / ${overall.totalAssets - overall.retired - overall.lost}`}
              icon={Activity}
              color="#0ea5e9"
              hint={`${overall.totalAssets} total assets`}
            />
            <KPITile
              label="Idle Assets"
              value={overall.idleCount}
              icon={Clock}
              color="#f59e0b"
              hint="In stock > 30 days"
            />
          </div>

          {/* Divider between KPI tiles and bucket sections */}
          <div className="gradient-divider-strong" aria-hidden />

          {/* By Department */}
          <BucketSection
            title="Utilization by Department"
            description="How each department is putting its assigned assets to work."
            icon={Building2}
            iconColor="#8b5cf6"
            buckets={data.byDepartment}
            chartHeight={Math.max(220, data.byDepartment.length * 36)}
          />

          {/* By Asset Type */}
          <BucketSection
            title="Utilization by Asset Type"
            description="Usage breakdown by asset category — spot types that are overstocked or underused."
            icon={Layers}
            iconColor="#0ea5e9"
            buckets={data.byAssetType}
            chartHeight={Math.max(220, data.byAssetType.length * 36)}
          />

          {/* Divider between asset-type section and idle assets */}
          <div className="gradient-divider-strong" aria-hidden />

          {/* Idle Assets */}
          <div className="space-y-3">
            <div className="section-accent-bar dot-pattern-bg rounded-lg px-3 py-2">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Timer className="h-5 w-5 text-amber-600" />
                Idle Assets
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Assets that have been sitting in stock without being assigned — candidates for redeployment or disposal.
              </p>
            </div>

            {data.idleAssets.length === 0 ? (
              <Card>
                <CardContent className="p-2">
                  <EmptyState
                    icon={TrendingUp}
                    title="No idle assets — great job!"
                    description="Every in-stock asset has been put to use within the last 30 days. Keep it up."
                  />
                </CardContent>
              </Card>
            ) : (
              <IdleAssetsTable assets={data.idleAssets} />
            )}
          </div>

          {/* Footer summary */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
              <Package className="h-4 w-4 text-slate-500" />
              <span className="text-muted-foreground">Total assets:</span>
              <span className="ml-auto font-semibold tabular-nums">{overall.totalAssets}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-muted-foreground">In use:</span>
              <span className="ml-auto font-semibold tabular-nums">{overall.inUse}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <span className="text-muted-foreground">In stock:</span>
              <span className="ml-auto font-semibold tabular-nums">{overall.inStock}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span className="text-muted-foreground">Repair + Retired + Lost:</span>
              <span className="ml-auto font-semibold tabular-nums">
                {overall.repair + overall.retired + overall.lost}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
