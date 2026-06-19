# Task ID: R4-A — Calendar View toggle for Bookings

**Agent**: code (Z.ai Code)
**Date**: 2026-06-18
**Task**: Add a Calendar View toggle to the existing Bookings view.

## What was built

### 1. New file: `src/components/views/bookings-calendar-view.tsx` (~570 lines)

A full month-grid calendar component (`BookingsCalendarView`) plus an internal `BookingDetailDialog` sub-component.

**Calendar features**
- Header card with gradient icon container (`bg-gradient-to-br from-sky-500/10 to-cyan-500/5 border border-sky-500/20`) holding `CalendarRange` icon, title "Bookings **Calendar**" (gradient-text span), description, prev/next/today buttons (ChevronLeft, ChevronRight, CalendarDays).
- 6-week × 7-day grid (Sun→Sat) built from the displayed month. Each cell shows day number + up to 3 booking bars + "+N more" overflow indicator.
- Booking bars rendered inside each day cell the booking overlaps (chosen approach over absolute positioning). Bars colored via `BOOKING_STATUS_CONFIG` (bg/text) — same Tailwind classes used in the existing `StatusBadge`.
- A leading "↳" marker distinguishes a continuation cell (where the booking started on a previous day) from the start cell (rendered bold). Legend card explains the marker.
- Today's cell highlighted with `ring-2 ring-primary ring-inset`, and the day number is wrapped in a primary-colored pill with "Today" label.
- Different-month dates get `opacity-40`.
- Mobile responsive: outer wrapper has `overflow-x-auto scrollbar-thin` and inner grid has `min-w-[760px]` so the calendar scrolls horizontally on small screens.
- Loading state: skeleton inside the calendar area.
- Visible-bookings count badge in header ("N bookings in view").

**Detail dialog (`BookingDetailDialog`)**
- Opens when a booking bar (or "+N more" overflow) is clicked.
- Shows: status badge (with Upcoming / Overdue indicators when applicable), clickable asset chip → `useNav().navigate('asset-detail', { id })`, bookedBy avatar + name, start/end with `formatDateTime` + `formatRelative`, duration badge (`CalendarDays` icon), purpose, notes (`StickyNote` icon).
- Action buttons exactly mirror the list view's `BookingCard`:
  - Pending → Approve + Reject
  - Approved → Check Out
  - Active → Check In
  - non-terminal → Cancel
  - always → Edit + Delete
- Dialog stays open after Approve/Reject/Check Out/Cancel (so user sees status update via React Query invalidate). Dialog closes before opening other dialogs (Check-In / Edit / Delete) to avoid double-layered dialogs.

**Props**
```ts
interface BookingsCalendarViewProps {
  bookings: AssetBooking[]      // pre-filtered (search + status) by parent
  isLoading: boolean
  onApprove, onReject, onCheckOut, onCheckIn, onEdit, onDelete, onCancel: (b: AssetBooking) => void
}
```

The component reuses the parent's mutation handlers — no `useQueryClient` or API calls inside the calendar component itself. This keeps a single source of truth for the action logic.

### 2. Modified file: `src/components/views/bookings-view.tsx`

- Added `LayoutGrid` to lucide-react imports.
- Added `import { BookingsCalendarView } from './bookings-calendar-view'`.
- Added `viewMode` state: `useState<'list' | 'calendar'>('list')`.
- Added `calendarBookings` memo — applies only `search` + `statusFilter` (no `tab`, since tabs are list-only). Same search predicate as `filtered`.
- Inserted a **view-mode toggle** between the filter bar and the content area:
  ```tsx
  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'calendar')}>
    <TabsList>
      <TabsTrigger value="list"><LayoutGrid /> List View</TabsTrigger>
      <TabsTrigger value="calendar"><CalendarRange /> Calendar View</TabsTrigger>
    </TabsList>
  </Tabs>
  ```
- Wrapped the existing status tabs + list in `{viewMode === 'calendar' ? <BookingsCalendarView .../> : <>…existing list…</>}`.
- The filter bar (search + status filter) stays visible in both modes (it's rendered above the toggle).
- The calendar receives the parent's existing action handlers (`handleApprove`, `handleReject`, `handleCheckOut`, `handleCancel`) and the dialog-opening callbacks (`setCheckInBooking`, `setEditing + setFormOpen`, `setDeleteBooking`), so the same BookingFormDialog / CheckInDialog / AlertDialog used by the list view handles all calendar actions too.

## Decisions / design notes

1. **Per-day-cell bars over absolute positioning.** The task allowed either approach. Per-cell rendering is simpler, mobile-friendly, and avoids fragile pixel math. The trade-off is that each day cell of a multi-day booking shows its own bar (with a "↳" marker for continuations) instead of one long bar. The legend explains the marker.

2. **`BOOKING_STATUS_CONFIG` shape.** The task description listed `{ label, icon, dot, bg, text, border, hex }` but the actual config in `@/lib/types` only has `{ bg, text, dot, label }`. Used the actual fields directly (the `bg`/`text` Tailwind classes work perfectly for the bar). No new hex map needed in the calendar file.

3. **Local-date key (`YYYY-MM-DD`).** Used a custom `dayKey()` helper instead of `Date.toISOString()` to avoid timezone drift when the user is east of UTC (where local midnight maps to the previous UTC day).

4. **No new dependencies.** Everything uses existing shadcn/ui components (Card, Button, Badge, Skeleton, Separator, Dialog, Tabs) and existing lib helpers (`@/lib/types`, `@/lib/format`, `@/lib/nav`).

5. **Detail dialog lifecycle.** The Dialog shell is always mounted (so Radix can animate the close transition). Content renders conditionally on `booking` being non-null. The parent passes `open={!!selected}` and clears `selectedId` on close — same pattern as the existing `CheckInDialog`.

## Verification

- `bun run lint` → 0 errors, 0 warnings.
- `curl -sS http://localhost:3000/api/bookings` → returns 200 with 8 bookings (intact).
- `tail -n 30 /home/z/my-project/dev.log` → no errors, only successful `✓ Compiled in …ms` lines and 200 responses.
- Confirmed seeded bookings span late June 2026, with several overlapping days (June 21 has 3 bookings: Client demo, Project Phoenix kickoff, Conference travel) — the "+N more" overflow will trigger and validate the layout.
- No files other than the two named in the task were modified.

## Stage summary

The Bookings view now has a List/Calendar toggle right under the filter bar. Default is List (existing UI unchanged). Selecting Calendar shows a full month grid with colored booking bars per status, today's date highlighted, prev/next/today navigation, overflow indicator, and a click-through detail dialog with the same action buttons as the list view's BookingCard. All actions route through the parent's existing handlers, so audit logging, toast notifications, and query invalidation behave identically across both modes.
