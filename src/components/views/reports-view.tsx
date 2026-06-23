'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardApi, assetsApi, vendorsApi, purchaseOrdersApi, disposalsApi, depreciationApi, bookingsApi, tagsApi, exportApi, reportsApi } from '@/lib/api'
import type { SavedReport, SavedReportConfig } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatRelative, formatDate } from '@/lib/format'
import { useNav } from '@/lib/nav'
import { STATUS_CONFIG, DISPOSAL_METHOD_CONFIG, getTagColorConfig, BOOKING_STATUS_CONFIG, BOOKING_STATUSES, type CostForecastCategory, type CostForecastPoint } from '@/lib/types'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar, Legend, ComposedChart,
} from 'recharts'
import { Download, TrendingUp, TrendingDown, DollarSign, Package, Wrench, AlertTriangle, Activity, Store, Trash2, ShoppingCart, Tag, CalendarClock, LineChart as LineChartIcon, RefreshCw, CalendarRange, Bookmark, ChevronDown, FileText, Inbox } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  'In Use': '#10b981', 'In Stock': '#64748b', Repair: '#f59e0b', Retired: '#f43f5e', Lost: '#ef4444',
}
const CHART_COLORS = ['#0f172a', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

// Format a YYYY-MM month string as "MMM yy" (e.g. "2026-04" -> "Apr 26")
function fmtMonth(m: string): string {
  if (!m || m.length < 7) return m ?? ''
  const [y, mo] = m.split('-')
  const mi = parseInt(mo, 10) - 1
  const yi = parseInt(y, 10)
  if (isNaN(mi) || isNaN(yi)) return m
  return new Date(yi, mi, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

// Compact Y-axis currency formatter: $1.5k, $12k, $0
function fmtCompactCurrency(v: number): string {
  if (v >= 1000) return `$${Math.round(v / 1000)}k`
  return `$${Math.round(v)}`
}

export function ReportsView() {
  const { data: stats } = useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardApi.get() })
  const { data: assetsAll } = useQuery({
    queryKey: ['all-assets-report'],
    queryFn: () => assetsApi.list({ pageSize: 100, sortBy: 'purchaseDate', sortDir: 'asc' }),
  })
  const { data: vendors } = useQuery({ queryKey: ['vendors-report'], queryFn: () => vendorsApi.list() })
  const { data: purchaseOrders } = useQuery({ queryKey: ['pos-report'], queryFn: () => purchaseOrdersApi.list() })
  const { data: disposals } = useQuery({ queryKey: ['disposals-report'], queryFn: () => disposalsApi.list() })
  const { data: deprStats } = useQuery({ queryKey: ['depr-stats-report'], queryFn: () => depreciationApi.stats() })
  const { data: bookings } = useQuery({ queryKey: ['bookings-report'], queryFn: () => bookingsApi.list({ limit: 500 }) })
  const { data: tags } = useQuery({ queryKey: ['tags-report'], queryFn: () => tagsApi.list() })
  const qc = useQueryClient()

  // Date Range filter state (affects Acquisition Trend + Cost Trend)
  const [range, setRange] = useState<'all' | '30d' | '90d' | '365d' | 'custom'>('all')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')

  // ---- Saved Reports (Round 5) ----
  // Tracks which saved report is currently "loaded" (for the badge next to the range badge).
  // Cleared whenever the user manually changes the range / dates below.
  const [loadedSavedId, setLoadedSavedId] = useState<string | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveDesc, setSaveDesc] = useState('')
  const [savingReport, setSavingReport] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const savedReportsQuery = useQuery({
    queryKey: ['saved-reports'],
    queryFn: () => reportsApi.savedList(),
  })
  const savedReports: SavedReport[] = savedReportsQuery.data?.data ?? []
  const loadedSavedReport = loadedSavedId
    ? savedReports.find((r) => r.id === loadedSavedId) ?? null
    : null

  // Map the selected date range to a number of months for the cost-trend query
  const months = useMemo(() => {
    if (range === '30d') return 1
    if (range === '90d') return 3
    if (range === '365d') return 12
    if (range === 'custom' && customStart && customEnd) {
      const s = new Date(customStart)
      const e = new Date(customEnd)
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)))
        return Math.max(1, Math.min(60, Math.ceil(days / 30)))
      }
    }
    return 24 // All Time (24 months back max)
  }, [range, customStart, customEnd])

  const rangeLabel = useMemo(() => {
    if (range === '30d') return 'Last 30 days'
    if (range === '90d') return 'Last 90 days'
    if (range === '365d') return 'Last 365 days'
    if (range === 'custom') return 'Custom Range'
    return 'All Time'
  }, [range])

  const { data: costTrend } = useQuery({
    queryKey: ['cost-trend', months],
    queryFn: () => reportsApi.costTrend(months),
  })

  const { data: lifecycle } = useQuery({
    queryKey: ['lifecycle-report'],
    queryFn: () => reportsApi.lifecycle(),
  })

  // Year-over-year cost comparison (Round 5) — registered before early return to keep hook order stable
  const { data: lifecycleYoY } = useQuery({
    queryKey: ['lifecycle-yoy', 2],
    queryFn: () => reportsApi.lifecycleYoY(2),
  })

  // Maintenance cost analytics (Round 6) — registered before early return to keep hook order stable
  const { data: maintenanceCost } = useQuery({
    queryKey: ['maintenance-cost', 12],
    queryFn: () => reportsApi.maintenanceCost(12),
  })

  // Cost forecast analytics (Round 7) — 12-month historical spend + 6-month forecast per category.
  // Registered before any early return to keep hook order stable.
  const { data: costForecast } = useQuery({
    queryKey: ['cost-forecast'],
    queryFn: () => reportsApi.costForecast(12, 6),
  })

  // Navigation hook for asset-detail click-through (Maintenance Cost Analytics section)
  const { navigate } = useNav()

  function refreshAll() {
    qc.invalidateQueries()
    toast.success('Refreshing all reports...')
  }

  function exportFull() {
    exportApi.download(exportApi.assets())
    toast.success('Exporting full asset report...')
  }

  // ---- Saved Reports handlers (Round 5) ----
  // When the user manually picks a new range / dates, clear the "loaded" indicator
  // so the "Saved" badge disappears.
  function handleManualRangeChange(v: string) {
    setRange(v as typeof range)
    setLoadedSavedId(null)
  }
  function handleManualCustomStart(v: string) {
    setCustomStart(v)
    setLoadedSavedId(null)
  }
  function handleManualCustomEnd(v: string) {
    setCustomEnd(v)
    setLoadedSavedId(null)
  }

  function openSaveDialog() {
    setSaveName('')
    setSaveDesc('')
    setSaveDialogOpen(true)
  }

  async function submitSaveReport() {
    const name = saveName.trim()
    if (!name) {
      toast.error('Please enter a name for the saved report.')
      return
    }
    const config: SavedReportConfig = {
      range,
      customStart: customStart || null,
      customEnd: customEnd || null,
      months,
    }
    setSavingReport(true)
    try {
      const created = await reportsApi.savedCreate({
        name,
        description: saveDesc.trim() || undefined,
        section: 'Reports & Analytics',
        config,
      })
      await qc.invalidateQueries({ queryKey: ['saved-reports'] })
      setLoadedSavedId(created.id)
      setSaveDialogOpen(false)
      toast.success(`Saved report "${created.name}"`)
    } catch (err) {
      toast.error('Failed to save report. ' + (err instanceof Error ? err.message : ''))
    } finally {
      setSavingReport(false)
    }
  }

  function loadSavedReport(r: SavedReport) {
    const cfg = r.config || {}
    setRange((cfg.range as typeof range) || 'all')
    setCustomStart(cfg.customStart || '')
    setCustomEnd(cfg.customEnd || '')
    setLoadedSavedId(r.id)
    toast.success(`Loaded saved report: ${r.name}`)
  }

  async function deleteSavedReport(r: SavedReport) {
    if (!window.confirm(`Delete saved report "${r.name}"? This cannot be undone.`)) return
    setDeletingId(r.id)
    try {
      await reportsApi.savedDelete(r.id)
      await qc.invalidateQueries({ queryKey: ['saved-reports'] })
      if (loadedSavedId === r.id) setLoadedSavedId(null)
      toast.success(`Deleted saved report "${r.name}"`)
    } catch (err) {
      toast.error('Failed to delete report. ' + (err instanceof Error ? err.message : ''))
    } finally {
      setDeletingId(null)
    }
  }

  if (!stats) {
    return <div className="h-64 shimmer shimmer-bg rounded-lg" />
  }

  // Build acquisition trend by month
  const trend: Record<string, number> = {}
  if (assetsAll) {
    assetsAll.data.forEach((a) => {
      if (a.purchaseDate) {
        const m = a.purchaseDate.slice(0, 7)
        trend[m] = (trend[m] || 0) + 1
      }
    })
  }
  const trendData = Object.entries(trend)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months)
    .map(([month, count]) => ({ month, count }))

  // Value by type
  const valueByType = assetsAll
    ? Object.entries(
        assetsAll.data.reduce<Record<string, number>>((acc, a) => {
          const t = a.assetType?.name || 'Unknown'
          acc[t] = (acc[t] || 0) + (a.cost || 0)
          return acc
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : []

  const statusData = stats.byStatus.map((s) => ({
    name: s.status, value: s.count, fill: STATUS_COLORS[s.status] || '#94a3b8',
  }))

  const utilization = stats.totalAssets > 0 ? Math.round((stats.inUse / stats.totalAssets) * 100) : 0

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="live-dot" aria-hidden="true" />
            <Activity className="h-5 w-5" /> <span className="gradient-text-shine">Reports & Analytics</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              <span className="status-pulse-dot" aria-hidden="true" />
              <span className="text-shimmer uppercase tracking-wider">Live</span>
            </span>
            <Badge variant="secondary" className="text-xs font-normal">{rangeLabel}</Badge>
            {loadedSavedReport && (
              <Badge
                variant="outline"
                className="text-xs font-normal gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                title={loadedSavedReport.description || loadedSavedReport.name}
              >
                <Bookmark className="h-3 w-3" />
                Saved: {loadedSavedReport.name}
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">Insights and exportable reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refreshAll} title="Refresh reports">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {/* Saved Reports dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Saved Reports</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                <Bookmark className="h-3.5 w-3.5" />
                Saved Reports
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  openSaveDialog()
                }}
                className="gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">Save Current View…</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {savedReports.length === 0 ? (
                <div className="px-2 py-6 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span>No saved reports yet</span>
                  <span className="text-[10px] text-muted-foreground/80">
                    Configure a date range, then “Save Current View…”
                  </span>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto scrollbar-thin py-1">
                  {savedReports.map((r) => (
                    <div
                      key={r.id}
                      className="group flex items-center gap-1 rounded-sm px-1"
                    >
                      <button
                        type="button"
                        onClick={() => loadSavedReport(r)}
                        className="flex-1 min-w-0 text-left px-2 py-1.5 rounded-sm hover:bg-accent transition-colors"
                        title={r.description || r.name}
                      >
                        <div className="flex items-center gap-1.5">
                          <Bookmark
                            className={`h-3.5 w-3.5 shrink-0 ${loadedSavedId === r.id ? 'text-emerald-600' : 'text-muted-foreground'}`}
                          />
                          <span className="text-sm font-medium truncate">{r.name}</span>
                        </div>
                        <div className="pl-5 text-[10px] text-muted-foreground">
                          Updated {formatRelative(r.updatedAt)}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (deletingId === r.id) return
                          void deleteSavedReport(r)
                        }}
                        disabled={deletingId === r.id}
                        className="shrink-0 p-1.5 rounded-sm text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        title="Delete saved report"
                        aria-label={`Delete ${r.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={exportFull} disabled={!assetsAll}>
            <Download className="h-4 w-4 mr-1.5" /> Export Full Report
          </Button>
        </div>
      </div>

      {/* Date Range filter */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
            <span>Date Range:</span>
          </div>
          <Select value={range} onValueChange={handleManualRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last 365 days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Start date"
                value={customStart}
                onChange={(e) => handleManualCustomStart(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="date"
                aria-label="End date"
                value={customEnd}
                onChange={(e) => handleManualCustomEnd(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}
          <Badge variant="outline" className="ml-auto">{range !== 'all' ? `${months} month${months === 1 ? '' : 's'}` : '24 months max'}</Badge>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 hover-lift card-3d-tilt" style={{ borderLeftColor: '#10b981' }}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Utilization Rate</p>
                <p className="text-2xl font-bold animate-count-up">{utilization}%</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 hover-lift card-3d-tilt" style={{ borderLeftColor: '#8b5cf6' }}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Asset Value</p>
                <p className="text-2xl font-bold animate-count-up">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <DollarSign className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 hover-lift card-3d-tilt" style={{ borderLeftColor: '#f59e0b' }}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">In Repair</p>
                <p className="text-2xl font-bold animate-count-up">{stats.repair}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Wrench className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 hover-lift card-3d-tilt" style={{ borderLeftColor: '#06b6d4' }}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Warranty Expiring</p>
                <p className="text-2xl font-bold animate-count-up">{stats.warrantyExpiringSoon}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                <AlertTriangle className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Acquisition trend */}
        <Card className="hover-lift chart-bar-grow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base shimmer-underline">Asset Acquisition Trend</CardTitle>
            <CardDescription>Assets purchased per month (last 12 months)</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No purchase date data</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#0f172a" strokeWidth={2} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cost Trend Over Time — removed in Round 10 (referenced maintenance + disposal costs) */}

        {/* Status donut */}
        <Card className="hover-lift chart-bar-grow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base shimmer-underline">Status Distribution</CardTitle>
            <CardDescription>Asset count by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.fill }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="ml-auto font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Value by type */}
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Asset Value by Type</CardTitle>
            <CardDescription>Total cost grouped by asset type</CardDescription>
          </CardHeader>
          <CardContent>
            {valueByType.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No cost data</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={valueByType} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Department breakdown */}
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assets by Department</CardTitle>
            <CardDescription>Distribution across teams</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.byDepartment.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.byDepartment} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {stats.byDepartment.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Procurement & Vendor Analytics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Vendor Spend */}
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-sky-600" /> Vendor Spend
            </CardTitle>
            <CardDescription>Total purchase value by vendor (excludes Draft/Cancelled POs)</CardDescription>
          </CardHeader>
          <CardContent>
            {!vendors || vendors.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No vendor data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={vendors
                    .map((v) => ({ name: v.name, value: v._sum?.totalSpent ?? 0, pos: v._count?.purchaseOrders ?? 0 }))
                    .filter((v) => v.value > 0)
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* PO Status Breakdown */}
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-violet-600" /> Purchase Order Status
            </CardTitle>
            <CardDescription>Distribution of POs by status</CardDescription>
          </CardHeader>
          <CardContent>
            {!purchaseOrders || purchaseOrders.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No purchase orders</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        purchaseOrders.reduce<Record<string, number>>((acc, po) => {
                          acc[po.status] = (acc[po.status] || 0) + 1
                          return acc
                        }, {})
                      ).map(([name, value]) => ({ name, value }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {Object.entries(
                        purchaseOrders.reduce<Record<string, number>>((acc, po) => {
                          acc[po.status] = (acc[po.status] || 0) + 1
                          return acc
                        }, {})
                      ).map(([name], i) => {
                        const colors: Record<string, string> = {
                          Draft: '#94a3b8', 'Pending Approval': '#f59e0b', Approved: '#0ea5e9',
                          Ordered: '#8b5cf6', 'Partially Received': '#06b6d4', Received: '#10b981',
                          Cancelled: '#f43f5e', Closed: '#71717a',
                        }
                        return <Cell key={i} fill={colors[name] || '#94a3b8'} />
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {Object.entries(
                    purchaseOrders.reduce<Record<string, number>>((acc, po) => {
                      acc[po.status] = (acc[po.status] || 0) + 1
                      return acc
                    }, {})
                  ).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{name}</span>
                      <span className="ml-2 font-medium tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Depreciation Summary — removed in Round 10 */}

        {/* Disposal Summary — removed in Round 10 */}
      </div>

      {/* Bookings & Tags Analytics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Booking Status Distribution */}
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-cyan-600" /> Booking Status Distribution
            </CardTitle>
            <CardDescription>Active, pending, and historical reservations</CardDescription>
          </CardHeader>
          <CardContent>
            {bookings && bookings.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={BOOKING_STATUSES.map((s) => ({ name: s, count: bookings.filter((b) => b.status === s).length }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Bookings" radius={[6, 6, 0, 0]}>
                      {BOOKING_STATUSES.map((s) => {
                        const cfg = BOOKING_STATUS_CONFIG[s]
                        // Map text class to a hex color
                        const colorMap: Record<string, string> = {
                          amber: '#f59e0b', sky: '#0ea5e9', rose: '#f43f5e',
                          emerald: '#10b981', zinc: '#71717a', slate: '#64748b',
                        }
                        const m = cfg.dot.match(/bg-(\w+)-500/)
                        const color = m ? colorMap[m[1]] || '#94a3b8' : '#94a3b8'
                        return <Cell key={s} fill={color} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border bg-muted/30 p-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase">Active</div>
                    <div className="text-sm font-semibold text-emerald-600">{bookings.filter((b) => b.status === 'Active').length}</div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase">Pending</div>
                    <div className="text-sm font-semibold text-amber-600">{bookings.filter((b) => b.status === 'Pending').length}</div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase">Completed</div>
                    <div className="text-sm font-semibold text-zinc-600">{bookings.filter((b) => b.status === 'Completed').length}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No bookings to display
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tag Distribution */}
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-pink-600" /> Tag Distribution
            </CardTitle>
            <CardDescription>Asset count per tag</CardDescription>
          </CardHeader>
          <CardContent>
            {tags && tags.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tags.map((t) => ({ name: t.name, count: t._count?.assets || 0, color: t.color }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" name="Assets" radius={[0, 6, 6, 0]}>
                      {tags.map((t) => {
                        const cfg = getTagColorConfig(t.color)
                        const m = cfg.dot.match(/bg-(\w+)-500/)
                        const colorMap: Record<string, string> = {
                          slate: '#64748b', emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
                          violet: '#8b5cf6', sky: '#0ea5e9', orange: '#f97316', pink: '#ec4899',
                          lime: '#84cc16', cyan: '#06b6d4',
                        }
                        const color = m ? colorMap[m[1]] || '#94a3b8' : '#94a3b8'
                        return <Cell key={t.id} fill={color} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.slice(0, 6).map((t) => {
                    const cfg = getTagColorConfig(t.color)
                    return (
                      <span key={t.id} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${cfg.bg} ${cfg.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {t.name} ({t._count?.assets || 0})
                      </span>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No tags to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Year-over-Year Cost Comparison */}
      <div className="section-accent-bar mt-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-5 w-5 text-violet-600" />
          Year-over-Year Cost Comparison
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Purchase cost by asset type: current year vs previous year
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* YoY Grouped Bar Chart */}
        <Card className="hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-violet-600" /> Cost by Asset Type (YoY)
            </CardTitle>
            <CardDescription>Current year vs previous year purchase cost</CardDescription>
          </CardHeader>
          <CardContent>
            {!lifecycleYoY || lifecycleYoY.data.length === 0 ||
             lifecycleYoY.data.every((p) => p.currentYear === 0 && p.previousYear === 0) ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No YoY cost data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={lifecycleYoY.data}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                  <XAxis dataKey="assetType" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => fmtCompactCurrency(v)}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Legend />
                  <Bar dataKey="previousYear" name="Previous Year" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="currentYear" name="Current Year" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* YoY Summary Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-violet-600" /> YoY Summary by Type
            </CardTitle>
            <CardDescription>Per-type delta and percent change</CardDescription>
          </CardHeader>
          <CardContent>
            {!lifecycleYoY || lifecycleYoY.data.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No YoY cost data</p>
            ) : (
              <div className="scrollbar-thin max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-2 font-medium">Asset Type</th>
                      <th className="pb-2 pr-2 text-right font-medium">Previous Year</th>
                      <th className="pb-2 pr-2 text-right font-medium">Current Year</th>
                      <th className="pb-2 pr-2 text-right font-medium">Delta</th>
                      <th className="pb-2 text-right font-medium">Delta %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lifecycleYoY.data.map((row) => {
                      const isUp = row.delta > 0
                      const isDown = row.delta < 0
                      const deltaPctLabel =
                        row.deltaPct === null
                          ? '—'
                          : `${row.deltaPct >= 0 ? '+' : ''}${(row.deltaPct * 100).toFixed(1)}%`
                      return (
                        <tr key={row.assetType} className="border-b last:border-0">
                          <td className="py-1.5 pr-2 font-medium">{row.assetType}</td>
                          <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(row.previousYear)}
                          </td>
                          <td className="py-1.5 pr-2 text-right tabular-nums">{formatCurrency(row.currentYear)}</td>
                          <td
                            className={`py-1.5 pr-2 text-right tabular-nums ${
                              isUp ? 'tick-up' : isDown ? 'tick-down' : 'text-muted-foreground'
                            }`}
                          >
                            <span className="inline-flex items-center justify-end gap-0.5">
                              {isUp && <TrendingUp className="h-3 w-3" />}
                              {isDown && <TrendingDown className="h-3 w-3" />}
                              {formatCurrency(row.delta)}
                            </span>
                          </td>
                          <td
                            className={`py-1.5 text-right tabular-nums ${
                              isUp ? 'tick-up' : isDown ? 'tick-down' : 'text-muted-foreground'
                            }`}
                          >
                            {deltaPctLabel}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-2 bg-muted/40 font-bold">
                      <td className="py-2 pr-2">TOTAL</td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {formatCurrency(lifecycleYoY.totals.previousYear)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {formatCurrency(lifecycleYoY.totals.currentYear)}
                      </td>
                      <td
                        className={`py-2 pr-2 text-right tabular-nums ${
                          lifecycleYoY.totals.delta > 0
                            ? 'tick-up'
                            : lifecycleYoY.totals.delta < 0
                            ? 'tick-down'
                            : ''
                        }`}
                      >
                        <span className="inline-flex items-center justify-end gap-0.5">
                          {lifecycleYoY.totals.delta > 0 && <TrendingUp className="h-3 w-3" />}
                          {lifecycleYoY.totals.delta < 0 && <TrendingDown className="h-3 w-3" />}
                          {formatCurrency(lifecycleYoY.totals.delta)}
                        </span>
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums ${
                          lifecycleYoY.totals.delta > 0
                            ? 'tick-up'
                            : lifecycleYoY.totals.delta < 0
                            ? 'tick-down'
                            : ''
                        }`}
                      >
                        {lifecycleYoY.totals.deltaPct === null
                          ? '—'
                          : `${lifecycleYoY.totals.deltaPct >= 0 ? '+' : ''}${(
                              lifecycleYoY.totals.deltaPct * 100
                            ).toFixed(1)}%`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* YoY KPI tiles */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="border-l-4" style={{ borderLeftColor: '#8b5cf6' }}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Current Year Spend</p>
                <p className="text-lg font-bold tabular-nums">
                  {formatCurrency(lifecycleYoY?.totals.currentYear ?? 0)}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                <DollarSign className="h-4 w-4 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: '#64748b' }}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Previous Year Spend</p>
                <p className="text-lg font-bold tabular-nums">
                  {formatCurrency(lifecycleYoY?.totals.previousYear ?? 0)}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-500/10">
                <DollarSign className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        {(() => {
          const delta = lifecycleYoY?.totals.delta ?? 0
          const deltaPct = lifecycleYoY?.totals.deltaPct
          const isUp = delta >= 0
          return (
            <Card className="border-l-4" style={{ borderLeftColor: isUp ? '#10b981' : '#f43f5e' }}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">YoY Change</p>
                    <p className="text-lg font-bold tabular-nums">
                      {isUp ? '+' : ''}
                      {formatCurrency(delta)}
                    </p>
                    <p className={`text-[11px] ${isUp ? 'tick-up' : 'tick-down'}`}>
                      {deltaPct === null || deltaPct === undefined
                        ? '—'
                        : `${deltaPct >= 0 ? '+' : ''}${(deltaPct * 100).toFixed(1)}%`}
                    </p>
                  </div>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      isUp ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}
      </div>



      {/* Detailed tables */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Summary by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">Count</th>
                  <th className="pb-2 font-medium text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.byType.map((t) => (
                  <tr key={t.name} className="border-b last:border-0">
                    <td className="py-2 font-medium">{t.name}</td>
                    <td className="py-2 text-right tabular-nums">{t.count}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {stats.totalAssets > 0 ? Math.round((t.count / stats.totalAssets) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Save Current View dialog (Round 5) */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-emerald-600" />
              Save Current View
            </DialogTitle>
            <DialogDescription>
              Save the current date range configuration so you can return to it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sr-name">Name <span className="text-rose-500">*</span></Label>
              <Input
                id="sr-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Q2 2026 IT budget review"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !savingReport) {
                    e.preventDefault()
                    void submitSaveReport()
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                id="sr-desc"
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                placeholder="What is this report for?"
                rows={3}
              />
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Snapshot:</span>{' '}
              {rangeLabel}
              {range === 'custom' && customStart && customEnd
                ? ` · ${customStart} → ${customEnd}`
                : ''}
              {range !== 'all' ? ` · ${months} month${months === 1 ? '' : 's'}` : ' · 24 months max'}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={savingReport}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void submitSaveReport()}
              disabled={savingReport || !saveName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingReport ? 'Saving…' : 'Save Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== Cost Forecast Category Card ====================

const CATEGORY_COLORS: Record<CostForecastCategory['category'], string> = {
  purchase: '#0ea5e9',
  maintenance: '#f59e0b',
  depreciation: '#f43f5e',
}

const CATEGORY_TITLES: Record<CostForecastCategory['category'], string> = {
  purchase: 'Purchase',
  maintenance: 'Maintenance',
  depreciation: 'Depreciation',
}

function CategoryForecastCard({ cat }: { cat: CostForecastCategory }) {
  // Extract arrays first so the React Compiler can track them in the deps array.
  const history = cat.history
  const forecast = cat.forecast

  // Combine history + forecast into a single series for the sparkline (history first, then forecast).
  const sparkData = useMemo(() => {
    const h = history.map((pt) => ({ month: pt.month, value: pt.value, kind: 'history' as const }))
    const f = forecast.map((pt) => ({ month: pt.month, value: pt.value, kind: 'forecast' as const }))
    return [...h, ...f]
  }, [history, forecast])

  const color = CATEGORY_COLORS[cat.category] || '#8b5cf6'
  const title = CATEGORY_TITLES[cat.category] || cat.category

  const trendChipClass =
    cat.trendDirection === 'up'
      ? 'trend-chip-up'
      : cat.trendDirection === 'down'
        ? 'trend-chip-down'
        : 'trend-chip-flat'
  const trendArrow = cat.trendDirection === 'up' ? '↑' : cat.trendDirection === 'down' ? '↓' : '→'

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
              style={{ backgroundColor: `${color}1a` }}
            >
              {cat.category === 'purchase' && <Package className="h-4 w-4" style={{ color }} />}
              {cat.category === 'maintenance' && <Wrench className="h-4 w-4" style={{ color }} />}
              {cat.category === 'depreciation' && <TrendingDown className="h-4 w-4" style={{ color }} />}
            </span>
            <span className="truncate">{title}</span>
          </span>
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium shrink-0 ${trendChipClass}`}>
            <span>{trendArrow}</span> {cat.trendDirection}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mini rows: total historical / total forecast / projected annual */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Historical (12mo)</span>
            <span className="tabular-nums font-medium">{formatCurrency(cat.totalHistorical)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Forecast (6mo)</span>
            <span className="tabular-nums font-medium">{formatCurrency(cat.totalForecast)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Projected Annual</span>
            <span className="tabular-nums font-bold" style={{ color }}>
              {formatCurrency(cat.projectedAnnual)}
            </span>
          </div>
        </div>

        {/* Sparkline: combined history + forecast values */}
        <div className="h-[60px] w-full">
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={sparkData} margin={{ top: 2, right: 4, left: 4, bottom: 2 }}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer: history/forecast point counts */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{history.length}mo history</span>
          <span>{forecast.length}mo forecast</span>
        </div>
      </CardContent>
    </Card>
  )
}
