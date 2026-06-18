# R7-B — PO Receiving Workflow + Cost Forecast Analytics

**Task ID**: R7-B
**Agent**: fullstack-developer (R7-B)

## Task
1. Add PO Receiving Workflow UI to `src/components/views/purchase-orders-view.tsx` — Receive Items button on each PO row (Approved/Ordered/Partially Received statuses), a Receiving Status badge column, and a `POReceiveDialog` component that calls `poReceivingApi.receive(poId, items)`.
2. Add a "Cost Forecast Analytics" section to `src/components/views/reports-view.tsx` (after the Maintenance Cost Analytics section) — 3 KPI tiles, a ComposedChart (Bar + Line + Area), and 3 category cards with sparklines. Uses `reportsApi.costForecast(12, 6)`.

## Work Log

### Pre-flight
- Read `/home/z/my-project/worklog.md` (R6-Orchestrator handover + R7-A timeline/map views) to confirm project state (v2.3, 27 views, 75+ API routes, ESLint clean) and styling conventions (`stat-tile-gradient`, `section-accent-bar`, `btn-press`, `receive-progress`/`receive-progress-fill`, `trend-chip-up/down/flat`, `scrollbar-thin`, `animate-fade-in-up`).
- Verified the pre-existing API contracts:
  - `curl /api/reports/cost-forecast?history=12&forecast=6` → 200, returns `{categories:[{category:'purchase',history:[...12],forecast:[...6],...}],combined:[...18],totals:{historicalTotal,forecastTotal,projectedAnnual,trendDirection,trendPct}}`.
  - `curl /api/purchase-orders` → 200, list of POs each with `items[]` containing `{id,description,quantity,receivedQuantity,assetType}`.
  - Confirmed `poReceivingApi.receive(poId, items)` exists in `src/lib/api.ts` (line 562) and `reportsApi.costForecast` exists (line 540).
- Confirmed the existing CSS utilities in `src/app/globals.css` are pre-defined: `receive-progress`, `receive-progress-fill` (+ `.full` variant), `trend-chip-up`/`-down`/`-flat`, `section-accent-bar`, `stat-tile-gradient`, `btn-press`.

### Task 1 — `purchase-orders-view.tsx`
- **Imports added**: `PackageCheck`, `Loader2` from `lucide-react`; `poReceivingApi` from `@/lib/api`. All other required imports (`Dialog`, `Input`, `Label`, `toast`, `useQueryClient`, `useQuery`) were already present.
- **New constants/helpers**:
  - `RECEIVABLE_STATUSES: PurchaseOrderStatus[] = ['Approved', 'Ordered', 'Partially Received']` — matches the API's allowed states.
  - `isReceivable(status)` helper.
  - `computeReceivingTotals(po)` returns `{ ordered, received }` summed across all PO items (used by the row badge).
  - `ReceivingStatusBadge({ po })` — renders `{received}/{ordered} ({pct}%)` + a 4px `receive-progress` bar with the `full` class when fully received (emerald gradient) vs partial (amber gradient).
- **Table changes**: added a new "Receiving" column between "Total" and "Requester". Updated loading skeleton from 9 to 10 cells and empty-state `colSpan` from 9 to 10.
- **Receive button**: added to the Actions column, visible only when `isReceivable(po.status)`. Uses `PackageCheck` icon + `btn-press` class + emerald outline tinting. Sets `receivingId` state.
- **`POReceiveDialog` component** (new, appended after `PODetailDialog`):
  - `'use client'` (inherited from the parent module).
  - Fetches the PO fresh via `purchaseOrdersApi.get(id)` (matches `PODetailDialog` pattern).
  - State: `receiveMap: Record<string, string>` (itemId → receive-now input string), `submitting: boolean`.
  - Pre-fills each item's "Receive Now" with `Math.max(0, quantity - receivedQuantity)` (remaining) on first data load, using a `useMemo` initializer that respects existing user input.
  - For each item shows: description (font-medium) + assetType Badge, Ordered/Already Received/Unit Price stats, `{remaining} remaining` Badge (amber if >0, emerald if 0), `receive-progress` mini-bar with `full` class when fully received, and a number `<Input>` labeled "Receive Now" (min 0, max remaining, disabled while submitting or when remaining === 0).
  - Header note (emerald-tinted banner): "All receipts are logged in the audit trail." with `PackageCheck` icon.
  - Footer summary: total Ordered / Already Received / Receiving Now + count of items pending receipt.
  - "Confirm Receipt" button (emerald `bg-emerald-600 hover:bg-emerald-700`, `btn-press`): calls `poReceivingApi.receive(po.id, items)` where items is filtered to `enteredValue > 0`. On success: toast `Received {N} items` + `PO {poNumber} fully received` (if `allItemsReceived`) or `PO {poNumber} partially received` (otherwise). Invalidates `['purchase-orders']` + `['purchase-order', po.id]` queries. Closes dialog.
  - On error: toast `Receiving failed: {msg}` (extracts message from Error or stringified value — handles the API's 400 "PO must be in Approved, Ordered, or Partially Received state" error message).
  - While submitting: button disabled + shows `Loader2` with `animate-spin` + "Receiving…" text.
  - Dialog close is blocked during submission via the `onOpenChange` guard.

### Task 2 — `reports-view.tsx`
- **Imports added**: `ComposedChart` from `recharts`; `type CostForecastCategory` + `type CostForecastPoint` from `@/lib/types`. (`TrendingUp`, `TrendingDown`, `Package`, `Wrench`, `LineChart`, `Line`, `AreaChart`, `Area`, `formatCurrency`, `formatDate` were already imported.)
- **Hook registration**: added `useQuery({ queryKey: ['cost-forecast'], queryFn: () => reportsApi.costForecast(12, 6) })` BEFORE the early `if (!stats)` return at line 238, immediately after the `maintenanceCost` query (so hook order stays stable across renders).
- **New section** inserted after the Maintenance Cost Analytics section's closing `</>` (at line 1622), BEFORE the "Detailed tables" Card.
- **Section header**: `<div className="section-accent-bar mt-2">` with `<TrendingUp className="h-5 w-5 text-violet-600" />` + h3 "Cost Forecast Analytics" + subtitle "12-month historical spend + 6-month forecast based on linear regression per category".
- **Empty state**: if `!costForecast` OR `(historicalTotal === 0 && forecastTotal === 0)`, shows a centered Card with "No cost data available for forecasting".
- **3 KPI tiles** (`md:grid-cols-3`, each `stat-tile-gradient border-l-4`):
  - Historical Total (12mo) — sky `#0ea5e9` border + DollarSign icon (sky tint).
  - Forecast Total (6mo) — violet `#8b5cf6` border + TrendingUp icon (violet tint).
  - Projected Annual Run-Rate — emerald `#10b981` border + TrendingUp icon (emerald tint). Includes a trend chip using `trend-chip-up`/`-down`/`-flat` with `↑ up` / `↓ down` / `→ flat` text. If `trendPct !== null`, also shows `(±{Math.round(trendPct * 100)}%)` next to the chip.
- **Combined Forecast Chart** (full-width Card, height 320): Recharts `ComposedChart` with `data={costForecast.combined}` (18 points: 12 historical + 6 forecast).
  - `CartesianGrid` (horizontal only, soft oklch stroke).
  - `XAxis` dataKey="month" with `tickFormatter={(m) => fmtMonth(m)}` (re-uses the existing `fmtMonth` helper at line 47 that formats YYYY-MM as "MMM yy").
  - `YAxis` with `tickFormatter={(v) => fmtCompactCurrency(v)}` (re-uses the existing `fmtCompactCurrency` helper at line 57 that formats as `$1.5k`).
  - Custom `Tooltip` `content` render prop: shows `fmtMonth(month)` + Historical (sky) + Forecast (violet) + Lower Bound + Upper Bound. Uses `payload[0].payload as CostForecastPoint` cast.
  - `Legend` with `wrapperStyle={{ fontSize: 11 }}`.
  - `Area` for `upperBound` — violet `#8b5cf6` stroke at 0.4 opacity + 0.15 fill opacity, `connectNulls` (renders the upper bound of the confidence band).
  - `Bar` for `historical` — sky `#0ea5e9`, radius `[3,3,0,0]`, barSize 16 (nulls are skipped by Recharts so this only shows for history months).
  - `Line` for `forecast` — violet `#8b5cf6`, strokeWidth 2.5, `strokeDasharray="5 5"` (dashed), dot radius 3, `connectNulls`.
- **3 Category Cards** (`lg:grid-cols-3`): one `CategoryForecastCard` per category (purchase / maintenance / depreciation).
  - Added a new top-level `CategoryForecastCard` component (after `ReportsView`) that takes `cat: CostForecastCategory`.
  - Two module-level lookup tables: `CATEGORY_COLORS` (purchase→sky `#0ea5e9`, maintenance→amber `#f59e0b`, depreciation→rose `#f43f5e`) and `CATEGORY_TITLES` (Purchase / Maintenance / Depreciation).
  - Title with inline icon (no function-call component lookup to satisfy `react-hooks/static-components`): `Package` for purchase, `Wrench` for maintenance, `TrendingDown` for depreciation, all rendered in a colored circular container.
  - Trend chip in the top-right corner using `trend-chip-up/down/flat` with arrow + direction text.
  - 3 mini rows: Total Historical (12mo), Total Forecast (6mo), Projected Annual (bolded, colored).
  - Sparkline chart (Recharts `LineChart` height 60) combining history + forecast into a single series. Uses `useMemo` with the extracted `history` and `forecast` arrays in the deps (extracted first to satisfy `react-hooks/preserve-manual-memoization`).
  - Footer shows `{n}mo history` / `{n}mo forecast` point counts.
- **Type safety**: `CostForecastPoint` cast in the tooltip payload ensures the inline custom tooltip's `p.historical`, `p.forecast`, `p.lowerBound`, `p.upperBound` are properly typed (no `any`).

### React Compiler considerations
- The `useMemo` initializer pattern in `POReceiveDialog` (which calls `setReceiveMap` inside `useMemo`) matches the existing `POFormDialog` pattern in the same file (lines 577–607). The compiler accepts this because the deps array is `[open, po]` — both direct values.
- For `CategoryForecastCard`, extracted `const history = cat.history` and `const forecast = cat.forecast` before using them in `useMemo` deps `[history, forecast]` — this avoids the `react-hooks/preserve-manual-memoization` error that would have fired if I'd used `[cat.history, cat.forecast]` (the compiler can't statically verify property access chains).
- Inline JSX conditional rendering for the category icon (`{cat.category === 'purchase' && <Package .../>}`) avoids the `react-hooks/static-components` error that would have fired if I'd used a function-call lookup like `const Icon = iconMap[cat.category]; <Icon />`.

## Stage Summary
- Files modified (only these 2):
  - `/home/z/my-project/src/components/views/purchase-orders-view.tsx` (1239 → 1587 lines)
  - `/home/z/my-project/src/components/views/reports-view.tsx` (1717 → 2030 lines)
- No `any` types used. All Shadcn components sourced from `@/components/ui/*`.
- Verification:
  - `cd /home/z/my-project && bun run lint` → **exit code 0, 0 errors, 0 warnings** ✓
  - `curl -s "http://localhost:3000/api/reports/cost-forecast?history=12&forecast=6" | head -c 300` → returns valid JSON `{categories:[{category:'purchase',history:[...],forecast:[...]}],...}` ✓
  - `curl -s http://localhost:3000/api/purchase-orders | head -c 200` → returns valid PO list JSON ✓
  - `dev.log` tail shows `✓ Compiled in 197ms` and clean `200` responses for all three endpoints (cost-forecast, purchase-orders, dashboard) — no compilation errors.
- The new "Cost Forecast Analytics" section appears in the Reports view after the Maintenance Cost Analytics section. The new "Receive" button + "Receiving" column appear in the Purchase Orders table for POs in Approved / Ordered / Partially Received states. Both features render in the existing SPA view router on `/`.
