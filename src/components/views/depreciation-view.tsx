'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { depreciationApi, assetsApi, assetTypesApi } from '@/lib/api'
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
import { DEPRECIATION_METHODS } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Calculator,
  ArrowDownRight,
  Package,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

function StatTile({ label, value, icon: Icon, color, hint, sub }: { label: string; value: string; icon: typeof TrendingDown; color: string; hint?: string; sub?: string }) {
  return (
    <Card className="overflow-hidden border-l-4 shadow-soft" style={{ borderLeftColor: color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
            {sub && <p className="text-[10px] mt-0.5" style={{ color }}>{sub}</p>}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${color}1a` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type Tab = 'overview' | 'rules'

export function DepreciationView() {
  const qc = useQueryClient()
  const { navigate } = useNav()
  const [tab, setTab] = useState<Tab>('overview')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['depreciation-stats'],
    queryFn: () => depreciationApi.stats(),
  })
  const { data: calcs, isLoading: calcsLoading } = useQuery({
    queryKey: ['depreciation-calcs'],
    queryFn: () => depreciationApi.calculate() as Promise<any[]>,
  })
  const { data: rules } = useQuery({
    queryKey: ['depreciation-rules'],
    queryFn: () => depreciationApi.listRules(),
  })

  const filteredCalcs = useMemo(() => {
    if (!calcs) return []
    if (!search) return calcs
    const s = search.toLowerCase()
    return calcs.filter((c: any) => {
      const a = c.asset
      return (a?.assetTag || '').toLowerCase().includes(s) ||
        (a?.make || '').toLowerCase().includes(s) ||
        (a?.model || '').toLowerCase().includes(s)
    })
  }, [calcs, search])

  async function handleDeleteRule(id: string) {
    if (!confirm('Delete this depreciation rule?')) return
    try {
      await depreciationApi.deleteRule(id)
      toast.success('Rule deleted')
      qc.invalidateQueries({ queryKey: ['depreciation-rules'] })
      qc.invalidateQueries({ queryKey: ['depreciation-calcs'] })
      qc.invalidateQueries({ queryKey: ['depreciation-stats'] })
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Asset Depreciation</h2>
          <p className="text-sm text-muted-foreground">
            Track asset value depreciation over time using configurable rules.
          </p>
        </div>
        {tab === 'rules' && (
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Rule
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Assets" value={String(stats?.totalAssets ?? 0)} icon={Package} color="#0f172a" />
        <StatTile label="Purchase Value" value={formatCurrency(stats?.totalPurchaseValue ?? 0)} icon={DollarSign} color="#0ea5e9" />
        <StatTile label="Current Value" value={formatCurrency(stats?.totalCurrentValue ?? 0)} icon={TrendingDown} color="#10b981"
          sub={`-${formatCurrency((stats?.totalPurchaseValue ?? 0) - (stats?.totalCurrentValue ?? 0))} total depreciation`} />
        <StatTile label="Fully Depreciated" value={String(stats?.fullyDepreciatedCount ?? 0)} icon={Clock} color="#f59e0b" hint="reached salvage value" />
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        <button
          onClick={() => setTab('overview')}
          className={`px-3 py-1.5 text-sm rounded-md transition-all ${tab === 'overview' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Calculator className="h-3.5 w-3.5 inline mr-1" /> Asset Calculations
        </button>
        <button
          onClick={() => setTab('rules')}
          className={`px-3 py-1.5 text-sm rounded-md transition-all ${tab === 'rules' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <TrendingDown className="h-3.5 w-3.5 inline mr-1" /> Depreciation Rules
        </button>
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <>
          {/* Search */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by asset tag, make, or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md h-9"
            />
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredCalcs.length} of {calcs?.length || 0} assets
            </span>
          </div>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Purchase Cost</TableHead>
                    <TableHead>Years Elapsed</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Depreciation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calcsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredCalcs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        <TrendingDown className="h-8 w-8 mx-auto mb-2" />
                        <p>No depreciable assets found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCalcs.map((calc: any) => {
                      const a = calc.asset
                      const depPct = Math.min(100, calc.depreciationPercent)
                      return (
                        <TableRow key={a.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => navigate('asset-detail', { id: a.id })}>
                          <TableCell>
                            <div className="font-medium font-mono text-xs">{a.assetTag || '—'}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">{a.make} {a.model}</div>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(a.purchaseDate)}</TableCell>
                          <TableCell className="tabular-nums">{formatCurrency(calc.purchaseCost)}</TableCell>
                          <TableCell>
                            <div className="text-sm tabular-nums">{calc.yearsElapsed.toFixed(1)}y</div>
                            <div className="text-[10px] text-muted-foreground">of {calc.yearsElapsed + calc.yearsRemaining}y life</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{calc.method}</Badge>
                          </TableCell>
                          <TableCell className="tabular-nums font-medium">
                            <span className={calc.isFullyDepreciated ? 'text-muted-foreground' : 'text-emerald-600'}>
                              {formatCurrency(calc.currentValue)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 w-32">
                              <div className="flex justify-between text-xs">
                                <span className="tabular-nums">{formatCurrency(calc.depreciation)}</span>
                                <span className="text-muted-foreground">{depPct.toFixed(0)}%</span>
                              </div>
                              <Progress value={depPct} className="h-1" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {calc.isFullyDepreciated ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-0">Fully Depreciated</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-0">Active</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      {/* Rules tab */}
      {tab === 'rules' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Depreciation Rules</CardTitle>
            <CardDescription>Configure how asset values depreciate over time</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Asset Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Useful Life</TableHead>
                  <TableHead>Salvage %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!rules || rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <TrendingDown className="h-8 w-8 mx-auto mb-2" />
                      <p>No depreciation rules configured</p>
                      <Button size="sm" className="mt-2" onClick={() => { setEditing(null); setShowForm(true) }}>
                        <Plus className="h-4 w-4 mr-1.5" /> Add first rule
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        {r.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{r.description}</div>}
                      </TableCell>
                      <TableCell>
                        {r.assetType ? <Badge variant="outline">{r.assetType.name}</Badge> : <Badge variant="secondary">All Types</Badge>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.method}</Badge></TableCell>
                      <TableCell className="tabular-nums">{r.usefulLifeYears} years</TableCell>
                      <TableCell className="tabular-nums">{r.salvageValuePercent}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={r.isActive ? 'bg-emerald-500/10 text-emerald-700 border-0' : 'bg-slate-500/10 text-slate-700 border-0'}>
                          {r.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(r.id); setShowForm(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteRule(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Form dialog */}
      <RuleFormDialog open={showForm} onOpenChange={setShowForm} editingId={editing} />
    </div>
  )
}

function RuleFormDialog({ open, onOpenChange, editingId }: { open: boolean; onOpenChange: (v: boolean) => void; editingId: string | null }) {
  const qc = useQueryClient()
  const { data: types } = useQuery({ queryKey: ['asset-types'], queryFn: () => assetTypesApi.list() })
  const { data: rules } = useQuery({ queryKey: ['depreciation-rules'], queryFn: () => depreciationApi.listRules() })
  const editing = rules?.find((r) => r.id === editingId)

  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  useMemo(() => {
    if (open) {
      setForm({
        name: editing?.name || '',
        assetTypeId: editing?.assetTypeId || '__all__',
        method: editing?.method || 'straight-line',
        usefulLifeYears: editing?.usefulLifeYears ?? 4,
        salvageValuePercent: editing?.salvageValuePercent ?? 0,
        description: editing?.description || '',
        isActive: editing?.isActive ?? true,
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
        assetTypeId: form.assetTypeId === '__all__' ? null : form.assetTypeId,
        usefulLifeYears: Number(form.usefulLifeYears),
        salvageValuePercent: Number(form.salvageValuePercent),
      }
      if (editingId) {
        await depreciationApi.updateRule(editingId, payload)
        toast.success('Rule updated')
      } else {
        await depreciationApi.createRule(payload)
        toast.success('Rule created')
      }
      qc.invalidateQueries({ queryKey: ['depreciation-rules'] })
      qc.invalidateQueries({ queryKey: ['depreciation-calcs'] })
      qc.invalidateQueries({ queryKey: ['depreciation-stats'] })
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
          <DialogTitle>{editingId ? 'Edit Rule' : 'Add Depreciation Rule'}</DialogTitle>
          <DialogDescription>Configure how assets depreciate</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Rule Name *</Label>
            <Input value={String(form.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Laptops 3-year straight-line" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Asset Type</Label>
              <Select value={String(form.assetTypeId || '__all__')} onValueChange={(v) => setForm({ ...form, assetTypeId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Types (default)</SelectItem>
                  {types?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Method</Label>
              <Select value={String(form.method || 'straight-line')} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPRECIATION_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Useful Life (years)</Label>
              <Input type="number" min={1} value={String(form.usefulLifeYears ?? '')} onChange={(e) => setForm({ ...form, usefulLifeYears: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Salvage Value (%)</Label>
              <Input type="number" min={0} max={100} step="0.1" value={String(form.salvageValuePercent ?? '')} onChange={(e) => setForm({ ...form, salvageValuePercent: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea rows={2} value={String(form.description || '')} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
