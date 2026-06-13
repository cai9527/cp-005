import { create } from 'zustand'

export type SidebarWidthMode = 'collapsed' | 'compact' | 'normal' | 'wide'

export const SIDEBAR_WIDTHS: Record<SidebarWidthMode, number> = {
  collapsed: 72,
  compact: 180,
  normal: 240,
  wide: 300,
}

export const ZOOM_LEVELS = [0.8, 0.9, 1, 1.1, 1.2] as const
export type ZoomLevel = typeof ZOOM_LEVELS[number]

const sidebarWidthOrder: SidebarWidthMode[] = ['collapsed', 'compact', 'normal', 'wide']

const syncZoomMap: Record<SidebarWidthMode, ZoomLevel> = {
  collapsed: 0.8,
  compact: 0.9,
  normal: 1,
  wide: 1.1,
}

interface UIState {
  sidebarWidthMode: SidebarWidthMode
  sidebarCollapsed: boolean
  zoomLevel: ZoomLevel
  syncZoom: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidthMode: (mode: SidebarWidthMode) => void
  cycleSidebarWidth: (direction?: 'increase' | 'decrease') => void
  setZoomLevel: (level: ZoomLevel) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  toggleSyncZoom: () => void
  setSyncZoom: (sync: boolean) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarWidthMode: 'normal',
  sidebarCollapsed: false,
  zoomLevel: 1,
  syncZoom: false,

  toggleSidebar: () => set((state) => {
    const newCollapsed = !state.sidebarCollapsed
    const newMode = newCollapsed
      ? 'collapsed'
      : (state.sidebarWidthMode === 'collapsed' ? 'normal' : state.sidebarWidthMode)
    const updates: any = {
      sidebarCollapsed: newCollapsed,
      sidebarWidthMode: newMode,
    }
    if (state.syncZoom) {
      updates.zoomLevel = syncZoomMap[newMode]
    }
    return updates
  }),

  setSidebarCollapsed: (collapsed) => set((state) => {
    const newMode = collapsed
      ? 'collapsed'
      : (state.sidebarWidthMode === 'collapsed' ? 'normal' : state.sidebarWidthMode)
    const updates: any = {
      sidebarCollapsed: collapsed,
      sidebarWidthMode: newMode,
    }
    if (state.syncZoom) {
      updates.zoomLevel = syncZoomMap[newMode]
    }
    return updates
  }),

  setSidebarWidthMode: (mode) => set((state) => {
    const updates: any = {
      sidebarWidthMode: mode,
      sidebarCollapsed: mode === 'collapsed',
    }
    if (state.syncZoom) {
      updates.zoomLevel = syncZoomMap[mode]
    }
    return updates
  }),

  cycleSidebarWidth: (direction = 'increase') => set((state) => {
    const currentMode = state.sidebarCollapsed ? 'collapsed' : state.sidebarWidthMode
    const currentIndex = sidebarWidthOrder.indexOf(currentMode)
    let newIndex: number
    if (direction === 'increase') {
      newIndex = Math.min(currentIndex + 1, sidebarWidthOrder.length - 1)
    } else {
      newIndex = Math.max(currentIndex - 1, 0)
    }
    const newMode = sidebarWidthOrder[newIndex]
    const updates: any = {
      sidebarWidthMode: newMode,
      sidebarCollapsed: newMode === 'collapsed',
    }
    if (state.syncZoom) {
      updates.zoomLevel = syncZoomMap[newMode]
    }
    return updates
  }),

  setZoomLevel: (level) => set({ zoomLevel: level }),

  zoomIn: () => set((state) => {
    const currentIndex = ZOOM_LEVELS.indexOf(state.zoomLevel)
    const newIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1)
    return { zoomLevel: ZOOM_LEVELS[newIndex] }
  }),

  zoomOut: () => set((state) => {
    const currentIndex = ZOOM_LEVELS.indexOf(state.zoomLevel)
    const newIndex = Math.max(currentIndex - 1, 0)
    return { zoomLevel: ZOOM_LEVELS[newIndex] }
  }),

  resetZoom: () => set({ zoomLevel: 1 }),

  toggleSyncZoom: () => set((state) => {
    const newSync = !state.syncZoom
    const updates: any = { syncZoom: newSync }
    if (newSync) {
      const currentMode = state.sidebarCollapsed ? 'collapsed' : state.sidebarWidthMode
      updates.zoomLevel = syncZoomMap[currentMode]
    }
    return updates
  }),

  setSyncZoom: (sync) => set((state) => {
    const updates: any = { syncZoom: sync }
    if (sync) {
      const currentMode = state.sidebarCollapsed ? 'collapsed' : state.sidebarWidthMode
      updates.zoomLevel = syncZoomMap[currentMode]
    }
    return updates
  }),
}))
