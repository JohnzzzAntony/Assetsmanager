'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditLogApi, assetsApi } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatRelative, formatDate } from '@/lib/format'
import {
  ScrollText,
  Search,
  Package,
  Wrench,
  KeyRound,
  User,
  Activity,
  History,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Filter,
  X,
} from 'lucide-react'

const ACTION_CONFIG: Record<string, { icon: typeof Package; color: string; bg: string; label: string }> = {
  'asset.created': { icon: Plus, color: '#10b981', bg: 'bg-emerald-500/10', label: 'Asset Created' },
  'asset.updated': { icon: Pencil, color: '#0ea5e9', bg: 'bg-sky-500/10', label: 'Asset Updated' },
  'asset.deleted': { icon: Trash2, color: '#f43f5e', bg: 'bg-rose-500/10', label: 'Asset Deleted' },
  'asset.assigned': { icon: User, color: '#8b5cf6', bg: 'bg-violet-500/10', label: 'Asset Assigned' },
  'asset.unassigned': { icon: User, color: '#64748b', bg: 'bg-slate-500/10', label: 'Asset Unassigned' },
  'asset.imported': { icon: Upload, color: '#f59e0b', bg: 'bg-amber-500/10', label: 'Asset Imported' },
  'maintenance.created': { icon: Wrench, color: '#0ea5e9', bg: 'bg-sky-500/10', label: 'Maintenance Created' },
  'maintenance.updated': { icon: Wrench, color: '#f59e0b', bg: 'bg-amber-500/10', label: 'Maintenance Updated' },
  'maintenance.completed': { icon: Wrench, color: '#10b981', bg: 'bg-emerald-500/10', label: 'Maintenance Completed' },
  'maintenance.deleted': { icon: Trash2, color: '#f43f5e', bg: 'bg-rose-500/10', label: 'Maintenance Deleted' },
  'license.allocated': { icon: KeyRound, color: '#8b5cf6', bg: 'bg-violet-500/10', label: 'License Allocated' },
  'license.deallocated': { icon: KeyRound, color: '#64748b', bg: 'bg-slate-500/10', label: 'License Deallocated' },
}

function getConfig(action: string) {
  return ACTION_CONFIG[action] || { icon: Activity, color: '#64748b', bg: 'bg-slate-500/10', label: action }
}

export function AuditLogView() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [limit, setLimit] = useState(200)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', limit],
    queryFn: () => auditLogApi.list({ limit }),
  })

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((log) => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false
      if (entityFilter !== 'all' && log.entityType !== entityFilter) return false
      if (search) {
        const s = search.toLowerCase()
        if (!log.details?.toLowerCase().includes(s) && !log.action.toLowerCase().includes(s)) return false
      }
      return true
    })
  }, [data, search, actionFilter, entityFilter])

  const uniqueActions = Array.from(new Set((data || []).map((l) => l.action)))
  const uniqueEntities = Array.from(new Set((data || []).map((l) => l.entityType)))

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {}
    for (const log of filtered) {
      const date = new Date(log.createdAt).toDateString()
      if (!groups[date]) groups[date] = []
      groups[date].push(log)
    }
    return groups
  }, [filtered])

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          Complete activity history across assets, maintenance, and licenses.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search action or details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Action Type</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((a) => (
                  <SelectItem key={a} value={a}>{getConfig(a).label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Entity</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntities.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Limit</Label>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="100">Last 100</SelectItem>
                <SelectItem value="200">Last 200</SelectItem>
                <SelectItem value="500">Last 500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-bold mt-1">{data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Filtered</p>
            <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unique Actions</p>
            <p className="text-2xl font-bold mt-1">{uniqueActions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Most Recent</p>
            <p className="text-sm font-medium mt-1 truncate">
              {data?.[0] ? formatRelative(data[0].createdAt) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity Timeline</CardTitle>
          <CardDescription>Chronological log of all system events</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                    <div className="h-2 w-1/2 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <ScrollText className="h-10 w-10" />
              <p>No audit log entries match your filters</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-3">
                {Object.entries(grouped).map(([date, logs]) => (
                  <div key={date} className="space-y-3">
                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border" />
                        <Badge variant="secondary" className="text-xs">
                          {formatDate(date)} · {logs.length} {logs.length === 1 ? 'event' : 'events'}
                        </Badge>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </div>
                    {logs.map((log) => {
                      const cfg = getConfig(log.action)
                      const Icon = cfg.icon
                      return (
                        <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/30 transition-colors">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                            <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium leading-tight">{cfg.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {formatRelative(log.createdAt)}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                              <Badge variant="outline" className="text-[9px] py-0">{log.action}</Badge>
                              <span>·</span>
                              <span>{log.entityType}</span>
                              <span>·</span>
                              <span className="font-mono">{log.entityId.slice(0, 8)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
