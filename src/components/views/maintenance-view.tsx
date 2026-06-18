'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi, assetsApi } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
  DialogTrigger,
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
import { MAINTENANCE_TYPES, MAINTENANCE_STATUSES, MAINTENANCE_STATUS_CONFIG } from '@/lib/types'
import { formatDate, formatCurrency, formatRelative } from '@/lib/format'
import {
  Wrench,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Pencil,
  Trash2,
  Filter,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

function StatTile({ label, value, icon: Icon, color, hint }: { label: string; value: number; icon: typeof Wrench; color: string; hint?: string }) {
  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1a` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function MaintenanceView() {
  const qc = useQueryClient()
  const { navigate } = useNav()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', filterStatus, filterType],
    queryFn: () => maintenanceApi.list({
      status: filterStatus === 'all' ? undefined : filterStatus,
      type: filterType === 'all' ? undefined : filterType,
      limit: 200,
    }),
  })

  const { data: upcoming } = useQuery({
    queryKey: ['maintenance-upcoming'],
    queryFn: () => maintenanceApi.upcoming(),
  })

  const stats = upcoming?.stats

  async function handleDelete(id: string) {
    if (!confirm('Delete this maintenance schedule?')) return
    try {
      await maintenanceApi.delete(id)
      toast.success('Maintenance deleted')
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      qc.invalidateQueries({ queryKey: ['maintenance-upcoming'] })
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  async function quickStatus(id: string, status: string) {
    try {
      const updates: Record<string, unknown> = { status }
      if (status === 'Completed') updates.completedAt = new Date().toISOString()
      await maintenanceApi.update(id, updates)
      toast.success(`Marked as ${status}`)
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      qc.invalidateQueries({ queryKey: ['maintenance-upcoming'] })
    } catch (e) {
      toast.error('Update failed: ' + String(e))
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Maintenance Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Plan and track preventive, corrective, and upgrade maintenance for assets.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1.5" /> Schedule Maintenance
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Total" value={stats?.total ?? 0} icon={Wrench} color="#0f172a" />
        <StatTile label="Scheduled" value={stats?.scheduled ?? 0} icon={Calendar} color="#0ea5e9" />
        <StatTile label="In Progress" value={stats?.inProgress ?? 0} icon={Activity} color="#f59e0b" />
        <StatTile label="Overdue" value={stats?.overdue ?? 0} icon={AlertTriangle} color="#f43f5e" hint="needs attention" />
        <StatTile label="Completed" value={stats?.completed ?? 0} icon={CheckCircle2} color="#10b981" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {MAINTENANCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {MAINTENANCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('all'); setFilterType('all') }}>
            <X className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Maintenance Records</CardTitle>
          <CardDescription>
            {data ? `${data.length} records` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Wrench className="h-8 w-8" />
                      <p>No maintenance records</p>
                      <Button size="sm" onClick={() => { setEditing(null); setShowForm(true) }}>
                        <Plus className="h-4 w-4 mr-1.5" /> Schedule first maintenance
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((m) => {
                  const cfg = MAINTENANCE_STATUS_CONFIG[m.status as keyof typeof MAINTENANCE_STATUS_CONFIG] || MAINTENANCE_STATUS_CONFIG.Scheduled
                  const isOverdue = m.status === 'Overdue' || (m.status === 'Scheduled' && new Date(m.scheduledFor) < new Date())
                  return (
                    <TableRow key={m.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="font-medium">{m.title}</div>
                        {m.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{m.description}</div>}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => navigate('asset-detail', { id: m.assetId })}
                          className="font-medium text-primary hover:underline"
                        >
                          {m.asset?.assetTag || '—'}
                        </button>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {m.asset?.make} {m.asset?.model}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(m.scheduledFor)}</div>
                        <div className="text-xs text-muted-foreground">{formatRelative(m.scheduledFor)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0 gap-1`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {m.status}
                        </Badge>
                        {isOverdue && m.status !== 'Completed' && (
                          <div className="text-[10px] text-rose-600 mt-0.5 flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{m.cost != null ? formatCurrency(m.cost) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {m.status !== 'Completed' && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => quickStatus(m.id, 'Completed')}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(m.id); setShowForm(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Form dialog */}
      <MaintenanceFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editingId={editing}
      />
    </div>
  )
}

function MaintenanceFormDialog({
  open,
  onOpenChange,
  editingId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId: string | null
}) {
  const qc = useQueryClient()
  const { data: assets } = useQuery({ queryKey: ['assets-all'], queryFn: () => assetsApi.list({ pageSize: 100, sortBy: 'assetTag', sortDir: 'asc' }) })
  const { data: editing } = useQuery({
    queryKey: ['maintenance', editingId],
    queryFn: () => maintenanceApi.list({ assetId: undefined }).then((all) => all.find((m) => m.id === editingId)),
    enabled: !!editingId,
  })

  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens
  useMemo(() => {
    if (open) {
      const sched = editing?.scheduledFor ? new Date(editing.scheduledFor).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
      setForm({
        assetId: editing?.assetId || '',
        title: editing?.title || '',
        description: editing?.description || '',
        type: editing?.type || 'Preventive',
        status: editing?.status || 'Scheduled',
        scheduledFor: sched,
        cost: editing?.cost ?? '',
        performedBy: editing?.performedBy || '',
        notes: editing?.notes || '',
      })
    }
  }, [open, editing])

  async function save() {
    if (!form.assetId || !form.title || !form.scheduledFor) {
      toast.error('Asset, title and scheduled date are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        assetId: String(form.assetId),
        title: String(form.title),
        scheduledFor: new Date(String(form.scheduledFor)).toISOString(),
        cost: form.cost ? Number(form.cost) : null,
      }
      if (editingId) {
        await maintenanceApi.update(editingId, payload)
        toast.success('Maintenance updated')
      } else {
        await maintenanceApi.create(payload)
        toast.success('Maintenance scheduled')
      }
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      qc.invalidateQueries({ queryKey: ['maintenance-upcoming'] })
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
          <DialogTitle>{editingId ? 'Edit Maintenance' : 'Schedule Maintenance'}</DialogTitle>
          <DialogDescription>
            {editingId ? 'Update maintenance details' : 'Plan a new maintenance activity for an asset'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Asset *</Label>
            <Select value={String(form.assetId || '')} onValueChange={(v) => setForm({ ...form, assetId: v })}>
              <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>
                {assets?.data.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.assetTag} — {a.make} {a.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input value={String(form.title || '')} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Quarterly preventive maintenance" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={String(form.type || 'Preventive')} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={String(form.status || 'Scheduled')} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Scheduled For *</Label>
              <Input type="date" value={String(form.scheduledFor || '')} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cost (USD)</Label>
              <Input type="number" step="0.01" value={String(form.cost ?? '')} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Performed By</Label>
            <Input value={String(form.performedBy || '')} onChange={(e) => setForm({ ...form, performedBy: e.target.value })} placeholder="Technician name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea rows={2} value={String(form.description || '')} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={String(form.notes || '')} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : (editingId ? 'Update' : 'Schedule')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
