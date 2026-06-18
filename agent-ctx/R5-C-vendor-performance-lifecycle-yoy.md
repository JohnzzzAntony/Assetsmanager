# R5-C: Vendor Performance Dashboard + Asset Lifecycle YoY Comparison

## Task
Add two new analytics sections to the IT Asset Manager:
1. **Vendor Performance Dashboard** section in `src/components/views/vendors-view.tsx` — placed below the existing vendors table, before the form dialog. KPI tiles + Top 5 Vendors by Spend (horizontal bar) + On-Time Delivery Rate (color-coded horizontal bar) + Rating Distribution (pie) + Delivery Performance table (rose-highlighted low-on-time rows).
2. **Asset Lifecycle YoY Comparison** section in `src/components/views/reports-view.tsx` — placed after the Asset Lifecycle Cost Analysis section, before the "Summary by Type" table. Grouped bar chart (Previous Year slate + Current Year violet) + summary table with delta/percent + 3 KPI tiles.

Both consume the already-built `reportsApi.vendorPerformance()` and `reportsApi.lifecycleYoY(2)` endpoints that were added in the Round 5 backend prep worklog entry.

## Files Modified
- `/home/z/my-project/src/components/views/vendors-view.tsx` — 737 → 1104 lines (+367)
- `/home/z/my-project/src/components/views/reports-view.tsx` — 904 → 1408 lines (+504)

No other files touched (no API routes, no repo, no other views, no package.json changes).

## Implementation Notes

### vendors-view.tsx — VendorPerformanceSection
- Added recharts imports (`BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`, `PieChart`, `Pie`, `Cell`, `Legend`, `ResponsiveContainer`) — these were NOT previously imported despite the task note claiming otherwise.
- Added `Clock` icon to the lucide-react import block.
- Added `reportsApi` to the `@/lib/api` import.
- Added module-level `VENDOR_CHART_COLORS = ['#0f172a', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']` palette and `fmtCompactCurrency(v)` helper for axis ticks.
- Built `VendorPerformanceSection()` sub-component (between `VendorsView` and `VendorFormDialog`) that:
  - Uses `useQuery({ queryKey: ['vendor-performance'], queryFn: reportsApi.vendorPerformance })`.
  - Renders the `section-accent-bar` header (Store icon + "Vendor Performance Analytics" + description) consistently across loading / empty / loaded states.
  - Loading → 4-tile Skeleton row + 4-card Skeleton grid.
  - Empty → `empty-state-icon` ring with Store icon.
  - Loaded → 4 StatTiles (Total Vendors slate, Active Vendors emerald, Total Spend violet, Avg On-Time Rate amber percentage).
  - 2-col grid: Top 5 Vendors by Spend (horizontal BarChart, vertical layout, compact currency axis, multi-color cells from VENDOR_CHART_COLORS, currency tooltip) + On-Time Delivery Rate (top 5 by totalPOs, X-axis domain [0,1] formatted as %, bars colored emerald ≥ 0.8 / amber 0.5–0.8 / rose < 0.5, footnote "On-time = received on or before expected date").
  - 2-col grid: Rating Distribution PieChart (6 buckets: 5/4/3/2/1-star + No Rating, legend below, slices filtered to non-zero) + Delivery Performance compact table (Vendor, POs, On-Time %, Avg Days, Rating stars, sticky header, `max-h-80 overflow-y-auto`, rows with onTimeRate < 0.5 AND totalPOs > 0 highlighted with `bg-rose-500/5`).
- Inserted `<VendorPerformanceSection />` between the closing `</Card>` of the vendors table and the `{/* Add/Edit dialog */}` marker.

### reports-view.tsx — YoY section
- Registered the new query BEFORE the early `if (!stats) return` (line 103) to keep hook order stable: `useQuery({ queryKey: ['lifecycle-yoy', 2], queryFn: () => reportsApi.lifecycleYoY(2) })` placed immediately after the existing `lifecycle` query registration.
- Inserted new section after the Lifecycle KPI tiles grid (which ends with the 4 KPI Card row) and before `{/* Detailed tables */}`:
  - `section-accent-bar` header with TrendingUp icon + "Year-over-Year Cost Comparison" + description.
  - 2-col grid: grouped BarChart (X-axis = assetType, two bars: "Previous Year" slate `#64748b` + "Current Year" violet `#8b5cf6`, `<Legend />`, Y-axis via existing `fmtCompactCurrency`, currency tooltip, empty state if all values are 0) + summary table (Asset Type, Previous Year, Current Year, Delta with `tick-up`/`tick-down` CSS class + TrendingUp/TrendingDown icon, Delta %, sticky header, `max-h-80`, TOTALS row with `border-t-2 bg-muted/40 font-bold`).
  - 3-col KPI tile row (`grid-cols-1 md:grid-cols-3 gap-3`): Total Current Year Spend (violet, DollarSign), Total Previous Year Spend (slate, DollarSign), YoY Change (emerald if delta ≥ 0 / rose if delta < 0, TrendingUp/Down icon, shows absolute currency + percentage in matching tick color; computed via IIFE to determine `isUp`).

## Verification

### Lint
```
$ bun run lint
$ eslint .
```
0 errors, 0 warnings. ✓

### API endpoints
- `curl -s http://localhost:3000/api/reports/vendor-performance` → 200, returns 10 vendors including Apple India (1 PO, $14,150 spent, 100% on-time, 9-day avg delivery).
- `curl -s "http://localhost:3000/api/reports/lifecycle-yoy?years=2"` → 200, returns 7 asset types + totals (currentYear=$2,059, previousYear=$5,026, delta=-$2,967, deltaPct=-59.0%).

### Dev log
Zero errors related to the new code. The new query keys `vendor-performance` and `lifecycle-yoy` both show 200 responses in dev.log.

### agent-browser QA
On the Vendors view, confirmed all 6 expected strings are present in `document.body.innerText`:
- "Vendor Performance Analytics" ✓
- "Top 5 Vendors by Spend" ✓
- "On-Time Delivery Rate" ✓
- "Rating Distribution" ✓
- "Delivery Performance" ✓
- "Apple India" ✓ (data point rendered)

On the Reports view, confirmed all 6 expected strings are present:
- "Year-over-Year Cost Comparison" ✓
- "Cost by Asset Type (YoY)" ✓
- "YoY Summary by Type" ✓
- "Total Current Year Spend" ✓
- "Total Previous Year Spend" ✓
- "YoY Change" ✓

### Screenshots
- `/home/z/my-project/download/qa_r5_vendor_performance.png` (viewport, 145 KB)
- `/home/z/my-project/download/qa_r5_vendor_performance_full.png` (full page, 437 KB)
- `/home/z/my-project/download/qa_r5_lifecycle_yoy.png` (viewport, 150 KB)
- `/home/z/my-project/download/qa_r5_lifecycle_yoy_full.png` (full page, 572 KB)

## Notes for Downstream Agents
- The task constraint note "Recharts is already imported in both files" was inaccurate — vendors-view.tsx previously had NO recharts import. I added the full recharts import block. This is the only deviation from the task spec.
- The agents R5-A and R5-B may also be modifying files concurrently. I noticed a console warning in `bookings-view.tsx:466` about `EmptyState` being defined multiple times — that's R5-B's territory, not mine, so I did not touch it.
- Both new sections gracefully handle the loading, empty, and loaded states without breaking the existing layout.
- The `VendorPerformanceSection` is a self-contained sub-component placed between `VendorsView` and `VendorFormDialog`. It uses its own `useQuery` so it can be lifted out independently if needed.
- The YoY section is inlined directly in `ReportsView` (no separate component) because the `useQuery` hook had to be registered before the early return to keep hook order stable, and the section references the `lifecycleYoY` variable in scope.
