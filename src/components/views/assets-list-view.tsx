'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { assetsApi, departmentsApi, locationsApi, assetTypesApi, exportApi, tagsApi } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { EmptyState } from '@/components/empty-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { STATUS_CONFIG, ASSET_STATUSES, getTagColorConfig } from '@/lib/types'
import type { AssetStatus } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
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
  Tag,
  Loader2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'assetTag', label: 'Asset Tag' },
  { value: 'make', label: 'Make' },
  { value: 'model', label: 'Model' },
  { value: 'status', label: 'Status' },
  { value: 'purchaseDate', label: 'Purchase Date' },
  { value: 'cost', label: 'Cost' },
]

const BULK_STATUSES: AssetStatus[] = ASSET_STATUSES

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

  // Tag filtering state
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagMatch, setTagMatch] = useState<'any' | 'all'>('any')

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: types } = useQuery({ queryKey: ['asset-types'], queryFn: () => assetTypesApi.list() })
  const { data: depts } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list() })
  const { data: locs } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() })
  const { data: tags } = useQuery({ queryKey: ['tags'], queryFn: () => tagsApi.list() })

  const query = useMemo(
    () => ({
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      assetTypeId: assetTypeId === 'all' ? undefined : assetTypeId,
      departmentId: departmentId === 'all' ? undefined : departmentId,
      locationId: locationId === 'all' ? undefined : locationId,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      tagMatch: selectedTagIds.length > 0 ? tagMatch : undefined,
      page,
      pageSize,
      sortBy,
      sortDir,
    }),
    [search, status, assetTypeId, departmentId, locationId, selectedTagIds, tagMatch, page, pageSize, sortBy, sortDir]
  )

  const { data, isLoading } = useQuery({
    queryKey: ['assets', query],
    queryFn: () => assetsApi.list(query),
  })

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0

  const pageIds = useMemo(() => (data?.data || []).map((a) => a.id), [data])
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const someOnPageSelected = pageIds.some((id) => selectedIds.has(id))
  const selectedCount = selectedIds.size

  function toggleSort(col: string) {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
    setPage(1)
  }

  function toggleRowSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllOnPage() {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function invalidateAfterBulk() {
    qc.invalidateQueries({ queryKey: ['assets'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['tags'] })
  }

  async function handleBulk(
    action: 'setStatus' | 'delete' | 'assignTag' | 'removeTag',
    payload?: { status?: string; tagId?: string }
  ) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkLoading(true)
    try {
      const res = await assetsApi.bulk({ ids, action, payload })
      toast.success(res.message || `Bulk action completed (${res.affected} affected)`)
      invalidateAfterBulk()
      clearSelection()
    } catch (e) {
      toast.error('Bulk action failed: ' + String(e))
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleBulkDelete() {
    setDeleteDialogOpen(false)
    await handleBulk('delete')
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
    exportApi.download(exportApi.assets())
    toast.success('Exporting CSV...')
  }

  function clearFilters() {
    setSearch('')
    setStatus('all')
    setAssetTypeId('all')
    setDepartmentId('all')
    setLocationId('all')
    setSelectedTagIds([])
    setPage(1)
  }

  const hasFilters =
    !!search ||
    status !== 'all' ||
    assetTypeId !== 'all' ||
    departmentId !== 'all' ||
    locationId !== 'all' ||
    selectedTagIds.length > 0

  const activeFilterCount = [
    !!search,
    status !== 'all',
    assetTypeId !== 'all',
    departmentId !== 'all',
    locationId !== 'all',
    selectedTagIds.length > 0,
  ].filter(Boolean).length

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
            {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{activeFilterCount}</Badge>}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data}>
            <Download className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('ocr-upload')}>
            <ScanText className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Scan</span>
          </Button>
          <Button size="sm" className="btn-press" onClick={() => navigate('asset-new')}>
            <Plus className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Add Asset</span>
          </Button>
        </div>
      </div>

      {/* Tag filter chip row */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-xs text-muted-foreground pr-0.5">Tags:</span>
        {tags && tags.length > 0 ? (
          tags.map((tag) => {
            const tc = getTagColorConfig(tag.color)
            const selected = selectedTagIds.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                aria-pressed={selected}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs cursor-pointer transition-all hover:scale-105 ${tc.bg} ${tc.text} ${selected ? 'ring-2 ring-offset-1 ring-primary scale-105 font-medium' : ''}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${tc.dot}`} />
                {tag.name}
                {typeof tag._count?.assets === 'number' && (
                  <span className="opacity-60 ml-0.5 tabular-nums">{tag._count.assets}</span>
                )}
              </button>
            )
          })
        ) : (
          <span className="text-xs text-muted-foreground px-2 py-1">No tags available</span>
        )}
        {selectedTagIds.length > 0 && (
          <div className="ml-1 flex items-center gap-0.5 rounded-full border bg-muted/40 p-0.5 shrink-0">
            <span className="px-1.5 text-[11px] text-muted-foreground">Match:</span>
            <button
              type="button"
              onClick={() => { setTagMatch('any'); setPage(1) }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${tagMatch === 'any' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ANY
            </button>
            <button
              type="button"
              onClick={() => { setTagMatch('all'); setPage(1) }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${tagMatch === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              ALL
            </button>
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-1.5 animate-fade-in-up">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {search && (
            <Badge variant="secondary" className="gap-1">
              Search: &quot;{search}&quot;
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
          {selectedTagIds.map((tagId) => {
            const tag = tags?.find((t) => t.id === tagId)
            if (!tag) return null
            const tc = getTagColorConfig(tag.color)
            return (
              <Badge key={tagId} variant="secondary" className={`gap-1 border ${tc.bg} ${tc.text} ${tc.border}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${tc.dot}`} />
                Tag: {tag.name}
                <button onClick={() => toggleTag(tagId)} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button>
              </Badge>
            )
          })}
          {selectedTagIds.length > 1 && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              Match: {tagMatch.toUpperCase()}
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

      {/* Bulk actions toolbar */}
      {selectedCount > 0 && (
        <div className="sticky top-16 z-30 flex flex-wrap items-center gap-2 rounded-lg border bg-primary/5 px-3 py-2 backdrop-blur-sm animate-fade-in-up">
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-semibold">
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={clearSelection}
            disabled={bulkLoading}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Clear selection
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* Change Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkLoading}>
                  {bulkLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                  Change Status
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Set status to…</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {BULK_STATUSES.map((s) => {
                  const cfg = STATUS_CONFIG[s]
                  return (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => handleBulk('setStatus', { status: s })}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {s}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Tag */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkLoading}>
                  <Tag className="h-3.5 w-3.5 mr-1.5" />
                  Add Tag
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto scrollbar-thin">
                <DropdownMenuLabel>Assign tag</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tags && tags.length > 0 ? (
                  tags.map((tag) => {
                    const tc = getTagColorConfig(tag.color)
                    return (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={() => handleBulk('assignTag', { tagId: tag.id })}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${tc.dot}`} />
                        {tag.name}
                      </DropdownMenuItem>
                    )
                  })
                ) : (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No tags available</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Remove Tag */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkLoading}>
                  <Tag className="h-3.5 w-3.5 mr-1.5" />
                  Remove Tag
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto scrollbar-thin">
                <DropdownMenuLabel>Remove tag</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tags && tags.length > 0 ? (
                  tags.map((tag) => {
                    const tc = getTagColorConfig(tag.color)
                    return (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={() => handleBulk('removeTag', { tagId: tag.id })}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${tc.dot}`} />
                        {tag.name}
                      </DropdownMenuItem>
                    )
                  })
                ) : (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No tags available</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete (with confirmation) */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={bulkLoading}>
                  {bulkLoading
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete {selectedCount} asset{selectedCount === 1 ? '' : 's'}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. The selected assets will be permanently removed from the
                    system along with their assignment history and images.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={bulkLoading}
                  >
                    {bulkLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    Delete {selectedCount} asset{selectedCount === 1 ? '' : 's'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleSelectAllOnPage}
                    aria-label="Select all on page"
                  />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('assetTag')}>Asset Tag</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('type')}>Type</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('make')}>Make / Model</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>Status</TableHead>
                <TableHead className="min-w-[140px]">Tags</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('cost')}>Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 12 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full shimmer-bg" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data || data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-32 text-center">
                    <EmptyState
                      icon={Package}
                      title="No assets found"
                      description="Try adjusting your filters or add a new asset."
                      action={{ label: 'Add Asset', onClick: () => navigate('asset-new'), icon: Plus }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((asset) => {
                  const cfg = STATUS_CONFIG[asset.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['In Stock']
                  const assetTags = asset.tags || []
                  const isRowSelected = selectedIds.has(asset.id)
                  return (
                    <TableRow
                      key={asset.id}
                      className={`cursor-pointer hover:bg-muted/40 ${isRowSelected ? 'bg-primary/5' : ''}`}
                      onClick={() => navigate('asset-detail', { id: asset.id })}
                    >
                      <TableCell
                        className="w-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isRowSelected}
                          onCheckedChange={() => toggleRowSelection(asset.id)}
                          aria-label={`Select asset ${asset.assetTag || asset.id}`}
                        />
                      </TableCell>
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {assetTags.length > 0 ? (
                            <>
                              {assetTags.slice(0, 2).map((tag) => {
                                const tc = getTagColorConfig(tag.color)
                                const active = selectedTagIds.includes(tag.id)
                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    title={tag.description || tag.name}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] cursor-pointer transition-all hover:scale-105 ${tc.bg} ${tc.text} ${active ? 'ring-1 ring-primary' : ''}`}
                                  >
                                    <span className={`h-1 w-1 rounded-full ${tc.dot}`} />
                                    {tag.name}
                                  </button>
                                )
                              })}
                              {assetTags.length > 2 && (
                                <span
                                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                                  title={assetTags.slice(2).map((t) => t.name).join(', ')}
                                >
                                  +{assetTags.length - 2}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
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
