// ============================================================
// WaveNet Monitor — Tipos Compartilhados
// ============================================================

export interface WifiInfo {
  // Sinal & Conexão
  ssid: string
  bssid: string
  signalDbm: number
  signalPercent: number
  noiseDbm: number
  snrDb: number
  band: '2.4 GHz' | '5 GHz' | '6 GHz' | 'Desconhecido'
  channel: number
  channelWidth: number
  phyType: string
  txSpeedMbps: number
  rxSpeedMbps: number
  radioType: string
  connectionUptime: number // segundos

  // Segurança
  encryption: string
  authentication: string
  cipherAlgorithm: string
  networkType: string
  profileName: string

  // Adaptador
  adapterName: string
  adapterMac: string
  driverVersion: string
  driverDate: string
  powerMode: string
  roamingStatus: string

  // Estado
  isConnected: boolean
  isWifi: boolean
}

export interface NetworkInfo {
  // Endereçamento
  localIp: string
  publicIp: string
  subnetMask: string
  gateway: string
  dhcpServer: string
  dnsServers: string[]
  ipv6: string
  macAddress: string

  // Estatísticas de bytes
  bytesSent: number
  bytesReceived: number
  bytesSentTotal: number
  bytesReceivedTotal: number

  // Pacotes
  packetsSent: number
  packetsReceived: number
  packetsError: number
  packetsDiscarded: number

  // Velocidade
  uploadSpeedBps: number
  downloadSpeedBps: number
  uploadPeakBps: number
  downloadPeakBps: number
  uploadAvgBps: number
  downloadAvgBps: number

  // VPN & Firewall
  vpnConnected: boolean
  vpnAdapter: string
  firewallEnabled: boolean
  networkProfile: string

  // Sessão
  sessionStartTime: number
  totalSessionUpBytes: number
  totalSessionDownBytes: number
}

export interface LatencyStats {
  currentMs: number
  averageMs: number
  minMs: number
  maxMs: number
  jitterMs: number
  packetLossPercent: number
  latencyHistory: number[] // últimos 60 valores
  spikeCount: number
  lastSpikeMs: number
  stabilityScore: number // 0-100
}

export interface ChannelInfo {
  channel: number
  frequency: number
  utilization: number // %
  interference: number // %
  nearbyAPs: NearbyAP[]
  congestionLevel: 'Baixo' | 'Médio' | 'Alto'
}

export interface NearbyAP {
  ssid: string
  bssid: string
  signalDbm: number
  channel: number
  band: string
  encryption: string
}

export interface PingResult {
  host: string
  sent: number
  received: number
  lostPercent: number
  minMs: number
  maxMs: number
  avgMs: number
  results: PingEntry[]
}

export interface PingEntry {
  seq: number
  ms: number | null
  timeout: boolean
  ttl?: number
}

export interface TracerouteResult {
  host: string
  hops: TracerouteHop[]
  completed: boolean
  totalMs: number
}

export interface TracerouteHop {
  hop: number
  ip: string
  hostname: string
  ms: number[]
  timeout: boolean
}

export interface DnsResult {
  host: string
  records: DnsRecord[]
  queryTimeMs: number
  server: string
}

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'MX' | 'CNAME' | 'TXT' | 'NS' | 'SOA'
  value: string
  ttl?: number
  priority?: number
}

export interface PortCheckResult {
  host: string
  port: number
  protocol: 'TCP' | 'UDP'
  isOpen: boolean
  service: string
  responseMs: number
}

export interface NetworkDevice {
  ip: string
  mac: string
  hostname: string
  vendor: string
  isGateway: boolean
  isCurrentDevice: boolean
  openPorts?: number[]
  lastSeen: number
}

export interface SpeedTestResult {
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
  server: string
  timestamp: number
}

export interface DiagnosticReport {
  timestamp: number
  wifiInfo: WifiInfo
  networkInfo: NetworkInfo
  latencyStats: LatencyStats
  channelInfo: ChannelInfo
  nearbyAPs: NearbyAP[]
  events: SessionEvent[]
  recommendations: string[]
}

export interface SessionEvent {
  timestamp: number
  type: 'connected' | 'disconnected' | 'roaming' | 'spike' | 'dns_renewed' | 'ip_renewed' | 'warning' | 'info'
  message: string
  details?: string
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system'
  language: 'pt-BR' | 'en-US'
  pingInterval: number // ms
  metricsUpdateInterval: number // ms
  alertOnLatencySpike: boolean
  alertThresholdMs: number
  alertOnPacketLoss: boolean
  alertPacketLossPercent: number
  alertOnDisconnect: boolean
  minimizeToTray: boolean
  startWithWindows: boolean
  pingTarget: string
  showNotifications: boolean
  saveHistory: boolean
  historyDays: number
}

// IPC channels
export const IPC = {
  GET_WIFI_INFO: 'get-wifi-info',
  GET_NETWORK_INFO: 'get-network-info',
  GET_LATENCY_STATS: 'get-latency-stats',
  GET_CHANNEL_INFO: 'get-channel-info',
  GET_NEARBY_APS: 'get-nearby-aps',
  RUN_PING: 'run-ping',
  RUN_TRACEROUTE: 'run-traceroute',
  RUN_DNS_LOOKUP: 'run-dns-lookup',
  RUN_PORT_CHECK: 'run-port-check',
  RUN_NETWORK_SCAN: 'run-network-scan',
  RUN_SPEED_TEST: 'run-speed-test',
  FLUSH_DNS: 'flush-dns',
  RENEW_IP: 'renew-ip',
  RESET_ADAPTER: 'reset-adapter',
  GET_PUBLIC_IP: 'get-public-ip',
  GENERATE_REPORT: 'generate-report',
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  GET_SESSION_EVENTS: 'get-session-events',
  GET_SPEED_HISTORY: 'get-speed-history',

  // Push events (main → renderer)
  WIFI_UPDATE: 'wifi-update',
  NETWORK_UPDATE: 'network-update',
  LATENCY_UPDATE: 'latency-update',
  SESSION_EVENT: 'session-event',
  SPEED_UPDATE: 'speed-update',
} as const
