'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatRelative, formatDateTime } from '@/lib/format'
import { NOTIFICATION_SEVERITY_CONFIG } from '@/lib/types'
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  RefreshCw,
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Filter,
  Inbox,
} from 'lucide-react'
import { toast } from 'sonner'

const SEVERITY_ICONS: Record<string, typeof Info> = {
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
}

const TYPE_LABELS: Record<string, string> = {
  warranty_expiring: 'Warranty Expiring',
  maintenance_overdue: 'Maintenance Overdue',
  maintenance_scheduled: 'Maintenance Scheduled',
  license_expiring: 'License Expiring',
  license_expired: 'License Expired',
  checkout_request: 'Checkout Request',
  checkout_overdue: 'Checkout Overdue',
  low_stock: 'Low Stock',
  asset_created: 'Asset Created',
  system: 'System',
}

export function NotificationsView() {
  const qc = useQueryClient()
  const { navigate } = useNav()
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', showUnreadOnly],
    queryFn: () => notificationApi.list({ unread: showUnreadOnly || undefined, limit: 200 }),
    refetchInterval: 15000,
  })

  const filtered = useMemo(() => {
    if (!notifications) return []
    return notifications.filter((n) => {
      if (filterSeverity !== 'all' && n.severity !== filterSeverity) return false
      if (filterType !== 'all' && n.type !== filterType) return false
      return true
    })
  }, [notifications, filterSeverity, filterType])

  const stats = useMemo(() => {
    if (!notifications) return { total: 0, unread: 0, critical: 0, warning: 0 }
    return {
      total: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      critical: notifications.filter((n) => n.severity === 'critical').length,
      warning: notifications.filter((n) => n.severity === 'warning').length,
    }
  }, [notifications])

  const uniqueTypes = Array.from(new Set((notifications || []).map((n) => n.type)))

  async function handleMarkRead(id: string) {
    try {
      await notificationApi.markRead(id)
      qc.invalidateQueries({ queryKey: ['notifications'] })
    } catch (e) {
      toast.error('Failed to mark as read')
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationApi.markAllRead()
      toast.success('All notifications marked as read')
      qc.invalidateQueries({ queryKey: ['notifications'] })
    } catch (e) {
      toast.error('Failed: ' + String(e))
    }
  }

  async function handleDelete(id: string) {
    try {
      await notificationApi.delete(id)
      qc.invalidateQueries({ queryKey: ['notifications'] })
    } catch (e) {
      toast.error('Delete failed')
    }
  }

  async function handleRegenerate() {
    try {
      const result = await notificationApi.regenerate()
      toast.success(`Generated ${result.created} new notifications`)
      qc.invalidateQueries({ queryKey: ['notifications'] })
    } catch (e) {
      toast.error('Failed: ' + String(e))
    }
  }

  function handleAction(n: any) {
    if (n.actionUrl && n.entityId) {
      // For notifications pointing to specific assets
      if (n.actionUrl === 'asset-detail') {
        navigate('asset-detail', { id: n.entityId })
      } else if (n.actionUrl === 'maintenance') {
        navigate('maintenance')
      } else if (n.actionUrl === 'licenses') {
        navigate('licenses')
      } else if (n.actionUrl === 'checkouts') {
        navigate('checkouts')
      }
      // Mark as read on click
      if (!n.isRead) handleMarkRead(n.id)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Notifications
            {stats.unread > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                {stats.unread}
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Stay on top of warranty, maintenance, license, and checkout alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRegenerate}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Alerts
          </Button>
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={stats.unread === 0}>
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark all read
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="overflow-hidden border-l-4 shadow-soft" style={{ borderLeftColor: '#0f172a' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{stats.total}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-500/10">
                <Bell className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-l-4 shadow-soft" style={{ borderLeftColor: '#f43f5e' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Critical</p>
                <p className="text-2xl font-bold mt-1 tabular-nums text-rose-600">{stats.critical}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10">
                <AlertOctagon className="h-4 w-4 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-l-4 shadow-soft" style={{ borderLeftColor: '#f59e0b' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Warnings</p>
                <p className="text-2xl font-bold mt-1 tabular-nums text-amber-600">{stats.warning}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-l-4 shadow-soft" style={{ borderLeftColor: '#0ea5e9' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Unread</p>
                <p className="text-2xl font-bold mt-1 tabular-nums text-sky-600">{stats.unread}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10">
                <BellRing className="h-4 w-4 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Filters:</span>
          </div>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 w-48 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showUnreadOnly ? 'default' : 'outline'}
            size="sm"
            className="ml-auto"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            <Inbox className="h-3.5 w-3.5 mr-1.5" /> {showUnreadOnly ? 'Showing Unread Only' : 'Show Unread Only'}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Notifications</CardTitle>
          <CardDescription>{filtered.length} of {notifications?.length || 0} notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                    <div className="h-2 w-2/3 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <CheckCheck className="h-10 w-10 text-emerald-500" />
              <p className="text-sm">No notifications to show</p>
              <p className="text-xs">You're all caught up!</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-2 pr-3">
                {filtered.map((n) => {
                  const cfg = NOTIFICATION_SEVERITY_CONFIG[n.severity as keyof typeof NOTIFICATION_SEVERITY_CONFIG] || NOTIFICATION_SEVERITY_CONFIG.info
                  const Icon = SEVERITY_ICONS[cfg.icon] || Info
                  const hasAction = n.actionUrl && n.entityId
                  return (
                    <div
                      key={n.id}
                      className={`group flex items-start gap-3 rounded-lg border p-3 transition-all ${n.isRead ? 'bg-card/50' : 'bg-card shadow-sm'} hover:shadow-md cursor-pointer ${hasAction ? 'hover:border-primary/30' : ''}`}
                      onClick={() => hasAction && handleAction(n)}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                        <Icon className={`h-4 w-4 ${cfg.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${!n.isRead ? 'text-foreground' : 'text-foreground/80'}`}>
                                {n.title}
                              </span>
                              {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />}
                              <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[n.type] || n.type}</Badge>
                            </div>
                            <p className={`text-xs mt-0.5 ${n.isRead ? 'text-muted-foreground' : 'text-foreground/70'}`}>
                              {n.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">{formatRelative(n.createdAt)} · {formatDateTime(n.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.isRead && (
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id) }}
                                title="Mark as read"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDelete(n.id) }}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {n.actionLabel && hasAction && (
                          <Button variant="link" size="sm" className="h-6 mt-1 p-0 text-xs">
                            {n.actionLabel} →
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
