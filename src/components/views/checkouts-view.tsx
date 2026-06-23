'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { checkoutApi, assetsApi, personsApi } from '@/lib/api'
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
import { CHECKOUT_STATUSES, CHECKOUT_STATUS_CONFIG } from '@/lib/types'
import { formatDate, formatRelative, formatDateTime } from '@/lib/format'
import {
  ArrowLeftRight,
  Plus,
  Check,
  X,
  ArrowUpFromLine,
  ArrowDownToLine,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'

function StatTile({ label, value, icon: Icon, color, hint }: { label: string; value: number; icon: typeof Clock; color: string; hint?: string }) {
  return (
    <Card className="overflow-hidden border-l-4 shadow-soft" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
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

export function CheckoutsView() {
  const qc = useQueryClient()
  const { navigate } = useNav()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [approverModal, setApproverModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [decisionNotes, setDecisionNotes] = useState('')

  const { data: persons } = useQuery({ queryKey: ['persons'], queryFn: () => personsApi.list() })

  const { data, isLoading } = useQuery({
    queryKey: ['checkouts', statusFilter],
    queryFn: () => checkoutApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 200,
    }),
  })

  const stats = useMemo(() => {
    if (!data) return { total: 0, pending: 0, approved: 0, checkedOut: 0, overdue: 0, rejected: 0 }
    return {
      total: data.length,
      pending: data.filter((c) => c.status === 'Pending').length,
      approved: data.filter((c) => c.status === 'Approved').length,
      checkedOut: data.filter((c) => c.status === 'Checked Out').length,
      overdue: data.filter((c) => {
        if (c.status !== 'Checked Out' || !c.requestedReturnDate) return false
        return new Date(c.requestedReturnDate) < new Date()
      }).length,
      rejected: data.filter((c) => c.status === 'Rejected').length,
    }
  }, [data])

  async function handleApprove(id: string) {
    try {
      // Find an IT person (prefer IT Manager role) as the approver
      const approver = persons?.find((p) => p.role === 'IT Manager') || persons?.[0]
      if (!approver) {
        toast.error('No approver available')
        return
      }
      await checkoutApi.approve(id, approver.id, decisionNotes || undefined)
      toast.success('Request approved')
      qc.invalidateQueries({ queryKey: ['checkouts'] })
      setApproverModal(null)
      setDecisionNotes('')
    } catch (e) {
      toast.error('Approve failed: ' + String(e))
    }
  }

  async function handleReject(id: string) {
    try {
      const approver = persons?.find((p) => p.role === 'IT Manager') || persons?.[0]
      if (!approver) {
        toast.error('No approver available')
        return
      }
      await checkoutApi.reject(id, approver.id, decisionNotes || undefined)
      toast.success('Request rejected')
      qc.invalidateQueries({ queryKey: ['checkouts'] })
      setApproverModal(null)
      setDecisionNotes('')
    } catch (e) {
      toast.error('Reject failed: ' + String(e))
    }
  }

  async function handleCheckOut(id: string) {
    try {
      await checkoutApi.checkOut(id)
      toast.success('Asset checked out')
      qc.invalidateQueries({ queryKey: ['checkouts'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    } catch (e) {
      toast.error('Check-out failed: ' + String(e))
    }
  }

  async function handleCheckIn(id: string) {
    try {
      await checkoutApi.checkIn(id, 'Good condition')
      toast.success('Asset checked in')
      qc.invalidateQueries({ queryKey: ['checkouts'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    } catch (e) {
      toast.error('Check-in failed: ' + String(e))
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Check-out Requests</h2>
          <p className="text-sm text-muted-foreground">
            Manage asset check-out/check-in requests with approval workflow.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatTile label="Total" value={stats.total} icon={ArrowLeftRight} color="#0f172a" />
        <StatTile label="Pending" value={stats.pending} icon={Clock} color="#f59e0b" hint="awaiting review" />
        <StatTile label="Approved" value={stats.approved} icon={CheckCircle2} color="#0ea5e9" />
        <StatTile label="Checked Out" value={stats.checkedOut} icon={ArrowUpFromLine} color="#8b5cf6" />
        <StatTile label="Overdue" value={stats.overdue} icon={AlertTriangle} color="#f43f5e" hint="past due date" />
        <StatTile label="Rejected" value={stats.rejected} icon={XCircle} color="#64748b" />
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Label className="text-xs">Filter by status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {CHECKOUT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-muted-foreground">
            {data ? `${data.length} requests` : 'Loading...'}
          </span>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                      <ArrowLeftRight className="h-8 w-8" />
                      <p>No check-out requests</p>
                      <Button size="sm" onClick={() => setShowForm(true)}>
                        <Plus className="h-4 w-4 mr-1.5" /> Create first request
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((c) => {
                  const cfg = CHECKOUT_STATUS_CONFIG[c.status as keyof typeof CHECKOUT_STATUS_CONFIG] || CHECKOUT_STATUS_CONFIG.Pending
                  const isOverdue = c.status === 'Checked Out' && c.requestedReturnDate && new Date(c.requestedReturnDate) < new Date()
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/40">
                      <TableCell>
                        <button
                          onClick={() => c.asset && navigate('asset-detail', { id: c.assetId })}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.asset?.assetTag || '—'}
                        </button>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {c.asset?.make} {c.asset?.model}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{c.requestedBy?.fullName || '—'}</div>
                        <div className="text-xs text-muted-foreground">{c.requestedBy?.email}</div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm truncate">{c.reason || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(c.requestedStartDate)}</div>
                        <div className="text-[10px] text-muted-foreground">{formatRelative(c.requestedStartDate)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{c.requestedReturnDate ? formatDate(c.requestedReturnDate) : '—'}</div>
                        {isOverdue && <div className="text-[10px] text-rose-600 font-medium">Overdue</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0 gap-1`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.status === 'Pending' && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                                onClick={() => setApproverModal({ id: c.id, action: 'approve' })}>
                                <Check className="h-3 w-3 mr-0.5" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 hover:text-rose-700"
                                onClick={() => setApproverModal({ id: c.id, action: 'reject' })}>
                                <X className="h-3 w-3 mr-0.5" /> Reject
                              </Button>
                            </>
                          )}
                          {c.status === 'Approved' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs text-violet-600 hover:text-violet-700"
                              onClick={() => handleCheckOut(c.id)}>
                              <ArrowUpFromLine className="h-3 w-3 mr-0.5" /> Check Out
                            </Button>
                          )}
                          {c.status === 'Checked Out' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleCheckIn(c.id)}>
                              <ArrowDownToLine className="h-3 w-3 mr-0.5" /> Check In
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => c.asset && navigate('asset-detail', { id: c.assetId })}>
                            <Eye className="h-3.5 w-3.5" />
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

      {/* New request form */}
      <CheckoutFormDialog open={showForm} onOpenChange={setShowForm} />

      {/* Approve/Reject dialog */}
      <Dialog open={!!approverModal} onOpenChange={(v) => !v && setApproverModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{approverModal?.action === 'approve' ? 'Approve Request' : 'Reject Request'}</DialogTitle>
            <DialogDescription>
              {approverModal?.action === 'approve'
                ? 'Approve this check-out request. The asset will be ready to check out.'
                : 'Reject this check-out request with a reason.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Decision Notes (optional)</Label>
              <Textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder={approverModal?.action === 'approve' ? 'Approved for business use...' : 'Asset currently in use by another team...'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproverModal(null)}>Cancel</Button>
            {approverModal?.action === 'approve' ? (
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(approverModal.id)}>
                <Check className="h-4 w-4 mr-1.5" /> Approve Request
              </Button>
            ) : (
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => handleReject(approverModal!.id)}>
                <X className="h-4 w-4 mr-1.5" /> Reject Request
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CheckoutFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const { data: assets } = useQuery({ queryKey: ['assets-all'], queryFn: () => assetsApi.list({ pageSize: 100, sortBy: 'assetTag', sortDir: 'asc' }) })
  const { data: persons } = useQuery({ queryKey: ['persons'], queryFn: () => personsApi.list() })

  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  useMemo(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10)
      const ret = new Date(); ret.setDate(ret.getDate() + 14)
      setForm({
        assetId: '',
        requestedById: '',
        reason: '',
        requestedStartDate: today,
        requestedReturnDate: ret.toISOString().slice(0, 10),
      })
    }
  }, [open])

  async function save() {
    if (!form.assetId || !form.requestedById) {
      toast.error('Asset and requester are required')
      return
    }
    setSaving(true)
    try {
      await checkoutApi.create({
        assetId: String(form.assetId),
        requestedById: String(form.requestedById),
        reason: String(form.reason || ''),
        requestType: 'Checkout',
        status: 'Pending',
        requestedStartDate: new Date(String(form.requestedStartDate)).toISOString(),
        requestedReturnDate: form.requestedReturnDate ? new Date(String(form.requestedReturnDate)).toISOString() : null,
      })
      toast.success('Check-out request submitted')
      qc.invalidateQueries({ queryKey: ['checkouts'] })
      onOpenChange(false)
    } catch (e) {
      toast.error('Submit failed: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Check-out Request</DialogTitle>
          <DialogDescription>Request to check out an asset for temporary use.</DialogDescription>
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
            <Label className="text-xs">Requester *</Label>
            <Select value={String(form.requestedById || '')} onValueChange={(v) => setForm({ ...form, requestedById: v })}>
              <SelectTrigger><SelectValue placeholder="Select requester" /></SelectTrigger>
              <SelectContent>
                {persons?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName} {p.role ? `(${p.role})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date *</Label>
              <Input type="date" value={String(form.requestedStartDate || '')} onChange={(e) => setForm({ ...form, requestedStartDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expected Return</Label>
              <Input type="date" value={String(form.requestedReturnDate || '')} onChange={(e) => setForm({ ...form, requestedReturnDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason / Purpose</Label>
            <Textarea rows={3} value={String(form.reason || '')} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why do you need this asset?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Submitting...' : 'Submit Request'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
