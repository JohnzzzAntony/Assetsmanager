'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardApi, assetsApi, vendorsApi, purchaseOrdersApi, disposalsApi, depreciationApi, bookingsApi, tagsApi, exportApi, reportsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/format'
import { STATUS_CONFIG, DISPOSAL_METHOD_CONFIG, getTagColorConfig, BOOKING_STATUS_CONFIG, BOOKING_STATUSES } from '@/lib/types'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar, Legend,
} from 'recharts'
import { Download, TrendingUp, TrendingDown, DollarSign, Package, Wrench, AlertTriangle, Activity, Store, Trash2, ShoppingCart, Tag, CalendarClock, LineChart as LineChartIcon, RefreshCw, CalendarRange } from 'lucide-react'
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

  function refreshAll() {
    qc.invalidateQueries()
    toast.success('Refreshing all reports...')
  }

  function exportFull() {
    exportApi.download(exportApi.assets())
    toast.success('Exporting full asset report...')
  }

  if (!stats) {
    return <div className="h-64 shimmer rounded-lg" />
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
            <Activity className="h-5 w-5" /> Reports & Analytics
            <Badge variant="secondary" className="text-xs font-normal">{rangeLabel}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground">Insights and exportable reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refreshAll} title="Refresh reports">
            <RefreshCw className="h-4 w-4" />
          </Button>
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
          <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
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
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="date"
                aria-label="End date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}
          <Badge variant="outline" className="ml-auto">{range !== 'all' ? `${months} month${months === 1 ? '' : 's'}` : '24 months max'}</Badge>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4" style={{ borderLeftColor: '#10b981' }}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Utilization Rate</p>
                <p className="text-2xl font-bold">{utilization}%</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: '#8b5cf6' }}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Asset Value</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <DollarSign className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">In Repair</p>
                <p className="text-2xl font-bold">{stats.repair}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Wrench className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: '#06b6d4' }}>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Warranty Expiring</p>
                <p className="text-2xl font-bold">{stats.warrantyExpiringSoon}</p>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Asset Acquisition Trend</CardTitle>
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

        {/* Cost Trend Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-violet-600" /> Cost Trend Over Time
            </CardTitle>
            <CardDescription>Monthly purchase, maintenance, and disposal costs</CardDescription>
          </CardHeader>
          <CardContent>
            {!costTrend || costTrend.data.length === 0 ||
             costTrend.data.every((p) => p.purchase === 0 && p.maintenance === 0 && p.disposal === 0) ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No cost data in this range</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={costTrend.data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(m: string) => fmtMonth(m)} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtCompactCurrency(v)} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="purchase" name="Purchase" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="maintenance" name="Maintenance" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="disposal" name="Disposal" stroke="#f43f5e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Distribution</CardTitle>
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
        <Card>
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
        <Card>
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
        <Card>
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
        <Card>
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

        {/* Depreciation Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Depreciation Summary
            </CardTitle>
            <CardDescription>Purchase value vs current value</CardDescription>
          </CardHeader>
          <CardContent>
            {!deprStats ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No depreciation data</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-violet-500/10 p-3">
                    <p className="text-xs text-muted-foreground">Purchase Value</p>
                    <p className="text-lg font-bold tabular-nums text-violet-700 dark:text-violet-400">
                      {formatCurrency(deprStats.totalPurchaseValue)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <p className="text-xs text-muted-foreground">Current Value</p>
                    <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(deprStats.totalCurrentValue)}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Value Retained</span>
                    <span className="font-medium tabular-nums">
                      {deprStats.totalPurchaseValue > 0
                        ? Math.round((deprStats.totalCurrentValue / deprStats.totalPurchaseValue) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                      style={{
                        width: `${deprStats.totalPurchaseValue > 0
                          ? Math.round((deprStats.totalCurrentValue / deprStats.totalPurchaseValue) * 100)
                          : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Total depreciation: <span className="font-medium text-rose-600">-{formatCurrency(deprStats.totalDepreciation)}</span>
                    {' · '}
                    <span className="font-medium text-amber-600">{deprStats.fullyDepreciatedCount} fully depreciated</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disposal Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-600" /> Asset Disposals
            </CardTitle>
            <CardDescription>Disposals by method</CardDescription>
          </CardHeader>
          <CardContent>
            {!disposals || disposals.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No disposal records</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={Object.entries(
                      disposals.reduce<Record<string, number>>((acc, d) => {
                        acc[d.method] = (acc[d.method] || 0) + 1
                        return acc
                      }, {})
                    ).map(([name, count]) => ({ name, count }))}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-emerald-500/10 p-2">
                    <p className="text-[10px] text-muted-foreground">Recovered</p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(disposals.reduce((s, d) => s + (d.method === 'Sold' || d.method === 'Trade-in' || d.method === 'Recycled' ? d.netProceeds : 0), 0))}
                    </p>
                  </div>
                  <div className="rounded-md bg-rose-500/10 p-2">
                    <p className="text-[10px] text-muted-foreground">Cost</p>
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                      {formatCurrency(disposals.reduce((s, d) => s + d.disposalCost, 0))}
                    </p>
                  </div>
                  <div className="rounded-md bg-sky-500/10 p-2">
                    <p className="text-[10px] text-muted-foreground">Compliant</p>
                    <p className="text-sm font-bold text-sky-700 dark:text-sky-400">
                      {disposals.filter((d) => d.environmentalCompliant).length}/{disposals.length}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bookings & Tags Analytics */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Booking Status Distribution */}
        <Card>
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
        <Card>
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

      {/* Asset Lifecycle Cost Analysis */}
      <div className="flex items-center gap-2 mt-2">
        <TrendingUp className="h-5 w-5 text-violet-600" />
        <h3 className="text-base font-semibold">Asset Lifecycle Cost Analysis</h3>
      </div>
      <p className="text-sm text-muted-foreground mt-1">Purchase + maintenance + disposal costs vs residual value, by asset type</p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Lifecycle Stacked Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-violet-600" /> Lifecycle Cost Breakdown
            </CardTitle>
            <CardDescription>Stacked purchase, maintenance, and disposal costs by asset type</CardDescription>
          </CardHeader>
          <CardContent>
            {!lifecycle || lifecycle.byType.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No lifecycle cost data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={lifecycle.byType} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                  <XAxis dataKey="assetType" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtCompactCurrency(v)} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Legend />
                  <Bar dataKey="purchaseCost" name="Purchase" stackId="cost" fill="#8b5cf6" />
                  <Bar dataKey="maintenanceCost" name="Maintenance" stackId="cost" fill="#f59e0b" />
                  <Bar dataKey="disposalCost" name="Disposal" stackId="cost" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Lifecycle Summary Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" /> Cost Summary by Type
            </CardTitle>
            <CardDescription>Per-asset-type breakdown with totals</CardDescription>
          </CardHeader>
          <CardContent>
            {!lifecycle || lifecycle.byType.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No lifecycle cost data</p>
            ) : (
              <div className="overflow-x-auto scrollbar-thin max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-2 font-medium">Type</th>
                      <th className="pb-2 pr-2 font-medium text-right">Count</th>
                      <th className="pb-2 pr-2 font-medium text-right">Purchase</th>
                      <th className="pb-2 pr-2 font-medium text-right">Maint.</th>
                      <th className="pb-2 pr-2 font-medium text-right">Disposal</th>
                      <th className="pb-2 pr-2 font-medium text-right">Residual</th>
                      <th className="pb-2 font-medium text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lifecycle.byType.map((row) => (
                      <tr key={row.assetType} className="border-b last:border-0">
                        <td className="py-1.5 pr-2 font-medium">{row.assetType}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{row.assetCount}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-violet-700 dark:text-violet-400">{formatCurrency(row.purchaseCost)}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-amber-700 dark:text-amber-400">{formatCurrency(row.maintenanceCost)}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-rose-700 dark:text-rose-400">{formatCurrency(row.disposalCost)}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(row.residualValue)}</td>
                        <td className="py-1.5 text-right tabular-nums font-semibold">{formatCurrency(row.netCost)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 bg-muted/40 font-bold">
                      <td className="py-2 pr-2">TOTAL</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{lifecycle.totals.assetCount}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(lifecycle.totals.purchaseCost)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(lifecycle.totals.maintenanceCost)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(lifecycle.totals.disposalCost)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatCurrency(lifecycle.totals.residualValue)}</td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(lifecycle.totals.netCost)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4" style={{ borderLeftColor: '#8b5cf6' }}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Purchase Cost</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(lifecycle?.totals.purchaseCost)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                <DollarSign className="h-4 w-4 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Maintenance Cost</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(lifecycle?.totals.maintenanceCost)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Wrench className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: '#f43f5e' }}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Disposal Cost</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(lifecycle?.totals.disposalCost)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10">
                <Trash2 className="h-4 w-4 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: '#10b981' }}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net Cost (after residual)</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(lifecycle?.totals.netCost)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingDown className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
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
    </div>
  )
}
