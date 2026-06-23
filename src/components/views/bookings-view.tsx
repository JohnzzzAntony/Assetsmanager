'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingsApi, exportApi, assetsApi, personsApi } from '@/lib/api'
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_CONFIG,
} from '@/lib/types'
import type { AssetBooking, BookingStatus } from '@/lib/types'
import { useNav } from '@/lib/nav'
import { formatRelative, formatDateTime } from '@/lib/format'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  CalendarClock,
  Plus,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  Calendar,
  User,
  Package,
  Pencil,
  Trash2,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  Filter,
  Sparkles,
  CalendarDays,
  CalendarRange,
  Hourglass,
  MoreVertical,
  LayoutGrid,
} from 'lucide-react'
import { toast } from 'sonner'
import { BookingsCalendarView } from './bookings-calendar-view'

// ============================================================
// Helpers
// ============================================================

// Static hex map per booking status — used for inline-styled left status bars
// (Tailwind purges dynamic class names so we use inline styles for the bar color).
const STATUS_HEX: Record<BookingStatus, string> = {
  Pending: '#f59e0b',
  Approved: '#0ea5e9',
  Rejected: '#f43f5e',
  Active: '#10b981',
  Completed: '#71717a',
  Cancelled: '#64748b',
}

function durationDays(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (isNaN(s) || isNaN(e)) return 0
  return Math.max(Math.ceil((e - s) / (1000 * 60 * 60 * 24)), 0)
}

function toDateTimeLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDateTimeLocal(v: string): string {
  if (!v) return ''
  return new Date(v).toISOString()
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

// Pleasant avatar tints — pick deterministically by name hash
const AVATAR_TINTS = [
  '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1',
]
function pickTint(seed?: string | null): string {
  if (!seed) return AVATAR_TINTS[0]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length]
}

// ============================================================
// Small building blocks
// ============================================================

function StatTile({
  label,
  value,
  icon: Icon,
  color,
  hint,
}: {
  label: string
  value: number
  icon: typeof Clock
  color: string
  hint?: string
}) {
  return (
    <Card className="overflow-hidden border-l-4 card-hover shadow-sm" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}1a` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = BOOKING_STATUS_CONFIG[status as BookingStatus] || BOOKING_STATUS_CONFIG.Pending
  return (
    <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0 gap-1.5 px-2`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  )
}

function Avatar({ name, className }: { name?: string | null; className?: string }) {
  const tint = pickTint(name)
  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-semibold shrink-0 ${className ?? 'h-9 w-9 text-xs'}`}
      style={{ backgroundColor: tint }}
      title={name ?? ''}
    >
      {initials(name)}
    </div>
  )
}

// Small inline progress shown on Active booking cards — elapsed time visualization
function ActiveProgress({ start, end }: { start: string; end: string }) {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const now = Date.now()
  if (isNaN(s) || isNaN(e) || e <= s) return null
  const pct = Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100))
  return (
    <div className="mt-2 max-w-xs">
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
        <span>Started {formatRelative(start)}</span>
        <span className="tabular-nums">{Math.round(pct)}% elapsed</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  )
}

// ============================================================
// Booking Card
// ============================================================

interface BookingCardProps {
  booking: AssetBooking
  onApprove: (b: AssetBooking) => void
  onReject: (b: AssetBooking) => void
  onCheckOut: (b: AssetBooking) => void
  onCheckIn: (b: AssetBooking) => void
  onEdit: (b: AssetBooking) => void
  onDelete: (b: AssetBooking) => void
  onCancel: (b: AssetBooking) => void
}

function BookingCard({
  booking,
  onApprove,
  onReject,
  onCheckOut,
  onCheckIn,
  onEdit,
  onDelete,
  onCancel,
}: BookingCardProps) {
  const { navigate } = useNav()
  const status = (booking.status as BookingStatus) || 'Pending'
  const cfg = BOOKING_STATUS_CONFIG[status] || BOOKING_STATUS_CONFIG.Pending
  const hex = STATUS_HEX[status] ?? '#64748b'
  const dur = durationDays(booking.startDate, booking.endDate)
  const now = Date.now()
  const isUpcoming = new Date(booking.startDate).getTime() > now
  const isOverdue = status === 'Active' && new Date(booking.endDate).getTime() < now
  const isTerminal = status === 'Completed' || status === 'Cancelled' || status === 'Rejected'

  return (
    <Card className="card-hover overflow-hidden relative shadow-sm">
      {/* Colored left status bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <CardContent className="p-4 pl-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* LEFT — title + purpose + asset chip */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-semibold leading-tight truncate">{booking.title}</h4>
                {booking.purpose ? (
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{booking.purpose}</p>
                ) : null}
              </div>
            </div>
            {/* Asset chip */}
            <button
              type="button"
              onClick={() => booking.asset && navigate('asset-detail', { id: booking.assetId })}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-muted/60 hover:bg-muted px-2 py-1 text-xs transition-colors max-w-full"
            >
              <Package className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground truncate max-w-[220px]">
                {booking.asset
                  ? `${booking.asset.make ?? ''} ${booking.asset.model ?? ''}`.trim() || 'Untitled asset'
                  : 'Unknown asset'}
              </span>
              {booking.asset?.assetTag && (
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">{booking.asset.assetTag}</span>
              )}
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            </button>
            {status === 'Active' && booking.startDate && booking.endDate && (
              <ActiveProgress start={booking.startDate} end={booking.endDate} />
            )}
          </div>

          {/* MIDDLE — bookedBy + schedule */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6 md:min-w-[420px]">
            {/* Booked By */}
            <div className="flex items-center gap-2">
              <Avatar name={booking.bookedBy?.fullName} className="h-8 w-8 text-[10px]" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide flex items-center gap-1">
                  <User className="h-2.5 w-2.5" /> Booked by
                </p>
                <p className="text-sm font-medium truncate max-w-[160px]">
                  {booking.bookedBy?.fullName ?? '—'}
                </p>
              </div>
            </div>

            {/* Schedule */}
            <div className="flex items-start gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 shrink-0">
                <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide">Schedule</p>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                  <span className="font-medium">{formatDateTime(booking.startDate)}</span>
                  <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{formatDateTime(booking.endDate)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 border-muted-foreground/20">
                    <CalendarDays className="h-2.5 w-2.5" />
                    {dur} {dur === 1 ? 'day' : 'days'}
                  </Badge>
                  {isUpcoming && !isTerminal && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                      <Hourglass className="h-2.5 w-2.5" /> Upcoming
                    </Badge>
                  )}
                  {isOverdue && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — status badge + actions */}
          <div className="flex items-center gap-2 md:justify-end">
            <StatusBadge status={booking.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Booking actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {status === 'Pending' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onApprove(booking)}
                      className="text-emerald-600 dark:text-emerald-400 focus:text-emerald-700 dark:focus:text-emerald-300 cursor-pointer"
                    >
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onReject(booking)}
                      className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300 cursor-pointer"
                    >
                      <X className="h-4 w-4 mr-2" /> Reject
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {status === 'Approved' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onCheckOut(booking)}
                      className="text-violet-600 dark:text-violet-400 focus:text-violet-700 dark:focus:text-violet-300 cursor-pointer"
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" /> Check Out
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {status === 'Active' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onCheckIn(booking)}
                      className="text-emerald-600 dark:text-emerald-400 focus:text-emerald-700 dark:focus:text-emerald-300 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Check In
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {!isTerminal && (
                  <DropdownMenuItem
                    onClick={() => onCancel(booking)}
                    className="cursor-pointer"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Cancel Booking
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onEdit(booking)} className="cursor-pointer">
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(booking)}
                  className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Skeleton
// ============================================================

function BookingCardSkeleton() {
  return (
    <Card className="overflow-hidden relative shadow-sm">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-muted" aria-hidden />
      <CardContent className="p-4 pl-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3 shimmer-bg" />
            <Skeleton className="h-3 w-1/2 shimmer-bg" />
            <Skeleton className="h-5 w-40 rounded-md shimmer-bg" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full shimmer-bg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 shimmer-bg" />
              <Skeleton className="h-4 w-32 shimmer-bg" />
            </div>
          </div>
          <Skeleton className="h-6 w-24 shimmer-bg" />
          <Skeleton className="h-8 w-8 rounded-md shimmer-bg" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Empty State — uses shared <EmptyState /> component
// ============================================================

// ============================================================
// Booking Form Dialog (create + edit)
// ============================================================

function BookingFormDialog({
  open,
  onOpenChange,
  booking,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  booking: AssetBooking | null
}) {
  const qc = useQueryClient()
  const { data: assetsRes } = useQuery({
    queryKey: ['assets-all'],
    queryFn: () => assetsApi.list({ pageSize: 200 }),
  })
  const { data: persons } = useQuery({ queryKey: ['persons'], queryFn: () => personsApi.list() })

  const [form, setForm] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Sync form whenever the dialog opens (reset for create, or prefill for edit)
  useMemo(() => {
    if (open) {
      setForm({
        title: booking?.title ?? '',
        assetId: booking?.assetId ?? '',
        bookedById: booking?.bookedById ?? '',
        purpose: booking?.purpose ?? '',
        startDate: booking ? toDateTimeLocal(booking.startDate) : '',
        endDate: booking ? toDateTimeLocal(booking.endDate) : '',
        notes: booking?.notes ?? '',
      })
      setErrors({})
    }
  }, [open, booking])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.title?.trim()) e.title = 'Title is required'
    if (!form.assetId) e.assetId = 'Asset is required'
    if (!form.bookedById) e.bookedById = 'Person is required'
    if (!form.startDate) e.startDate = 'Start date is required'
    if (!form.endDate) e.endDate = 'End date is required'
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      e.endDate = 'End must be after start'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function save() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        assetId: form.assetId,
        bookedById: form.bookedById,
        purpose: form.purpose.trim() || null,
        startDate: fromDateTimeLocal(form.startDate),
        endDate: fromDateTimeLocal(form.endDate),
        notes: form.notes.trim() || null,
      }
      if (booking) {
        await bookingsApi.update(booking.id, payload)
        toast.success('Booking updated')
      } else {
        const created = await bookingsApi.create(payload)
        toast.success('Booking created')
        // Conflict warning
        const conflicts = (created as AssetBooking)?._conflicts
        if (conflicts && conflicts.length > 0) {
          toast.warning(
            `Note: This booking conflicts with ${conflicts.length} existing booking${conflicts.length === 1 ? '' : 's'}`
          )
        }
      }
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
    } catch (e) {
      toast.error('Save failed: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            {booking ? 'Edit Booking' : 'New Booking'}
          </DialogTitle>
          <DialogDescription>
            {booking
              ? 'Update booking details, schedule, or notes.'
              : 'Reserve a shared asset for a specific time window. Approval may be required.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input
              value={form.title ?? ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Projector for Q4 planning session"
              className={errors.title ? 'border-rose-500 focus-visible:ring-rose-500/30' : ''}
            />
            {errors.title && <p className="text-[11px] text-rose-600">{errors.title}</p>}
          </div>

          {/* Asset + Booked By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Asset *</Label>
              <Select value={form.assetId ?? ''} onValueChange={(v) => setForm({ ...form, assetId: v })}>
                <SelectTrigger className={errors.assetId ? 'border-rose-500' : ''}>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {assetsRes?.data?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.assetTag ? `${a.assetTag} — ` : ''}
                      {a.make ?? ''} {a.model ?? ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assetId && <p className="text-[11px] text-rose-600">{errors.assetId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Booked By *</Label>
              <Select value={form.bookedById ?? ''} onValueChange={(v) => setForm({ ...form, bookedById: v })}>
                <SelectTrigger className={errors.bookedById ? 'border-rose-500' : ''}>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {persons?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName}
                      {p.role ? ` (${p.role})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bookedById && <p className="text-[11px] text-rose-600">{errors.bookedById}</p>}
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label className="text-xs">Purpose</Label>
            <Textarea
              rows={2}
              value={form.purpose ?? ''}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="Why do you need this asset?"
            />
          </div>

          {/* Start + End */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date &amp; Time *</Label>
              <Input
                type="datetime-local"
                value={form.startDate ?? ''}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={errors.startDate ? 'border-rose-500 focus-visible:ring-rose-500/30' : ''}
              />
              {errors.startDate && <p className="text-[11px] text-rose-600">{errors.startDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date &amp; Time *</Label>
              <Input
                type="datetime-local"
                value={form.endDate ?? ''}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={errors.endDate ? 'border-rose-500 focus-visible:ring-rose-500/30' : ''}
              />
              {errors.endDate && <p className="text-[11px] text-rose-600">{errors.endDate}</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Accessories needed, pickup instructions, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Sparkles className="h-4 w-4 mr-1.5 animate-pulse" />
                {booking ? 'Saving...' : 'Creating...'}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                {booking ? 'Save Changes' : 'Create Booking'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Check-In Dialog
// ============================================================

function CheckInDialog({
  open,
  onOpenChange,
  booking,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  booking: AssetBooking | null
}) {
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useMemo(() => {
    if (open) setNotes('')
  }, [open])

  async function submit() {
    if (!booking) return
    setSaving(true)
    try {
      await bookingsApi.checkIn(booking.id, notes.trim() || undefined)
      toast.success('Asset checked in')
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
    } catch (e) {
      toast.error('Check-in failed: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Check In Asset
          </DialogTitle>
          <DialogDescription>
            Return <strong>&ldquo;{booking?.title}&rdquo;</strong> and record the asset&apos;s condition.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {booking?.asset && (
            <div className="rounded-md bg-muted/60 px-3 py-2 text-xs flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium truncate">
                {booking.asset.make ?? ''} {booking.asset.model ?? ''}
              </span>
              {booking.asset.assetTag && (
                <span className="font-mono text-[10px] text-muted-foreground">{booking.asset.assetTag}</span>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Condition / Notes (optional)</Label>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Returned in good condition. Minor scratch on case."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submit} disabled={saving}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {saving ? 'Checking in...' : 'Confirm Check-In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main View
// ============================================================

export function BookingsView() {
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tab, setTab] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AssetBooking | null>(null)
  const [checkInBooking, setCheckInBooking] = useState<AssetBooking | null>(null)
  const [deleteBooking, setDeleteBooking] = useState<AssetBooking | null>(null)

  // Load ALL bookings once so tab counts are accurate (no server-side status filter)
  const { data, isLoading } = useQuery({
    queryKey: ['bookings', 'all'],
    queryFn: () => bookingsApi.list({ limit: 500 }),
  })

  // Persons (to pick an approver for approve/reject actions)
  const { data: persons } = useQuery({ queryKey: ['persons'], queryFn: () => personsApi.list() })

  // Stats tiles
  const stats = useMemo(() => {
    if (!data) return { total: 0, pending: 0, approved: 0, active: 0, upcoming: 0 }
    const now = Date.now()
    return {
      total: data.length,
      pending: data.filter((b) => b.status === 'Pending').length,
      approved: data.filter((b) => b.status === 'Approved').length,
      active: data.filter((b) => b.status === 'Active').length,
      upcoming: data.filter(
        (b) =>
          (b.status === 'Pending' || b.status === 'Approved') &&
          new Date(b.startDate).getTime() > now
      ).length,
    }
  }, [data])

  // Tab definitions + counts
  const tabs = useMemo(() => {
    const c = {
      all: data?.length ?? 0,
      pending: data?.filter((b) => b.status === 'Pending').length ?? 0,
      approved: data?.filter((b) => b.status === 'Approved').length ?? 0,
      active: data?.filter((b) => b.status === 'Active').length ?? 0,
      completed: data?.filter((b) => b.status === 'Completed').length ?? 0,
      cancelled: data?.filter((b) => b.status === 'Cancelled' || b.status === 'Rejected').length ?? 0,
    }
    return [
      { id: 'all', label: 'All', count: c.all },
      { id: 'pending', label: 'Pending', count: c.pending },
      { id: 'approved', label: 'Approved', count: c.approved },
      { id: 'active', label: 'Active', count: c.active },
      { id: 'completed', label: 'Completed', count: c.completed },
      { id: 'cancelled', label: 'Cancelled / Rejected', count: c.cancelled },
    ]
  }, [data])

  // Filtered list (search + status filter + tab)
  const filtered = useMemo(() => {
    if (!data) return []
    let arr = data
    const q = search.trim().toLowerCase()
    if (q) {
      arr = arr.filter((b) => {
        const a = b.asset
        return (
          b.title.toLowerCase().includes(q) ||
          (b.purpose ?? '').toLowerCase().includes(q) ||
          (a?.make ?? '').toLowerCase().includes(q) ||
          (a?.model ?? '').toLowerCase().includes(q) ||
          (a?.assetTag ?? '').toLowerCase().includes(q) ||
          (b.bookedBy?.fullName ?? '').toLowerCase().includes(q)
        )
      })
    }
    if (statusFilter !== 'all') {
      arr = arr.filter((b) => b.status === statusFilter)
    }
    if (tab !== 'all') {
      if (tab === 'cancelled') {
        arr = arr.filter((b) => b.status === 'Cancelled' || b.status === 'Rejected')
      } else {
        const tabStatus =
          tab.charAt(0).toUpperCase() + tab.slice(1) // 'pending' → 'Pending'
        arr = arr.filter((b) => b.status === tabStatus)
      }
    }
    // Sort: upcoming first (soonest start first), then past (most recent first)
    const now = Date.now()
    arr = [...arr].sort((a, b) => {
      const as = new Date(a.startDate).getTime()
      const bs = new Date(b.startDate).getTime()
      const aUp = as > now ? 0 : 1
      const bUp = bs > now ? 0 : 1
      if (aUp !== bUp) return aUp - bUp
      return aUp === 0 ? as - bs : bs - as
    })
    return arr
  }, [data, search, statusFilter, tab])

  // Bookings shown in calendar mode — applies search + status filter only (no tab)
  const calendarBookings = useMemo(() => {
    if (!data) return []
    let arr = data
    const q = search.trim().toLowerCase()
    if (q) {
      arr = arr.filter((b) => {
        const a = b.asset
        return (
          b.title.toLowerCase().includes(q) ||
          (b.purpose ?? '').toLowerCase().includes(q) ||
          (a?.make ?? '').toLowerCase().includes(q) ||
          (a?.model ?? '').toLowerCase().includes(q) ||
          (a?.assetTag ?? '').toLowerCase().includes(q) ||
          (b.bookedBy?.fullName ?? '').toLowerCase().includes(q)
        )
      })
    }
    if (statusFilter !== 'all') {
      arr = arr.filter((b) => b.status === statusFilter)
    }
    return arr
  }, [data, search, statusFilter])

  // Action handlers
  function getApprover() {
    return persons?.find((p) => p.role === 'IT Manager') || persons?.[0]
  }

  async function handleApprove(b: AssetBooking) {
    const approver = getApprover()
    if (!approver) {
      toast.error('No approver available — add a person first')
      return
    }
    try {
      await bookingsApi.approve(b.id, { approvedById: approver.id })
      toast.success('Booking approved')
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error('Approve failed: ' + String(e))
    }
  }

  async function handleReject(b: AssetBooking) {
    const approver = getApprover()
    if (!approver) {
      toast.error('No approver available — add a person first')
      return
    }
    try {
      await bookingsApi.reject(b.id, { approvedById: approver.id })
      toast.success('Booking rejected')
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error('Reject failed: ' + String(e))
    }
  }

  async function handleCheckOut(b: AssetBooking) {
    try {
      await bookingsApi.checkOut(b.id)
      toast.success('Asset checked out')
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error('Check-out failed: ' + String(e))
    }
  }

  async function handleCancel(b: AssetBooking) {
    try {
      await bookingsApi.update(b.id, { status: 'Cancelled' })
      toast.success('Booking cancelled')
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error('Cancel failed: ' + String(e))
    }
  }

  async function handleDelete(b: AssetBooking) {
    try {
      await bookingsApi.delete(b.id)
      toast.success('Booking deleted')
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleteBooking(null)
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ============ Header ============ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/10 to-cyan-500/5 border border-sky-500/20">
            <CalendarClock className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Asset <span className="gradient-text">Bookings</span> &amp; Reservations
            </h2>
            <p className="text-sm text-muted-foreground">
              Schedule shared assets with approval workflow, check-out / check-in, and conflict detection.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportApi.download(exportApi.bookings())}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <Button
            className="btn-press"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> New Booking
          </Button>
        </div>
      </div>

      {/* ============ Stats Tiles ============ */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Total Bookings" value={stats.total} icon={CalendarRange} color="#0ea5e9" hint="all-time" />
        <StatTile label="Pending Approval" value={stats.pending} icon={Clock} color="#f59e0b" hint="awaiting review" />
        <StatTile label="Approved" value={stats.approved} icon={CheckCircle2} color="#8b5cf6" hint="ready to check out" />
        <StatTile label="Active Now" value={stats.active} icon={ArrowRightLeft} color="#10b981" hint="checked out" />
        <StatTile label="Upcoming" value={stats.upcoming} icon={CalendarDays} color="#64748b" hint="scheduled future" />
      </div>

      {/* ============ Filter Bar ============ */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, purpose, asset, or person..."
              className="pl-8 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {BOOKING_STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <Separator />
        <div className="px-4 py-2.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Showing all upcoming and past bookings
          </p>
        </div>
      </Card>

      {/* ============ View Mode Toggle (List / Calendar) ============ */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'calendar')}>
        <TabsList className="flex h-auto gap-1 bg-transparent p-0">
          <TabsTrigger
            value="list"
            className="gap-1.5 data-[state=active]:bg-sky-500/10 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            List View
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="gap-1.5 data-[state=active]:bg-sky-500/10 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300"
          >
            <CalendarRange className="h-3.5 w-3.5" />
            Calendar View
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === 'calendar' ? (
        /* ============ Calendar View ============ */
        <BookingsCalendarView
          bookings={calendarBookings}
          isLoading={isLoading}
          onApprove={handleApprove}
          onReject={handleReject}
          onCheckOut={handleCheckOut}
          onCheckIn={(bk) => setCheckInBooking(bk)}
          onEdit={(bk) => {
            setEditing(bk)
            setFormOpen(true)
          }}
          onDelete={(bk) => setDeleteBooking(bk)}
          onCancel={handleCancel}
        />
      ) : (
        <>
          {/* ============ Status Tabs (list mode) ============ */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="gap-1.5 data-[state=active]:bg-sky-500/10 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300"
                >
                  {t.label}
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] tabular-nums">
                    {t.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* ============ Bookings List ============ */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <BookingCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="bg-dot-pattern border-dashed border-2">
              <CardContent className="py-6">
                <EmptyState
                  icon={CalendarDays}
                  title="No bookings yet"
                  description="Schedule asset bookings for events, travel, or temporary use."
                  action={{ label: 'New Booking', onClick: () => { setEditing(null); setFormOpen(true) }, icon: Plus }}
                />
              </CardContent>
            </Card>
          ) : (
            <div
              key={tab}
              className="space-y-3 stagger-children max-h-[600px] overflow-y-auto scrollbar-thin pr-1"
            >
              {filtered.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onCheckOut={handleCheckOut}
                  onCheckIn={(bk) => setCheckInBooking(bk)}
                  onEdit={(bk) => {
                    setEditing(bk)
                    setFormOpen(true)
                  }}
                  onDelete={(bk) => setDeleteBooking(bk)}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ============ Form Dialog (create / edit) ============ */}
      <BookingFormDialog open={formOpen} onOpenChange={setFormOpen} booking={editing} />

      {/* ============ Check-In Dialog ============ */}
      <CheckInDialog
        open={!!checkInBooking}
        onOpenChange={(v) => !v && setCheckInBooking(null)}
        booking={checkInBooking}
      />

      {/* ============ Delete Confirmation ============ */}
      <AlertDialog open={!!deleteBooking} onOpenChange={(v) => !v && setDeleteBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Delete booking?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the booking <strong>&ldquo;{deleteBooking?.title}&rdquo;</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/30"
              onClick={() => deleteBooking && handleDelete(deleteBooking)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
