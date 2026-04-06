import { useEffect } from 'react'
import { useWifiStore } from '../store/wifiStore'
import type { WifiInfo, NetworkInfo, LatencyStats, SessionEvent, AppSettings } from '@shared/types'

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void
      maximize: () => void
      close: () => void
      getWifiInfo: () => Promise<WifiInfo>
      getNetworkInfo: () => Promise<NetworkInfo>
      getLatencyStats: () => Promise<LatencyStats>
      getChannelInfo: () => Promise<unknown>
      getNearbyAPs: () => Promise<unknown[]>
      getPublicIp: () => Promise<string>
      getSettings: () => Promise<AppSettings>
      getSessionEvents: () => Promise<SessionEvent[]>
      getSpeedHistory: () => Promise<Array<{ ts: number; up: number; down: number }>>
      runPing: (host: string, count: number) => Promise<unknown>
      runTraceroute: (host: string) => Promise<unknown>
      runDnsLookup: (host: string) => Promise<unknown>
      runPortCheck: (host: string, port: number) => Promise<unknown>
      runNetworkScan: () => Promise<unknown[]>
      runSpeedTest: () => Promise<unknown>
      flushDns: () => Promise<{ success: boolean; message: string }>
      renewIp: () => Promise<{ success: boolean; message: string }>
      resetAdapter: () => Promise<{ success: boolean; message: string }>
      generateReport: () => Promise<{ success: boolean; path?: string; error?: string }>
      saveSettings: (s: unknown) => Promise<{ success: boolean }>
      onWifiUpdate: (cb: (d: unknown) => void) => () => void
      onNetworkUpdate: (cb: (d: unknown) => void) => () => void
      onLatencyUpdate: (cb: (d: unknown) => void) => () => void
      onSpeedUpdate: (cb: (d: unknown) => void) => () => void
      onSessionEvent: (cb: (d: unknown) => void) => () => void
    }
  }
}

// ── Hook principal: conecta store ao processo principal ──────
export function useElectronBridge() {
  const {
    setWifiInfo, setNetworkInfo, setLatencyStats,
    addSpeedSample, addSessionEvent, setSettings, setLoading,
  } = useWifiStore()

  useEffect(() => {
    if (!window.electronAPI) return

    // Carga inicial
    setLoading(true)
    Promise.all([
      window.electronAPI.getWifiInfo().then(setWifiInfo),
      window.electronAPI.getNetworkInfo().then(setNetworkInfo),
      window.electronAPI.getSettings().then(setSettings),
      window.electronAPI.getSessionEvents().then((evs) => evs.forEach(addSessionEvent)),
    ]).catch(console.error)

    // Subscriptions (push do processo principal)
    const unsubWifi = window.electronAPI.onWifiUpdate((d) => setWifiInfo(d as WifiInfo))
    const unsubNet = window.electronAPI.onNetworkUpdate((d) => setNetworkInfo(d as NetworkInfo))
    const unsubLat = window.electronAPI.onLatencyUpdate((d) => setLatencyStats(d as LatencyStats))
    const unsubSpeed = window.electronAPI.onSpeedUpdate((d) => {
      const { up, down } = d as { up: number; down: number }
      addSpeedSample(up, down)
    })
    const unsubEvent = window.electronAPI.onSessionEvent((d) => {
      addSessionEvent(d as SessionEvent)
    })

    return () => {
      unsubWifi(); unsubNet(); unsubLat(); unsubSpeed(); unsubEvent()
    }
  }, [])
}

// ── Utilitários de formatação ─────────────────────────────
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes < 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`
}

export function formatSpeed(bps: number): string {
  if (bps < 1024) return `${bps} B/s`
  if (bps < 1048576) return `${(bps / 1024).toFixed(1)} KB/s`
  if (bps < 1073741824) return `${(bps / 1048576).toFixed(2)} MB/s`
  return `${(bps / 1073741824).toFixed(2)} GB/s`
}

export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export function dbmToQuality(dbm: number): { label: string; cls: string; pct: number } {
  if (dbm >= -50) return { label: 'Excelente', cls: 'good', pct: 100 }
  if (dbm >= -60) return { label: 'Bom', cls: 'good', pct: 80 }
  if (dbm >= -70) return { label: 'Regular', cls: 'warn', pct: 60 }
  if (dbm >= -80) return { label: 'Fraco', cls: 'warn', pct: 40 }
  return { label: 'Muito Fraco', cls: 'bad', pct: 20 }
}

export function latencyToQuality(ms: number): { cls: string; label: string } {
  if (ms <= 0) return { cls: '', label: 'N/A' }
  if (ms < 20) return { cls: 'good', label: 'Excelente' }
  if (ms < 50) return { cls: 'good', label: 'Bom' }
  if (ms < 100) return { cls: 'warn', label: 'Regular' }
  if (ms < 200) return { cls: 'warn', label: 'Alto' }
  return { cls: 'bad', label: 'Crítico' }
}

export function stabilityLabel(score: number): { label: string; cls: string } {
  if (score >= 90) return { label: 'Excelente', cls: 'good' }
  if (score >= 75) return { label: 'Boa', cls: 'good' }
  if (score >= 55) return { label: 'Regular', cls: 'warn' }
  if (score >= 35) return { label: 'Instável', cls: 'warn' }
  return { label: 'Crítica', cls: 'bad' }
}
