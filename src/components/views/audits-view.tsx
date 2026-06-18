'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  auditsApi,
  assetTypesApi,
  departmentsApi,
  locationsApi,
} from '@/lib/api'
import type {
  AssetAudit,
  AssetAuditItem,
  AuditItemStatus,
  AuditScope,
  AuditStatus,
  AssetAuditCreatePayload,
} from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Download,
  Play,
  X,
  ArrowLeft,
  ScanLine,
  Loader2,
  Search,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatDateTime } from '@/lib/format'
import { EmptyState } from '@/components/empty-state'

// ===== Status helpers =====

const STATUS_BADGE_CLASS: Record<AuditStatus, string> = {
  Open: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  'In Progress':
    'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  Completed:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Cancelled:
    'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
}

const ITEM_STATUS_BADGE_CLASS: Record<AuditItemStatus, string> = {
  Pending: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  Verified:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Missing:
    'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  Found: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  Extra:
    'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
}

const STATUS_PULSE: Record<AuditStatus, boolean> = {
  Open: false,
  'In Progress': true,
  Completed: false,
  Cancelled: false,
}

function scopeLabel(scope: AuditScope): string {
  switch (scope) {
    case 'all':
      return 'All Assets'
    case 'location':
      return 'By Location'
    case 'department':
      return 'By Department'
    case 'type':
      return 'By Asset Type'
    default:
      return scope
  }
}

// ===== KPI tile =====

interface KpiTileProps {
  label: string
  value: number | string
  suffix?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  loading?: boolean
  pulse?: boolean
}

function KpiTile({ label, value, suffix, icon: Icon, color, loading, pulse }: KpiTileProps) {
  return (
    <Card className="hover-lift card-3d-tilt overflow-hidden border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-1.5 h-7 w-16 skeleton-shimmer" />
            ) : (
              <p
                className="animate-count-up mt-1 text-2xl font-bold tracking-tight tabular-nums"
                style={{ color }}
              >
                {value}
                {suffix && <span className="ml-0.5 text-sm font-medium">{suffix}</span>}
                {pulse && (
                  <span
                    className="status-pulse-dot ml-2 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                )}
              </p>
            )}
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

// ===== Mini stat card =====

function MiniStat({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string
  value: number
  color: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="hover-lift card-3d-tilt">
      <CardContent className="flex items-center gap-2 p-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${color}1a` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-lg font-bold tabular-nums" style={{ color }}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ===== Create Dialog =====

interface CreateDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (audit: AssetAudit) => void
}

function CreateDialog({ open, onOpenChange, onCreated }: CreateDialogProps) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState<AuditScope>('all')
  const [scopeId, setScopeId] = useState<string>('')
  const [notes, setNotes] = useState('')

  const locationsQ = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.list,
    enabled: scope === 'location' && open,
  })
  const deptsQ = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.list,
    enabled: scope === 'department' && open,
  })
  const typesQ = useQuery({
    queryKey: ['asset-types'],
    queryFn: assetTypesApi.list,
    enabled: scope === 'type' && open,
  })

  const createMut = useMutation({
    mutationFn: (payload: AssetAuditCreatePayload) => auditsApi.create(payload),
    onSuccess: (audit) => {
      toast.success(`Audit created — ${audit.auditNumber}`)
      qc.invalidateQueries({ queryKey: ['audits'] })
      onOpenChange(false)
      setTitle('')
      setScope('all')
      setScopeId('')
      setNotes('')
      onCreated(audit)
    },
    onError: (e: unknown) => {
      toast.error('Failed to create audit: ' + String(e))
    },
  })

  const canSubmit =
    title.trim().length > 0 &&
    (scope === 'all' || scopeId.length > 0) &&
    !createMut.isPending

  function handleSubmit() {
    if (!canSubmit) return
    createMut.mutate({
      title: title.trim(),
      scope,
      scopeId: scope === 'all' ? undefined : scopeId,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setTitle('')
          setScope('all')
          setScopeId('')
          setNotes('')
        }
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            New Asset Audit
          </DialogTitle>
          <DialogDescription>
            Start a physical inventory check. Expected items will be auto-populated from the chosen scope.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="audit-title">Title *</Label>
            <Input
              id="audit-title"
              placeholder="e.g. Q4 2026 Server Room Inventory"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-scope">Scope *</Label>
            <Select
              value={scope}
              onValueChange={(v) => {
                setScope(v as AuditScope)
                setScopeId('')
              }}
            >
              <SelectTrigger id="audit-scope">
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="location">By Location</SelectItem>
                <SelectItem value="department">By Department</SelectItem>
                <SelectItem value="type">By Asset Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'location' && (
            <div className="space-y-1.5">
              <Label htmlFor="audit-location">Location *</Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger id="audit-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {(locationsQ.data || []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === 'department' && (
            <div className="space-y-1.5">
              <Label htmlFor="audit-department">Department *</Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger id="audit-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {(deptsQ.data || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === 'type' && (
            <div className="space-y-1.5">
              <Label htmlFor="audit-type">Asset Type *</Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger id="audit-type">
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  {(typesQ.data || []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="audit-notes">Notes</Label>
            <Textarea
              id="audit-notes"
              placeholder="Optional context for this audit…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMut.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {createMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Audit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== Audit list row =====

interface AuditRowProps {
  audit: AssetAudit
  onView: (id: string) => void
}

function AuditRow({ audit, onView }: AuditRowProps) {
  const stats = audit.stats || {
    total: 0,
    verified: 0,
    missing: 0,
    found: 0,
    extra: 0,
    pending: 0,
    accuracyPct: 0,
  }
  const progressPct = stats.total > 0 ? (stats.verified / stats.total) * 100 : 0
  return (
    <TableRow
      className="hover-lift cursor-pointer"
      onClick={() => onView(audit.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onView(audit.id)
        }
      }}
    >
      <TableCell>
        <Badge variant="outline" className="font-mono text-[11px]">
          {audit.auditNumber}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[200px] truncate font-medium" title={audit.title}>
        {audit.title}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-[11px]">
          {scopeLabel(audit.scope)}
          {audit.scopeName ? `: ${audit.scopeName}` : ''}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={STATUS_BADGE_CLASS[audit.status]}>
          {STATUS_PULSE[audit.status] && (
            <span
              className="status-pulse-dot mr-1 inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'currentColor' }}
              aria-hidden="true"
            />
          )}
          {audit.status}
        </Badge>
      </TableCell>
      <TableCell className="min-w-[120px]">
        <div className="flex items-center gap-2">
          <Progress value={progressPct} className="h-2 flex-1" />
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {stats.verified}/{stats.total}
          </span>
        </div>
      </TableCell>
      <TableCell className="tabular-nums">
        {stats.accuracyPct.toFixed(1)}%
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatDate(audit.startedAt || audit.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onView(audit.id)
          }}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  )
}

// ===== Audit list section =====

interface AuditListProps {
  onOpenCreate: () => void
  onSelect: (id: string) => void
}

function AuditList({ onOpenCreate, onSelect }: AuditListProps) {
  const listQ = useQuery({
    queryKey: ['audits'],
    queryFn: auditsApi.list,
  })

  const kpis = useMemo(() => {
    const audits = listQ.data || []
    const total = audits.length
    const inProgress = audits.filter((a) => a.status === 'In Progress' || a.status === 'Open').length
    const completed = audits.filter((a) => a.status === 'Completed').length
    const completedWithStats = audits.filter((a) => a.status === 'Completed' && a.stats)
    const avgAccuracy =
      completedWithStats.length > 0
        ? completedWithStats.reduce((s, a) => s + (a.stats?.accuracyPct || 0), 0) /
          completedWithStats.length
        : 0
    return { total, inProgress, completed, avgAccuracy }
  }, [listQ.data])

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Total Audits"
          value={kpis.total}
          icon={ClipboardCheck}
          color="#0ea5e9"
          loading={listQ.isLoading}
        />
        <KpiTile
          label="In Progress"
          value={kpis.inProgress}
          icon={Play}
          color="#f59e0b"
          loading={listQ.isLoading}
          pulse={kpis.inProgress > 0}
        />
        <KpiTile
          label="Completed"
          value={kpis.completed}
          icon={CheckCircle2}
          color="#10b981"
          loading={listQ.isLoading}
        />
        <KpiTile
          label="Avg Accuracy"
          value={kpis.avgAccuracy.toFixed(1)}
          suffix="%"
          icon={History}
          color="#8b5cf6"
          loading={listQ.isLoading}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="section-accent-bar text-sm font-semibold text-foreground">
            All Audits
          </h2>
        </div>

        <Card>
          <CardContent className="p-0">
            {listQ.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full skeleton-shimmer" />
                ))}
              </div>
            ) : listQ.error ? (
              <div className="p-8 text-center text-sm text-destructive">
                Failed to load audits: {String(listQ.error)}
              </div>
            ) : (listQ.data || []).length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No audits yet"
                description="Create your first audit to start tracking inventory."
                action={{
                  label: 'New Audit',
                  onClick: onOpenCreate,
                  icon: Plus,
                }}
              />
            ) : (
              <div className="scrollbar-thin overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Audit #</TableHead>
                      <TableHead className="text-xs">Title</TableHead>
                      <TableHead className="text-xs">Scope</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Progress</TableHead>
                      <TableHead className="text-xs">Accuracy</TableHead>
                      <TableHead className="text-xs">Started</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(listQ.data || []).map((a) => (
                      <AuditRow key={a.id} audit={a} onView={onSelect} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

// ===== Audit Detail =====

interface AuditDetailProps {
  auditId: string
  onBack: () => void
}

const ITEM_FILTERS: { key: 'All' | AuditItemStatus; label: string; color: string }[] = [
  { key: 'All', label: 'All', color: '#64748b' },
  { key: 'Verified', label: 'Verified', color: '#10b981' },
  { key: 'Missing', label: 'Missing', color: '#f43f5e' },
  { key: 'Pending', label: 'Pending', color: '#64748b' },
  { key: 'Found', label: 'Found', color: '#0ea5e9' },
  { key: 'Extra', label: 'Extra', color: '#8b5cf6' },
]

function AuditDetail({ auditId, onBack }: AuditDetailProps) {
  const qc = useQueryClient()
  const [scanInput, setScanInput] = useState('')
  const [filter, setFilter] = useState<'All' | AuditItemStatus>('All')
  const [showComplete, setShowComplete] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [search, setSearch] = useState('')

  const detailQ = useQuery({
    queryKey: ['audit', auditId],
    queryFn: () => auditsApi.get(auditId),
    enabled: !!auditId,
  })

  const scanMut = useMutation({
    mutationFn: (payload: { assetTag?: string; assetId?: string }) =>
      auditsApi.scan(auditId, payload),
    onSuccess: (res) => {
      if (res.wasExpected && res.newlyVerified) {
        toast.success(`✓ Verified: ${res.item.assetTag || 'asset'}`)
      } else if (res.wasExpected && !res.newlyVerified) {
        toast.info(`Already verified: ${res.item.assetTag || 'asset'}`)
      } else if (!res.wasExpected) {
        toast.warning(
          `⚠ Extra asset added: ${res.item.assetTag || 'asset'} (not on expected list)`
        )
      }
      setScanInput('')
      qc.invalidateQueries({ queryKey: ['audit', auditId] })
      qc.invalidateQueries({ queryKey: ['audits'] })
    },
    onError: (e: unknown) => {
      toast.error(String(e))
    },
  })

  const markMissingMut = useMutation({
    mutationFn: (assetId: string) =>
      auditsApi.scan(auditId, { assetId, status: 'Missing' }),
    onSuccess: (res) => {
      toast.info(`Marked as Missing: ${res.item.assetTag || 'asset'}`)
      qc.invalidateQueries({ queryKey: ['audit', auditId] })
      qc.invalidateQueries({ queryKey: ['audits'] })
    },
    onError: (e: unknown) => {
      toast.error(String(e))
    },
  })

  const completeMut = useMutation({
    mutationFn: () => auditsApi.complete(auditId),
    onSuccess: () => {
      toast.success('Audit completed')
      setShowComplete(false)
      qc.invalidateQueries({ queryKey: ['audit', auditId] })
      qc.invalidateQueries({ queryKey: ['audits'] })
    },
    onError: (e: unknown) => {
      toast.error(String(e))
    },
  })

  const cancelMut = useMutation({
    mutationFn: () => auditsApi.cancel(auditId),
    onSuccess: () => {
      toast.success('Audit cancelled')
      setShowCancel(false)
      qc.invalidateQueries({ queryKey: ['audit', auditId] })
      qc.invalidateQueries({ queryKey: ['audits'] })
    },
    onError: (e: unknown) => {
      toast.error(String(e))
    },
  })

  if (detailQ.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 skeleton-shimmer" />
        <Skeleton className="h-24 w-full skeleton-shimmer" />
        <Skeleton className="h-12 w-full skeleton-shimmer" />
        <Skeleton className="h-64 w-full skeleton-shimmer" />
      </div>
    )
  }

  if (detailQ.error || !detailQ.data) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Audits
        </Button>
        <EmptyState
          icon={AlertTriangle}
          title="Audit not found"
          description="This audit may have been deleted, or the link is invalid."
        />
      </div>
    )
  }

  const { audit, items } = detailQ.data
  const stats = audit.stats || {
    total: 0,
    verified: 0,
    missing: 0,
    found: 0,
    extra: 0,
    pending: 0,
    accuracyPct: 0,
  }
  const isActive = audit.status === 'Open' || audit.status === 'In Progress'
  const progressPct = stats.total > 0 ? (stats.verified / stats.total) * 100 : 0

  const filteredItems = items.filter((it) => {
    if (filter !== 'All' && it.status !== filter) return false
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      const hay = `${it.assetTag || ''} ${it.assetName || ''} ${it.assetTypeName || ''} ${it.scannedByName || ''}`.toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  // Per-filter counts
  const filterCounts: Record<string, number> = {
    All: items.length,
    Verified: 0,
    Missing: 0,
    Pending: 0,
    Found: 0,
    Extra: 0,
  }
  for (const it of items) filterCounts[it.status] = (filterCounts[it.status] || 0) + 1

  function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = scanInput.trim()
    if (!v) return
    scanMut.mutate({ assetTag: v })
  }

  function handleExport() {
    window.open(auditsApi.exportCsvUrl(auditId), '_blank')
    toast.success('Exporting CSV…')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Header */}
      <Card className="hover-lift bg-radial-spotlight">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px] badge-shine">
                {audit.auditNumber}
              </Badge>
              <Badge variant="outline" className={STATUS_BADGE_CLASS[audit.status]}>
                {STATUS_PULSE[audit.status] && (
                  <span
                    className="status-pulse-dot mr-1 inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'currentColor' }}
                    aria-hidden="true"
                  />
                )}
                {audit.status}
              </Badge>
              <Badge variant="secondary" className="text-[11px]">
                {scopeLabel(audit.scope)}
                {audit.scopeName ? `: ${audit.scopeName}` : ''}
              </Badge>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground shimmer-underline">
              {audit.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground/70">Started:</span>{' '}
                {formatDateTime(audit.startedAt || audit.createdAt)}
              </span>
              {audit.completedAt && (
                <span>
                  <span className="font-medium text-foreground/70">Completed:</span>{' '}
                  {formatDateTime(audit.completedAt)}
                </span>
              )}
              {audit.startedByName && (
                <span>
                  <span className="font-medium text-foreground/70">Started by:</span>{' '}
                  {audit.startedByName}
                </span>
              )}
              {audit.notes && (
                <span className="italic">“{audit.notes}”</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            {isActive && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancel(true)}
                  className="text-rose-700 dark:text-rose-300"
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Cancel Audit
                </Button>
                <Button size="sm" onClick={() => setShowComplete(true)}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Complete Audit
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress + mini stats */}
      <section>
        <h2 className="section-accent-bar mb-3 text-sm font-semibold text-foreground">
          Progress
        </h2>
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-foreground/80">
                  {stats.verified} of {stats.total} verified
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {progressPct.toFixed(1)}% · Accuracy {stats.accuracyPct.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={progressPct}
                className="h-3 [&>div]:bg-emerald-500 progress-stripes"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <MiniStat label="Total" value={stats.total} color="#64748b" icon={Package} />
              <MiniStat label="Verified" value={stats.verified} color="#10b981" icon={CheckCircle2} />
              <MiniStat label="Missing" value={stats.missing} color="#f43f5e" icon={XCircle} />
              <MiniStat label="Found" value={stats.found} color="#0ea5e9" icon={Search} />
              <MiniStat label="Extra" value={stats.extra} color="#8b5cf6" icon={AlertTriangle} />
              <MiniStat label="Pending" value={stats.pending} color="#94a3b8" icon={History} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Scan section */}
      {isActive && (
        <section>
          <h2 className="section-accent-bar mb-3 text-sm font-semibold text-foreground">
            Scan Asset
          </h2>
          <Card>
            <CardContent className="p-5">
              <form onSubmit={handleScanSubmit} className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Scan or type asset tag, then press Enter…"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="pl-9 font-mono"
                    autoComplete="off"
                    autoFocus
                    aria-label="Asset tag input"
                    disabled={scanMut.isPending}
                  />
                </div>
                <Button type="submit" disabled={!scanInput.trim() || scanMut.isPending}>
                  {scanMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                  )}
                  Scan
                </Button>
              </form>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Tip: scanning an expected asset marks it <span className="font-medium text-emerald-700 dark:text-emerald-300">Verified</span>. Scanning an asset not on the list adds it as <span className="font-medium text-violet-700 dark:text-violet-300">Extra</span>.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Items table */}
      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-accent-bar text-sm font-semibold text-foreground">
            Items ({items.length})
          </h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
              aria-label="Search items"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {ITEM_FILTERS.map((f) => {
            const count = filterCounts[f.key] || 0
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  active
                    ? 'border-foreground/30 bg-foreground/5 text-foreground'
                    : 'border-border/60 bg-transparent text-muted-foreground hover:bg-muted/40'
                }`}
                style={active ? { borderColor: `${f.color}55` } : undefined}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: f.color }}
                  aria-hidden="true"
                />
                {f.label}
                <span className="rounded bg-muted/60 px-1 tabular-nums">{count}</span>
              </button>
            )
          })}
        </div>

        <Card>
          <CardContent className="p-0">
            {filteredItems.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No items"
                description={
                  items.length === 0
                    ? 'This audit has no expected items yet.'
                    : 'No items match the current filter.'
                }
              />
            ) : (
              <div className="scrollbar-thin max-h-[500px] overflow-y-auto overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="text-xs">Asset Tag</TableHead>
                      <TableHead className="text-xs">Asset Name</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Expected</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Scanned At</TableHead>
                      <TableHead className="text-xs">Scanned By</TableHead>
                      <TableHead className="text-xs">Notes</TableHead>
                      <TableHead className="text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((it) => (
                      <TableRow key={it.id} className="hover-lift">
                        <TableCell className="font-mono font-medium">
                          {it.assetTag || '—'}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={it.assetName || ''}>
                          {it.assetName || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.assetTypeName || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              it.expected
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]'
                                : 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 text-[10px]'
                            }
                          >
                            {it.expected ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${ITEM_STATUS_BADGE_CLASS[it.status]} text-[10px]`}
                          >
                            {it.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.scannedAt ? formatDateTime(it.scannedAt) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.scannedByName || '—'}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground" title={it.notes || ''}>
                          {it.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {it.status === 'Pending' && it.assetId && isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
                              onClick={() => markMissingMut.mutate(it.assetId!)}
                              disabled={markMissingMut.isPending}
                              aria-label={`Mark ${it.assetTag || 'asset'} as missing`}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Mark Missing
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Complete confirm */}
      <AlertDialog open={showComplete} onOpenChange={setShowComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this audit?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark all unscanned items as Missing and complete this audit? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completeMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                completeMut.mutate()
              }}
              disabled={completeMut.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {completeMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              Complete Audit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirm */}
      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this audit?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel this audit? Expected items will remain Pending.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMut.isPending}>Keep Audit</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                cancelMut.mutate()
              }}
              disabled={cancelMut.isPending}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {cancelMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-1.5 h-4 w-4" />
              )}
              Cancel Audit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ===== Main view =====

export function AuditsView() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-5">
      <header className="bg-radial-spotlight flex flex-col gap-3 rounded-xl border border-border/60 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground shimmer-underline">
            Asset Audits
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conduct periodic physical inventory checks
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="hover-ripple">
          <Plus className="mr-2 h-4 w-4" />
          New Audit
        </Button>
      </header>

      {selectedId ? (
        <AuditDetail auditId={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <AuditList onOpenCreate={() => setCreateOpen(true)} onSelect={setSelectedId} />
      )}

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(audit) => setSelectedId(audit.id)}
      />
    </div>
  )
}
