# 8-D — PO Receiving UI: Auto-Created Assets + Empty-Items Validation + "Auto-creates Asset" Badge

**Task ID**: 8-D
**Agent**: fullstack-developer (Round 8)
**File modified**: `/home/z/my-project/src/components/views/purchase-orders-view.tsx` (1587 → 1733 lines, +146)

## Task
Modify the existing `POReceiveDialog` component (added in R7-B at line 1318) to:
1. After a successful receive call, inspect the response for `createdAssets`. If present and non-empty: show a "Created N new asset(s) from this PO" toast, then swap the dialog body to an "Assets Auto-Created" success summary card with sub-cards per line item + clickable asset tag badges + Done/View Assets buttons.
2. Validate BEFORE submit that at least one item has `receivedQty > 0`. If not, show an inline error (red, AlertCircle icon) inside the dialog and DO NOT call the API (defense in depth — backend also rejects with 400).
3. For each line item with an `assetTypeId` set, show a small "Auto-creates Asset" badge (Sparkles icon, variant="outline", emerald text) next to the qty input.

## Pre-flight
- Read `/home/z/my-project/worklog.md` Round 7 handover + R7-B record to confirm v2.4 state. Located `POReceiveDialog` at line 1318 of `purchase-orders-view.tsx` (1586 lines).
- Verified the orchestrator's Round 8 backend changes via curl:
  - `POST /api/purchase-orders/<id>/receive` with `{"items":[]}` → **HTTP 400** with `"No items were advanced. Provide at least one itemId with a positive receivedQty greater than the previously received quantity."`
  - `POST /api/purchase-orders/<id>/receive` with a valid item → **HTTP 200** with `createdAssets: [{ itemId, assetIds: [...], assetTags: ["LAPTOP-0001","LAPTOP-0002"] }]`
- Verified `POReceiveResult` type in `src/lib/types.ts` has `createdAssets?: { itemId: string; assetIds: string[]; assetTags: string[] }[]`.
- Verified `poReceivingApi.receive(poId, items)` in `src/lib/api.ts` returns the full `POReceiveResult` (line 571-577).
- Verified `useNav` from `@/lib/nav` exposes `navigate(view, params)` (lines 42-56) for SPA routing.
- Seeded a fresh receivable PO with assetTypeId-bearing items for QA: **PO-2024-1009** (id `03c5cd4f-05bf-4e28-9545-abd28eabc9f6`, vendor Dell Technologies, status "Ordered", 2 items — Dell OptiPlex 7090 Desktop with assetTypeId=Desktop + Dell 27 UltraSharp Monitor with assetTypeId=Monitor).

## Work Log

### Imports
- Added `Sparkles, AlertCircle` to the existing `lucide-react` import list.
- Added `type POReceiveResult` to the existing `@/lib/types` import.
- Added new `import { useNav } from '@/lib/nav'`.

### `POReceiveDialog` modifications
- **3 new useState hooks**:
  - `inlineError: string | null` — empty-items validation message.
  - `createdAssetsResult: NonNullable<POReceiveResult['createdAssets']>` — when non-null, swaps dialog body to success view.
  - `const navigate = useNav((s) => s.navigate)` — for "View Assets" navigation.
- **`setReceiveValue`**: clears `inlineError` on every input change (so the error disappears as the user starts fixing it).
- **`confirmReceipt` rewrite**:
  - Pre-submit validation: if `itemsToReceive.length === 0` → `setInlineError('Enter at least one received quantity greater than 0')` + `return` (NO API call).
  - On success: extract `result.createdAssets ?? []`, compute `totalCreated`. If `created.length > 0 && totalCreated > 0` → `toast.success('Created ${totalCreated} new asset(s) from this PO')`.
  - Invalidate 3 query keys: `['purchase-orders']`, `['purchase-order', po.id]`, AND `['assets']` (new — so assets list refetches on navigation).
  - Branch: if `created.length > 0` → `setCreatedAssetsResult(created)` (swap to success view); else → `onOpenChange(false)` (close dialog as before).
- **NEW success summary view** (rendered when `createdAssetsResult` is non-empty):
  - `<div className="animate-in fade-in-50 slide-in-from-bottom-1 duration-300">` wrapper for subtle entrance animation.
  - `<Card className="border-emerald-500/30 bg-emerald-500/5">` container.
  - Header row: `<Sparkles className="h-5 w-5 text-emerald-600" />` + `<CardTitle className="text-base">Assets Auto-Created</CardTitle>` + `<Badge variant="secondary">{totalCreated} new</Badge>`.
  - CardDescription: "These assets are now in your inventory with status 'In Stock'. Assign or configure them as needed."
  - For each entry in `createdAssetsResult`: a sub-card (`rounded-md border bg-background p-3`) with the line item description (looked up via `(po.items ?? []).find((it) => it.id === entry.itemId)?.description`) + assetType name Badge + `{N} asset(s)` count + clickable asset tag Badges (`variant="secondary"` + `className="font-mono cursor-pointer hover:bg-secondary/80"`, onClick → `onOpenChange(false)` + `navigate('asset-detail', { id: entry.assetIds[i] })`).
  - Footer: "Done" button (closes dialog) + "View Assets" button (emerald, Sparkles icon, navigates to `assets` view).
- **NEW inline error block** in the regular view (between audit note and items list): `<div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4" /><span>{inlineError}</span></div>` — only rendered when `inlineError` is truthy.
- **NEW "Auto-creates Asset" badge** per line item: when `it.assetTypeId` is truthy, render `<Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5"><Sparkles className="h-3 w-3 mr-1" /><span className="text-[10px] uppercase tracking-wide">Auto-creates Asset</span></Badge>` inside the same flex row as the "Receive Now" input (with `flex-wrap`).
- **Button disabled prop change**: changed Confirm Receipt button from `disabled={submitting || itemsToReceive.length === 0}` to `disabled={submitting}` — so the user can click it even when all qty are 0, which triggers the inline validation error (rather than the button being silently disabled and giving no feedback).
- **A11y fix**: added `<DialogHeader><DialogTitle>Receive Items</DialogTitle><DialogDescription>{isLoading ? 'Loading purchase order details, please wait.' : 'Purchase order not found.'}</DialogDescription></DialogHeader>` to the `if (!po)` loading branch (previously had neither — was triggering Radix a11y warnings from R7-B).

### React Compiler considerations
- `useMemo` deps use direct `po` + `receiveMap` identifiers (no optional-chaining in deps) → satisfies `preserve-manual-memoization`.
- `setInlineError`/`setCreatedAssetsResult` are called inside event handlers (`setReceiveValue`, `confirmReceipt`, button onClicks) — NOT inside effects → satisfies `set-state-in-effect`.
- No dynamic component lookups → satisfies `static-components`.

## Verification

- `cd /home/z/my-project && bun run lint` → **exit code 0, 0 errors, 0 warnings** ✓
- Backend curl tests:
  - `POST /api/purchase-orders/<id>/receive` with `{"items":[]}` → **HTTP 400** ✓
  - `POST /api/purchase-orders/<id>/receive` with valid item → **HTTP 200** + `createdAssets` array ✓
- `dev.log` last 30 lines: ✓ Compiled in 199ms (clean), `POST /api/purchase-orders/03c5cd4f.../receive 200`, no new errors, no new a11y warnings after fix ✓
- agent-browser QA (4 scenarios verified end-to-end, screenshots saved):
  1. **Open Receive dialog** → title + audit note + 2 line items each showing "AUTO-CREATES ASSET" badge + Receive Now spinbuttons prefilled with remaining qty ✓ (screenshot: `qa_r8_po_receive.png`)
  2. **Empty-items validation** → filled both spinbuttons with "0" + clicked Confirm Receipt → inline error "Enter at least one received quantity greater than 0" appeared (red, AlertCircle) → dialog stayed open → no POST call in dev.log ✓ (screenshot: `qa_r8_po_receive_empty_error.png`)
  3. **Success view with auto-created assets** → filled spinbuttons with "1" + "1" + clicked Confirm Receipt → toast "Created 2 new assets from this PO" → dialog body swapped to "Assets Auto-Created" success card with Sparkles icon + 2 sub-cards (Desktop "DESKTOP-0001" + Monitor "MONITOR-0001" as clickable mono-font Badges) + Done/View Assets buttons ✓ (screenshot: `qa_r8_po_receive_success.png`). Verified via curl: PO status Ordered → Partially Received; new assets DESKTOP-0001 + MONITOR-0001 created with status "In Stock" + comment "Auto-created from PO PO-2024-1009 · ...".
  4. **View Assets navigation** → clicked "View Assets" → dialog closed → SPA navigated to Assets list → DESKTOP-0001 + MONITOR-0001 visible at top ✓ (screenshot: `qa_r8_po_receive_assets_list.png`)

## Stage Summary
- **All 3 task requirements complete** + 2 bonus improvements (a11y fix on loading branch + `['assets']` query invalidation).
- **Files modified (only 1)**: `/home/z/my-project/src/components/views/purchase-orders-view.tsx` (1587 → 1733 lines, +146).
- **Seeded test data**: PO-2024-1009 (Ordered, 2 items with assetTypeId) for end-to-end QA.
- No new package dependencies. No `any` types. ESLint clean. Dev.log clean.
