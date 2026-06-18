'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { expirationsApi, vendorsApi } from '@/lib/api'
import type { ExpirationItem, ExpirationUrgency, ExpiryRenewResult, Vendor } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  CalendarX2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  KeyRound,
  Search,
  Package,
  FileWarning,
  Timer,
  TrendingUp,
  Download,
  RefreshCw,
  Loader2,
  ShoppingCart,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/format'
import { useNav } from '@/lib/nav'

interface StatTileProps {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  hint?: string
}

function StatTile({ label, value, icon: Icon, color, hint }: StatTileProps) {
  return (
    <Card className="stat-tile-gradient card-hover-lift overflow-hidden border-l-4" style={{ borderLeftColor: color }}>
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

const URGENCY_BADGE_CLASS: Record<ExpirationUrgency, string> = {
  expired: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  '30d': 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  '60d': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  '90d': 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  future: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
}

function urgencyLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d ago`
  if (days === 0) return 'Today'
  return `${days}d left`
}

function defaultExpectedDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

function handleExportCsv() {
  window.open(expirationsApi.exportCsvUrl(), '_blank')
  toast.success('Exported CSV')
}

function ItemRow({
  item,
  onRenew,
  renewed,
}: {
  item: ExpirationItem
  onRenew: (item: ExpirationItem) => void
  renewed: boolean
}) {
  const navigate = useNav((s) => s.navigate)
  const isLicense = item.kind === 'license'
  const Icon = isLicense ? KeyRound : ShieldCheck
  const iconColor = isLicense ? '#8b5cf6' : '#0ea5e9'

  const chips: { label: string; value: string | null | undefined }[] = []
  if (isLicense) {
    if (item.meta?.vendor) chips.push({ label: 'Vendor', value: item.meta.vendor })
    if (item.meta?.category) chips.push({ label: 'Category', value: item.meta.category })
    if (item.meta?.seats) chips.push({ label: 'Seats', value: item.meta.seats })
  } else {
    if (item.meta?.assetType) chips.push({ label: 'Type', value: item.meta.assetType })
    if (item.meta?.department) chips.push({ label: 'Dept', value: item.meta.department })
    if (item.meta?.assetTag) chips.push({ label: 'Tag', value: item.meta.assetTag })
  }

  function onClick() {
    if (isLicense) navigate('licenses')
    else navigate('asset-detail', { id: item.entityId })
  }

  return (
    <Card
      className={`urgency-${item.urgency} cursor-pointer border transition-shadow hover:shadow-md ${
        renewed ? 'ring-2 ring-emerald-500/40' : ''
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <CardContent className="flex items-center gap-3 p-4">
        {/* Left: icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${iconColor}1a` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>

        {/* Middle: text */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{item.name}</p>
          {item.subtitle && (
            <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
          )}
          {chips.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  <span className="font-medium text-foreground/70">{c.label}:</span>{' '}
                  <span className="ml-1">{c.value ?? '—'}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: badges + dates */}
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <Badge variant="outline" className={URGENCY_BADGE_CLASS[item.urgency]}>
            {urgencyLabel(item.daysUntilExpiry)}
          </Badge>
          <p className="text-xs text-muted-foreground">{formatDate(item.expiryDate)}</p>
          {item.cost != null && (
            <p className="flex items-center gap-1 text-xs font-medium text-foreground/80">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              {formatCurrency(item.cost, item.currency || 'USD')}
            </p>
          )}
        </div>

        {/* Renew action */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {renewed && (
            <Badge className="animate-count-pop border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Renewal PO Created
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="btn-press hover:ring-2 hover:ring-emerald-500/30"
            onClick={(e) => {
              e.stopPropagation()
              onRenew(item)
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Renew</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ItemList({
  items,
  onRenew,
  renewedItemId,
}: {
  items: ExpirationItem[]
  onRenew: (item: ExpirationItem) => void
  renewedItemId: string | null
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-2">
          <EmptyState
            icon={FileWarning}
            title="No expiring items"
            description="Nothing matches your current filter. Try a different search or tab."
          />
        </CardContent>
      </Card>
    )
  }

  // Sort: expired first, then by daysUntilExpiry ascending
  const sorted = [...items].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileWarning className="h-4 w-4 text-rose-600" />
          Expiring Items
        </CardTitle>
        <CardDescription>
          {sorted.length} item{sorted.length === 1 ? '' : 's'} · sorted by urgency (expired first)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[640px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
          {sorted.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onRenew={onRenew}
              renewed={renewedItemId === item.id}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RenewForm({
  item,
  vendors,
  onSuccess,
  onClose,
}: {
  item: ExpirationItem
  vendors: Vendor[] | undefined
  onSuccess: (result: ExpiryRenewResult, itemId: string) => void
  onClose: () => void
}) {
  const navigate = useNav((s) => s.navigate)
  const isLicense = item.kind === 'license'
  const [vendorId, setVendorId] = useState('')
  const [expectedDate, setExpectedDate] = useState<string>(defaultExpectedDate())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vendorId) {
      toast.error('Please choose a vendor for this renewal.')
      return
    }
    setSubmitting(true)
    const payload = {
      vendorId,
      expectedDate: expectedDate || undefined,
      notes: notes.trim() || undefined,
      ...(isLicense ? { licenseId: item.entityId } : { assetId: item.entityId }),
    }
    try {
      const result = await expirationsApi.renew(payload)
      toast.success(`Renewal PO ${result.po.poNumber} created`, {
        action: {
          label: 'View PO',
          onClick: () => navigate('purchase-orders'),
        },
      })
      onSuccess(result, item.id)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create renewal PO'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-emerald-600" />
          Renew Expiry
        </DialogTitle>
        <DialogDescription>
          Create a draft Purchase Order to renew this{' '}
          {isLicense ? 'license' : 'warranty'}.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit}>
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <div className="font-medium text-foreground">{item.name}</div>
          {item.subtitle && (
            <div className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">Kind:</span>
              <span className="font-medium text-foreground">
                {isLicense ? 'Software License' : 'Hardware Warranty'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">Current expiry:</span>
              <span className="font-medium text-foreground">
                {formatDate(item.expiryDate)}
              </span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="renew-vendor">
              Vendor <span className="text-rose-600">*</span>
            </Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger id="renew-vendor" className="w-full">
                <SelectValue placeholder="Choose a vendor…" />
              </SelectTrigger>
              <SelectContent>
                {(vendors ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                    {v.category ? <span className="text-muted-foreground"> · {v.category}</span> : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="renew-date">Expected date (optional)</Label>
            <Input
              id="renew-date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Defaults to 30 days from today.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="renew-notes">Notes (optional)</Label>
            <Textarea
              id="renew-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any context about this renewal (e.g. seat count, contract ref)…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !vendorId}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Create Renewal PO
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

function RenewDialog({
  open,
  onOpenChange,
  item,
  vendors,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ExpirationItem | null
  vendors: Vendor[] | undefined
  onSuccess: (result: ExpiryRenewResult, itemId: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {item ? (
          <RenewForm
            key={item.id}
            item={item}
            vendors={vendors}
            onSuccess={onSuccess}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-emerald-600" />
              Renew Expiry
            </DialogTitle>
            <DialogDescription>Loading expiry details…</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ExpirationsView() {
  const { data, isLoading } = useQuery({
    queryKey: ['expirations'],
    queryFn: () => expirationsApi.list(),
  })

  // Vendor list for the Renew dialog dropdown
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorsApi.list(),
  })

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'warranty' | 'license'>('all')
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewItem, setRenewItem] = useState<ExpirationItem | null>(null)
  const [renewedItemId, setRenewedItemId] = useState<string | null>(null)

  const totals = data?.totals

  const filteredItems = useMemo(() => {
    if (!data?.items) return []
    const q = search.trim().toLowerCase()
    return data.items.filter((item) => {
      if (tab === 'warranty' && item.kind !== 'warranty') return false
      if (tab === 'license' && item.kind !== 'license') return false
      if (!q) return true
      const haystack = `${item.name} ${item.subtitle ?? ''} ${item.meta?.vendor ?? ''} ${
        item.meta?.category ?? ''
      } ${item.meta?.department ?? ''} ${item.meta?.assetType ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [data, search, tab])

  function openRenew(item: ExpirationItem) {
    setRenewItem(item)
    setRenewOpen(true)
  }

  function handleRenewSuccess(_result: ExpiryRenewResult, itemId: string) {
    setRenewedItemId(itemId)
    // Auto-clear the success badge after 5 seconds
    window.setTimeout(() => {
      setRenewedItemId((cur) => (cur === itemId ? null : cur))
    }, 5000)
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="section-accent-bar">
          <h2 className="gradient-text-shine text-xl font-bold tracking-tight">
            Expiry Center
          </h2>
          <p className="text-sm text-muted-foreground">
            Track warranty and license expirations before they become costly.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button
            variant="default"
            size="sm"
            className="btn-press shrink-0"
            onClick={handleExportCsv}
            title="Download all expirations as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <span className="live-dot" />
            <span className="gradient-text-shine text-xs font-medium">Live data</span>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {!isLoading && data && totals && (
        <>
          {/* Stat tiles row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile label="Expired" value={totals.expired} icon={CalendarX2} color="#f43f5e" hint="Action required" />
            <StatTile label="≤30 days" value={totals.within30} icon={AlertTriangle} color="#f97316" hint="Critical" />
            <StatTile label="≤60 days" value={totals.within60} icon={Clock} color="#f59e0b" hint="Plan renewals" />
            <StatTile label="≤90 days" value={totals.within90} icon={Timer} color="#0ea5e9" hint="Review soon" />
            <StatTile label="Future" value={totals.future} icon={ShieldCheck} color="#64748b" hint="In good shape" />
          </div>

          {/* Exposed value banner */}
          {totals.exposedValue > 0 && (
            <Alert variant="destructive" className="border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-semibold">
                ⚠ {formatCurrency(totals.exposedValue)} exposed value
              </AlertTitle>
              <AlertDescription className="text-rose-700/80 dark:text-rose-300/80">
                Total cost of assets and licenses that are expired or expiring within 90 days. Renew or
                replace them to avoid business disruption.
              </AlertDescription>
            </Alert>
          )}

          {/* Divider between stat tiles and tabs / items list */}
          <div className="gradient-divider-strong" aria-hidden />

          {/* Tabs + search */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'warranty' | 'license')}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="all">
                  <Package className="h-3.5 w-3.5" /> All
                </TabsTrigger>
                <TabsTrigger value="warranty">
                  <ShieldCheck className="h-3.5 w-3.5" /> Warranties
                </TabsTrigger>
                <TabsTrigger value="license">
                  <KeyRound className="h-3.5 w-3.5" /> Licenses
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, vendor, dept…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                {search && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="btn-press shrink-0"
                    onClick={() => setSearch('')}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="all" className="mt-4">
              <ItemList
                items={filteredItems}
                onRenew={openRenew}
                renewedItemId={renewedItemId}
              />
            </TabsContent>
            <TabsContent value="warranty" className="mt-4">
              <ItemList
                items={filteredItems}
                onRenew={openRenew}
                renewedItemId={renewedItemId}
              />
            </TabsContent>
            <TabsContent value="license" className="mt-4">
              <ItemList
                items={filteredItems}
                onRenew={openRenew}
                renewedItemId={renewedItemId}
              />
            </TabsContent>
          </Tabs>

          {/* Footer summary */}
          {data.items.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredItems.length} of {data.items.length} items ·{' '}
              {data.items.filter((i) => i.kind === 'warranty').length} warranties ·{' '}
              {data.items.filter((i) => i.kind === 'license').length} licenses
            </p>
          )}
        </>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <Card>
          <CardContent className="p-2">
            <EmptyState
              icon={ShieldCheck}
              title="No expirations tracked"
              description="Once you add assets with warranty dates or software licenses with expiry dates, they will appear here."
            />
          </CardContent>
        </Card>
      )}

      <RenewDialog
        open={renewOpen}
        onOpenChange={setRenewOpen}
        item={renewItem}
        vendors={vendors}
        onSuccess={handleRenewSuccess}
      />
    </div>
  )
}
