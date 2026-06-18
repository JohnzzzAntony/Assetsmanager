'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { expirationsApi } from '@/lib/api'
import type { ExpirationItem, ExpirationUrgency } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
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
} from 'lucide-react'
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

function ItemRow({ item }: { item: ExpirationItem }) {
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
      className={`urgency-${item.urgency} cursor-pointer border transition-shadow hover:shadow-md`}
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
      </CardContent>
    </Card>
  )
}

function ItemList({ items }: { items: ExpirationItem[] }) {
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
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ExpirationsView() {
  const { data, isLoading } = useQuery({
    queryKey: ['expirations'],
    queryFn: () => expirationsApi.list(),
  })

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'warranty' | 'license'>('all')

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

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Expiry Center</h2>
          <p className="text-sm text-muted-foreground">
            Track warranty and license expirations before they become costly.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <span className="live-dot" />
          Live data
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
              <ItemList items={filteredItems} />
            </TabsContent>
            <TabsContent value="warranty" className="mt-4">
              <ItemList items={filteredItems} />
            </TabsContent>
            <TabsContent value="license" className="mt-4">
              <ItemList items={filteredItems} />
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
    </div>
  )
}
