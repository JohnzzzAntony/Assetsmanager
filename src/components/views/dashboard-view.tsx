'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi, assetsApi } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useNav } from '@/lib/nav'
import { formatRelative, formatCurrency } from '@/lib/format'
import { STATUS_CONFIG } from '@/lib/types'
import {
  Package,
  CheckCircle2,
  Boxes,
  Wrench,
  Archive,
  AlertTriangle,
  TrendingUp,
  Users,
  Building2,
  MapPin,
  ArrowRight,
  ScanText,
  Upload,
  Plus,
  Activity,
  DollarSign,
  ShieldAlert,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  'In Use': '#10b981',
  'In Stock': '#64748b',
  Repair: '#f59e0b',
  Retired: '#f43f5e',
  Lost: '#ef4444',
}

const CHART_COLORS = ['#0f172a', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color,
  onClick,
}: {
  label: string
  value: number | string
  icon: typeof Package
  trend?: string
  color: string
  onClick?: () => void
}) {
  return (
    <Card
      className="card-hover cursor-pointer overflow-hidden border-l-4"
      style={{ borderLeftColor: color }}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {trend && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  color,
}: {
  title: string
  description: string
  icon: typeof Package
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className="card-hover group flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}1a` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight className="h-3 w-3" />
      </span>
    </button>
  )
}

export function DashboardView() {
  const { navigate } = useNav()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get(),
  })
  const { data: recentAssets } = useQuery({
    queryKey: ['recent-assets'],
    queryFn: () => assetsApi.list({ pageSize: 5, sortBy: 'createdAt', sortDir: 'desc' }),
  })

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="h-32">
            <CardContent className="h-full shimmer rounded-lg" />
          </Card>
        ))}
      </div>
    )
  }

  const totalByStatus = stats.totalAssets || 1
  const statusData = stats.byStatus.map((s) => ({
    name: s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || '#94a3b8',
  }))

  const typeData = stats.byType.map((t, i) => ({
    name: t.name,
    count: t.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }))

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Welcome banner */}
      <div className="gradient-mesh rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              Welcome back to AssetHub 👋
            </h2>
            <p className="text-sm text-muted-foreground">
              You have <span className="font-semibold text-foreground">{stats.totalAssets}</span> assets across{' '}
              <span className="font-semibold text-foreground">{stats.totalDepartments}</span> departments and{' '}
              <span className="font-semibold text-foreground">{stats.totalLocations}</span> locations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('ocr-upload')}>
              <ScanText className="h-4 w-4 mr-1.5" /> Scan Image
            </Button>
            <Button size="sm" onClick={() => navigate('asset-new')}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Asset
            </Button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Assets"
          value={stats.totalAssets}
          icon={Package}
          color="#0f172a"
          onClick={() => navigate('assets')}
        />
        <StatCard
          label="In Use"
          value={stats.inUse}
          icon={CheckCircle2}
          color="#10b981"
          trend={`${Math.round((stats.inUse / totalByStatus) * 100)}% utilization`}
          onClick={() => navigate('assets', { status: 'In Use' })}
        />
        <StatCard
          label="In Stock"
          value={stats.inStock}
          icon={Boxes}
          color="#64748b"
          onClick={() => navigate('assets', { status: 'In Stock' })}
        />
        <StatCard
          label="In Repair"
          value={stats.repair}
          icon={Wrench}
          color="#f59e0b"
          onClick={() => navigate('assets', { status: 'Repair' })}
        />
        <StatCard
          label="Retired"
          value={stats.retired}
          icon={Archive}
          color="#f43f5e"
          onClick={() => navigate('assets', { status: 'Retired' })}
        />
        <StatCard
          label="Lost"
          value={stats.lost}
          icon={AlertTriangle}
          color="#ef4444"
          onClick={() => navigate('assets', { status: 'Lost' })}
        />
        <StatCard
          label="Total Value"
          value={formatCurrency(stats.totalValue)}
          icon={DollarSign}
          color="#8b5cf6"
        />
        <StatCard
          label="Warranty Expiring"
          value={stats.warrantyExpiringSoon}
          icon={ShieldAlert}
          color="#06b6d4"
          trend="within 30 days"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Assets by Type</CardTitle>
              <CardDescription>Distribution across asset categories</CardDescription>
            </div>
            <Badge variant="secondary">{stats.byType.length} types</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid oklch(0.91 0.005 240)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Breakdown</CardTitle>
            <CardDescription>Current asset status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid oklch(0.91 0.005 240)',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="ml-auto font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments & Locations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Assets by Department</CardTitle>
              <CardDescription>Department-wise distribution</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('departments')}>
              <Building2 className="h-4 w-4 mr-1" /> Manage
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.byDepartment.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No departments yet</p>
            ) : (
              stats.byDepartment.slice(0, 6).map((d) => {
                const pct = Math.round((d.count / totalByStatus) * 100)
                return (
                  <div key={d.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-muted-foreground">
                        {d.count} <span className="text-xs">({pct}%)</span>
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Assets by Location</CardTitle>
              <CardDescription>Location-wise distribution</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('locations')}>
              <MapPin className="h-4 w-4 mr-1" /> Manage
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.byLocation.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No locations yet</p>
            ) : (
              stats.byLocation.slice(0, 6).map((l) => {
                const pct = Math.round((l.count / totalByStatus) * 100)
                return (
                  <div key={l.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{l.name}</span>
                      <span className="text-muted-foreground">
                        {l.count} <span className="text-xs">({pct}%)</span>
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            title="Add New Asset"
            description="Manually create an asset record"
            icon={Plus}
            onClick={() => navigate('asset-new')}
            color="#0f172a"
          />
          <QuickActionCard
            title="Add via Image (OCR)"
            description="Upload a photo and auto-extract details"
            icon={ScanText}
            onClick={() => navigate('ocr-upload')}
            color="#10b981"
          />
          <QuickActionCard
            title="Import from Excel"
            description="Bulk import assets from CSV/XLSX"
            icon={Upload}
            onClick={() => navigate('import')}
            color="#f59e0b"
          />
          <QuickActionCard
            title="View Reports"
            description="Analytics and export tools"
            icon={Activity}
            onClick={() => navigate('reports')}
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* Recent activity & recent assets */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest assignment changes</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No recent activity</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                {stats.recentActivity.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="leading-tight">
                        <span className="font-medium">{a.action}</span>
                        {a.asset && (
                          <span className="text-muted-foreground">
                            {' '}
                            — {a.asset.assetTag || a.asset.model || a.asset.id.slice(0, 8)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.person?.fullName || 'Unassigned'} · {formatRelative(a.assignedOn)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Recently Added Assets</CardTitle>
              <CardDescription>Latest entries in the system</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('assets')}>
              View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {!recentAssets || recentAssets.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No assets yet</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                {recentAssets.data.map((asset) => {
                  const cfg = STATUS_CONFIG[asset.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['In Stock']
                  return (
                    <button
                      key={asset.id}
                      onClick={() => navigate('asset-detail', { id: asset.id })}
                      className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent/50"
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cfg.bg}`}>
                        <Package className={`h-4 w-4 ${cfg.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {asset.make} {asset.model}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {asset.assetTag || asset.serialNumber || 'No tag'}
                        </p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${cfg.bg} ${cfg.text} border-0`}>
                        {asset.status}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
