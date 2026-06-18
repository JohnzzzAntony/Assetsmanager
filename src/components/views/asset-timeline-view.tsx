'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { timelineApi, exportApi } from '@/lib/api'
import type { TimelineEvent, AssetTimeline } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  UserPlus,
  UserMinus,
  Wrench,
  CalendarClock,
  KeyRound,
  Image as ImageIcon,
  Trash2,
  Activity,
  Clock,
  History,
  Package,
  GitBranch,
  CheckCircle2,
  XCircle,
  ClipboardList,
  FilterX,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatRelative } from '@/lib/format'
import { useNav } from '@/lib/nav'

// Round 9-B: persist the active event-type filter across reloads.
// Stored as a JSON-encoded array of active filter names so the schema supports
// multi-select in the future; today the UI is single-select so we read the first element.
const TIMELINE_FILTERS_STORAGE_KEY = 'assethub:asset-timeline-filters'

function loadTimelineFilterFromStorage(): string {
  if (typeof window === 'undefined') return 'All'
  try {
    const raw = window.localStorage.getItem(TIMELINE_FILTERS_STORAGE_KEY)
    if (!raw) return 'All'
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return 'All'
    const first = String(parsed[0])
    // Only accept known category keys; otherwise fall back to 'All'.
    const known = new Set(FILTER_CATEGORIES.map((c) => c.key))
    return known.has(first) ? first : 'All'
  } catch {
    return 'All'
  }
}

function saveTimelineFilterToStorage(filter: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TIMELINE_FILTERS_STORAGE_KEY, JSON.stringify([filter]))
  } catch {
    // localStorage may be unavailable — fail silently.
  }
}

// ---- Icon map: event.icon string → Lucide component (default = Activity) ----
const iconMap: Record<string, LucideIcon> = {
  Plus,
  UserPlus,
  UserMinus,
  Wrench,
  CalendarClock,
  KeyRound,
  Image: ImageIcon,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardList,
}

// ---- Map event.type → dot CSS variant class ----
function dotVariant(type: string): string {
  switch (type) {
    case 'created':
    case 'updated':
      return 'event-created'
    case 'assigned':
      return 'event-assigned'
    case 'unassigned':
      return 'event-unassigned'
    case 'checkout':
    case 'checkin':
      return 'event-emerald'
    case 'maintenance.scheduled':
    case 'maintenance.cancelled':
      return 'event-maintenance'
    case 'maintenance.completed':
      return 'event-maintenance-completed'
    case 'booking.created':
    case 'booking.completed':
      return 'event-booking'
    case 'license.allocated':
    case 'license.deallocated':
      return 'event-license'
    case 'image.added':
      return 'event-image'
    case 'disposal':
      return 'event-disposal'
    default:
      return 'event-created'
  }
}

// ---- Map event.type → accent color (matches dot border color in globals.css) ----
function accentColor(type: string): string {
  switch (type) {
    case 'created':
    case 'updated':
    case 'maintenance.completed':
      return '#10b981' // emerald
    case 'assigned':
      return '#8b5cf6' // violet
    case 'unassigned':
      return '#64748b' // slate
    case 'checkout':
    case 'checkin':
      return '#10b981' // emerald (Round 8 — checkout/checkin)
    case 'maintenance.scheduled':
    case 'maintenance.cancelled':
      return '#f59e0b' // amber
    case 'booking.created':
    case 'booking.completed':
      return '#0ea5e9' // sky
    case 'license.allocated':
    case 'license.deallocated':
      return '#ec4899' // pink
    case 'image.added':
      return '#f97316' // orange
    case 'disposal':
      return '#f43f5e' // rose
    default:
      return '#0ea5e9' // sky default
  }
}

// ---- Filter category config ----
interface FilterCategory {
  key: string
  label: string
  types: string[]
  color: string
  ringClass: string
}

const FILTER_CATEGORIES: FilterCategory[] = [
  {
    key: 'All',
    label: 'All',
    types: [],
    color: '#64748b',
    ringClass: 'ring-slate-400/40',
  },
  {
    key: 'Assignments',
    label: 'Assignments',
    types: ['assigned', 'unassigned'],
    color: '#0ea5e9',
    ringClass: 'ring-sky-500/30',
  },
  {
    key: 'Maintenance',
    label: 'Maintenance',
    types: ['maintenance.scheduled', 'maintenance.completed', 'maintenance.cancelled'],
    color: '#f59e0b',
    ringClass: 'ring-amber-500/30',
  },
  {
    key: 'Bookings',
    label: 'Bookings',
    types: ['booking.created', 'booking.completed'],
    color: '#8b5cf6',
    ringClass: 'ring-violet-500/30',
  },
  {
    key: 'Checkouts',
    label: 'Checkouts',
    types: ['checkout', 'checkin'],
    color: '#10b981',
    ringClass: 'ring-emerald-500/30',
  },
  {
    key: 'Licenses',
    label: 'Licenses',
    types: ['license.allocated', 'license.deallocated'],
    color: '#ec4899',
    ringClass: 'ring-pink-500/30',
  },
  {
    key: 'Images',
    label: 'Images',
    types: ['image.added'],
    color: '#f97316',
    ringClass: 'ring-orange-500/30',
  },
  {
    key: 'Lifecycle',
    label: 'Lifecycle',
    types: ['created', 'disposal'],
    color: '#64748b',
    ringClass: 'ring-slate-500/30',
  },
]

// ---- Stat tile ----
interface StatTileProps {
  label: string
  value: number
  icon: LucideIcon
  color: string
  hint?: string
}

function StatTile({ label, value, icon: Icon, color, hint }: StatTileProps) {
  return (
    <Card className="stat-tile-gradient card-hover-lift card-3d-tilt overflow-hidden border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="animate-count-pop mt-1 text-2xl font-bold tracking-tight tabular-nums" style={{ color }}>
              {value}
            </p>
            {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}1a` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Timeline item ----
function TimelineItemRow({ event, index }: { event: TimelineEvent; index: number }) {
  const Icon = (event.icon && iconMap[event.icon]) || Activity
  const variant = dotVariant(event.type)
  const color = accentColor(event.type)
  const ts = event.timestamp

  return (
    <div
      className="timeline-item relative pl-10 pb-4"
      style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}
    >
      {/* Dot on the rail */}
      <span className={`timeline-dot ${variant}`} aria-hidden />
      <div className="rounded-lg border border-border/60 bg-card/70 px-3 py-2.5 shadow-sm">
        <div className="flex items-start gap-2.5">
          <div
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color}1a` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="font-medium text-foreground">{event.title}</p>
              <span
                className="text-[10px] text-muted-foreground tabular-nums"
                title={formatDate(ts, 'MMM d, yyyy h:mm a')}
              >
                <Clock className="mr-1 inline-block h-3 w-3 align-text-bottom" />
                {formatRelative(ts)}
              </span>
            </div>
            {event.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
            )}
            {event.actorName && (
              <p className="mt-0.5 text-xs italic text-muted-foreground/80">— {event.actorName}</p>
            )}
            {event.meta && Object.keys(event.meta).length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {Object.entries(event.meta).slice(0, 4).map(([k, v]) => {
                  if (v === null || v === undefined || v === '') return null
                  return (
                    <Badge key={k} variant="outline" className="text-[10px] font-normal">
                      <span className="text-muted-foreground">{k}:</span>{' '}
                      <span className="ml-0.5 text-foreground">{String(v)}</span>
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Group events by date ----
function groupByDate(events: TimelineEvent[]): { date: string; items: TimelineEvent[] }[] {
  const groups: { date: string; items: TimelineEvent[] }[] = []
  const map = new Map<string, TimelineEvent[]>()
  for (const ev of events) {
    const key = new Date(ev.timestamp).toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(ev)
  }
  for (const [date, items] of map.entries()) {
    groups.push({ date, items })
  }
  return groups
}

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

// ---- Loading skeleton ----
function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-l-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-10" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </CardHeader>
        <CardContent>
          <div className="max-h-[640px] overflow-hidden">
            <div className="timeline-rail pt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="relative pl-10 pb-4">
                  <span className="timeline-dot event-created" aria-hidden />
                  <div className="rounded-lg border border-border/60 bg-card/70 px-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Empty state ----
function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="empty-state-icon mb-4">
          <History className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No timeline events yet</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Activity for this asset will appear here once it has assignments, maintenance, bookings, or other lifecycle events.
        </p>
      </CardContent>
    </Card>
  )
}

// ---- Filter-empty state ----
function FilterEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-14 px-4 text-center">
        <div className="empty-state-icon mb-4">
          <FilterX className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No events match this filter</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          There are no events in the selected category for this asset. Try clearing the filter to see all activity.
        </p>
        <Button variant="outline" className="mt-4 btn-press" onClick={onClear}>
          <FilterX className="mr-2 h-4 w-4" />
          Clear filter
        </Button>
      </CardContent>
    </Card>
  )
}

// ---- Filter chip ----
interface FilterChipProps {
  category: FilterCategory
  count: number
  active: boolean
  onClick: () => void
}

function FilterChip({ category, count, active, onClick }: FilterChipProps) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-8 gap-1.5 rounded-full px-3 text-xs font-medium shadow-sm transition-all',
        active
          ? cn('text-white shadow-sm ring-2', category.ringClass)
          : 'border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/40',
      )}
      style={active ? { backgroundColor: category.color, borderColor: category.color } : undefined}
    >
      <span>{category.label}</span>
      <span
        className={cn(
          'ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
          active ? 'bg-white/20' : 'bg-muted-foreground/10',
        )}
      >
        {count}
      </span>
    </Button>
  )
}

// ---- Main view ----
export function AssetTimelineView({ assetId }: { assetId: string }) {
  const navigate = useNav((s) => s.navigate)
  // Round 9-B: initial filter restored from localStorage (default 'All').
  const [activeFilter, setActiveFilter] = useState<string>(() => loadTimelineFilterFromStorage())
  const { data, isLoading, isError } = useQuery<AssetTimeline>({
    queryKey: ['asset-timeline', assetId],
    queryFn: () => timelineApi.getForAsset(assetId),
  })

  // Round 9-B: persist filter changes to localStorage as a JSON array.
  useEffect(() => {
    saveTimelineFilterToStorage(activeFilter)
  }, [activeFilter])

  // Round 9-B: trigger a CSV download of the asset's timeline events.
  function handleExportCsv() {
    exportApi.download(timelineApi.exportCsvUrl(assetId))
    toast.success('Exported timeline CSV')
  }

  const events = data?.events

  // Per-category counts (always computed from ALL events, never filtered)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (!events) return counts
    for (const cat of FILTER_CATEGORIES) {
      if (cat.key === 'All') {
        counts[cat.key] = events.length
      } else {
        counts[cat.key] = events.filter((e) => cat.types.includes(e.type)).length
      }
    }
    return counts
  }, [events])

  // Filtered events (filter applied BEFORE grouping so empty date groups don't render)
  const filteredEvents = useMemo(() => {
    if (!events) return []
    if (activeFilter === 'All') return events
    const cat = FILTER_CATEGORIES.find((c) => c.key === activeFilter)
    if (!cat) return events
    return events.filter((e) => cat.types.includes(e.type))
  }, [events, activeFilter])

  const groups = useMemo(() => {
    const sorted = [...filteredEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    return groupByDate(sorted)
  }, [filteredEvents])

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            className="btn-press shrink-0"
            onClick={() => navigate('asset-detail', { id: assetId })}
            aria-label="Back to asset detail"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight shimmer-underline">Asset Timeline</h2>
              <span className="live-dot" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Live history
              </span>
            </div>
            {data && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                <span className="gradient-text-shine font-medium text-foreground">{data.assetName}</span>
                {data.assetTag && (
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {data.assetTag}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="empty-state-icon mb-4">
              <XCircle className="h-7 w-7 text-rose-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Couldn&apos;t load timeline</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Something went wrong while fetching the asset&apos;s lifecycle history. Please try again later.
            </p>
            <Button
              variant="outline"
              className="mt-4 btn-press"
              onClick={() => navigate('asset-detail', { id: assetId })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat tiles — 7 total, always unfiltered */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <StatTile
              label="Total Events"
              value={data.stats.totalEvents}
              icon={GitBranch}
              color="#0ea5e9"
              hint="All activity"
            />
            <StatTile
              label="Assignments"
              value={data.stats.assignmentCount}
              icon={UserPlus}
              color="#0ea5e9"
              hint="Assignment changes"
            />
            <StatTile
              label="Maintenance"
              value={data.stats.maintenanceCount}
              icon={Wrench}
              color="#f59e0b"
              hint="Scheduled & completed"
            />
            <StatTile
              label="Bookings"
              value={data.stats.bookingCount}
              icon={CalendarClock}
              color="#8b5cf6"
              hint="Reservation events"
            />
            <StatTile
              label="Checkouts"
              value={data.stats.checkoutCount ?? 0}
              icon={ArrowUpRight}
              color="#10b981"
              hint="Check-out / check-in"
            />
            <StatTile
              label="Licenses"
              value={data.stats.licenseCount ?? 0}
              icon={KeyRound}
              color="#ec4899"
              hint="Allocated / deallocated"
            />
            <StatTile
              label="Images"
              value={data.stats.imageCount ?? 0}
              icon={ImageIcon}
              color="#f97316"
              hint="Photos added"
            />
          </div>

          {/* Strong gradient divider between KPIs and filter chips */}
          <div className="gradient-divider-strong" aria-hidden />

          {/* Filter chips + Round 9-B: Export CSV button */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex flex-wrap gap-2">
              {FILTER_CATEGORIES.map((cat) => (
                <FilterChip
                  key={cat.key}
                  category={cat}
                  count={categoryCounts[cat.key] ?? 0}
                  active={activeFilter === cat.key}
                  onClick={() => setActiveFilter(cat.key)}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="btn-press shrink-0"
              onClick={handleExportCsv}
              aria-label="Export timeline as CSV"
              title="Export this asset's full timeline as a CSV file"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>

          {/* First / Last event footer */}
          {(data.stats.firstEventAt || data.stats.lastEventAt) && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                First event:{' '}
                <span className="font-medium text-foreground">
                  {data.stats.firstEventAt ? formatDate(data.stats.firstEventAt) : '—'}
                </span>
              </span>
              <span className="text-border">·</span>
              <Clock className="h-3.5 w-3.5 text-sky-600" />
              <span>
                Last event:{' '}
                <span className="font-medium text-foreground">
                  {data.stats.lastEventAt ? formatRelative(data.stats.lastEventAt) : '—'}
                </span>
              </span>
            </div>
          )}

          {/* Timeline */}
          {data.events.length === 0 ? (
            <EmptyState />
          ) : filteredEvents.length === 0 ? (
            <FilterEmptyState onClear={() => setActiveFilter('All')} />
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4 text-sky-600" />
                  Lifecycle Events
                  <Badge variant="secondary" className="ml-1">{filteredEvents.length}</Badge>
                  {activeFilter !== 'All' && (
                    <Badge variant="outline" className="ml-1 text-[10px] font-normal">
                      Filtered: {activeFilter}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Full chronological history · most recent first · scroll for older events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[640px] overflow-y-auto scrollbar-thin pr-1">
                  <div className="timeline-rail pt-1">
                    {groups.map((group) => (
                      <div key={group.date} className="mb-1">
                        <div className="sticky top-0 z-10 mb-2 bg-background/95 py-1 pl-10 backdrop-blur">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {dateLabel(group.date)}
                          </span>
                        </div>
                        {group.items.map((ev, idx) => (
                          <TimelineItemRow key={ev.id} event={ev} index={idx} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
