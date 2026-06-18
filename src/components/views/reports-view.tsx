'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi, assetsApi, vendorsApi, purchaseOrdersApi, disposalsApi, depreciationApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { STATUS_CONFIG, DISPOSAL_METHOD_CONFIG } from '@/lib/types'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar, Legend,
} from 'recharts'
import { Download, TrendingUp, DollarSign, Package, Wrench, AlertTriangle, Activity, Store, Trash2, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  'In Use': '#10b981', 'In Stock': '#64748b', Repair: '#f59e0b', Retired: '#f43f5e', Lost: '#ef4444',
}
const CHART_COLORS = ['#0f172a', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

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

  function exportFull() {
    if (!assetsAll) return
    const headers = ['Asset Tag', 'Type', 'Make', 'Model', 'Serial', 'Status', 'User', 'Dept', 'Loc', 'Cost', 'Purchase', 'Warranty', 'OS', 'CPU', 'RAM', 'Storage']
    const rows = assetsAll.data.map((a) => [
      a.assetTag || '', a.assetType?.name || '', a.make || '', a.model || '', a.serialNumber || '',
      a.status, a.assignedTo?.fullName || '', a.department?.name || '', a.location?.name || '',
      a.cost?.toString() || '', a.purchaseDate?.slice(0, 10) || '', a.warrantyExpiry?.slice(0, 10) || '',
      a.os || '', a.cpu || '', a.ram || '', a.storage || '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `full-asset-report-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Full report exported')
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
    .slice(-12)
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
          <h2 className="text-lg font-bold flex items-center gap-2"><Activity className="h-5 w-5" /> Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">Insights and exportable reports</p>
        </div>
        <Button onClick={exportFull} disabled={!assetsAll}>
          <Download className="h-4 w-4 mr-1.5" /> Export Full Report
        </Button>
      </div>

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
