'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNav, type ViewName } from '@/lib/nav'
import {
  assetsApi,
  personsApi,
  vendorsApi,
  locationsApi,
  purchaseOrdersApi,
} from '@/lib/api'
import { Input } from '@/components/ui/input'
import {
  Search,
  Plus,
  ScanText,
  Upload,
  QrCode,
  LayoutDashboard,
  Package,
  CalendarX2,
  BarChart3,
  ScrollText,
  Bell,
  Boxes,
  Building2,
  MapPin,
  Users,
  Layers,
  ArrowLeftRight,
  KeyRound,
  Tag,
  CalendarClock,
  Store,
  ShoppingCart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Local copy of the sidebar navigation list. Kept in sync with src/components/sidebar.tsx
// so the palette can offer every destination without importing the sidebar component.
interface NavItemDef {
  label: string
  view: ViewName
  icon: LucideIcon
}

const NAV_ITEMS_LOCAL: NavItemDef[] = [
  { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
  { label: 'Assets', view: 'assets', icon: Package },
  { label: 'Expiry Center', view: 'expirations', icon: CalendarX2 },
  { label: 'Reports & Analytics', view: 'reports', icon: BarChart3 },
  { label: 'Audit Log', view: 'audit-log', icon: ScrollText },
  { label: 'Notifications', view: 'notifications', icon: Bell },
  { label: 'Add Asset', view: 'asset-new', icon: Boxes },
  { label: 'Add via Image (OCR)', view: 'ocr-upload', icon: ScanText },
  { label: 'Import Excel', view: 'import', icon: Upload },
  { label: 'Print Asset Labels', view: 'asset-labels', icon: QrCode },
  { label: 'Check-out Requests', view: 'checkouts', icon: ArrowLeftRight },
  { label: 'Software Licenses', view: 'licenses', icon: KeyRound },
  { label: 'Asset Tags', view: 'tags', icon: Tag },
  { label: 'Asset Bookings', view: 'bookings', icon: CalendarClock },
  { label: 'Vendors', view: 'vendors', icon: Store },
  { label: 'Purchase Orders', view: 'purchase-orders', icon: ShoppingCart },
  { label: 'Departments', view: 'departments', icon: Building2 },
  { label: 'Locations', view: 'locations', icon: MapPin },
  { label: 'Persons', view: 'persons', icon: Users },
  { label: 'Asset Types', view: 'asset-types', icon: Layers },
]

interface QuickActionDef {
  label: string
  view: ViewName
  icon: LucideIcon
  hint: string
}

const QUICK_ACTIONS: QuickActionDef[] = [
  { label: 'Add Asset', view: 'asset-new', icon: Plus, hint: 'Create a new asset record' },
  { label: 'Add via Image (OCR)', view: 'ocr-upload', icon: ScanText, hint: 'Upload image & auto-fill fields' },
  { label: 'Import Excel', view: 'import', icon: Upload, hint: 'Bulk import from CSV / XLSX' },
  { label: 'Print Asset Labels', view: 'asset-labels', icon: QrCode, hint: 'Generate QR / barcode labels' },
]

// Category is a string so we can include live counts in the section headers
// (e.g. "Assets (5)" / "Persons (2)") when surfacing search results.
type CmdCategory = string

interface CmdItem {
  id: string
  label: string
  hint: string
  icon: LucideIcon
  category: CmdCategory
  action: () => void
}

function matches(query: string, ...needles: string[]): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return needles.some((n) => n.toLowerCase().includes(q))
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { navigate } = useNav()

  // Global key listener: Cmd/Ctrl+K toggles, Escape closes.
  // Dependent on `open` so the Escape branch only fires when the palette is visible
  // and so we can reset the query + selection synchronously on open.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) {
          setOpen(false)
        } else {
          setQuery('')
          setDebouncedQuery('')
          setSelectedIndex(0)
          setOpen(true)
        }
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Debounce the search query so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(t)
  }, [query])

  // Focus the input when the palette opens.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  // Combined multi-entity search — fires a single debounced request that fans out to
  // 5 endpoints in parallel. Non-asset entities are filtered client-side because their
  // list endpoints don't support server-side `?search=`. Limit to top 3 matches per type.
  const { data: searchResults } = useQuery({
    queryKey: ['command-palette-search', debouncedQuery],
    queryFn: async () => {
      const [assets, persons, vendors, locations, pos] = await Promise.all([
        assetsApi.list({ search: debouncedQuery, pageSize: 5 }),
        personsApi.list(),
        vendorsApi.list(),
        locationsApi.list(),
        purchaseOrdersApi.list(),
      ])
      return { assets, persons, vendors, locations, pos }
    },
    enabled: debouncedQuery.trim().length > 0,
  })

  // Build the flat, categorized list of items based on the current query.
  const items = useMemo<CmdItem[]>(() => {
    const q = query.trim()
    const list: CmdItem[] = []

    for (const a of QUICK_ACTIONS) {
      if (matches(q, a.label, a.hint, 'Quick Actions')) {
        list.push({
          id: `qa-${a.view}`,
          label: a.label,
          hint: a.hint,
          icon: a.icon,
          category: 'Quick Actions',
          action: () => navigate(a.view),
        })
      }
    }

    for (const n of NAV_ITEMS_LOCAL) {
      if (matches(q, n.label, 'Quick Navigation')) {
        list.push({
          id: `nav-${n.view}`,
          label: n.label,
          hint: 'Go to view',
          icon: n.icon,
          category: 'Quick Navigation',
          action: () => navigate(n.view),
        })
      }
    }

    if (q && searchResults) {
      // --- Assets (server-side search via /api/assets?search=) ---
      const assetHits = searchResults.assets?.data ?? []
      if (assetHits.length > 0) {
        const catName = `Assets (${assetHits.length})`
        for (const a of assetHits) {
          const label =
            [a.make, a.model].filter(Boolean).join(' ').trim() ||
            a.assetTag ||
            a.serialNumber ||
            'Untitled asset'
          const hint = [a.assetTag, a.assetType?.name, a.serialNumber]
            .filter(Boolean)
            .join(' · ')
          list.push({
            id: `search-asset-${a.id}`,
            label,
            hint: hint || 'Asset',
            icon: Package,
            category: catName,
            action: () => navigate('asset-detail', { id: a.id }),
          })
        }
      }

      // --- Persons (filter client-side by fullName / email / role) ---
      const personHits = (searchResults.persons ?? [])
        .filter((p) => matches(q, p.fullName, p.email ?? '', p.role ?? ''))
        .slice(0, 3)
      if (personHits.length > 0) {
        const catName = `Persons (${personHits.length})`
        for (const p of personHits) {
          list.push({
            id: `search-person-${p.id}`,
            label: p.fullName,
            hint: p.email || p.role || 'Person',
            icon: Users,
            category: catName,
            action: () => navigate('persons'),
          })
        }
      }

      // --- Vendors (filter by name / category / contactPerson) ---
      const vendorHits = (searchResults.vendors ?? [])
        .filter((v) => matches(q, v.name, v.category ?? '', v.contactPerson ?? ''))
        .slice(0, 3)
      if (vendorHits.length > 0) {
        const catName = `Vendors (${vendorHits.length})`
        for (const v of vendorHits) {
          list.push({
            id: `search-vendor-${v.id}`,
            label: v.name,
            hint: v.category || 'Vendor',
            icon: Store,
            category: catName,
            action: () => navigate('vendors'),
          })
        }
      }

      // --- Locations (filter by name / address) ---
      const locationHits = (searchResults.locations ?? [])
        .filter((l) => matches(q, l.name, l.address ?? ''))
        .slice(0, 3)
      if (locationHits.length > 0) {
        const catName = `Locations (${locationHits.length})`
        for (const l of locationHits) {
          list.push({
            id: `search-location-${l.id}`,
            label: l.name,
            hint: l.address || 'No address',
            icon: MapPin,
            category: catName,
            action: () => navigate('locations'),
          })
        }
      }

      // --- Purchase Orders (filter by poNumber / vendor.name / status) ---
      const poHits = (searchResults.pos ?? [])
        .filter((po) => matches(q, po.poNumber, po.vendor?.name ?? '', po.status))
        .slice(0, 3)
      if (poHits.length > 0) {
        const catName = `Purchase Orders (${poHits.length})`
        for (const po of poHits) {
          list.push({
            id: `search-po-${po.id}`,
            label: po.poNumber,
            hint: `${po.poNumber} · ${po.status}`,
            icon: ShoppingCart,
            category: catName,
            action: () => navigate('purchase-orders'),
          })
        }
      }
    }

    return list
  }, [query, searchResults, navigate])

  // Keep the visual selection within the valid range when the list shrinks.
  // Derived value (no effect) so it stays in sync on every render.
  const safeSelectedIndex = items.length === 0 ? 0 : Math.min(selectedIndex, items.length - 1)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (items.length === 0 ? 0 : (i + 1) % items.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[safeSelectedIndex]
      if (item) {
        item.action()
        setOpen(false)
      }
    }
  }

  function executeItem(item: CmdItem) {
    item.action()
    setOpen(false)
  }

  if (!open) return null

  // Group consecutive items by category for visual headers (preserves flat order).
  const categories: { name: CmdCategory; items: CmdItem[] }[] = []
  for (const item of items) {
    const last = categories[categories.length - 1]
    if (last && last.name === item.category) {
      last.items.push(item)
    } else {
      categories.push({ name: item.category, items: [item] })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="glass-card-strong w-full max-w-2xl overflow-hidden rounded-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search header */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Search or jump to…"
            className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
            autoFocus
            aria-label="Search input"
          />
          <kbd className="kbd-pill shrink-0">Esc</kbd>
        </div>

        {/* Scrollable results */}
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin py-2">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {query.trim() ? `No matches for “${query.trim()}”.` : 'Start typing to search…'}
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat.name} className="mb-1">
                <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {cat.name}
                </div>
                {cat.items.map((item) => {
                  const flatIndex = items.indexOf(item)
                  const selected = flatIndex === safeSelectedIndex
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-selected={selected ? 'true' : 'false'}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      className="cmd-result hover-lift flex w-full items-center gap-3 px-4 py-2 text-left text-sm"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate font-medium">{item.label}</span>
                      {item.hint && (
                        <span className="shrink-0 max-w-[55%] truncate text-xs text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

          {/* Footer hint */}
        <div className="border-t px-4 py-2 text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1"><kbd className="kbd-key">↑</kbd><kbd className="kbd-key">↓</kbd> to navigate</span>
          <span aria-hidden="true" className="opacity-50">·</span>
          <span className="inline-flex items-center gap-1"><kbd className="kbd-key">Enter</kbd> to select</span>
          <span aria-hidden="true" className="opacity-50">·</span>
          <span className="inline-flex items-center gap-1"><kbd className="kbd-key">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  )
}
