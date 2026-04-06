import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { AppSettings, SessionEvent, DiagnosticReport } from '../shared/types'

// ============================================================
// SettingsManager — Salva/carrega configurações locais
// Dados ficam apenas no computador do usuário.
// ============================================================

export class SettingsManager {
  private configPath: string
  private defaults: AppSettings = {
    theme: 'dark',
    language: 'pt-BR',
    pingInterval: 1000,
    metricsUpdateInterval: 2000,
    alertOnLatencySpike: true,
    alertThresholdMs: 100,
    alertOnPacketLoss: true,
    alertPacketLossPercent: 5,
    alertOnDisconnect: true,
    minimizeToTray: true,
    startWithWindows: false,
    pingTarget: '8.8.8.8',
    showNotifications: true,
    saveHistory: true,
    historyDays: 7,
  }

  constructor() {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming')
    const configDir = path.join(appData, 'WaveNetMonitor')
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true })
    this.configPath = path.join(configDir, 'settings.json')
  }

  getSettings(): AppSettings {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8')
        return { ...this.defaults, ...JSON.parse(raw) }
      }
    } catch { /* usa defaults */ }
    return { ...this.defaults }
  }

  saveSettings(settings: Partial<AppSettings>): void {
    const current = this.getSettings()
    const merged = { ...current, ...settings }
    fs.writeFileSync(this.configPath, JSON.stringify(merged, null, 2), 'utf8')
  }
}

// ============================================================
// SessionLogger — Registra eventos da sessão Wi-Fi
// ============================================================

export class SessionLogger {
  private events: SessionEvent[] = []
  private speedHistory: Array<{ ts: number; up: number; down: number }> = []
  private readonly MAX_EVENTS = 500
  private readonly MAX_SPEED_HISTORY = 3600 // 1 hora de amostras

  constructor() {
    this.addEvent('info', 'Sessão WaveNet Monitor iniciada', 'App carregado com sucesso')
  }

  addEvent(
    type: SessionEvent['type'],
    message: string,
    details?: string
  ): void {
    this.events.unshift({
      timestamp: Date.now(),
      type,
      message,
      details,
    })
    if (this.events.length > this.MAX_EVENTS) {
      this.events.splice(this.MAX_EVENTS)
    }
  }

  addSpeedSample(up: number, down: number): void {
    this.speedHistory.push({ ts: Date.now(), up, down })
    if (this.speedHistory.length > this.MAX_SPEED_HISTORY) {
      this.speedHistory.shift()
    }
  }

  getEvents(): SessionEvent[] {
    return [...this.events]
  }

  getSpeedHistory() {
    return [...this.speedHistory]
  }

  clearEvents(): void {
    this.events = []
  }
}

// ============================================================
// ReportGenerator — Gera relatório TXT de diagnóstico
// ============================================================

export class ReportGenerator {
  generate(data: Partial<DiagnosticReport>): string {
    const timestamp = new Date()
    const filename = `WaveNet-Report-${timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.txt`
    const desktop = path.join(os.homedir(), 'Desktop')
    const filePath = path.join(desktop, filename)

    const lines: string[] = [
      '╔══════════════════════════════════════════════════════════════╗',
      '║          WAVENET MONITOR — RELATÓRIO DE DIAGNÓSTICO          ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',
      `Data/Hora: ${timestamp.toLocaleString('pt-BR')}`,
      `Versão: WaveNet Monitor 1.0.0`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'INFORMAÇÕES DA CONEXÃO WI-FI',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ]

    if (data.wifiInfo) {
      const w = data.wifiInfo
      lines.push(
        `SSID:              ${w.ssid}`,
        `BSSID:             ${w.bssid}`,
        `Sinal:             ${w.signalDbm} dBm (${w.signalPercent}%)`,
        `SNR:               ${w.snrDb} dB`,
        `Banda:             ${w.band}`,
        `Canal:             ${w.channel} (${w.channelWidth} MHz)`,
        `Tipo PHY:          ${w.phyType}`,
        `Velocidade TX:     ${w.txSpeedMbps} Mbps`,
        `Velocidade RX:     ${w.rxSpeedMbps} Mbps`,
        `Criptografia:      ${w.encryption}`,
        `Autenticação:      ${w.authentication}`,
        `Adaptador:         ${w.adapterName}`,
        `MAC Adaptador:     ${w.adapterMac}`,
        `Driver:            ${w.driverVersion}`,
        `Modo de Energia:   ${w.powerMode}`,
        ''
      )
    }

    if (data.networkInfo) {
      const n = data.networkInfo
      lines.push(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        'INFORMAÇÕES DE REDE',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `IP Local:          ${n.localIp}`,
        `IP Público:        ${n.publicIp}`,
        `Máscara:           ${n.subnetMask}`,
        `Gateway:           ${n.gateway}`,
        `Servidor DHCP:     ${n.dhcpServer}`,
        `DNS:               ${n.dnsServers.join(', ')}`,
        `IPv6:              ${n.ipv6}`,
        `VPN:               ${n.vpnConnected ? 'Conectado (' + n.vpnAdapter + ')' : 'Desconectado'}`,
        `Firewall:          ${n.firewallEnabled ? 'Ativo' : 'Inativo'}`,
        `Perfil de Rede:    ${n.networkProfile}`,
        '',
        `Bytes Enviados:    ${this.formatBytes(n.bytesSent)}`,
        `Bytes Recebidos:   ${this.formatBytes(n.bytesReceived)}`,
        ''
      )
    }

    if (data.events && data.events.length > 0) {
      lines.push(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        'EVENTOS DA SESSÃO',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      )
      for (const ev of data.events.slice(0, 50)) {
        const time = new Date(ev.timestamp).toLocaleTimeString('pt-BR')
        lines.push(`[${time}] [${ev.type.toUpperCase()}] ${ev.message}`)
      }
      lines.push('')
    }

    lines.push(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'AVISO DE PRIVACIDADE',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'Este relatório foi gerado localmente. Nenhum dado pessoal ou',
      'informação sensível é coletada, transmitida ou armazenada em',
      'servidores externos pelo WaveNet Monitor.',
      '',
      '--- Fim do Relatório ---'
    )

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8')
    return filePath
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(2)} MB`
    return `${(bytes / 1073741824).toFixed(2)} GB`
  }
}
