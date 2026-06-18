'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { licensesApi, assetsApi } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
import { formatCurrency, formatDate, formatRelative } from '@/lib/format'
import type { SoftwareLicense } from '@/lib/types'
import {
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Link2,
  Unlink,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES = ['Productivity', 'OS', 'Design', 'Development', 'Communication', 'Security', 'Database', 'Other']

function StatTile({ label, value, icon: Icon, color, hint }: { label: string; value: string | number; icon: typeof KeyRound; color: string; hint?: string }) {
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

export function LicensesView() {
  const qc = useQueryClient()
  const { navigate } = useNav()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [allocating, setAllocating] = useState<string | null>(null)

  const { data: licenses, isLoading } = useQuery({
    queryKey: ['licenses'],
    queryFn: () => licensesApi.list(),
  })

  const filtered = useMemo(() => {
    if (!licenses) return []
    return licenses.filter((l) => {
      if (categoryFilter !== 'all' && l.category !== categoryFilter) return false
      if (search) {
        const s = search.toLowerCase()
        if (!l.name.toLowerCase().includes(s) && !(l.vendor || '').toLowerCase().includes(s)) return false
      }
      return true
    })
  }, [licenses, search, categoryFilter])

  async function handleDelete(id: string) {
    if (!confirm('Delete this license? Allocations will be removed.')) return
    try {
      await licensesApi.delete(id)
      toast.success('License deleted')
      qc.invalidateQueries({ queryKey: ['licenses'] })
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Software Licenses</h2>
          <p className="text-sm text-muted-foreground">
            Manage software licenses, track seat allocation, and monitor expirations.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add License
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Licenses" value={licenses?.length ?? 0} icon={KeyRound} color="#0f172a" />
        <StatTile label="Total Seats" value={licenses?.reduce((s, l) => s + l.seatsTotal, 0) ?? 0} icon={ShieldCheck} color="#0ea5e9" />
        <StatTile label="Used Seats" value={licenses?.reduce((s, l) => s + l.seatsUsed, 0) ?? 0} icon={Link2} color="#f59e0b" />
        <StatTile label="Total Value" value={formatCurrency(licenses?.reduce((s, l) => s + (l.cost || 0), 0) ?? 0)} icon={Building2} color="#10b981" />
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name or vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Licenses</CardTitle>
          <CardDescription>{filtered.length} of {licenses?.length ?? 0} licenses</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Seats Used</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Purchase</TableHead>
                <TableHead>Expiry</TableHead>
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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <KeyRound className="h-8 w-8" />
                      <p>No licenses found</p>
                      <Button size="sm" onClick={() => { setEditing(null); setShowForm(true) }}>
                        <Plus className="h-4 w-4 mr-1.5" /> Add your first license
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((l) => {
                  const pct = l.seatsTotal > 0 ? (l.seatsUsed / l.seatsTotal) * 100 : 0
                  const expiringSoon = l.expiryDate && new Date(l.expiryDate) < new Date(Date.now() + 30 * 86400000)
                  const expired = l.expiryDate && new Date(l.expiryDate) < new Date()
                  return (
                    <TableRow key={l.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          {l.name}
                          {expired && (
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-0 text-[10px]">Expired</Badge>
                          )}
                          {expiringSoon && !expired && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-0 text-[10px]">Expiring</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{l.vendor || '—'}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{l.category || '—'}</Badge></TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{l.seatsUsed} / {l.seatsTotal}</span>
                            <span className="text-muted-foreground">{Math.round(pct)}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{l.cost != null ? formatCurrency(l.cost, l.currency) : '—'}</TableCell>
                      <TableCell className="text-sm">{l.purchaseDate ? formatDate(l.purchaseDate) : '—'}</TableCell>
                      <TableCell className="text-sm">{l.expiryDate ? formatDate(l.expiryDate) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAllocating(l.id)} disabled={l.seatsUsed >= l.seatsTotal}>
                            <Link2 className="h-3 w-3 mr-1" /> Allocate
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(l.id); setShowForm(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(l.id)}>
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
      <LicenseFormDialog open={showForm} onOpenChange={setShowForm} editingId={editing} />

      {/* Allocate dialog */}
      {allocating && (
        <AllocateDialog
          licenseId={allocating}
          open={!!allocating}
          onOpenChange={(v) => !v && setAllocating(null)}
        />
      )}
    </div>
  )
}

function LicenseFormDialog({ open, onOpenChange, editingId }: { open: boolean; onOpenChange: (v: boolean) => void; editingId: string | null }) {
  const qc = useQueryClient()
  const { data: licenses } = useQuery({ queryKey: ['licenses'], queryFn: () => licensesApi.list() })
  const editing = licenses?.find((l) => l.id === editingId)

  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  useMemo(() => {
    if (open) {
      setForm({
        name: editing?.name || '',
        vendor: editing?.vendor || '',
        key: editing?.key || '',
        category: editing?.category || 'Productivity',
        seatsTotal: editing?.seatsTotal ?? 1,
        seatsUsed: editing?.seatsUsed ?? 0,
        cost: editing?.cost ?? '',
        currency: editing?.currency || 'USD',
        purchaseDate: editing?.purchaseDate ? editing.purchaseDate.slice(0, 10) : '',
        expiryDate: editing?.expiryDate ? editing.expiryDate.slice(0, 10) : '',
        notes: editing?.notes || '',
      })
    }
  }, [open, editing])

  async function save() {
    if (!form.name) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        name: String(form.name),
        seatsTotal: Number(form.seatsTotal),
        seatsUsed: Number(form.seatsUsed),
        cost: form.cost ? Number(form.cost) : null,
        purchaseDate: form.purchaseDate ? new Date(String(form.purchaseDate)).toISOString() : null,
        expiryDate: form.expiryDate ? new Date(String(form.expiryDate)).toISOString() : null,
      }
      if (editingId) {
        await licensesApi.update(editingId, payload)
        toast.success('License updated')
      } else {
        await licensesApi.create(payload)
        toast.success('License created')
      }
      qc.invalidateQueries({ queryKey: ['licenses'] })
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
          <DialogTitle>{editingId ? 'Edit License' : 'Add License'}</DialogTitle>
          <DialogDescription>
            {editingId ? 'Update license information' : 'Register a new software license'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Microsoft Office 365" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vendor</Label>
              <Input value={String(form.vendor || '')} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Microsoft, Adobe..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">License Key</Label>
            <Input value={String(form.key || '')} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="XXXXX-XXXXX-XXXXX" className="font-mono" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={String(form.category || 'Productivity')} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total Seats</Label>
              <Input type="number" min={1} value={String(form.seatsTotal ?? '')} onChange={(e) => setForm({ ...form, seatsTotal: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cost</Label>
              <Input type="number" step="0.01" value={String(form.cost ?? '')} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Purchase Date</Label>
              <Input type="date" value={String(form.purchaseDate || '')} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Expiry Date</Label>
              <Input type="date" value={String(form.expiryDate || '')} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={String(form.notes || '')} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AllocateDialog({ licenseId, open, onOpenChange }: { licenseId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const { data: assets } = useQuery({ queryKey: ['assets-all'], queryFn: () => assetsApi.list({ pageSize: 100, sortBy: 'assetTag', sortDir: 'asc' }) })
  const [assetId, setAssetId] = useState('')
  const [saving, setSaving] = useState(false)

  async function allocate() {
    if (!assetId) {
      toast.error('Select an asset')
      return
    }
    setSaving(true)
    try {
      await licensesApi.allocate(licenseId, assetId)
      toast.success('License allocated to asset')
      qc.invalidateQueries({ queryKey: ['licenses'] })
      onOpenChange(false)
      setAssetId('')
    } catch (e) {
      toast.error('Allocation failed: ' + String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Allocate License to Asset</DialogTitle>
          <DialogDescription>Select an asset to assign this license seat to.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Select Asset</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger><SelectValue placeholder="Choose an asset" /></SelectTrigger>
              <SelectContent>
                {assets?.data.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.assetTag} — {a.make} {a.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={allocate} disabled={saving || !assetId}>
            <Link2 className="h-4 w-4 mr-1.5" /> {saving ? 'Allocating...' : 'Allocate Seat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
