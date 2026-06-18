'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { assetsApi, departmentsApi, locationsApi, assetTypesApi } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { STATUS_CONFIG, ASSET_STATUSES } from '@/lib/types'
import { formatDate, formatCurrency } from '@/lib/format'
import {
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Pencil,
  Trash2,
  Package,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ScanText,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'assetTag', label: 'Asset Tag' },
  { value: 'make', label: 'Make' },
  { value: 'model', label: 'Model' },
  { value: 'status', label: 'Status' },
  { value: 'purchaseDate', label: 'Purchase Date' },
  { value: 'cost', label: 'Cost' },
]

export function AssetsListView() {
  const { navigate, params } = useNav()
  const qc = useQueryClient()
  const [search, setSearch] = useState(params.search || '')
  const [status, setStatus] = useState<string>(params.status || 'all')
  const [assetTypeId, setAssetTypeId] = useState<string>('all')
  const [departmentId, setDepartmentId] = useState<string>('all')
  const [locationId, setLocationId] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(15)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)

  const { data: types } = useQuery({ queryKey: ['asset-types'], queryFn: () => assetTypesApi.list() })
  const { data: depts } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list() })
  const { data: locs } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() })

  const query = useMemo(
    () => ({
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      assetTypeId: assetTypeId === 'all' ? undefined : assetTypeId,
      departmentId: departmentId === 'all' ? undefined : departmentId,
      locationId: locationId === 'all' ? undefined : locationId,
      page,
      pageSize,
      sortBy,
      sortDir,
    }),
    [search, status, assetTypeId, departmentId, locationId, page, pageSize, sortBy, sortDir]
  )

  const { data, isLoading } = useQuery({
    queryKey: ['assets', query],
    queryFn: () => assetsApi.list(query),
  })

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0

  function toggleSort(col: string) {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this asset? This cannot be undone.')) return
    try {
      await assetsApi.delete(id)
      toast.success('Asset deleted')
      qc.invalidateQueries({ queryKey: ['assets'] })
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  function exportCsv() {
    if (!data) return
    const headers = ['Asset Tag', 'Type', 'Make', 'Model', 'Serial', 'Status', 'User', 'Department', 'Location', 'Cost', 'Purchase Date']
    const rows = data.data.map((a) => [
      a.assetTag || '',
      a.assetType?.name || '',
      a.make || '',
      a.model || '',
      a.serialNumber || '',
      a.status,
      a.assignedTo?.fullName || '',
      a.department?.name || '',
      a.location?.name || '',
      a.cost?.toString() || '',
      formatDate(a.purchaseDate),
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `assets-export-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported CSV')
  }

  function clearFilters() {
    setSearch('')
    setStatus('all')
    setAssetTypeId('all')
    setDepartmentId('all')
    setLocationId('all')
    setPage(1)
  }

  const hasFilters = search || status !== 'all' || assetTypeId !== 'all' || departmentId !== 'all' || locationId !== 'all'

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tag, serial, IMEI, make, model..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <Filter className="h-4 w-4 mr-1.5" /> Filters
            {hasFilters && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{[search, status !== 'all', assetTypeId !== 'all', departmentId !== 'all', locationId !== 'all'].filter(Boolean).length}</Badge>}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data}>
            <Download className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('ocr-upload')}>
            <ScanText className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Scan</span>
          </Button>
          <Button size="sm" onClick={() => navigate('asset-new')}>
            <Plus className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Add Asset</span>
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-1.5 animate-fade-in-up">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {search && (
            <Badge variant="secondary" className="gap-1">
              Search: "{search}"
              <button onClick={() => setSearch('')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {status}
              <button onClick={() => setStatus('all')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {assetTypeId !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Type: {types?.find((t) => t.id === assetTypeId)?.name || 'Unknown'}
              <button onClick={() => setAssetTypeId('all')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {departmentId !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Dept: {depts?.find((d) => d.id === departmentId)?.name || 'Unknown'}
              <button onClick={() => setDepartmentId('all')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {locationId !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Loc: {locs?.find((l) => l.id === locationId)?.name || 'Unknown'}
              <button onClick={() => setLocationId('all')} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {ASSET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={assetTypeId} onValueChange={(v) => { setAssetTypeId(v); setPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {depts?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Select value={locationId} onValueChange={(v) => { setLocationId(v); setPage(1) }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locs?.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results summary & sort */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {data ? (
            <>
              Showing <span className="font-medium text-foreground">{data.data.length}</span> of{' '}
              <span className="font-medium text-foreground">{data.total}</span> assets
            </>
          ) : (
            'Loading...'
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleSort(sortBy)}>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('assetTag')}>Asset Tag</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('type')}>Type</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('make')}>Make / Model</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>Status</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('cost')}>Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data || data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8" />
                      <p>No assets found</p>
                      <Button size="sm" onClick={() => navigate('asset-new')}>
                        <Plus className="h-4 w-4 mr-1.5" /> Add your first asset
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((asset) => {
                  const cfg = STATUS_CONFIG[asset.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['In Stock']
                  return (
                    <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate('asset-detail', { id: asset.id })}>
                      <TableCell className="font-mono text-xs">{asset.assetTag || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{asset.assetType?.name || '—'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{asset.make} {asset.model}</div>
                        {asset.modelNumber && <div className="text-xs text-muted-foreground">{asset.modelNumber}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{asset.serialNumber || '—'}</TableCell>
                      <TableCell>{asset.assignedTo?.fullName || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{asset.department?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{asset.location?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0 gap-1`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{asset.cost != null ? formatCurrency(asset.cost, asset.currency) : '—'}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate('asset-detail', { id: asset.id })}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('asset-edit', { id: asset.id })}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(asset.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
            </PaginationItem>
            <PaginationItem className="text-sm">
              <span className="px-3">Page {page} of {totalPages}</span>
            </PaginationItem>
            <PaginationItem>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
