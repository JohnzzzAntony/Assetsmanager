'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  purchaseOrdersApi,
  vendorsApi,
  personsApi,
  assetTypesApi,
  exportApi,
} from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PO_STATUSES,
  PO_STATUS_CONFIG,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type PurchaseOrderStatus,
} from '@/lib/types'
import { formatCurrency, formatDate, formatDateTime, formatRelative } from '@/lib/format'
import {
  ShoppingCart,
  Clock,
  Loader,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Printer,
  Check,
  Truck,
  Building2,
  Mail,
  Phone,
  Calendar,
  User,
  Package,
  X,
  Filter,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'

// Statuses considered "open" (in-flight) for the Open POs stat tile.
const OPEN_STATUSES: PurchaseOrderStatus[] = [
  'Draft',
  'Pending Approval',
  'Approved',
  'Ordered',
  'Partially Received',
]

// Statutes that should NOT contribute to "Total Spent" (drafts not yet committed, cancelled).
const EXCLUDED_FROM_SPENT: string[] = ['Draft', 'Cancelled']

function StatTile({
  label,
  value,
  icon: Icon,
  color,
  hint,
}: {
  label: string
  value: string | number
  icon: typeof ShoppingCart
  color: string
  hint?: string
}) {
  return (
    <Card className="overflow-hidden border-l-4 shadow-soft card-hover" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums truncate">{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
            style={{ backgroundColor: `${color}1a` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = (PO_STATUS_CONFIG as Record<string, { bg: string; text: string; dot: string }>)[status] || {
    bg: 'bg-slate-500/10',
    text: 'text-slate-700 dark:text-slate-400',
    dot: 'bg-slate-400',
  }
  return (
    <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0 gap-1.5 whitespace-nowrap`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </Badge>
  )
}

export function PurchaseOrdersView() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [vendorFilter, setVendorFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => vendorsApi.list() })

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseOrdersApi.list(),
  })

  const filtered = useMemo(() => {
    if (!purchaseOrders) return []
    return purchaseOrders.filter((po) => {
      if (statusFilter !== 'all' && po.status !== statusFilter) return false
      if (vendorFilter !== 'all' && po.vendorId !== vendorFilter) return false
      if (search) {
        const s = search.toLowerCase()
        const matchesPo = po.poNumber.toLowerCase().includes(s)
        const matchesVendor = (po.vendor?.name || '').toLowerCase().includes(s)
        const matchesNotes = (po.notes || '').toLowerCase().includes(s)
        if (!matchesPo && !matchesVendor && !matchesNotes) return false
      }
      return true
    })
  }, [purchaseOrders, search, statusFilter, vendorFilter])

  const stats = useMemo(() => {
    if (!purchaseOrders) return { total: 0, pending: 0, open: 0, totalSpent: 0 }
    return {
      total: purchaseOrders.length,
      pending: purchaseOrders.filter((p) => p.status === 'Pending Approval').length,
      open: purchaseOrders.filter((p) => OPEN_STATUSES.includes(p.status as PurchaseOrderStatus)).length,
      totalSpent: purchaseOrders
        .filter((p) => !EXCLUDED_FROM_SPENT.includes(p.status))
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0),
    }
  }, [purchaseOrders])

  async function handleDelete(id: string) {
    try {
      await purchaseOrdersApi.delete(id)
      toast.success('Purchase order deleted')
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      setDeletingId(null)
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  async function handleQuickStatusChange(po: PurchaseOrder, newStatus: PurchaseOrderStatus, label: string) {
    try {
      const patch: Partial<PurchaseOrder> = { status: newStatus }
      if (newStatus === 'Approved') {
        // Find an approver — prefer IT Manager role, fall back to first person.
        const approvers = await personsApi.list()
        const approver =
          approvers.find((p) => (p.role || '').toLowerCase().includes('manager')) || approvers[0]
        if (approver) {
          patch.approvedById = approver.id
          patch.approvedAt = new Date().toISOString()
        }
      }
      await purchaseOrdersApi.update(po.id, patch)
      toast.success(`Purchase order ${label}`)
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
    } catch (e) {
      toast.error(`Update failed: ${String(e)}`)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-sm text-muted-foreground">
            Create, track, and manage purchase orders with vendor line items and approval workflow.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportApi.download(exportApi.purchaseOrders())}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <Button
            className="btn-press"
            onClick={() => {
              setEditingId(null)
              setShowForm(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> New Purchase Order
          </Button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total POs" value={stats.total} icon={ShoppingCart} color="#0f172a" />
        <StatTile
          label="Pending Approval"
          value={stats.pending}
          icon={Clock}
          color="#f59e0b"
          hint="awaiting review"
        />
        <StatTile label="Open POs" value={stats.open} icon={Loader} color="#0ea5e9" hint="in-flight" />
        <StatTile
          label="Total Spent"
          value={formatCurrency(stats.totalSpent)}
          icon={DollarSign}
          color="#10b981"
          hint="excl. drafts & cancelled"
        />
      </div>

      {/* Filter bar */}
      <Card className="card-hover">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search PO #, vendor, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {PO_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Vendor</Label>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {(vendors || []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(search || statusFilter !== 'all' || vendorFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
                setVendorFilter('all')
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All Purchase Orders</CardTitle>
              <CardDescription>
                {filtered.length} of {purchaseOrders?.length ?? 0} purchase orders
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Filter className="h-3 w-3" /> {statusFilter === 'all' ? 'All' : statusFilter}
            </Badge>
          </div>
        </CardHeader>
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ShoppingCart className="h-8 w-8" />
                      <p>No purchase orders found</p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingId(null)
                          setShowForm(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1.5" /> Create your first PO
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((po) => {
                  const itemCount = po._count?.items ?? po.items?.length ?? 0
                  return (
                    <TableRow key={po.id} className="hover:bg-muted/40">
                      <TableCell>
                        <button
                          onClick={() => setViewingId(po.id)}
                          className="font-mono font-bold text-primary hover:underline"
                        >
                          {po.poNumber}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{po.vendor?.name || '—'}</div>
                        {po.vendor?.category && (
                          <Badge variant="outline" className="mt-0.5 text-[10px]">
                            {po.vendor.category}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(po.orderDate)}</div>
                        <div className="text-[10px] text-muted-foreground">{formatRelative(po.orderDate)}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {po.expectedDate ? formatDate(po.expectedDate) : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={po.status} />
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{itemCount}</TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatCurrency(po.totalAmount, po.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{po.requestedBy?.fullName || '—'}</div>
                        {po.requestedBy?.role && (
                          <div className="text-[10px] text-muted-foreground">{po.requestedBy.role}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {po.status === 'Pending Approval' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleQuickStatusChange(po, 'Approved', 'approved')}
                            >
                              <Check className="h-3 w-3 mr-0.5" /> Approve
                            </Button>
                          )}
                          {po.status === 'Approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-violet-600 hover:text-violet-700"
                              onClick={() => handleQuickStatusChange(po, 'Ordered', 'marked as ordered')}
                            >
                              <Truck className="h-3 w-3 mr-0.5" /> Mark Ordered
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setViewingId(po.id)}
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingId(po.id)
                              setShowForm(true)
                            }}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeletingId(po.id)}
                            title="Delete"
                          >
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

      {/* Form dialog (create/edit) */}
      <POFormDialog open={showForm} onOpenChange={setShowForm} editingId={editingId} />

      {/* Detail dialog */}
      {viewingId && (
        <PODetailDialog id={viewingId} open={!!viewingId} onOpenChange={(v) => !v && setViewingId(null)} />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete purchase order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the purchase order and all of its line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ==================== Form Dialog ====================

interface ItemDraft {
  _key: string
  id?: string
  assetTypeId: string
  description: string
  quantity: string
  unitPrice: string
  notes: string
}

let _itemKeyCounter = 0
function makeItemKey() {
  _itemKeyCounter += 1
  return `item-${Date.now()}-${_itemKeyCounter}`
}

function generatePoNumberPlaceholder() {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `PO-${year}-${rand}`
}

function POFormDialog({
  open,
  onOpenChange,
  editingId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId: string | null
}) {
  const qc = useQueryClient()
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => vendorsApi.list() })
  const { data: persons } = useQuery({ queryKey: ['persons'], queryFn: () => personsApi.list() })
  const { data: assetTypes } = useQuery({ queryKey: ['asset-types'], queryFn: () => assetTypesApi.list() })
  const { data: allPOs } = useQuery({ queryKey: ['purchase-orders'], queryFn: () => purchaseOrdersApi.list() })

  const editing = useMemo(
    () => (editingId ? allPOs?.find((p) => p.id === editingId) : undefined),
    [editingId, allPOs]
  )

  const [form, setForm] = useState<Record<string, unknown>>({})
  const [items, setItems] = useState<ItemDraft[]>([])
  const [saving, setSaving] = useState(false)

  useMemo(() => {
    if (!open) return
    if (editingId && !editing) return // wait for data
    setForm({
      poNumber: editing?.poNumber || generatePoNumberPlaceholder(),
      vendorId: editing?.vendorId || '',
      status: editing?.status || 'Draft',
      orderDate: editing?.orderDate ? editing.orderDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      expectedDate: editing?.expectedDate ? editing.expectedDate.slice(0, 10) : '',
      requestedById: editing?.requestedById || '',
      taxRate: editing?.taxRate ?? 0,
      shippingCost: editing?.shippingCost ?? 0,
      currency: editing?.currency || 'USD',
      notes: editing?.notes || '',
    })
    if (editing?.items && editing.items.length > 0) {
      setItems(
        editing.items.map((it) => ({
          _key: makeItemKey(),
          id: it.id,
          assetTypeId: it.assetTypeId || '',
          description: it.description || '',
          quantity: String(it.quantity ?? 1),
          unitPrice: String(it.unitPrice ?? 0),
          notes: it.notes || '',
        }))
      )
    } else {
      setItems([{ _key: makeItemKey(), assetTypeId: '', description: '', quantity: '1', unitPrice: '0', notes: '' }])
    }
  }, [open, editingId, editing])

  // ---- Auto-calculated totals ----
  const subtotal = useMemo(
    () =>
      items.reduce((s, it) => {
        const qty = Number(it.quantity) || 0
        const unit = Number(it.unitPrice) || 0
        return s + qty * unit
      }, 0),
    [items]
  )
  const taxRateNum = Number(form.taxRate) || 0
  const taxAmount = (subtotal * taxRateNum) / 100
  const shippingNum = Number(form.shippingCost) || 0
  const totalAmount = subtotal + taxAmount + shippingNum

  function setField(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setItemField(key: string, field: keyof ItemDraft, value: string) {
    setItems((arr) => arr.map((it) => (it._key === key ? { ...it, [field]: value } : it)))
  }

  function addItem() {
    setItems((arr) => [
      ...arr,
      { _key: makeItemKey(), assetTypeId: '', description: '', quantity: '1', unitPrice: '0', notes: '' },
    ])
  }

  function removeItem(key: string) {
    setItems((arr) => (arr.length <= 1 ? arr : arr.filter((it) => it._key !== key)))
  }

  async function save() {
    if (!form.vendorId) {
      toast.error('Vendor is required')
      return
    }
    const cleanItems = items.filter((it) => it.description.trim() !== '')
    if (cleanItems.length === 0) {
      toast.error('At least one line item with a description is required')
      return
    }
    for (const it of cleanItems) {
      if (!it.description.trim()) {
        toast.error('All line items must have a description')
        return
      }
    }
    setSaving(true)
    try {
      const payload: Partial<PurchaseOrder> & { items?: Partial<PurchaseOrderItem>[] } = {
        poNumber: String(form.poNumber || generatePoNumberPlaceholder()),
        vendorId: String(form.vendorId),
        status: String(form.status || 'Draft'),
        orderDate: form.orderDate
          ? new Date(String(form.orderDate)).toISOString()
          : new Date().toISOString(),
        expectedDate: form.expectedDate ? new Date(String(form.expectedDate)).toISOString() : null,
        requestedById: form.requestedById ? String(form.requestedById) : null,
        taxRate: Number(form.taxRate) || 0,
        shippingCost: Number(form.shippingCost) || 0,
        currency: String(form.currency || 'USD'),
        notes: form.notes ? String(form.notes) : null,
        items: cleanItems.map((it) => ({
          id: it.id,
          assetTypeId: it.assetTypeId || null,
          description: it.description.trim(),
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
          notes: it.notes || null,
        })),
      }
      if (editingId) {
        await purchaseOrdersApi.update(editingId, payload)
        toast.success('Purchase order updated')
      } else {
        await purchaseOrdersApi.create(payload)
        toast.success('Purchase order created')
      }
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      onOpenChange(false)
    } catch (e) {
      toast.error('Save failed: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit Purchase Order' : 'New Purchase Order'}</DialogTitle>
          <DialogDescription>
            {editingId
              ? 'Update purchase order details and line items.'
              : 'Create a new purchase order with vendor and line items.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 max-h-[68vh] overflow-y-auto scrollbar-thin pr-1">
          {/* Top row: PO number, vendor, status */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">PO Number</Label>
              <Input
                value={String(form.poNumber || '')}
                onChange={(e) => setField('poNumber', e.target.value)}
                className="font-mono"
                placeholder={generatePoNumberPlaceholder()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vendor *</Label>
              <Select value={String(form.vendorId || '')} onValueChange={(v) => setField('vendorId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {(vendors || []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={String(form.status || 'Draft')} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PO_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates + requester */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Order Date</Label>
              <Input
                type="date"
                value={String(form.orderDate || '')}
                onChange={(e) => setField('orderDate', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expected Date</Label>
              <Input
                type="date"
                value={String(form.expectedDate || '')}
                onChange={(e) => setField('expectedDate', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Requested By</Label>
              <Select
                value={String(form.requestedById || '__none__')}
                onValueChange={(v) => setField('requestedById', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select requester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {(persons || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName} {p.role ? `(${p.role})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tax / shipping / currency */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tax Rate (%)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={String(form.taxRate ?? '')}
                onChange={(e) => setField('taxRate', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Shipping Cost</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={String(form.shippingCost ?? '')}
                onChange={(e) => setField('shippingCost', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select value={String(form.currency || 'USD')} onValueChange={(v) => setField('currency', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Line Items</Label>
              <Button size="sm" variant="outline" className="h-7" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
              </Button>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[180px]">Asset Type</TableHead>
                    <TableHead>Description *</TableHead>
                    <TableHead className="w-[80px]">Qty</TableHead>
                    <TableHead className="w-[110px]">Unit Price</TableHead>
                    <TableHead className="w-[110px] text-right">Total</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const qty = Number(it.quantity) || 0
                    const unit = Number(it.unitPrice) || 0
                    const lineTotal = qty * unit
                    return (
                      <TableRow key={it._key}>
                        <TableCell>
                          <Select
                            value={it.assetTypeId || '__none__'}
                            onValueChange={(v) => setItemField(it._key, 'assetTypeId', v === '__none__' ? '' : v)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— None —</SelectItem>
                              {(assetTypes || []).map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            value={it.description}
                            onChange={(e) => setItemField(it._key, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            className="h-8 text-xs tabular-nums"
                            value={it.quantity}
                            onChange={(e) => setItemField(it._key, 'quantity', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8 text-xs tabular-nums"
                            value={it.unitPrice}
                            onChange={(e) => setItemField(it._key, 'unitPrice', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatCurrency(lineTotal, String(form.currency || 'USD'))}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            disabled={items.length <= 1}
                            onClick={() => removeItem(it._key)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              rows={2}
              value={String(form.notes || '')}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Internal notes, payment terms reminders, etc."
            />
          </div>

          {/* Summary footer */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(subtotal, String(form.currency || 'USD'))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxRateNum.toFixed(2)}%)</span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(taxAmount, String(form.currency || 'USD'))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(shippingNum, String(form.currency || 'USD'))}
                </span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(totalAmount, String(form.currency || 'USD'))}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update PO' : 'Create PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== Detail Dialog ====================

function PODetailDialog({
  id,
  open,
  onOpenChange,
}: {
  id: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => purchaseOrdersApi.get(id),
    enabled: open && !!id,
  })

  if (!po) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center h-40">
            {isLoading ? (
              <div className="space-y-2 w-full max-w-md">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <p className="text-muted-foreground">Purchase order not found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const currency = po.currency || 'USD'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle className="font-mono text-lg">{po.poNumber}</DialogTitle>
              <DialogDescription>Purchase order details</DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={po.status} />
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 max-h-[72vh] overflow-y-auto scrollbar-thin pr-1">
          {/* Vendor + dates row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Vendor card */}
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> Vendor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="font-medium text-base">{po.vendor?.name || '—'}</div>
                {po.vendor?.category && (
                  <Badge variant="outline" className="text-[10px]">
                    {po.vendor.category}
                  </Badge>
                )}
                {po.vendor?.contactPerson && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3 w-3" /> {po.vendor.contactPerson}
                  </div>
                )}
                {po.vendor?.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3 w-3" /> {po.vendor.email}
                  </div>
                )}
                {po.vendor?.phone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3 w-3" /> {po.vendor.phone}
                  </div>
                )}
                {po.vendor?.paymentTerms && (
                  <div className="text-xs text-muted-foreground pt-1">Terms: {po.vendor.paymentTerms}</div>
                )}
              </CardContent>
            </Card>

            {/* Dates & people */}
            <Card className="card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Dates &amp; Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Date</span>
                  <span className="font-medium">{formatDate(po.orderDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Date</span>
                  <span className="font-medium">{po.expectedDate ? formatDate(po.expectedDate) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Received Date</span>
                  <span className="font-medium">{po.receivedDate ? formatDate(po.receivedDate) : '—'}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested By</span>
                  <span className="font-medium">{po.requestedBy?.fullName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved By</span>
                  <span className="font-medium">{po.approvedBy?.fullName || '—'}</span>
                </div>
                {po.approvedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved At</span>
                    <span className="font-medium">{formatDateTime(po.approvedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Items table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Package className="h-4 w-4" /> Line Items ({po.items?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Description</TableHead>
                    <TableHead>Asset Type</TableHead>
                    <TableHead className="text-center">Ordered</TableHead>
                    <TableHead className="text-center">Received</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(po.items || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No line items on this PO.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (po.items || []).map((it) => {
                      const qty = it.quantity || 0
                      const recv = it.receivedQuantity || 0
                      const pct = qty > 0 ? Math.min(100, (recv / qty) * 100) : 0
                      return (
                        <TableRow key={it.id}>
                          <TableCell>
                            <div className="font-medium">{it.description}</div>
                            {it.notes && <div className="text-[10px] text-muted-foreground">{it.notes}</div>}
                          </TableCell>
                          <TableCell>
                            {it.assetType ? (
                              <Badge variant="outline" className="text-[10px]">
                                {it.assetType.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{qty}</TableCell>
                          <TableCell className="text-center tabular-nums">
                            <span className={recv === qty && qty > 0 ? 'text-emerald-600 font-medium' : ''}>
                              {recv}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="w-24">
                              <Progress value={pct} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(it.unitPrice, currency)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatCurrency(it.totalPrice, currency)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="ml-auto w-full max-w-sm space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums font-medium">{formatCurrency(po.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({po.taxRate.toFixed(2)}%)</span>
                  <span className="tabular-nums font-medium">{formatCurrency(po.taxAmount, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="tabular-nums font-medium">{formatCurrency(po.shippingCost, currency)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(po.totalAmount, currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {po.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{po.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
