'use client'

import { useState, useMemo } from 'react'
import {
  BOOKING_STATUS_CONFIG,
} from '@/lib/types'
import type { AssetBooking, BookingStatus } from '@/lib/types'
import { useNav } from '@/lib/nav'
import { formatDateTime, formatRelative } from '@/lib/format'
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
  User,
  Package,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Pencil,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Hourglass,
  StickyNote,
} from 'lucide-react'

// ============================================================
// Helpers
// ============================================================

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

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

function initials(name?: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ============================================================
// Main Calendar View
// ============================================================

interface BookingsCalendarViewProps {
  bookings: AssetBooking[]
  isLoading: boolean
  onApprove: (b: AssetBooking) => void
  onReject: (b: AssetBooking) => void
  onCheckOut: (b: AssetBooking) => void
  onCheckIn: (b: AssetBooking) => void
  onEdit: (b: AssetBooking) => void
  onDelete: (b: AssetBooking) => void
  onCancel: (b: AssetBooking) => void
}

export function BookingsCalendarView({
  bookings,
  isLoading,
  onApprove,
  onReject,
  onCheckOut,
  onCheckIn,
  onEdit,
  onDelete,
  onCancel,
}: BookingsCalendarViewProps) {
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

  // Map each visible day → list of bookings that overlap it (sorted by start time)
  const dayBookings = useMemo(() => {
    const map: Record<string, AssetBooking[]> = {}
    for (const day of gridDays) {
      const ds = startOfDay(day).getTime()
      const de = endOfDay(day).getTime()
      const overlaps = (bookings ?? []).filter((b) => {
        const bs = new Date(b.startDate).getTime()
        const be = new Date(b.endDate).getTime()
        if (isNaN(bs) || isNaN(be)) return false
        return bs <= de && be >= ds
      })
      overlaps.sort((a, b) => {
        const as = new Date(a.startDate).getTime()
        const bs = new Date(b.startDate).getTime()
        if (as !== bs) return as - bs
        return a.title.localeCompare(b.title)
      })
      map[dayKey(day)] = overlaps
    }
    return map
  }, [gridDays, bookings])

  const today = new Date()
  const todayKey = dayKey(today)

  const selected = useMemo(() => {
    if (!selectedId) return null
    return (bookings ?? []).find((b) => b.id === selectedId) || null
  }, [selectedId, bookings])

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

  // Count distinct bookings visible in the current 6-week grid
  const visibleCount = useMemo(() => {
    const set = new Set<string>()
    for (const day of gridDays) {
      for (const b of dayBookings[dayKey(day)] ?? []) {
        set.add(b.id)
      }
    }
    return set.size
  }, [gridDays, dayBookings])

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ============ Header Card ============ */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/10 to-cyan-500/5 border border-sky-500/20">
                <CalendarRange className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Bookings <span className="gradient-text">Calendar</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Visualize reservations across a month grid. Click any booking bar for details and actions.
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
              {visibleCount} booking{visibleCount === 1 ? '' : 's'} in view
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
                const list = dayBookings[key] ?? []
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
                      {shown.map((b) => {
                        const status = (b.status as BookingStatus) || 'Pending'
                        const cfg = BOOKING_STATUS_CONFIG[status] || BOOKING_STATUS_CONFIG.Pending
                        const isStart = sameDay(new Date(b.startDate), day)
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedId(b.id)}
                            title={b.title}
                            className={`text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity text-left ${cfg.bg} ${cfg.text} ${isStart ? 'font-semibold' : ''}`}
                          >
                            <span className="flex items-center gap-1">
                              {!isStart && <span aria-hidden className="shrink-0">↳</span>}
                              <span className="truncate">{b.title}</span>
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
                          title={`${overflow} more booking${overflow === 1 ? '' : 's'} on this day`}
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
            {(Object.keys(BOOKING_STATUS_CONFIG) as BookingStatus[]).map((s) => {
              const cfg = BOOKING_STATUS_CONFIG[s]
              return (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${cfg.dot}`} />
                  <span>{cfg.label}</span>
                </span>
              )
            })}
            <span className="ml-auto text-[10px]">
              <span className="mr-1" aria-hidden>↳</span>= continuation from a previous day
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ============ Booking Detail Dialog ============ */}
      <BookingDetailDialog
        booking={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelectedId(null)}
        onApprove={onApprove}
        onReject={onReject}
        onCheckOut={onCheckOut}
        onCheckIn={(b) => {
          onCheckIn(b)
          setSelectedId(null)
        }}
        onEdit={(b) => {
          onEdit(b)
          setSelectedId(null)
        }}
        onDelete={(b) => {
          onDelete(b)
          setSelectedId(null)
        }}
        onCancel={onCancel}
      />
    </div>
  )
}

// ============================================================
// Booking Detail Dialog
// ============================================================

interface BookingDetailDialogProps {
  booking: AssetBooking | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onApprove: (b: AssetBooking) => void
  onReject: (b: AssetBooking) => void
  onCheckOut: (b: AssetBooking) => void
  onCheckIn: (b: AssetBooking) => void
  onEdit: (b: AssetBooking) => void
  onDelete: (b: AssetBooking) => void
  onCancel: (b: AssetBooking) => void
}

function BookingDetailDialog({
  booking,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onCheckOut,
  onCheckIn,
  onEdit,
  onDelete,
  onCancel,
}: BookingDetailDialogProps) {
  const { navigate } = useNav()

  const status = (booking?.status as BookingStatus) || 'Pending'
  const cfg = BOOKING_STATUS_CONFIG[status] || BOOKING_STATUS_CONFIG.Pending
  const dur = durationDays(booking?.startDate, booking?.endDate)
  const now = Date.now()
  const isUpcoming = booking ? new Date(booking.startDate).getTime() > now : false
  const isOverdue = booking
    ? status === 'Active' && new Date(booking.endDate).getTime() < now
    : false
  const isTerminal = status === 'Completed' || status === 'Cancelled' || status === 'Rejected'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-start gap-2 pr-6">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                <span className="flex-1 break-words">{booking.title}</span>
              </DialogTitle>
              <DialogDescription>
                Booking details, schedule, and lifecycle actions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* Status + meta row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0 gap-1.5 px-2`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </Badge>
                {isUpcoming && !isTerminal && (
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] gap-1 border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  >
                    <Hourglass className="h-2.5 w-2.5" /> Upcoming
                  </Badge>
                )}
                {isOverdue && (
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] gap-1 border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                  </Badge>
                )}
              </div>

              {/* Asset chip */}
              <button
                type="button"
                onClick={() => booking.asset && navigate('asset-detail', { id: booking.assetId })}
                className="w-full inline-flex items-center gap-1.5 rounded-md bg-muted/60 hover:bg-muted px-2.5 py-2 text-xs transition-colors"
              >
                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground truncate flex-1 text-left">
                  {booking.asset
                    ? `${booking.asset.make ?? ''} ${booking.asset.model ?? ''}`.trim() || 'Untitled asset'
                    : 'Unknown asset'}
                </span>
                {booking.asset?.assetTag && (
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {booking.asset.assetTag}
                  </span>
                )}
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>

              {/* Booked by */}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                  {initials(booking.bookedBy?.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide flex items-center gap-1">
                    <User className="h-2.5 w-2.5" /> Booked by
                  </p>
                  <p className="text-sm font-medium truncate">
                    {booking.bookedBy?.fullName ?? '—'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" /> Start
                  </p>
                  <p className="text-sm font-medium">{formatDateTime(booking.startDate)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatRelative(booking.startDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" /> End
                  </p>
                  <p className="text-sm font-medium">{formatDateTime(booking.endDate)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatRelative(booking.endDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[10px] gap-1 border-muted-foreground/20"
                >
                  <CalendarDays className="h-2.5 w-2.5" />
                  {dur} {dur === 1 ? 'day' : 'days'} duration
                </Badge>
              </div>

              {/* Purpose */}
              {booking.purpose && (
                <div>
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide mb-1">
                    Purpose
                  </p>
                  <p className="text-sm text-foreground/90 rounded-md bg-muted/40 px-2.5 py-2 whitespace-pre-wrap">
                    {booking.purpose}
                  </p>
                </div>
              )}

              {/* Notes */}
              {booking.notes && (
                <div>
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide mb-1 flex items-center gap-1">
                    <StickyNote className="h-2.5 w-2.5" /> Notes
                  </p>
                  <p className="text-sm text-foreground/90 rounded-md bg-muted/40 px-2.5 py-2 whitespace-pre-wrap">
                    {booking.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <Separator />
            <div className="flex flex-wrap items-center justify-end gap-2">
              {status === 'Pending' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReject(booking)}
                    className="text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApprove(booking)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                </>
              )}
              {status === 'Approved' && (
                <Button
                  size="sm"
                  onClick={() => onCheckOut(booking)}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Check Out
                </Button>
              )}
              {status === 'Active' && (
                <Button
                  size="sm"
                  onClick={() => onCheckIn(booking)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Check In
                </Button>
              )}
              {!isTerminal && (
                <Button variant="outline" size="sm" onClick={() => onCancel(booking)}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onEdit(booking)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(booking)}
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
