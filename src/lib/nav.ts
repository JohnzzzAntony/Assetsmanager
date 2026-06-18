// Navigation store - controls the SPA view routing on the single `/` page
import { create } from 'zustand'

export type ViewName =
  | 'dashboard'
  | 'assets'
  | 'asset-detail'
  | 'asset-new'
  | 'asset-edit'
  | 'ocr-upload'
  | 'departments'
  | 'locations'
  | 'persons'
  | 'asset-types'
  | 'import'
  | 'reports'
  | 'maintenance'
  | 'audit-log'
  | 'licenses'
  | 'asset-labels'
  | 'checkouts'
  | 'depreciation'
  | 'notifications'
  | 'vendors'
  | 'purchase-orders'
  | 'disposals'
  | 'tags'
  | 'bookings'
  | 'expirations'
  | 'utilization'

interface NavState {
  view: ViewName
  params: Record<string, string>
  navigate: (view: ViewName, params?: Record<string, string>) => void
  back: () => void
  history: { view: ViewName; params: Record<string, string> }[]
}

export const useNav = create<NavState>((set, get) => ({
  view: 'dashboard',
  params: {},
  history: [],
  navigate: (view, params = {}) => {
    const current = get()
    set({
      view,
      params,
      history: [...current.history, { view: current.view, params: current.params }].slice(-20),
    })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  },
  back: () => {
    const h = get().history
    if (h.length === 0) {
      set({ view: 'dashboard', params: {} })
      return
    }
    const last = h[h.length - 1]
    set({ view: last.view, params: last.params, history: h.slice(0, -1) })
  },
}))
