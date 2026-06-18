# R7-A — fullstack-developer — Asset Timeline View + Asset Location Map View

## Task
Build two new view files for the IT Asset Manager — overwrite the existing stubs:
- `/home/z/my-project/src/components/views/asset-timeline-view.tsx` (full lifecycle timeline of a single asset, uses `timelineApi.getForAsset(assetId)`)
- `/home/z/my-project/src/components/views/asset-map-view.tsx` (assets grouped by location in a map-like layout, uses `assetMapApi.report()`)

Both views were already wired into `src/app/page.tsx` (lines 30–31 + 135/138) and `ViewName` already included `'asset-map'` + `'asset-timeline'` in `src/lib/nav.ts`.

## What was built

### Asset Timeline view (`asset-timeline-view.tsx`, 462 lines)
- `useQuery(['asset-timeline', assetId])` via `timelineApi.getForAsset(assetId)`.
- Header: Back button (`btn-press` → `navigate('asset-detail', { id: assetId })`) + h2 "Asset Timeline" + `<span className="live-dot" />` + "Live history" label + asset name + assetTag Badge.
- 4 stat tiles (`stat-tile-gradient card-hover-lift border-l-4`, count uses `animate-count-pop`): Total Events (GitBranch/sky), Assignments (UserPlus/violet), Maintenance Events (Wrench/amber), Bookings (CalendarClock/emerald).
- First/Last event footer summary row using `formatDate` + `formatRelative`.
- Timeline rail inside a `Card` (with `CardHeader` showing count + description + History icon) wrapped in `max-h-[640px] overflow-y-auto scrollbar-thin` scroll area.
- `iconMap: Record<string, LucideIcon>` mapping 8 icon names (Plus, UserPlus, UserMinus, Wrench, CalendarClock, KeyRound, Image, Trash2) → components; inline lookup `(event.icon && iconMap[event.icon]) || Activity` (avoids React Compiler `static-components` error).
- `dotVariant(type)` switch maps each `TimelineEventType` to the correct `event-*` CSS class (e.g. `'maintenance.completed'` → `event-maintenance-completed`, `'license.allocated'` → `event-license`, `'disposal'` → `event-disposal`).
- `accentColor(type)` returns matching hex for icon container tinting.
- Each `timeline-item` (relative pl-10 pb-4, staggered `animationDelay` capped at 600ms): absolute-positioned `<span className="timeline-dot {variant}" />` on the rail + bordered card with icon (h-4 w-4 in colored circular container) + title + description + actor name (italic) + timestamp (`formatRelative` + Clock icon, `title` attribute shows full `formatDate` tooltip) + meta outline Badges (up to 4).
- Date groupings via `groupByDate()` + sticky top date headers showing `dateLabel()` (Today/Yesterday/full date).
- Empty state (History icon + "No timeline events yet"), error state (XCircle + "Couldn't load timeline" + Back button), loading state (4 stat-tile skeletons + 3 timeline-item skeletons).
- Wrapped in `<div className="space-y-5 animate-fade-in-up">`.

### Asset Location Map view (`asset-map-view.tsx`, 500 lines)
- `useQuery(['asset-map'])` via `assetMapApi.report()`.
- Header: h2 "Asset Location Map" + subtitle + `<span className="live-dot" />` + "Live data" + "Manage Locations" outline button.
- 3 KPI tiles (`stat-tile-gradient`, count uses `animate-count-pop`): Total Locations (Building2/slate #64748b), Total Assets (Package/sky #0ea5e9), Avg Utilization (Gauge/emerald #10b981, shown as `Math.round(rate * 100)%`).
- Unassigned banner (only if `unassigned.count > 0`): amber-tinted `<Alert>` with `AlertCircle` icon + AlertTitle "{count} assets have no location assigned" + AlertDescription showing `{formatCurrency(value)} in asset value is currently unmapped" + "View Assets" outline button (amber border, `btn-press`, → `navigate('assets')`).
- Locations section header using `section-accent-bar dot-pattern-bg` + Layers (violet) icon + count Badge.
- Locations grid (`grid gap-4 md:grid-cols-2 lg:grid-cols-3`): each `LocationCard` is a `<Card className="map-tile card-hover-lift overflow-hidden">` containing:
  - Top: `<div className="location-pin">` with `MapPin` icon (violet, pulsing) + location name (font-semibold, truncate) + address (text-xs muted, truncate).
  - 2x2 grid of `MiniStat` cards: Total / In Use (emerald) / In Stock (sky) / Repair (amber).
  - Utilization bar: `<div className="util-bar-fill progress-fill-anim">` with `width = max(pct, 2)%`, `background = rateColor(rate)`, label colored via `rateTextClass`.
  - Total Value row with `DollarSign` icon + `formatCurrency(totalValue)`.
  - Asset Types: row of outline Badges showing top 3 `byType` entries ("Mobile: 3", "Laptop: 2").
  - Top Assets: list of up to 3 `topAssets` as clickable buttons → `navigate('asset-detail', { id: asset.id })` showing name + assetTag + assetType + status Badge + `ArrowRight` icon (hover translate).
  - "View Location" outline button (`btn-press`, → `navigate('locations')`) with `Navigation` icon.
- Bottom bar chart: full-width Recharts `<BarChart layout="vertical">` showing all locations sorted by totalAssets desc, `XAxis` number, `YAxis` category (width 130), custom `ChartTooltip` showing location name + total assets + utilization % (colored) + total value, per-cell `<Cell fill={rateColor(utilizationRate)} />`, chart height scales with location count.
- Empty state (`locations.length === 0`): MapPin + "No locations yet" + "Add a location" button (→ `navigate('locations')`).
- Error state: AlertCircle (rose) + "Couldn't load asset map".
- Loading state: 3 KPI skeletons + 6 location card skeletons.
- Wrapped in `<div className="space-y-5 animate-fade-in-up">`.

## React Compiler compatibility fixes
- `react-hooks/static-components` error in `TimelineItemRow`: original `const Icon = getEventIcon(event.icon)` triggered "Cannot create components during render". Refactored to inline lookup `const Icon = (event.icon && iconMap[event.icon]) || Activity` and removed the unused `getEventIcon` function.
- `react-hooks/preserve-manual-memoization` errors in both views: `useMemo(..., [data?.events])` and `useMemo(..., [data?.locations])` failed (compiler inferred `data.events` / `data.locations` as the actual dependency). Refactored both to extract the derived value first (`const events = data?.events` / `const locations = data?.locations`) then use that plain identifier in the deps array — matches the pattern used in the existing `utilization-view.tsx`.

## Verification
- `cd /home/z/my-project && bun run lint` → **exit code 0, 0 errors, 0 warnings** ✓
- `curl -s "http://localhost:3000/api/assets/4f17c247-7cf5-4021-becc-b147dcfedfbe/timeline" | head -c 200` → returns valid JSON `{assetId:"4f17c247-...", assetTag:"TC-000027", assetName:"Samsung Galaxy A32", events:[{id:"created-...", type:"created", timestamp:"2026-06-18T18:49:46.853Z", ...}]}` ✓
- `curl -s http://localhost:3000/api/asset-map | head -c 200` → returns valid JSON `{locations:[{locationId:"bf04b3ea-...", locationName:"Branch - Bangalore", ...}], totals:..., unassigned:...}` ✓
- `dev.log` tail shows `✓ Compiled in 167ms` + clean `GET / 200` responses after the final edits — no compilation errors remain (an earlier transient "getEventIcon defined multiple times" error in the log was from an intermediate edit state and was resolved before the final lint pass).
- Both views are already wired into `src/app/page.tsx` (lines 30-31 imports + lines 135-138 switch cases for `'asset-map'` and `'asset-timeline'`), so they will render when the SPA navigates to those views.

## Files modified (only these two)
- `/home/z/my-project/src/components/views/asset-timeline-view.tsx` (12-line stub → 462 lines)
- `/home/z/my-project/src/components/views/asset-map-view.tsx` (12-line stub → 500 lines)

No `any` types used. All Shadcn components sourced from `@/components/ui/*`. No other files touched.
