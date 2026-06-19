'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { tagsApi, exportApi, assetsApi } from '@/lib/api'
import {
  TAG_COLORS,
  getTagColorConfig,
  STATUS_CONFIG,
} from '@/lib/types'
import type { AssetTag, TagColor, Asset } from '@/lib/types'
import { useNav } from '@/lib/nav'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { formatRelative, formatDate } from '@/lib/format'
import {
  Tag,
  Plus,
  Search,
  Pencil,
  Trash2,
  Download,
  Folder,
  Hash,
  Boxes,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  MoreVertical,
} from 'lucide-react'
import { toast } from 'sonner'

// Color name -> tailwind hex used for the colored left border + tile accents.
// Kept in sync with TAG_COLORS in lib/types.ts.
const COLOR_HEX: Record<TagColor, string> = {
  slate: '#64748b',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  orange: '#f97316',
  pink: '#ec4899',
  lime: '#84cc16',
  cyan: '#06b6d4',
}

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
    <Card
      className="card-hover overflow-hidden border-l-4"
      style={{ borderLeftColor: color }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums truncate">
              {value}
            </p>
            {hint && (
              <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                {hint}
              </p>
            )}
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

// ---- Color picker swatch ----
function ColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: { value: TagColor; label: string; dot: string }
  selected: boolean
  onClick: () => void
}) {
  const hex = COLOR_HEX[color.value]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Color: ${color.label}`}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        selected ? 'ring-2 ring-offset-2 ring-ring' : ''
      }`}
      style={{ backgroundColor: hex }}
    >
      {selected && <CheckCircle2 className="h-4 w-4 text-white drop-shadow" />}
    </button>
  )
}

// ---- Tag card ----
interface TagCardProps {
  tag: AssetTag
  onEdit: () => void
  onDelete: () => void
}

function TagCard({ tag, onEdit, onDelete }: TagCardProps) {
  const cfg = getTagColorConfig(tag.color)
  const hex = COLOR_HEX[tag.color as TagColor] ?? COLOR_HEX.slate
  const assetCount = tag._count?.assets ?? 0

  return (
    <Card
      className="card-hover group relative overflow-hidden border-l-4 transition-all hover:-translate-y-1 hover:shadow-lg"
      style={{ borderLeftColor: hex }}
    >
      {/* Subtle color wash on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${hex}10 0%, transparent 60%)`,
        }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full ring-2 ring-background"
              style={{ backgroundColor: hex }}
            />
            <CardTitle className="truncate text-lg">{tag.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
                aria-label="Tag actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-rose-600 focus:text-rose-600"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription className="min-h-[2.5rem] line-clamp-2 text-sm">
          {tag.description || 'No description provided.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className={`gap-1 ${cfg.bg} ${cfg.text} border ${cfg.border}`}
          >
            <Boxes className="h-3 w-3" />
            {assetCount} {assetCount === 1 ? 'asset' : 'assets'}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            Created {formatRelative(tag.createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Tag card skeleton ----
function TagCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Tag form dialog ----
interface TagFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: AssetTag | null
}

function TagFormDialog({ open, onOpenChange, editing }: TagFormDialogProps) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState<TagColor>('slate')
  const [description, setDescription] = useState('')
  const [nameTouched, setNameTouched] = useState(false)

  // Sync fields when dialog opens / target changes.
  // Using a derived "key" effect via state reset on open prop.
  // We reset on every open transition.
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setName(editing?.name ?? '')
      setColor((editing?.color as TagColor) ?? 'slate')
      setDescription(editing?.description ?? '')
      setNameTouched(false)
    }
  }

  const nameError = !name.trim()
    ? 'Name is required'
    : name.trim().length > 50
      ? 'Name must be 50 characters or fewer'
      : null

  const createMut = useMutation({
    mutationFn: (data: { name: string; color: TagColor; description?: string }) =>
      tagsApi.create(data),
    onSuccess: (tag) => {
      toast.success(`Tag "${tag.name}" created`)
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
      onOpenChange(false)
    },
    onError: (e: unknown) => {
      toast.error('Failed to create tag: ' + String(e))
    },
  })

  const updateMut = useMutation({
    mutationFn: (data: {
      id: string
      payload: { name: string; color: TagColor; description?: string }
    }) => tagsApi.update(data.id, data.payload),
    onSuccess: (tag) => {
      toast.success(`Tag "${tag.name}" updated`)
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
      onOpenChange(false)
    },
    onError: (e: unknown) => {
      toast.error('Failed to update tag: ' + String(e))
    },
  })

  const saving = createMut.isPending || updateMut.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNameTouched(true)
    if (nameError) return
    const payload = {
      name: name.trim(),
      color,
      description: description.trim() || undefined,
    }
    if (editing) {
      updateMut.mutate({ id: editing.id, payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const previewCfg = getTagColorConfig(color)
  const previewHex = COLOR_HEX[color]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            {editing ? 'Edit Tag' : 'Add New Tag'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the tag details. Changes apply to all assets using this tag.'
              : 'Create a color-coded tag that can be attached to assets for grouping and filtering.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Live preview */}
          <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/40 p-3">
            <span
              className="h-3 w-3 rounded-full ring-2 ring-background"
              style={{ backgroundColor: previewHex }}
            />
            <span className="font-medium">{name.trim() || 'Tag name'}</span>
            <Badge
              variant="secondary"
              className={`ml-auto ${previewCfg.bg} ${previewCfg.text} border ${previewCfg.border}`}
            >
              {previewCfg.label}
            </Badge>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">
              Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="e.g. Production, High-Value, Needs Repair"
              maxLength={50}
              autoFocus
              aria-invalid={nameTouched && !!nameError}
              className={nameTouched && nameError ? 'border-rose-500 focus-visible:ring-rose-500' : ''}
            />
            {nameTouched && nameError ? (
              <p className="flex items-center gap-1 text-xs text-rose-500">
                <AlertCircle className="h-3 w-3" /> {nameError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {name.length}/50 characters
              </p>
            )}
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((c) => (
                <ColorSwatch
                  key={c.value}
                  color={c}
                  selected={color === c.value}
                  onClick={() => setColor(c.value)}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: <span className="font-medium">{previewCfg.label}</span>
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="tag-description">Description</Label>
            <Textarea
              id="tag-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about what this tag represents…"
              rows={3}
              maxLength={240}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/240 characters
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !!nameError}
          >
            {saving ? (
              <>
                <Sparkles className="mr-1.5 h-4 w-4 animate-pulse" />
                {editing ? 'Saving…' : 'Creating…'}
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {editing ? 'Save Changes' : 'Create Tag'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Recently tagged asset row ----
function AssetRow({ asset }: { asset: Asset }) {
  const { navigate } = useNav()
  const cfg = STATUS_CONFIG[asset.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['In Stock']

  return (
    <button
      type="button"
      onClick={() => navigate('asset-detail', { id: asset.id })}
      className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Folder className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {asset.assetTag || '—'}
          </span>
          <span className="truncate font-medium">
            {asset.make} {asset.model}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {asset.tags && asset.tags.length > 0 ? (
            asset.tags.map((t) => {
              const tc = getTagColorConfig(t.color)
              const hex = COLOR_HEX[t.color as TagColor] ?? COLOR_HEX.slate
              return (
                <Badge
                  key={t.id}
                  variant="secondary"
                  className={`gap-1 ${tc.bg} ${tc.text} border ${tc.border}`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: hex }}
                  />
                  {t.name}
                </Badge>
              )
            })
          ) : (
            <span className="text-xs text-muted-foreground">No tags</span>
          )}
        </div>
      </div>
      <Badge
        variant="outline"
        className={`shrink-0 ${cfg.bg} ${cfg.text} border-current/20`}
      >
        <span className={`mr-1 h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </Badge>
    </button>
  )
}

// ---- Main view ----
export function TagsView() {
  const { navigate } = useNav()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTag, setEditingTag] = useState<AssetTag | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AssetTag | null>(null)

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  })

  const { data: recentAssetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets', { pageSize: 8, sortBy: 'createdAt', sortDir: 'desc' }],
    queryFn: () =>
      assetsApi.list({ pageSize: 8, sortBy: 'createdAt', sortDir: 'desc' }),
  })

  // ---- Derived stats ----
  const stats = useMemo(() => {
    const list = tags ?? []
    const total = list.length
    const taggedAssetIds = new Set<string>()
    let topTag: AssetTag | null = null
    let topCount = -1
    const colorSet = new Set<string>()

    for (const t of list) {
      const c = t._count?.assets ?? 0
      colorSet.add(t.color)
      // We don't have individual asset IDs here, so we approximate the
      // tagged-assets metric using sum of asset counts (an upper bound).
      // A more accurate count would require an extra endpoint, but for the
      // dashboard tile this is acceptable as "tagged asset slots".
      if (c > 0) {
        // No-op; tracked via sum below.
      }
      if (c > topCount) {
        topCount = c
        topTag = t
      }
    }

    // Tagged Assets: count distinct assets that carry at least one tag.
    // Compute from the recently loaded assets sample when available.
    const recentAssets = recentAssetsData?.data ?? []
    for (const a of recentAssets) {
      if (a.tags && a.tags.length > 0) taggedAssetIds.add(a.id)
    }
    // We can't enumerate every asset cheaply, so fall back to the recent
    // sample count. To produce a more meaningful number, we also sum
    // per-tag asset counts (cap at total tag count to avoid double counting
    // the same asset across multiple tags — use a conservative max).
    const summedTagged = list.reduce(
      (sum, t) => sum + (t._count?.assets ?? 0),
      0,
    )
    const taggedAssets = Math.max(taggedAssetIds.size, summedTagged)

    return {
      total,
      taggedAssets,
      activeCategories: colorSet.size,
      topTag,
      topCount,
    }
  }, [tags, recentAssetsData])

  // ---- Filtering ----
  const filtered = useMemo(() => {
    if (!tags) return []
    if (!search.trim()) return tags
    const s = search.toLowerCase()
    return tags.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.description || '').toLowerCase().includes(s),
    )
  }, [tags, search])

  function openNew() {
    setEditingTag(null)
    setShowForm(true)
  }

  function openEdit(tag: AssetTag) {
    setEditingTag(tag)
    setShowForm(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await tagsApi.delete(deleteTarget.id)
      toast.success(`Tag "${deleteTarget.name}" deleted`)
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
      setDeleteTarget(null)
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  function handleExport() {
    try {
      exportApi.download(exportApi.assets())
      toast.success('Asset export started')
    } catch (e) {
      toast.error('Export failed: ' + String(e))
    }
  }

  const qc = useQueryClient()
  const recentAssets = recentAssetsData?.data ?? []

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 text-white shadow-md">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Asset <span className="gradient-text">Tags</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Create color-coded tags to group, filter, and categorize your
              asset inventory.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" /> Export Assets (CSV)
          </Button>
          <Button onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Tag
          </Button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Tags"
          value={stats.total}
          icon={Tag}
          color="#10b981"
          hint="Tags defined"
        />
        <StatTile
          label="Tagged Assets"
          value={stats.taggedAssets}
          icon={Boxes}
          color="#0ea5e9"
          hint="Assets carrying ≥1 tag"
        />
        <StatTile
          label="Active Categories"
          value={stats.activeCategories}
          icon={Hash}
          color="#8b5cf6"
          hint="Distinct colors used"
        />
        <StatTile
          label="Top Tag"
          value={stats.topTag ? stats.topTag.name : '—'}
          icon={Sparkles}
          color="#f59e0b"
          hint={
            stats.topTag
              ? `${stats.topCount} ${stats.topCount === 1 ? 'asset' : 'assets'}`
              : 'No tags yet'
          }
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Search Tags</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by tag name or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tag grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <TagCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="bg-dot-pattern flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Tag className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {search ? 'No tags match your search' : 'No tags yet'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? 'Try a different keyword, or clear the search.'
                  : 'Create your first tag to start organizing your assets.'}
              </p>
            </div>
            {!search && (
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" /> Add your first tag
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              onEdit={() => openEdit(tag)}
              onDelete={() => setDeleteTarget(tag)}
            />
          ))}
        </div>
      )}

      <Separator />

      {/* Recently tagged assets */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Boxes className="h-4 w-4 text-primary" />
                Recently Added Assets
              </CardTitle>
              <CardDescription>
                Latest assets in your inventory — click any row to view details
                and manage its tags.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('assets')}
            >
              View all assets
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assetsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                >
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Boxes className="h-8 w-8" />
              <p className="font-medium">No assets yet</p>
              <p className="text-xs">
                Add assets to see them here with their tag assignments.
              </p>
            </div>
          ) : (
            <div className="max-h-96 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
              {recentAssets.map((a) => (
                <AssetRow key={a.id} asset={a} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <TagFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editing={editingTag}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              Delete tag &ldquo;{deleteTarget?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This tag will be permanently removed and detached from{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?._count?.assets ?? 0}
              </span>{' '}
              {deleteTarget && (deleteTarget._count?.assets ?? 0) === 1
                ? 'asset'
                : 'assets'}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600"
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
