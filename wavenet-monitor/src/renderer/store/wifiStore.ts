import { create } from 'zustand'
import type {
  WifiInfo, NetworkInfo, LatencyStats,
  SessionEvent, AppSettings,
} from '@shared/types'

interface SpeedSample { ts: number; up: number; down: number }

interface WifiStore {
  // Dados ao vivo
  wifiInfo: WifiInfo | null
  networkInfo: NetworkInfo | null
  latencyStats: LatencyStats | null
  speedHistory: SpeedSample[]
  sessionEvents: SessionEvent[]
  settings: AppSettings | null
  isLoading: boolean
  theme: 'dark' | 'light'
  activeTab: string

  // Actions
  setWifiInfo: (d: WifiInfo) => void
  setNetworkInfo: (d: NetworkInfo) => void
  setLatencyStats: (d: LatencyStats) => void
  addSpeedSample: (up: number, down: number) => void
  addSessionEvent: (ev: SessionEvent) => void
  setSettings: (s: AppSettings) => void
  setTheme: (t: 'dark' | 'light') => void
  setActiveTab: (tab: string) => void
  setLoading: (v: boolean) => void
}

export const useWifiStore = create<WifiStore>((set) => ({
  wifiInfo: null,
  networkInfo: null,
  latencyStats: null,
  speedHistory: [],
  sessionEvents: [],
  settings: null,
  isLoading: true,
  theme: 'dark',
  activeTab: 'dashboard',

  setWifiInfo: (d) => set({ wifiInfo: d, isLoading: false }),
  setNetworkInfo: (d) => set({ networkInfo: d }),
  setLatencyStats: (d) => set({ latencyStats: d }),

  addSpeedSample: (up, down) =>
    set((state) => {
      const history = [...state.speedHistory, { ts: Date.now(), up, down }]
      if (history.length > 3600) history.shift() // 1 hora
      return { speedHistory: history }
    }),

  addSessionEvent: (ev) =>
    set((state) => ({
      sessionEvents: [ev, ...state.sessionEvents].slice(0, 500),
    })),

  setSettings: (s) => set({ settings: s }),
  setTheme: (t) => set({ theme: t }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLoading: (v) => set({ isLoading: v }),
}))

// Seletores de conveniência
export const selectSignalQuality = (s: WifiStore) => {
  const pct = s.wifiInfo?.signalPercent ?? 0
  if (pct >= 80) return { label: 'Excelente', cls: 'good' }
  if (pct >= 60) return { label: 'Bom', cls: 'good' }
  if (pct >= 40) return { label: 'Regular', cls: 'warn' }
  return { label: 'Fraco', cls: 'bad' }
}

export const selectLatencyQuality = (s: WifiStore) => {
  const ms = s.latencyStats?.currentMs ?? 0
  if (ms <= 0) return { label: 'N/A', cls: '' }
  if (ms < 20) return { label: 'Excelente', cls: 'good' }
  if (ms < 50) return { label: 'Bom', cls: 'good' }
  if (ms < 100) return { label: 'Regular', cls: 'warn' }
  return { label: 'Alto', cls: 'bad' }
}
