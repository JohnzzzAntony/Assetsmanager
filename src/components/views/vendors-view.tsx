'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { vendorsApi } from '@/lib/api'
import { VENDOR_CATEGORIES } from '@/lib/types'
import type { Vendor } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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
import { formatCurrency, formatDate } from '@/lib/format'
import {
  Store,
  CheckCircle2,
  DollarSign,
  Star,
  Plus,
  Pencil,
  Trash2,
  Search,
  Mail,
  Phone,
  Globe,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'

// ---- Stat tile ----
interface StatTileProps {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
  hint?: string
}

function StatTile({ label, value, icon: Icon, color, hint }: StatTileProps) {
  return (
    <Card className="card-hover overflow-hidden border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
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

// ---- Star rating ----
function StarRating({ value, size = 'h-3.5 w-3.5' }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${value} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${size} ${
            i < value
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

// ---- Main view ----
export function VendorsView() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorsApi.list(),
  })

  // ---- Derived stats ----
  const stats = useMemo(() => {
    const list = vendors ?? []
    const total = list.length
    const active = list.filter((v) => v.isActive).length
    const totalSpent = list.reduce((sum, v) => sum + (v._sum?.totalSpent ?? 0), 0)
    const rated = list.filter((v) => v.rating > 0)
    const avgRating = rated.length
      ? rated.reduce((sum, v) => sum + v.rating, 0) / rated.length
      : 0
    return { total, active, totalSpent, avgRating }
  }, [vendors])

  // ---- Filtering ----
  const filtered = useMemo(() => {
    if (!vendors) return []
    return vendors.filter((v) => {
      if (!showInactive && !v.isActive) return false
      if (categoryFilter !== 'all' && v.category !== categoryFilter) return false
      if (search) {
        const s = search.toLowerCase()
        const matches =
          v.name.toLowerCase().includes(s) ||
          (v.contactPerson || '').toLowerCase().includes(s) ||
          (v.email || '').toLowerCase().includes(s) ||
          (v.phone || '').toLowerCase().includes(s)
        if (!matches) return false
      }
      return true
    })
  }, [vendors, search, categoryFilter, showInactive])

  function openNew() {
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(id: string) {
    setEditingId(id)
    setShowForm(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await vendorsApi.delete(deleteTarget.id)
      toast.success(`Vendor "${deleteTarget.name}" deleted`)
      qc.invalidateQueries({ queryKey: ['vendors'] })
      setDeleteTarget(null)
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Vendors &amp; Suppliers</h2>
          <p className="text-sm text-muted-foreground">
            Manage vendor relationships, payment terms, ratings, and procurement spend.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Vendor
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Vendors"
          value={stats.total}
          icon={Store}
          color="#8b5cf6"
          hint="Registered suppliers"
        />
        <StatTile
          label="Active Vendors"
          value={stats.active}
          icon={CheckCircle2}
          color="#10b981"
          hint={`${stats.total - stats.active} inactive`}
        />
        <StatTile
          label="Total Spent"
          value={formatCurrency(stats.totalSpent)}
          icon={DollarSign}
          color="#0ea5e9"
          hint="Across all POs"
        />
        <StatTile
          label="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          icon={Star}
          color="#f59e0b"
          hint="Out of 5.0"
        />
      </div>

      {/* Search + filter bar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, contact, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {VENDOR_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive" className="cursor-pointer text-xs">
              Show inactive
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Vendors table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Vendors</CardTitle>
          <CardDescription>
            {filtered.length} of {vendors?.length ?? 0} vendors
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-center">POs</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
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
                      <Store className="h-8 w-8" />
                      <p className="font-medium">No vendors found</p>
                      <p className="text-xs">
                        Try adjusting your filters, or add a new vendor to get started.
                      </p>
                      <Button size="sm" variant="outline" className="mt-1" onClick={openNew}>
                        <Plus className="mr-1.5 h-4 w-4" /> Add your first vendor
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => openEdit(v.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                          <Store className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium leading-tight">{v.name}</div>
                          {v.website && (
                            <a
                              href={v.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
                            >
                              <Globe className="h-2.5 w-2.5" />
                              {v.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {v.contactPerson ? (
                        <div className="flex flex-col text-xs">
                          <span className="font-medium text-foreground">{v.contactPerson}</span>
                          <div className="mt-0.5 flex flex-col gap-0.5 text-muted-foreground">
                            {v.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-2.5 w-2.5" />
                                {v.email}
                              </span>
                            )}
                            {v.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                {v.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {v.category ? (
                        <Badge variant="outline" className="text-[11px]">
                          {v.category}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {v.paymentTerms || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <StarRating value={v.rating} />
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                        <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                        {v._count?.purchaseOrders ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {v._sum?.totalSpent
                        ? formatCurrency(v._sum.totalSpent)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {v.isActive ? (
                        <Badge
                          variant="outline"
                          className="border-0 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400"
                        >
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-0 bg-slate-500/10 text-[11px] text-slate-600 dark:text-slate-400"
                        >
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(v.id)}
                          aria-label={`Edit ${v.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteTarget(v)}
                          aria-label={`Delete ${v.name}`}
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

      {/* Add/Edit dialog */}
      <VendorFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editingId={editingId}
      />

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (deleteTarget._count?.purchaseOrders ?? 0) > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              This vendor has <strong>{deleteTarget._count?.purchaseOrders}</strong> associated
              purchase order(s). Deletion may affect historical reporting.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Form dialog ----
interface VendorFormDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingId: string | null
}

function VendorFormDialog({ open, onOpenChange, editingId }: VendorFormDialogProps) {
  const qc = useQueryClient()
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorsApi.list(),
  })
  const editing = vendors?.find((v) => v.id === editingId)

  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  // Initialize form whenever dialog opens or editing target changes
  useMemo(() => {
    if (open) {
      setForm({
        name: editing?.name || '',
        category: editing?.category || 'Hardware',
        contactPerson: editing?.contactPerson || '',
        email: editing?.email || '',
        phone: editing?.phone || '',
        website: editing?.website || '',
        address: editing?.address || '',
        taxId: editing?.taxId || '',
        paymentTerms: editing?.paymentTerms || '',
        rating: editing?.rating ?? 3,
        isActive: editing?.isActive ?? true,
        notes: editing?.notes || '',
      })
    }
  }, [open, editing])

  function setField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function save() {
    if (!String(form.name || '').trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: String(form.name).trim(),
        category: String(form.category || 'Other'),
        contactPerson: form.contactPerson ? String(form.contactPerson).trim() : null,
        email: form.email ? String(form.email).trim() : null,
        phone: form.phone ? String(form.phone).trim() : null,
        website: form.website ? String(form.website).trim() : null,
        address: form.address ? String(form.address).trim() : null,
        taxId: form.taxId ? String(form.taxId).trim() : null,
        paymentTerms: form.paymentTerms ? String(form.paymentTerms).trim() : null,
        rating: Number(form.rating) || 0,
        isActive: Boolean(form.isActive),
        notes: form.notes ? String(form.notes).trim() : null,
      }
      if (editingId) {
        await vendorsApi.update(editingId, payload)
        toast.success('Vendor updated')
      } else {
        await vendorsApi.create(payload)
        toast.success('Vendor created')
      }
      qc.invalidateQueries({ queryKey: ['vendors'] })
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
          <DialogTitle>{editingId ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
          <DialogDescription>
            {editingId
              ? 'Update vendor information and contact details.'
              : 'Register a new vendor or supplier in your directory.'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto scrollbar-thin pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Name *</Label>
              <Input
                value={String(form.name || '')}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g., Dell Technologies, CDW, Insight"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                value={String(form.category || 'Hardware')}
                onValueChange={(v) => setField('category', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Terms</Label>
              <Input
                value={String(form.paymentTerms || '')}
                onChange={(e) => setField('paymentTerms', e.target.value)}
                placeholder="Net 30, Net 60, COD..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Person</Label>
              <Input
                value={String(form.contactPerson || '')}
                onChange={(e) => setField('contactPerson', e.target.value)}
                placeholder="Account manager name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tax ID</Label>
              <Input
                value={String(form.taxId || '')}
                onChange={(e) => setField('taxId', e.target.value)}
                placeholder="EIN / VAT / GST number"
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={String(form.email || '')}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="sales@vendor.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={String(form.phone || '')}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Website</Label>
            <Input
              value={String(form.website || '')}
              onChange={(e) => setField('website', e.target.value)}
              placeholder="https://www.vendor.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Address</Label>
            <Textarea
              rows={2}
              value={String(form.address || '')}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Street, City, State, ZIP, Country"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Rating (1-5)</Label>
              <Select
                value={String(form.rating ?? 3)}
                onValueChange={(v) => setField('rating', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? 'Star' : 'Stars'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="vendor-active"
                  checked={Boolean(form.isActive)}
                  onCheckedChange={(v) => setField('isActive', v)}
                />
                <Label htmlFor="vendor-active" className="cursor-pointer text-xs">
                  Active vendor
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              rows={2}
              value={String(form.notes || '')}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Internal notes about this vendor (relationship, contract, SLAs...)"
            />
          </div>

          {editing && (
            <p className="text-[10px] text-muted-foreground">
              Last updated {formatDate(editing.updatedAt, 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Vendor' : 'Create Vendor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
