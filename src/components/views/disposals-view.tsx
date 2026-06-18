'use client'

import { useState, useMemo, type ReactNode, createElement } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { disposalsApi, assetsApi, personsApi } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, formatRelative, formatDateTime } from '@/lib/format'
import {
  DISPOSAL_METHODS,
  DISPOSAL_METHOD_CONFIG,
} from '@/lib/types'
import type { AssetDisposal, DisposalMethod, Asset } from '@/lib/types'
import {
  Trash2,
  DollarSign,
  TrendingDown,
  Clock,
  Plus,
  Pencil,
  Eye,
  Search,
  CheckCircle2,
  AlertTriangle,
  Recycle,
  Gift,
  Undo2,
  ArrowLeftRight,
  Trash,
  Calendar,
  UserCheck,
  FileText,
  ShieldCheck,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'

// Map method-config icon string names to Lucide components
const METHOD_ICONS: Record<string, typeof Trash2> = {
  DollarSign,
  Recycle,
  Gift,
  Trash2,
  Undo2,
  ArrowLeftRight,
  Trash,
}

function getMethodIcon(method: string) {
  const cfg = DISPOSAL_METHOD_CONFIG[method as DisposalMethod]
  if (!cfg) return Trash2
  return METHOD_ICONS[cfg.icon] || Trash2
}

function StatTile({
  label,
  value,
  icon: Icon,
  color,
  hint,
}: {
  label: string
  value: string | number
  icon: typeof Clock
  color: string
  hint?: string
}) {
  return (
    <Card className="overflow-hidden border-l-4 card-hover" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums truncate">{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1a` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MethodBadge({ method }: { method: string }) {
  const cfg = DISPOSAL_METHOD_CONFIG[method as DisposalMethod]
  if (!cfg) {
    return <Badge variant="outline">{method}</Badge>
  }
  const iconComp = getMethodIcon(method)
  return (
    <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0 gap-1 whitespace-nowrap`}>
      {createElement(iconComp, { className: 'h-3 w-3' })}
      {method}
    </Badge>
  )
}

function NetProceedsValue({ value }: { value: number }) {
  const positive = value >= 0
  return (
    <span className={`font-semibold tabular-nums ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {formatCurrency(value)}
    </span>
  )
}

export function DisposalsView() {
  const qc = useQueryClient()
  const { navigate } = useNav()
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: disposals, isLoading } = useQuery({
    queryKey: ['disposals'],
    queryFn: () => disposalsApi.list(),
  })

  const filtered = useMemo(() => {
    if (!disposals) return []
    return disposals.filter((d) => {
      if (methodFilter !== 'all' && d.method !== methodFilter) return false
      if (search) {
        const s = search.toLowerCase()
        const assetMatch = d.asset
          ? `${d.asset.make || ''} ${d.asset.model || ''} ${d.asset.assetTag || ''}`.toLowerCase().includes(s)
          : false
        const numMatch = (d.disposalNumber || '').toLowerCase().includes(s)
        const buyerMatch = (d.buyerRecipient || '').toLowerCase().includes(s)
        if (!assetMatch && !numMatch && !buyerMatch) return false
      }
      return true
    })
  }, [disposals, search, methodFilter])

  const stats = useMemo(() => {
    if (!disposals) return { total: 0, recovered: 0, cost: 0, pending: 0 }
    const recoveryMethods = ['Sold', 'Trade-in', 'Recycled']
    return {
      total: disposals.length,
      recovered: disposals
        .filter((d) => recoveryMethods.includes(d.method))
        .reduce((s, d) => s + (d.netProceeds || 0), 0),
      cost: disposals.reduce((s, d) => s + (d.disposalCost || 0), 0),
      pending: disposals.filter((d) => !d.approvedById).length,
    }
  }, [disposals])

  const viewing = disposals?.find((d) => d.id === viewingId) || null
  const deleting = disposals?.find((d) => d.id === deleteId) || null

  async function handleDelete(id: string) {
    try {
      await disposalsApi.delete(id)
      toast.success('Disposal record deleted')
      qc.invalidateQueries({ queryKey: ['disposals'] })
      setDeleteId(null)
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Asset Disposals</h2>
          <p className="text-sm text-muted-foreground">
            Track retired, sold, recycled, and donated assets.
          </p>
        </div>
        <Button onClick={() => { setEditingId(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1.5" /> Record Disposal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Disposals" value={stats.total} icon={Trash2} color="#64748b" />
        <StatTile
          label="Total Recovered"
          value={formatCurrency(stats.recovered)}
          icon={DollarSign}
          color="#10b981"
          hint="Sold · Trade-in · Recycled"
        />
        <StatTile label="Disposal Cost" value={formatCurrency(stats.cost)} icon={TrendingDown} color="#f43f5e" />
        <StatTile
          label="Pending Approval"
          value={stats.pending}
          icon={Clock}
          color="#f59e0b"
          hint="awaiting approver"
        />
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search disposal #, asset, or recipient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Method</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {DISPOSAL_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Disposals</CardTitle>
          <CardDescription>
            {filtered.length} of {disposals?.length ?? 0} records
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disposal #</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Residual</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Buyer / Recipient</TableHead>
                <TableHead className="text-center">Env.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Trash2 className="h-8 w-8" />
                      <p>No disposal records found</p>
                      <Button size="sm" onClick={() => { setEditingId(null); setShowForm(true) }}>
                        <Plus className="h-4 w-4 mr-1.5" /> Record your first disposal
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/40">
                    <TableCell>
                      <span className="font-mono font-semibold text-xs">
                        {d.disposalNumber || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => d.asset && navigate('asset-detail', { id: d.assetId })}
                        className="text-left font-medium text-primary hover:underline"
                      >
                        {(d.asset?.make || '') + ' ' + (d.asset?.model || '')}
                      </button>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {d.asset?.assetTag || '—'}
                      </div>
                    </TableCell>
                    <TableCell><MethodBadge method={d.method} /></TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(d.disposalDate)}</div>
                      <div className="text-[10px] text-muted-foreground">{formatRelative(d.disposalDate)}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(d.residualValue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(d.disposalCost)}</TableCell>
                    <TableCell className="text-right"><NetProceedsValue value={d.netProceeds} /></TableCell>
                    <TableCell className="max-w-[180px]">
                      <p className="text-sm truncate">{d.buyerRecipient || '—'}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      {d.environmentalCompliant ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-500 inline" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewingId(d.id)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => { setEditingId(d.id); setShowForm(true) }}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteId(d.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* View detail dialog */}
      <Dialog open={!!viewingId} onOpenChange={(v) => !v && setViewingId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Disposal Details</DialogTitle>
            <DialogDescription>
              {viewing?.disposalNumber ? `Record ${viewing.disposalNumber}` : 'Disposal record'}
            </DialogDescription>
          </DialogHeader>
          {viewing && <DisposalDetail disposal={viewing} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingId(null)}>Close</Button>
            <Button
              onClick={() => {
                setEditingId(viewing?.id || null)
                setViewingId(null)
                setShowForm(true)
              }}
            >
              <Pencil className="h-4 w-4 mr-1.5" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit form dialog */}
      <DisposalFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editingId={editingId}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" /> Delete Disposal Record
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the disposal record
              {deleting?.disposalNumber ? ` ${deleting.disposalNumber}` : ''}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleting && (
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <div className="font-medium">{deleting.asset?.make} {deleting.asset?.model}</div>
              <div className="text-xs text-muted-foreground font-mono">{deleting.asset?.assetTag}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Method: {deleting.method} · Net Proceeds: {formatCurrency(deleting.netProceeds)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: ReactNode
  icon?: typeof Trash2
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="text-sm text-right max-w-[60%]">{value || '—'}</div>
    </div>
  )
}

function DisposalDetail({ disposal }: { disposal: AssetDisposal }) {
  const { navigate } = useNav()
  const netPositive = disposal.netProceeds >= 0
  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
      {/* Top: Number + Method + Date */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Disposal Number</div>
          <div className="font-mono font-bold text-base">{disposal.disposalNumber || '—'}</div>
        </div>
        <Separator orientation="vertical" className="h-10" />
        <div>
          <div className="text-xs text-muted-foreground">Method</div>
          <div className="mt-1"><MethodBadge method={disposal.method} /></div>
        </div>
        <Separator orientation="vertical" className="h-10" />
        <div>
          <div className="text-xs text-muted-foreground">Disposal Date</div>
          <div className="text-sm font-medium">{formatDate(disposal.disposalDate)}</div>
        </div>
      </div>

      {/* Asset card */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
          <Package className="h-3 w-3" /> Asset
        </div>
        <button
          onClick={() => disposal.asset && navigate('asset-detail', { id: disposal.assetId })}
          className="text-left"
        >
          <div className="font-medium text-primary hover:underline">
            {disposal.asset?.make} {disposal.asset?.model}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{disposal.asset?.assetTag || '—'}</div>
        </button>
      </div>

      {/* Financials */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-l-4" style={{ borderLeftColor: '#0ea5e9' }}>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Residual Value</div>
            <div className="text-lg font-semibold tabular-nums mt-0.5">
              {formatCurrency(disposal.residualValue)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: '#f43f5e' }}>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Disposal Cost</div>
            <div className="text-lg font-semibold tabular-nums mt-0.5">
              {formatCurrency(disposal.disposalCost)}
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-l-4 ${netPositive ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}
          style={{ borderLeftColor: netPositive ? '#10b981' : '#f43f5e' }}
        >
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Net Proceeds</div>
            <div className={`text-lg font-bold tabular-nums mt-0.5 ${netPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(disposal.netProceeds)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reason */}
      {disposal.reason && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Reason</div>
          <p className="text-sm bg-muted/30 rounded-md p-2">{disposal.reason}</p>
        </div>
      )}

      {/* Buyer + Condition */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailRow label="Buyer / Recipient" value={disposal.buyerRecipient} icon={UserCheck} />
        <DetailRow label="Condition at Disposal" value={disposal.conditionAtDisposal} />
      </div>

      <Separator />

      {/* Compliance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          {disposal.environmentalCompliant ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          )}
          <div>
            <div className="text-xs text-muted-foreground">Environmental Compliance</div>
            <div className={`text-sm font-medium ${disposal.environmentalCompliant ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {disposal.environmentalCompliant ? 'Compliant' : 'Non-compliant'}
            </div>
          </div>
        </div>
        <DetailRow
          label="Certificate #"
          value={disposal.certificateNumber ? <span className="font-mono text-xs">{disposal.certificateNumber}</span> : null}
          icon={FileText}
        />
      </div>

      <Separator />

      {/* Approval + Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DetailRow
          label="Approved By"
          value={
            disposal.approvedBy ? (
              <div>
                <div className="font-medium">{disposal.approvedBy.fullName}</div>
                {disposal.approvedAt && (
                  <div className="text-[10px] text-muted-foreground">{formatDateTime(disposal.approvedAt)}</div>
                )}
              </div>
            ) : <span className="text-amber-600 dark:text-amber-400">Pending approval</span>
          }
          icon={ShieldCheck}
        />
        <DetailRow label="Record Created" value={formatRelative(disposal.createdAt)} icon={Calendar} />
      </div>

      {disposal.notes && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Notes</div>
          <p className="text-sm bg-muted/30 rounded-md p-2 whitespace-pre-wrap">{disposal.notes}</p>
        </div>
      )}
    </div>
  )
}

function DisposalFormDialog({
  open,
  onOpenChange,
  editingId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId: string | null
}) {
  const qc = useQueryClient()
  const { data: disposals } = useQuery({ queryKey: ['disposals'], queryFn: () => disposalsApi.list() })
  const { data: assetsData } = useQuery({
    queryKey: ['assets-all'],
    queryFn: () => assetsApi.list({ pageSize: 200, sortBy: 'assetTag', sortDir: 'asc' }),
  })
  const { data: persons } = useQuery({ queryKey: ['persons'], queryFn: () => personsApi.list() })

  const editing = disposals?.find((d) => d.id === editingId)

  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  useMemo(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10)
      setForm({
        assetId: editing?.assetId || '',
        method: editing?.method || 'Disposed',
        disposalDate: editing?.disposalDate ? editing.disposalDate.slice(0, 10) : today,
        reason: editing?.reason || '',
        residualValue: editing?.residualValue ?? '',
        disposalCost: editing?.disposalCost ?? '',
        buyerRecipient: editing?.buyerRecipient || '',
        conditionAtDisposal: editing?.conditionAtDisposal || '',
        environmentalCompliant: editing?.environmentalCompliant ?? true,
        certificateNumber: editing?.certificateNumber || '',
        approvedById: editing?.approvedById || '',
        notes: editing?.notes || '',
      })
    }
  }, [open, editing])

  const availableAssets = useMemo(() => {
    if (!assetsData?.data) return [] as Asset[]
    if (editing) return assetsData.data
    return assetsData.data.filter((a) => a.status !== 'Retired')
  }, [assetsData, editing])

  const residualValue = Number(form.residualValue) || 0
  const disposalCost = Number(form.disposalCost) || 0
  const netPreview = residualValue - disposalCost

  const method = String(form.method || '')
  const certRequired = method === 'Recycled' || method === 'Scrapped'

  async function save() {
    if (!form.assetId) {
      toast.error('Please select an asset')
      return
    }
    if (!form.method) {
      toast.error('Please select a disposal method')
      return
    }
    if (certRequired && !form.certificateNumber) {
      toast.error(`Certificate number is required for ${method} disposals`)
      return
    }
    setSaving(true)
    try {
      const payload: Partial<AssetDisposal> = {
        assetId: String(form.assetId),
        method: String(form.method),
        disposalDate: new Date(String(form.disposalDate)).toISOString(),
        reason: form.reason ? String(form.reason) : null,
        residualValue: Number(form.residualValue) || 0,
        disposalCost: Number(form.disposalCost) || 0,
        buyerRecipient: form.buyerRecipient ? String(form.buyerRecipient) : null,
        conditionAtDisposal: form.conditionAtDisposal ? String(form.conditionAtDisposal) : null,
        environmentalCompliant: !!form.environmentalCompliant,
        certificateNumber: form.certificateNumber ? String(form.certificateNumber) : null,
        approvedById: form.approvedById ? String(form.approvedById) : null,
        notes: form.notes ? String(form.notes) : null,
      }
      if (editingId) {
        await disposalsApi.update(editingId, payload)
        toast.success('Disposal record updated')
      } else {
        await disposalsApi.create(payload)
        toast.success('Disposal recorded. Asset marked as Retired.')
      }
      qc.invalidateQueries({ queryKey: ['disposals'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
      onOpenChange(false)
    } catch (e) {
      toast.error('Save failed: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit Disposal' : 'Record Disposal'}</DialogTitle>
          <DialogDescription>
            {editingId
              ? 'Update disposal record details'
              : 'Dispose of an asset. The asset will be marked as Retired automatically.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[65vh] overflow-y-auto scrollbar-thin pr-1">
          {/* Asset + Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Asset *</Label>
              <Select
                value={String(form.assetId || '')}
                onValueChange={(v) => setForm({ ...form, assetId: v })}
                disabled={!!editingId}
              >
                <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent>
                  {availableAssets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.assetTag} — {a.make} {a.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingId && (
                <p className="text-[10px] text-muted-foreground">Asset cannot be changed after disposal.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Method *</Label>
              <Select value={String(form.method || 'Disposed')} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISPOSAL_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Disposal date + buyer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Disposal Date *</Label>
              <Input
                type="date"
                value={String(form.disposalDate || '')}
                onChange={(e) => setForm({ ...form, disposalDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Buyer / Recipient</Label>
              <Input
                value={String(form.buyerRecipient || '')}
                onChange={(e) => setForm({ ...form, buyerRecipient: e.target.value })}
                placeholder="e.g., GreenTech Recyclers LLC"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Textarea
              rows={2}
              value={String(form.reason || '')}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="End of useful life, hardware failure, upgrade cycle..."
            />
          </div>

          {/* Financials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Residual Value</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={String(form.residualValue ?? '')}
                onChange={(e) => setForm({ ...form, residualValue: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Disposal Cost</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={String(form.disposalCost ?? '')}
                onChange={(e) => setForm({ ...form, disposalCost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Net Proceeds</Label>
              <div className={`flex h-9 items-center rounded-md border px-3 text-sm font-semibold tabular-nums ${netPreview >= 0 ? 'border-emerald-200 bg-emerald-500/5 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400' : 'border-rose-200 bg-rose-500/5 text-rose-700 dark:border-rose-800 dark:text-rose-400'}`}>
                {formatCurrency(netPreview)}
              </div>
              <p className="text-[10px] text-muted-foreground">Auto-calculated: residual − cost</p>
            </div>
          </div>

          {/* Condition + Certificate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Condition at Disposal</Label>
              <Input
                value={String(form.conditionAtDisposal || '')}
                onChange={(e) => setForm({ ...form, conditionAtDisposal: e.target.value })}
                placeholder="Poor, Fair, Broken..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Certificate #{certRequired ? '*' : ''}
              </Label>
              <Input
                value={String(form.certificateNumber || '')}
                onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })}
                placeholder={certRequired ? 'Required for Recycled / Scrapped' : 'Optional certificate or reference #'}
                className="font-mono"
              />
              {certRequired && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  Required for {method} disposals (environmental compliance)
                </p>
              )}
            </div>
          </div>

          {/* Compliance + Approver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-xs">Environmental Compliant</Label>
                <p className="text-[10px] text-muted-foreground">Follows e-waste regulations</p>
              </div>
              <Switch
                checked={!!form.environmentalCompliant}
                onCheckedChange={(v) => setForm({ ...form, environmentalCompliant: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Approved By (optional)</Label>
              <Select
                value={String(form.approvedById || 'none')}
                onValueChange={(v) => setForm({ ...form, approvedById: v === 'none' ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {persons?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName} {p.role ? `(${p.role})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              rows={2}
              value={String(form.notes || '')}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional context or reference info..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : (editingId ? 'Update Disposal' : 'Record Disposal')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
