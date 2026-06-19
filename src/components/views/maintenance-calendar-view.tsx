'use client'

import { useState, useMemo } from 'react'
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_CONFIG,
} from '@/lib/types'
import type { MaintenanceSchedule, MaintenanceStatus } from '@/lib/types'
import { useNav } from '@/lib/nav'
import { formatDateTime, formatRelative, formatCurrency } from '@/lib/format'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  Calendar,
  Package,
  Wrench,
  Pencil,
  Trash2,
  AlertTriangle,
  User,
  DollarSign,
  StickyNote,
  FileText,
  CheckCircle2,
} from 'lucide-react'

// ============================================================
// Helpers (mirror bookings-calendar-view.tsx — kept local on purpose)
// ============================================================

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Human-readable labels for the legend (MAINTENANCE_STATUS_CONFIG has no `label` field)
const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  Scheduled: 'Scheduled',
  'In Progress': 'In Progress',
  Completed: 'Completed',
  Overdue: 'Overdue',
  Cancelled: 'Cancelled',
}

function durationDays(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (isNaN(s) || isNaN(e)) return 0
  return Math.max(Math.ceil((e - s) / (1000 * 60 * 60 * 24)), 1)
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

// Local-date key (YYYY-MM-DD) — avoids timezone drift from .toISOString()
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/**
 * Compute the "bar end" date for a maintenance task.
 *  - Scheduled / Completed / Cancelled → single-day bar on scheduledFor
 *  - In Progress / Overdue → span from scheduledFor to completedAt (or today if not yet completed)
 */
function barEndDate(m: MaintenanceSchedule, now: Date): Date {
  const start = new Date(m.scheduledFor)
  const status = m.status as MaintenanceStatus
  if (status === 'In Progress' || status === 'Overdue') {
    if (m.completedAt) {
      const ce = new Date(m.completedAt)
      if (!isNaN(ce.getTime())) return ce
    }
    return now
  }
  return start
}

// ============================================================
// Main Maintenance Calendar View
// ============================================================

interface MaintenanceCalendarViewProps {
  maintenances: MaintenanceSchedule[]
  isLoading?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function MaintenanceCalendarView({
  maintenances,
  isLoading,
  onEdit,
  onDelete,
}: MaintenanceCalendarViewProps) {
  const [cursor, setCursor] = useState<Date>(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Build a 6-week × 7-day grid starting from the Sunday on or before the 1st of the month
  const gridDays = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = new Date(firstOfMonth)
    start.setDate(start.getDate() - start.getDay()) // back to Sunday
    const days: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }
    return days
  }, [cursor])

  const now = useMemo(() => new Date(), [])

  // Map each visible day → list of maintenance tasks whose bar overlaps that day
  const dayMaintenances = useMemo(() => {
    const map: Record<string, MaintenanceSchedule[]> = {}
    for (const day of gridDays) {
      const ds = startOfDay(day).getTime()
      const de = endOfDay(day).getTime()
      const overlaps = (maintenances ?? []).filter((m) => {
        const bs = new Date(m.scheduledFor).getTime()
        if (isNaN(bs)) return false
        const be = barEndDate(m, now).getTime()
        if (isNaN(be)) return false
        return bs <= de && be >= ds
      })
      overlaps.sort((a, b) => {
        const as = new Date(a.scheduledFor).getTime()
        const bs = new Date(b.scheduledFor).getTime()
        if (as !== bs) return as - bs
        return a.title.localeCompare(b.title)
      })
      map[dayKey(day)] = overlaps
    }
    return map
  }, [gridDays, maintenances, now])

  const today = new Date()
  const todayKey = dayKey(today)

  const selected = useMemo(() => {
    if (!selectedId) return null
    return (maintenances ?? []).find((m) => m.id === selectedId) || null
  }, [selectedId, maintenances])

  function goPrev() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
  }
  function goNext() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
  }
  function goToday() {
    const n = new Date()
    setCursor(new Date(n.getFullYear(), n.getMonth(), 1))
  }

  const monthLabel = `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`

  // Count distinct maintenances visible in the current 6-week grid
  const visibleCount = useMemo(() => {
    const set = new Set<string>()
    for (const day of gridDays) {
      for (const m of dayMaintenances[dayKey(day)] ?? []) {
        set.add(m.id)
      }
    }
    return set.size
  }, [gridDays, dayMaintenances])

  // Empty state: no maintenance visible in the current grid
  const isEmpty = !isLoading && visibleCount === 0

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ============ Header Card ============ */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-rose-500/5 border border-amber-500/20">
                <CalendarRange className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Maintenance <span className="gradient-text">Calendar</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Visualize scheduled and ongoing maintenance across a month grid. Click any bar for details and actions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={goPrev} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday}>
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goNext} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-lg font-semibold tabular-nums">{monthLabel}</p>
            <p className="text-xs text-muted-foreground">
              {visibleCount} task{visibleCount === 1 ? '' : 's'} in view
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ============ Calendar Grid ============ */}
      {isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-[420px] w-full" />
          </CardContent>
        </Card>
      ) : isEmpty ? (
        <Card>
          <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-3">
            <div className="empty-state-icon">
              <Calendar className="h-9 w-9 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">No maintenance scheduled this month</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Try moving to a different month, or clear any active filters to see all maintenance tasks.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[760px]">
            {/* Weekday header */}
            <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground border-b">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2 text-center">
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
              {gridDays.map((day) => {
                const key = dayKey(day)
                const list = dayMaintenances[key] ?? []
                const inMonth = day.getMonth() === cursor.getMonth()
                const isToday = key === todayKey
                const shown = list.slice(0, 3)
                const overflow = list.length - shown.length
                return (
                  <div
                    key={key}
                    className={`bg-background min-h-[120px] p-1.5 flex flex-col gap-1 ${isToday ? 'ring-2 ring-primary ring-inset' : ''} ${!inMonth ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      {isToday ? (
                        <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold tabular-nums">
                          {day.getDate()}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                          {day.getDate()}
                        </span>
                      )}
                      {isToday && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-primary">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {shown.map((m) => {
                        const status = (m.status as MaintenanceStatus) || 'Scheduled'
                        const cfg = MAINTENANCE_STATUS_CONFIG[status] || MAINTENANCE_STATUS_CONFIG.Scheduled
                        const isStart = sameDay(new Date(m.scheduledFor), day)
                        const isOverdue = status === 'Overdue'
                        const isCancelled = status === 'Cancelled'
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedId(m.id)}
                            title={`${m.title} — ${m.asset?.assetTag ?? 'no asset'}`}
                            className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity text-left ${cfg.bg} ${cfg.text} ${isStart ? 'font-semibold' : ''} ${isOverdue ? 'animate-pulse ring-1 ring-rose-500/40 shadow-[0_0_4px_rgba(244,63,94,0.25)]' : ''}`}
                          >
                            <span className="flex items-center gap-1">
                              {!isStart && <span aria-hidden className="shrink-0">↳</span>}
                              <span className={`truncate ${isCancelled ? 'line-through opacity-70' : ''}`}>
                                {m.title}
                              </span>
                              {m.asset?.assetTag && (
                                <span className="font-mono text-[9px] opacity-70 shrink-0 border border-current/20 rounded px-0.5">
                                  {m.asset.assetTag}
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                      {overflow > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const firstHidden = list[3]
                            if (firstHidden) setSelectedId(firstHidden.id)
                          }}
                          className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 text-left cursor-pointer hover:opacity-80 transition-opacity"
                          title={`${overflow} more task${overflow === 1 ? '' : 's'} on this day`}
                        >
                          +{overflow} more
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============ Legend ============ */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium">Legend:</span>
            {MAINTENANCE_STATUSES.map((s) => {
              const cfg = MAINTENANCE_STATUS_CONFIG[s]
              return (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${cfg.dot}`} />
                  <span>{MAINTENANCE_STATUS_LABEL[s]}</span>
                </span>
              )
            })}
            <span className="ml-auto text-[10px]">
              <span className="mr-1" aria-hidden>↳</span>= continuation from a previous day
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ============ Maintenance Detail Dialog ============ */}
      <MaintenanceDetailDialog
        maintenance={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelectedId(null)}
        onEdit={(id) => {
          onEdit?.(id)
          setSelectedId(null)
        }}
        onDelete={(id) => {
          onDelete?.(id)
          setSelectedId(null)
        }}
      />
    </div>
  )
}

// ============================================================
// Maintenance Detail Dialog
// ============================================================

interface MaintenanceDetailDialogProps {
  maintenance: MaintenanceSchedule | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

function MaintenanceDetailDialog({
  maintenance,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: MaintenanceDetailDialogProps) {
  const { navigate } = useNav()

  const status = (maintenance?.status as MaintenanceStatus) || 'Scheduled'
  const cfg = MAINTENANCE_STATUS_CONFIG[status] || MAINTENANCE_STATUS_CONFIG.Scheduled
  const dur = maintenance && maintenance.completedAt
    ? durationDays(maintenance.scheduledFor, maintenance.completedAt)
    : 0
  const isCompleted = status === 'Completed'
  const isOverdue = status === 'Overdue'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {maintenance && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-start gap-2 pr-6">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot} ${isOverdue ? 'animate-pulse' : ''}`} />
                <span className="flex-1 break-words">{maintenance.title}</span>
              </DialogTitle>
              <DialogDescription>
                Maintenance schedule details, technician, and lifecycle actions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* Status + meta row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0 gap-1.5 px-2`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  {status}
                </Badge>
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 border-muted-foreground/20">
                  <Wrench className="h-2.5 w-2.5" /> {maintenance.type}
                </Badge>
                {isOverdue && (
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] gap-1 border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" /> Needs attention
                  </Badge>
                )}
              </div>

              {/* Asset chip */}
              <button
                type="button"
                onClick={() => navigate('asset-detail', { id: maintenance.assetId })}
                className="w-full inline-flex items-center gap-1.5 rounded-md bg-muted/60 hover:bg-muted px-2.5 py-2 text-xs transition-colors"
              >
                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground truncate flex-1 text-left">
                  {maintenance.asset
                    ? `${maintenance.asset.make ?? ''} ${maintenance.asset.model ?? ''}`.trim() || 'Untitled asset'
                    : 'Unknown asset'}
                </span>
                {maintenance.asset?.assetTag && (
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {maintenance.asset.assetTag}
                  </span>
                )}
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>

              {/* Performed by */}
              {maintenance.performedBy && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide flex items-center gap-1">
                      <User className="h-2.5 w-2.5" /> Performed by
                    </p>
                    <p className="text-sm font-medium truncate">{maintenance.performedBy}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" /> Scheduled For
                  </p>
                  <p className="text-sm font-medium">{formatDateTime(maintenance.scheduledFor)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatRelative(maintenance.scheduledFor)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Completed At
                  </p>
                  <p className="text-sm font-medium">{formatDateTime(maintenance.completedAt)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatRelative(maintenance.completedAt)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isCompleted && dur > 0 && (
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] gap-1 border-muted-foreground/20"
                  >
                    <CalendarDays className="h-2.5 w-2.5" />
                    {dur} {dur === 1 ? 'day' : 'days'} duration
                  </Badge>
                )}
                {maintenance.cost != null && (
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] gap-1 border-muted-foreground/20"
                  >
                    <DollarSign className="h-2.5 w-2.5" />
                    {formatCurrency(maintenance.cost)}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {maintenance.description && (
                <div>
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide mb-1 flex items-center gap-1">
                    <FileText className="h-2.5 w-2.5" /> Description
                  </p>
                  <p className="text-sm text-foreground/90 rounded-md bg-muted/40 px-2.5 py-2 whitespace-pre-wrap">
                    {maintenance.description}
                  </p>
                </div>
              )}

              {/* Notes */}
              {maintenance.notes && (
                <div>
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide mb-1 flex items-center gap-1">
                    <StickyNote className="h-2.5 w-2.5" /> Notes
                  </p>
                  <p className="text-sm text-foreground/90 rounded-md bg-muted/40 px-2.5 py-2 whitespace-pre-wrap">
                    {maintenance.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <Separator />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(maintenance.id)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(maintenance.id)}
                className="text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
