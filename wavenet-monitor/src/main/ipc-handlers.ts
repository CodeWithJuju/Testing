import type { IpcMain, BrowserWindow } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { WifiScanner } from './wifi-scanner'
import { PingService } from './ping-service'
import { NetworkTools } from './network-tools'
import { SettingsManager } from './settings-manager'
import { SessionLogger } from './session-logger'
import { ReportGenerator } from './report-generator'
import { IPC } from '../shared/types'

// ============================================================
// IPC Handlers — Registra todos os canais de comunicação
// ============================================================

export function setupIpcHandlers(
  ipcMain: IpcMain,
  getWindow: () => BrowserWindow | null
): void {
  const scanner = new WifiScanner()
  const pingService = new PingService()
  const tools = new NetworkTools()
  const settings = new SettingsManager()
  const logger = new SessionLogger()
  const reporter = new ReportGenerator()

  // ── Dados ao vivo ─────────────────────────────────────────
  ipcMain.handle(IPC.GET_WIFI_INFO, () => scanner.getWifiInfo())
  ipcMain.handle(IPC.GET_NETWORK_INFO, () => scanner.getNetworkInfo())
  ipcMain.handle(IPC.GET_NEARBY_APS, () => scanner.getNearbyAPs())
  ipcMain.handle(IPC.GET_PUBLIC_IP, () => tools.getPublicIp())

  ipcMain.handle(IPC.GET_CHANNEL_INFO, async () => {
    const aps = await scanner.getNearbyAPs()
    const channelMap: Record<number, number> = {}
    for (const ap of aps) {
      channelMap[ap.channel] = (channelMap[ap.channel] ?? 0) + 1
    }
    const channels = Object.entries(channelMap).map(([ch, count]) => ({
      channel: parseInt(ch),
      utilization: Math.min(100, count * 20),
      apCount: count,
    }))
    return {
      channels,
      nearbyAPs: aps,
      congestionLevel: aps.length > 10 ? 'Alto' : aps.length > 5 ? 'Médio' : 'Baixo',
    }
  })

  // ── Ferramentas ───────────────────────────────────────────
  ipcMain.handle(IPC.RUN_PING, (_e, host: string, count = 8) => {
    return pingService.runPing(host, count)
  })

  ipcMain.handle(IPC.RUN_TRACEROUTE, (_e, host: string) => {
    return tools.traceroute(host)
  })

  ipcMain.handle(IPC.RUN_DNS_LOOKUP, (_e, host: string) => {
    return tools.dnsLookup(host)
  })

  ipcMain.handle(IPC.RUN_PORT_CHECK, (_e, host: string, port: number) => {
    return tools.checkPort(host, port)
  })

  ipcMain.handle(IPC.RUN_NETWORK_SCAN, () => {
    return tools.scanLocalNetwork()
  })

  ipcMain.handle(IPC.RUN_SPEED_TEST, () => {
    return tools.runSpeedTest()
  })

  // ── Ações do Sistema ──────────────────────────────────────
  ipcMain.handle(IPC.FLUSH_DNS, () => tools.flushDns())
  ipcMain.handle(IPC.RENEW_IP, () => tools.renewIp())
  ipcMain.handle(IPC.RESET_ADAPTER, () => tools.resetAdapter())

  // ── Configurações ──────────────────────────────────────────
  ipcMain.handle(IPC.GET_SETTINGS, () => settings.getSettings())
  ipcMain.handle(IPC.SAVE_SETTINGS, (_e, newSettings: unknown) => {
    settings.saveSettings(newSettings as Parameters<SettingsManager['saveSettings']>[0])
    return { success: true }
  })

  // ── Histórico de eventos ──────────────────────────────────
  ipcMain.handle(IPC.GET_SESSION_EVENTS, () => logger.getEvents())
  ipcMain.handle(IPC.GET_SPEED_HISTORY, () => logger.getSpeedHistory())

  // ── Relatório de Diagnóstico ──────────────────────────────
  ipcMain.handle(IPC.GENERATE_REPORT, async () => {
    try {
      const [wifiInfo, networkInfo] = await Promise.all([
        scanner.getWifiInfo(),
        scanner.getNetworkInfo(),
      ])
      const filePath = reporter.generate({
        wifiInfo,
        networkInfo,
        events: logger.getEvents(),
      })
      return { success: true, path: filePath }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
