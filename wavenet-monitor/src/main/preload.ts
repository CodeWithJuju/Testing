import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Data requests (invoke = request/response)
  getWifiInfo: () => ipcRenderer.invoke(IPC.GET_WIFI_INFO),
  getNetworkInfo: () => ipcRenderer.invoke(IPC.GET_NETWORK_INFO),
  getLatencyStats: () => ipcRenderer.invoke(IPC.GET_LATENCY_STATS),
  getChannelInfo: () => ipcRenderer.invoke(IPC.GET_CHANNEL_INFO),
  getNearbyAPs: () => ipcRenderer.invoke(IPC.GET_NEARBY_APS),
  getPublicIp: () => ipcRenderer.invoke(IPC.GET_PUBLIC_IP),
  getSettings: () => ipcRenderer.invoke(IPC.GET_SETTINGS),
  getSessionEvents: () => ipcRenderer.invoke(IPC.GET_SESSION_EVENTS),
  getSpeedHistory: () => ipcRenderer.invoke(IPC.GET_SPEED_HISTORY),

  // Tools
  runPing: (host: string, count: number) => ipcRenderer.invoke(IPC.RUN_PING, host, count),
  runTraceroute: (host: string) => ipcRenderer.invoke(IPC.RUN_TRACEROUTE, host),
  runDnsLookup: (host: string) => ipcRenderer.invoke(IPC.RUN_DNS_LOOKUP, host),
  runPortCheck: (host: string, port: number) => ipcRenderer.invoke(IPC.RUN_PORT_CHECK, host, port),
  runNetworkScan: () => ipcRenderer.invoke(IPC.RUN_NETWORK_SCAN),
  runSpeedTest: () => ipcRenderer.invoke(IPC.RUN_SPEED_TEST),

  // Actions
  flushDns: () => ipcRenderer.invoke(IPC.FLUSH_DNS),
  renewIp: () => ipcRenderer.invoke(IPC.RENEW_IP),
  resetAdapter: () => ipcRenderer.invoke(IPC.RESET_ADAPTER),
  generateReport: () => ipcRenderer.invoke(IPC.GENERATE_REPORT),
  saveSettings: (settings: unknown) => ipcRenderer.invoke(IPC.SAVE_SETTINGS, settings),

  // Event listeners (push from main)
  onWifiUpdate: (cb: (data: unknown) => void) => {
    ipcRenderer.on(IPC.WIFI_UPDATE, (_e, d) => cb(d))
    return () => ipcRenderer.removeAllListeners(IPC.WIFI_UPDATE)
  },
  onNetworkUpdate: (cb: (data: unknown) => void) => {
    ipcRenderer.on(IPC.NETWORK_UPDATE, (_e, d) => cb(d))
    return () => ipcRenderer.removeAllListeners(IPC.NETWORK_UPDATE)
  },
  onLatencyUpdate: (cb: (data: unknown) => void) => {
    ipcRenderer.on(IPC.LATENCY_UPDATE, (_e, d) => cb(d))
    return () => ipcRenderer.removeAllListeners(IPC.LATENCY_UPDATE)
  },
  onSpeedUpdate: (cb: (data: unknown) => void) => {
    ipcRenderer.on(IPC.SPEED_UPDATE, (_e, d) => cb(d))
    return () => ipcRenderer.removeAllListeners(IPC.SPEED_UPDATE)
  },
  onSessionEvent: (cb: (data: unknown) => void) => {
    ipcRenderer.on(IPC.SESSION_EVENT, (_e, d) => cb(d))
    return () => ipcRenderer.removeAllListeners(IPC.SESSION_EVENT)
  },
})
