# R6-A — fullstack-developer — Expiry Center + Asset Utilization Dashboard views

## Task
Build two new view files for the IT Asset Manager — overwrite the existing stubs:
- `/home/z/my-project/src/components/views/expirations-view.tsx` (Expiry Center)
- `/home/z/my-project/src/components/views/utilization-view.tsx` (Asset Utilization Dashboard)

Both views are already wired into `src/app/page.tsx` (lines 28–29 + 130/132).

## What was built

### Expiry Center view (`expirations-view.tsx`, 354 lines)
- `useQuery(['expirations'])` via `expirationsApi.list()`.
- Header + rose/emerald "Live data" pill with `<span className="live-dot" />`.
- 5 stat tiles (`lg:grid-cols-5`): Expired/≤30d/≤60d/≤90d/Future — color-coded rose/orange/amber/sky/slate, each with `stat-tile-gradient card-hover-lift border-l-4` + `animate-count-pop` count.
- Rose `<Alert variant="destructive">` banner when `totals.exposedValue > 0` — "⚠ {formatCurrency(exposedValue)} exposed value".
- shadcn `<Tabs>` (All / Warranties / Licenses) + search Input with Search icon and a Clear Button when active.
- `ItemList` wrapped in `<Card>` with `CardHeader/CardTitle/CardDescription` showing count; inner `max-h-[640px] overflow-y-auto scrollbar-thin` scroll area.
- Each `ItemRow` is a clickable card with the matching `urgency-{urgency}` CSS class; left icon circle (ShieldCheck sky for warranty, KeyRound violet for license), middle name/subtitle/meta chips, right urgency Badge + expiry date + cost (with TrendingUp icon).
- Click handler: warranty → `navigate('asset-detail', { id })`, license → `navigate('licenses')`. Keyboard accessible (Enter/Space).
- Sorted by `daysUntilExpiry` asc. Empty states via `<EmptyState>`. Loading skeletons for tiles + search + rows.

### Asset Utilization Dashboard view (`utilization-view.tsx`, ~370 lines)
- `useQuery(['utilization'])` via `utilizationApi.report()`.
- 3 KPI tiles (`sm:grid-cols-3`): Overall Utilization Rate (emerald/Gauge), In Use vs Available (sky/Activity), Idle Assets (amber/Clock).
- Reusable `BucketSection` component (used for both Department and Asset Type):
  - Header: `section-accent-bar dot-pattern-bg rounded-lg` with Building2 (violet) / Layers (sky) icon + title + description.
  - Recharts `BarChart layout="vertical"` — X axis 0–100%, Y axis bucketName, CartesianGrid, custom Tooltip showing "X% (inUse of total in use)"; each `<Cell>` colored by rate (emerald ≥75%, sky ≥50%, amber ≥25%, rose <25%). Chart height scales with bucket count.
  - Below the chart, `BucketList` of grid rows (name | total | inUse | rate% colored | mini progress bar using `util-bar-fill progress-fill-anim`).
- Idle Assets section (`section-accent-bar dot-pattern-bg` header with Timer icon):
  - Empty: `<EmptyState>` with TrendingUp icon + "No idle assets — great job!" success message.
  - Otherwise: shadcn `<Table>` inside `max-h-96 overflow-y-auto scrollbar-thin`. Columns: Asset (name + assetTag + "Purchased {date}") | Serial | Department | Location | Days Idle (Badge — rose if >180d, amber if >90d, sky otherwise, all with Clock icon) | Action "View" Button → `navigate('asset-detail', { id })`. Sorted by daysIdle desc.
- Footer summary row: 4 small bordered tiles (Total / In use / In stock / Repair+Retired+Lost).
- Both views wrapped in `<div className="space-y-5 animate-fade-in-up">`. No `any` types. Only shadcn/ui components from `@/components/ui/*`.

## Verification
- `cd /home/z/my-project && bun run lint` → **exit code 0, 0 errors, 0 warnings** ✓
- `curl -s http://localhost:3000/api/expirations | head -c 200` → returns valid JSON `{items:[{id:"lic-...", kind:"license", ...}]}` ✓
- `curl -s http://localhost:3000/api/utilization | head -c 200` → returns valid JSON `{byDepartment:[{bucketId:..., bucketName:"IT", utilizationRate:1, ...}]}` ✓
- `dev.log` tail shows `✓ Compiled` then `GET /api/expirations 200` + `GET /api/utilization 200` with no errors ✓

## Files modified (only these two)
- `/home/z/my-project/src/components/views/expirations-view.tsx` (13 stub → 354 lines)
- `/home/z/my-project/src/components/views/utilization-view.tsx` (13 stub → ~370 lines)
