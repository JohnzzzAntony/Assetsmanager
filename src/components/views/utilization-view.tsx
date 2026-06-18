'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  utilizationApi,
  assetsApi,
  disposalsApi,
  personsApi,
  departmentsApi,
  locationsApi,
} from '@/lib/api'
import type {
  UtilizationByBucket,
  IdleAsset,
  DisposalMethod,
} from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  AlertCircle,
  Building2,
  Layers,
  Activity,
  Timer,
  UserCog,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'
import { useNav } from '@/lib/nav'

// ---- Idle threshold options ----
type IdleThreshold = 30 | 60 | 90 | 180
const IDLE_THRESHOLDS: IdleThreshold[] = [30, 60, 90, 180]

// ---- KPI tile ----
interface KPITileProps {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  color: string
  hint?: string
}

function KPITile({ label, value, icon: Icon, color, hint }: KPITileProps) {
  return (
    <Card className="stat-tile-gradient card-hover-lift overflow-hidden border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="animate-count-pop mt-1 text-2xl font-bold tracking-tight tabular-nums" style={{ color }}>
              {value}
            </p>
            {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}1a` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Returns bar color by utilization rate
function rateColor(rate: number): string {
  if (rate >= 0.75) return '#10b981' // emerald
  if (rate >= 0.5) return '#0ea5e9' // sky
  if (rate >= 0.25) return '#f59e0b' // amber
  return '#f43f5e' // rose
}

function rateLabel(rate: number): { text: string; className: string } {
  const pct = Math.round(rate * 100)
  if (rate >= 0.75) return { text: `${pct}%`, className: 'text-emerald-600 dark:text-emerald-400' }
  if (rate >= 0.5) return { text: `${pct}%`, className: 'text-sky-600 dark:text-sky-400' }
  if (rate >= 0.25) return { text: `${pct}%`, className: 'text-amber-600 dark:text-amber-400' }
  return { text: `${pct}%`, className: 'text-rose-600 dark:text-rose-400' }
}

// ---- Bucket list (below chart) ----
function BucketList({ buckets }: { buckets: UtilizationByBucket[] }) {
  if (buckets.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">No buckets to display.</p>
    )
  }
  return (
    <div className="space-y-2">
      {buckets.map((b) => {
        const pct = Math.round(b.utilizationRate * 100)
        const label = rateLabel(b.utilizationRate)
        return (
          <div
            key={b.bucketId}
            className="grid grid-cols-12 items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs"
          >
            <div className="col-span-12 truncate font-medium text-foreground sm:col-span-4" title={b.bucketName}>
              {b.bucketName}
            </div>
            <div className="col-span-3 text-center tabular-nums text-muted-foreground sm:col-span-2">
              <span className="font-medium text-foreground">{b.total}</span> total
            </div>
            <div className="col-span-3 text-center tabular-nums sm:col-span-2">
              <span className="font-medium text-foreground">{b.inUse}</span>{' '}
              <span className="text-muted-foreground">in use</span>
            </div>
            <div className={`col-span-2 text-right font-semibold tabular-nums sm:col-span-2 ${label.className}`}>
              {label.text}
            </div>
            <div className="col-span-4 sm:col-span-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="util-bar-fill progress-fill-anim h-full rounded-full"
                  style={{ width: `${pct}%`, background: rateColor(b.utilizationRate) }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Bucket section (header + chart + list) ----
interface BucketSectionProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  buckets: UtilizationByBucket[]
  chartHeight?: number
}

function BucketSection({ title, description, icon: Icon, iconColor, buckets, chartHeight = 280 }: BucketSectionProps) {
  const chartData = useMemo(
    () =>
      [...buckets]
        .sort((a, b) => b.utilizationRate - a.utilizationRate)
        .map((b) => ({
          name: b.bucketName,
          rate: Math.round(b.utilizationRate * 100),
          total: b.total,
          inUse: b.inUse,
          bucketId: b.bucketId,
        })),
    [buckets],
  )

  return (
    <div className="space-y-3">
      <div className="section-accent-bar dot-pattern-bg rounded-lg px-3 py-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Utilization Rate by Bucket</CardTitle>
          <CardDescription>Bars colored by rate (green ≥75%, blue ≥50%, amber ≥25%, rose &lt;25%)</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.7 0.01 240 / 0.15)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid oklch(0.91 0.005 240)', fontSize: 12 }}
                  formatter={(value: number, _name, props) => {
                    const payload = props?.payload as { inUse?: number; total?: number } | undefined
                    return [
                      `${value}% (${payload?.inUse ?? 0} of ${payload?.total ?? 0} in use)`,
                      'Utilization',
                    ]
                  }}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.bucketId} fill={rateColor(entry.rate / 100)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <BucketList buckets={buckets} />
    </div>
  )
}

// ---- Idle asset row badge ----
function idleBadge(days: number): { text: string; className: string } {
  if (days > 180) return { text: `${days}d`, className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' }
  if (days > 90) return { text: `${days}d`, className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' }
  return { text: `${days}d`, className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' }
}

// ---- Idle Assets Table ----
interface IdleAssetsTableProps {
  assets: IdleAsset[]
  idleThresholdDays: IdleThreshold
  onReassign: (asset: IdleAsset) => void
  onDispose: (asset: IdleAsset) => void
}

function IdleAssetsTable({ assets, idleThresholdDays, onReassign, onDispose }: IdleAssetsTableProps) {
  const navigate = useNav((s) => s.navigate)
  const sorted = useMemo(() => [...assets].sort((a, b) => b.daysIdle - a.daysIdle), [assets])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Idle Assets
          <Badge variant="secondary" className="ml-1">{sorted.length}</Badge>
        </CardTitle>
        <CardDescription>
          {`Assets in stock for ≥ ${idleThresholdDays} days · sorted by days idle (desc)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto scrollbar-thin [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Days Idle</TableHead>
                <TableHead className="sticky right-0 z-10 bg-background/95 text-right backdrop-blur">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((a) => {
                const badge = idleBadge(a.daysIdle)
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-medium text-foreground hover:underline"
                        onClick={() => navigate('asset-detail', { id: a.id })}
                      >
                        {a.name}
                      </button>
                      {a.assetTag && (
                        <div className="text-[11px] text-muted-foreground">{a.assetTag}</div>
                      )}
                      {a.purchaseDate && (
                        <div className="text-[10px] text-muted-foreground/70">
                          Purchased {formatDate(a.purchaseDate)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {a.serialNumber || '—'}
                    </TableCell>
                    <TableCell>{a.departmentName || '—'}</TableCell>
                    <TableCell>{a.locationName || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={badge.className}>
                        <Clock className="mr-1 h-3 w-3" />
                        {badge.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 bg-background/95 text-right backdrop-blur">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn-press h-7 px-2 text-xs hover:ring-2 hover:ring-sky-500/30"
                          onClick={() => onReassign(a)}
                          title="Reassign asset"
                        >
                          <UserCog className="h-3.5 w-3.5" />
                          <span className="ml-1 hidden sm:inline">Reassign</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="btn-press h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => onDispose(a)}
                          title="Dispose asset"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="ml-1 hidden sm:inline">Dispose</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Reassign Dialog ----
function ReassignDialog({ asset, onClose }: { asset: IdleAsset; onClose: () => void }) {
  const qc = useQueryClient()
  const [personId, setPersonId] = useState<string>('')
  const [departmentId, setDepartmentId] = useState<string>('')
  const [locationId, setLocationId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch persons / departments / locations whenever this dialog mounts.
  // TanStack Query caches by key, so reopens are instant.
  const { data: persons, isLoading: personsLoading } = useQuery({
    queryKey: ['persons', 'list-all'],
    queryFn: () => personsApi.list(),
  })
  const { data: departments } = useQuery({
    queryKey: ['departments', 'list-all'],
    queryFn: () => departmentsApi.list(),
  })
  const { data: locations } = useQuery({
    queryKey: ['locations', 'list-all'],
    queryFn: () => locationsApi.list(),
  })

  async function handleSubmit() {
    if (!personId) {
      toast.error('Please select a person to reassign the asset to.')
      return
    }
    setSubmitting(true)
    try {
      // The existing assetsApi.assign accepts { personId, departmentId, locationId, reason, action }.
      // We fold the optional notes into the reason string so the data is preserved without
      // requiring changes to the assign repo (AssignmentHistory.reason is free-text).
      const reason = notes.trim()
        ? `Reassigned from idle — ${notes.trim()}`
        : 'Reassigned from idle'
      await assetsApi.assign(asset.id, {
        personId,
        departmentId: departmentId || undefined,
        locationId: locationId || undefined,
        reason,
      })
      toast.success('Asset reassigned', {
        description: `${asset.name} has been reassigned to a new owner.`,
      })
      onClose()
      await qc.invalidateQueries({ queryKey: ['utilization'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error('Failed to reassign asset', { description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-sky-600" />
            Reassign Asset
          </DialogTitle>
          <DialogDescription>
            Reassign this idle asset to a new owner. The previous assignment will be closed and a new one created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Read-only asset context */}
          <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Asset</span>
              <span className="text-right font-medium text-foreground">{asset.name}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Asset Tag</span>
              <span className="font-mono text-foreground">{asset.assetTag || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Current Department</span>
              <span className="text-foreground">{asset.departmentName || '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Current Location</span>
              <span className="text-foreground">{asset.locationName || '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Days Idle</span>
              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                <Clock className="mr-1 h-3 w-3" />
                {asset.daysIdle}d
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reassign-person" className="text-xs uppercase tracking-wide text-muted-foreground">
              New Owner <span className="text-destructive">*</span>
            </Label>
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger id="reassign-person" className="w-full">
                <SelectValue placeholder={personsLoading ? 'Loading people…' : 'Select a person…'} />
              </SelectTrigger>
              <SelectContent>
                {(persons ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}{p.role ? ` · ${p.role}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                New Department
              </Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unchanged" />
                </SelectTrigger>
                <SelectContent>
                  {(departments ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                New Location
              </Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unchanged" />
                </SelectTrigger>
                <SelectContent>
                  {(locations ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reassign-notes" className="text-xs uppercase tracking-wide text-muted-foreground">
              Notes
            </Label>
            <Textarea
              id="reassign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any context about this reassignment…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !personId}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reassigning…
              </>
            ) : (
              <>
                <UserCog className="mr-2 h-4 w-4" />
                Reassign Asset
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Dispose AlertDialog ----
const DISPOSE_OPTIONS: { value: DisposalMethod; label: string }[] = [
  { value: 'Donated', label: 'Donate' },
  { value: 'Recycled', label: 'Recycle' },
  { value: 'Sold', label: 'Sell' },
  { value: 'Scrapped', label: 'Scrap' },
]

function DisposeDialog({ asset, onClose }: { asset: IdleAsset; onClose: () => void }) {
  const qc = useQueryClient()
  const [method, setMethod] = useState<DisposalMethod>('Donated')
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm() {
    setSubmitting(true)
    try {
      await disposalsApi.create({
        assetId: asset.id,
        method,
        reason: reason.trim() || undefined,
      })
      toast.success('Asset disposed', {
        description: `${asset.name} has been marked as ${method.toLowerCase()}.`,
      })
      onClose()
      await qc.invalidateQueries({ queryKey: ['utilization'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error('Failed to dispose asset', { description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Dispose Asset?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the asset as disposed. The action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-1">
          <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Asset</span>
              <span className="text-right font-medium text-foreground">{asset.name}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Asset Tag</span>
              <span className="font-mono text-foreground">{asset.assetTag || '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Days Idle</span>
              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                <Clock className="mr-1 h-3 w-3" />
                {asset.daysIdle}d
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Disposal Method
            </Label>
            <Select value={method} onValueChange={(v) => setMethod(v as DisposalMethod)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPOSE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dispose-reason" className="text-xs uppercase tracking-wide text-muted-foreground">
              Reason (optional)
            </Label>
            <Textarea
              id="dispose-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this asset being disposed?"
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Prevent default close — we close manually after the API call resolves.
              e.preventDefault()
              handleConfirm()
            }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disposing…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Confirm Disposal
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ---- Main view ----
export function UtilizationView() {
  const qc = useQueryClient()
  const [idleThresholdDays, setIdleThresholdDays] = useState<IdleThreshold>(30)
  const [reassignAsset, setReassignAsset] = useState<IdleAsset | null>(null)
  const [disposeAsset, setDisposeAsset] = useState<IdleAsset | null>(null)

  // Skip toast on initial mount; show "Idle threshold updated to N days" on user-initiated changes.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    toast.success(`Idle threshold updated to ${idleThresholdDays} days`)
  }, [idleThresholdDays])

  const { data, isLoading } = useQuery({
    queryKey: ['utilization', idleThresholdDays],
    queryFn: () => utilizationApi.report(idleThresholdDays),
  })

  const overall = data?.overall

  // Helper used by Reassign/Dispose success handlers — we already invalidate inside the
  // dialogs, but keep a stable no-op here for clarity / future use.
  void qc

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Header — title + idle-threshold selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="gradient-text-shine text-xl font-bold tracking-tight">Asset Utilization</h2>
          <p className="text-sm text-muted-foreground">
            Track how effectively your asset pool is being used across departments and types.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="idle-threshold"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              Idle Threshold:
            </Label>
            <Select
              value={String(idleThresholdDays)}
              onValueChange={(v) => setIdleThresholdDays(Number(v) as IdleThreshold)}
            >
              <SelectTrigger id="idle-threshold" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IDLE_THRESHOLDS.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {`Assets In Stock for ≥ ${idleThresholdDays} days are considered idle`}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && data && overall && (
        <>
          {/* KPI tiles */}
          <div className="grid gap-3 sm:grid-cols-3">
            <KPITile
              label="Overall Utilization Rate"
              value={
                <span className="gradient-text-shine">
                  {Math.round(overall.utilizationRate * 100)}%
                </span>
              }
              icon={Gauge}
              color="#10b981"
              hint="In-use / available assets"
            />
            <KPITile
              label="In Use vs Available"
              value={`${overall.inUse} / ${overall.totalAssets - overall.retired - overall.lost}`}
              icon={Activity}
              color="#0ea5e9"
              hint={`${overall.totalAssets} total assets`}
            />
            <KPITile
              label="Idle Assets"
              value={overall.idleCount}
              icon={Clock}
              color="#f59e0b"
              hint={`In stock > ${idleThresholdDays} days`}
            />
          </div>

          {/* Divider between KPI tiles and bucket sections */}
          <div className="gradient-divider-strong" aria-hidden />

          {/* By Department */}
          <BucketSection
            title="Utilization by Department"
            description="How each department is putting its assigned assets to work."
            icon={Building2}
            iconColor="#8b5cf6"
            buckets={data.byDepartment}
            chartHeight={Math.max(220, data.byDepartment.length * 36)}
          />

          {/* By Asset Type */}
          <BucketSection
            title="Utilization by Asset Type"
            description="Usage breakdown by asset category — spot types that are overstocked or underused."
            icon={Layers}
            iconColor="#0ea5e9"
            buckets={data.byAssetType}
            chartHeight={Math.max(220, data.byAssetType.length * 36)}
          />

          {/* Divider between asset-type section and idle assets */}
          <div className="gradient-divider-strong" aria-hidden />

          {/* Idle Assets */}
          <div className="space-y-3">
            <div className="section-accent-bar dot-pattern-bg rounded-lg px-3 py-2">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Timer className="h-5 w-5 text-amber-600" />
                Idle Assets
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Assets that have been sitting in stock without being assigned — candidates for redeployment or disposal.
              </p>
            </div>

            {data.idleAssets.length === 0 ? (
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      No idle assets at this threshold
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      {`Every in-stock asset has been put to use within the last ${idleThresholdDays} days. Try a higher threshold to surface longer-idle assets.`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <IdleAssetsTable
                assets={data.idleAssets}
                idleThresholdDays={idleThresholdDays}
                onReassign={setReassignAsset}
                onDispose={setDisposeAsset}
              />
            )}
          </div>

          {/* Footer summary */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
              <Package className="h-4 w-4 text-slate-500" />
              <span className="text-muted-foreground">Total assets:</span>
              <span className="ml-auto font-semibold tabular-nums">{overall.totalAssets}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-muted-foreground">In use:</span>
              <span className="ml-auto font-semibold tabular-nums">{overall.inUse}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <span className="text-muted-foreground">In stock:</span>
              <span className="ml-auto font-semibold tabular-nums">{overall.inStock}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span className="text-muted-foreground">Repair + Retired + Lost:</span>
              <span className="ml-auto font-semibold tabular-nums">
                {overall.repair + overall.retired + overall.lost}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Reassign / Dispose dialogs — mounted on demand */}
      {reassignAsset && (
        <ReassignDialog
          asset={reassignAsset}
          onClose={() => setReassignAsset(null)}
        />
      )}
      {disposeAsset && (
        <DisposeDialog
          asset={disposeAsset}
          onClose={() => setDisposeAsset(null)}
        />
      )}
    </div>
  )
}
