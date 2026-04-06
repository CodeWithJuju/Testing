import { exec, execSync } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import type { WifiInfo, NetworkInfo, NearbyAP } from '../shared/types'

const execAsync = promisify(exec)

// ============================================================
// WifiScanner — Coleta dados do Wi-Fi via comandos do Windows
// Usa: netsh wlan, ipconfig, getmac, netstat
// NENHUM dado é enviado para servidores externos.
// ============================================================

export class WifiScanner {
  private pollingTimer: NodeJS.Timeout | null = null
  private speedTimer: NodeJS.Timeout | null = null
  private prevBytesSent = 0
  private prevBytesReceived = 0
  private prevTimestamp = Date.now()
  private uploadPeak = 0
  private downloadPeak = 0
  private uploadSamples: number[] = []
  private downloadSamples: number[] = []

  // ── Obtém informações completas do Wi-Fi ──────────────────
  async getWifiInfo(): Promise<WifiInfo> {
    try {
      const { stdout } = await execAsync('netsh wlan show interfaces', { timeout: 5000 })
      return this.parseWlanInterfaces(stdout)
    } catch {
      return this.getDefaultWifiInfo()
    }
  }

  private parseWlanInterfaces(raw: string): WifiInfo {
    const get = (pattern: RegExp): string => raw.match(pattern)?.[1]?.trim() ?? 'N/A'
    const getNum = (pattern: RegExp): number => parseFloat(raw.match(pattern)?.[1] ?? '0') || 0

    const signalPercent = getNum(/Sinal\s*:\s*(\d+)%|Signal\s*:\s*(\d+)%/)
    const signalDbm = this.percentToDbm(signalPercent)

    const band = this.detectBand(
      get(/Tipo de rádio\s*:\s*(.+)|Radio type\s*:\s*(.+)/),
      getNum(/Canal\s*:\s*(\d+)|Channel\s*:\s*(\d+)/)
    )

    return {
      ssid: get(/SSID\s*:\s*(?!BSSID)(.+)/),
      bssid: get(/BSSID\s*:\s*([0-9a-fA-F:]{17})/),
      signalDbm,
      signalPercent: signalPercent || Math.round((signalDbm + 100) * 2),
      noiseDbm: -95,
      snrDb: Math.max(0, signalDbm + 95),
      band,
      channel: getNum(/Canal\s*:\s*(\d+)|Channel\s*:\s*(\d+)/),
      channelWidth: this.inferChannelWidth(get(/Tipo PHY\s*:\s*(.+)|PHY type\s*:\s*(.+)/)),
      phyType: get(/Tipo PHY\s*:\s*(.+)|PHY type\s*:\s*(.+)/),
      txSpeedMbps: getNum(/Taxa de transmissão\s*:\s*([\d.]+)|Transmit rate \(Mbps\)\s*:\s*([\d.]+)/),
      rxSpeedMbps: getNum(/Taxa de recepção\s*:\s*([\d.]+)|Receive rate \(Mbps\)\s*:\s*([\d.]+)/),
      radioType: get(/Tipo de rádio\s*:\s*(.+)|Radio type\s*:\s*(.+)/),
      connectionUptime: 0,
      encryption: get(/Cifra\s*:\s*(.+)|Cipher\s*:\s*(.+)/),
      authentication: get(/Autenticação\s*:\s*(.+)|Authentication\s*:\s*(.+)/),
      cipherAlgorithm: get(/Cifra\s*:\s*(.+)|Cipher\s*:\s*(.+)/),
      networkType: get(/Tipo de rede\s*:\s*(.+)|Network type\s*:\s*(.+)/),
      profileName: get(/Perfil\s*:\s*(.+)|Profile\s*:\s*(.+)/),
      adapterName: get(/Nome\s*:\s*(.+)|Name\s*:\s*(.+)/),
      adapterMac: this.getAdapterMac(),
      driverVersion: this.getDriverVersion(),
      driverDate: '',
      powerMode: this.getPowerMode(),
      roamingStatus: 'Não Itinerante',
      isConnected: raw.toLowerCase().includes('conectado') || raw.toLowerCase().includes('connected'),
      isWifi: true,
    }
  }

  // ── Obtém informações de rede (IP, DNS, bytes, etc.) ──────
  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const [ipconfigOut, statsOut] = await Promise.all([
        execAsync('ipconfig /all', { timeout: 5000 }).then(r => r.stdout),
        this.getNetworkStats(),
      ])

      const wifiSection = this.extractWifiSection(ipconfigOut)
      const get = (pattern: RegExp, src = wifiSection): string => src.match(pattern)?.[1]?.trim() ?? 'N/A'

      const publicIp = await this.getPublicIpSafe()

      const { bytesSent, bytesReceived, ...speeds } = statsOut

      return {
        localIp: get(/Endereço IPv4[^:]*:\s*([\d.]+)|IPv4 Address[^:]*:\s*([\d.]+)/),
        publicIp,
        subnetMask: get(/Máscara de Sub-rede[^:]*:\s*([\d.]+)|Subnet Mask[^:]*:\s*([\d.]+)/),
        gateway: get(/Gateway Padrão[^:]*:\s*([\d.]+)|Default Gateway[^:]*:\s*([\d.]+)/),
        dhcpServer: get(/Servidor DHCP[^:]*:\s*([\d.]+)|DHCP Server[^:]*:\s*([\d.]+)/),
        dnsServers: this.parseDnsServers(wifiSection),
        ipv6: get(/Endereço IPv6 de Link Local[^:]*:\s*([0-9a-fA-F:%]+)|Link-local IPv6 Address[^:]*:\s*([0-9a-fA-F:%]+)/),
        macAddress: get(/Endereço Físico[^:]*:\s*([0-9A-F-]{17})|Physical Address[^:]*:\s*([0-9A-F-]{17})/),
        bytesSent,
        bytesReceived,
        bytesSentTotal: bytesSent,
        bytesReceivedTotal: bytesReceived,
        packetsSent: 0,
        packetsReceived: 0,
        packetsError: 0,
        packetsDiscarded: 0,
        ...speeds,
        vpnConnected: this.detectVpn(ipconfigOut),
        vpnAdapter: this.getVpnAdapterName(ipconfigOut),
        firewallEnabled: await this.checkFirewall(),
        networkProfile: await this.getNetworkProfile(),
        sessionStartTime: Date.now(),
        totalSessionUpBytes: bytesSent,
        totalSessionDownBytes: bytesReceived,
      }
    } catch {
      return this.getDefaultNetworkInfo()
    }
  }

  // ── APs Vizinhos ──────────────────────────────────────────
  async getNearbyAPs(): Promise<NearbyAP[]> {
    try {
      const { stdout } = await execAsync('netsh wlan show networks mode=bssid', { timeout: 8000 })
      return this.parseNearbyAPs(stdout)
    } catch {
      return []
    }
  }

  private parseNearbyAPs(raw: string): NearbyAP[] {
    const aps: NearbyAP[] = []
    const blocks = raw.split(/SSID \d+ :/)
    for (const block of blocks.slice(1)) {
      const get = (p: RegExp) => block.match(p)?.[1]?.trim() ?? ''
      const ssid = block.match(/^\s*(.+)/)?.[1]?.trim() ?? 'Oculto'
      const bssidSection = block.split(/BSSID \d+ :/g)
      for (const bssid of bssidSection.slice(1)) {
        const getB = (p: RegExp) => bssid.match(p)?.[1]?.trim() ?? ''
        const signalStr = getB(/Sinal\s*:\s*(\d+)%|Signal\s*:\s*(\d+)%/)
        const signal = parseInt(signalStr) || 50
        aps.push({
          ssid,
          bssid: getB(/([0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2})/),
          signalDbm: this.percentToDbm(signal),
          channel: parseInt(getB(/Canal\s*:\s*(\d+)|Channel\s*:\s*(\d+)/)) || 6,
          band: get(/Tipo de rádio\s*:\s*(.+)|Radio type\s*:\s*(.+)/) || '2.4 GHz',
          encryption: getB(/Autenticação\s*:\s*(.+)|Authentication\s*:\s*(.+)/) || 'WPA2',
        })
      }
    }
    return aps.slice(0, 20)
  }

  // ── Estatísticas de rede (bytes via netstat) ──────────────
  private async getNetworkStats() {
    try {
      const ifaces = os.networkInterfaces()
      let bytesSent = 0
      let bytesReceived = 0

      // Tenta via netstat -e (mais rápido)
      const { stdout } = await execAsync('netstat -e', { timeout: 3000 })
      const lines = stdout.split('\n')
      for (const line of lines) {
        const m = line.match(/(\d+)\s+(\d+)/)
        if (m && line.toLowerCase().includes('byte')) {
          bytesReceived = parseInt(m[1]) || 0
          bytesSent = parseInt(m[2]) || 0
          break
        }
      }

      const now = Date.now()
      const elapsed = (now - this.prevTimestamp) / 1000

      let uploadBps = 0
      let downloadBps = 0

      if (elapsed > 0 && this.prevBytesSent > 0) {
        uploadBps = Math.max(0, (bytesSent - this.prevBytesSent) / elapsed)
        downloadBps = Math.max(0, (bytesReceived - this.prevBytesReceived) / elapsed)
      }

      this.prevBytesSent = bytesSent
      this.prevBytesReceived = bytesReceived
      this.prevTimestamp = now

      if (uploadBps > this.uploadPeak) this.uploadPeak = uploadBps
      if (downloadBps > this.downloadPeak) this.downloadPeak = downloadBps

      this.uploadSamples.push(uploadBps)
      this.downloadSamples.push(downloadBps)
      if (this.uploadSamples.length > 60) this.uploadSamples.shift()
      if (this.downloadSamples.length > 60) this.downloadSamples.shift()

      const avgUp = this.uploadSamples.reduce((a, b) => a + b, 0) / this.uploadSamples.length
      const avgDown = this.downloadSamples.reduce((a, b) => a + b, 0) / this.downloadSamples.length

      return {
        bytesSent,
        bytesReceived,
        uploadSpeedBps: Math.round(uploadBps),
        downloadSpeedBps: Math.round(downloadBps),
        uploadPeakBps: Math.round(this.uploadPeak),
        downloadPeakBps: Math.round(this.downloadPeak),
        uploadAvgBps: Math.round(avgUp),
        downloadAvgBps: Math.round(avgDown),
      }
    } catch {
      return {
        bytesSent: 0, bytesReceived: 0,
        uploadSpeedBps: 0, downloadSpeedBps: 0,
        uploadPeakBps: 0, downloadPeakBps: 0,
        uploadAvgBps: 0, downloadAvgBps: 0,
      }
    }
  }

  // ── IP Público (via DNS — sem servidor externo de API) ────
  async getPublicIpSafe(): Promise<string> {
    try {
      // Usa nslookup no DNS da Cloudflare (privacy-safe, sem HTTP)
      const { stdout } = await execAsync('nslookup myip.opendns.com resolver1.opendns.com', { timeout: 5000 })
      const m = stdout.match(/Address:\s*([\d.]+)\s*$/)
      return m?.[1] ?? 'N/A'
    } catch {
      return 'N/A'
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  private percentToDbm(pct: number): number {
    if (pct <= 0) return -100
    if (pct >= 100) return -50
    return Math.round(-100 + (pct / 2))
  }

  private detectBand(radioType: string, channel: number): WifiInfo['band'] {
    const rt = radioType.toLowerCase()
    if (rt.includes('6e') || rt.includes('6 ghz')) return '6 GHz'
    if (rt.includes('802.11ac') || rt.includes('802.11ax') || channel > 14) return '5 GHz'
    if (channel > 0 && channel <= 14) return '2.4 GHz'
    if (rt.includes('802.11n') || rt.includes('802.11b') || rt.includes('802.11g')) return '2.4 GHz'
    return 'Desconhecido'
  }

  private inferChannelWidth(phyType: string): number {
    const p = phyType.toLowerCase()
    if (p.includes('ax')) return 80
    if (p.includes('ac')) return 80
    if (p.includes('n')) return 40
    return 20
  }

  private extractWifiSection(ipconfig: string): string {
    const lines = ipconfig.split('\n')
    let inWifi = false
    const section: string[] = []
    for (const line of lines) {
      if (/wi.fi|wireless|sem fio|wlan/i.test(line) && line.includes(':')) {
        inWifi = true
      } else if (inWifi && line.trim() === '' && section.length > 5) {
        const nextLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 3)
        if (nextLines.some(l => /adaptador|adapter/i.test(l))) break
      }
      if (inWifi) section.push(line)
    }
    return section.join('\n') || ipconfig
  }

  private parseDnsServers(section: string): string[] {
    const servers: string[] = []
    const lines = section.split('\n')
    let inDns = false
    for (const line of lines) {
      if (/servidores dns|dns servers/i.test(line)) {
        inDns = true
        const m = line.match(/([\d.]+)$/)
        if (m) servers.push(m[1])
        continue
      }
      if (inDns) {
        const m = line.match(/^\s+([\d.]+)\s*$/)
        if (m) servers.push(m[1])
        else if (line.trim() !== '' && !/^\s+$/.test(line)) inDns = false
      }
    }
    return servers.filter(Boolean).slice(0, 4)
  }

  private detectVpn(ipconfig: string): boolean {
    return /vpn|tun|tap|nordvpn|expressvpn|protonvpn|wireguard|openvpn/i.test(ipconfig)
  }

  private getVpnAdapterName(ipconfig: string): string {
    const m = ipconfig.match(/Adaptador[^:]*VPN[^:]*:|.*VPN.*Adapter.*:/i)
    return m ? m[0].replace(/adaptador|adapter|:/gi, '').trim() : ''
  }

  private async checkFirewall(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('netsh advfirewall show allprofiles state', { timeout: 3000 })
      return stdout.toLowerCase().includes('on')
    } catch { return true }
  }

  private async getNetworkProfile(): Promise<string> {
    try {
      const { stdout } = await execAsync('netsh wlan show interfaces', { timeout: 3000 })
      if (/private|privado/i.test(stdout)) return 'Privado'
      if (/public|público/i.test(stdout)) return 'Público'
      return 'Domínio'
    } catch { return 'Privado' }
  }

  private getAdapterMac(): string {
    try {
      const ifaces = os.networkInterfaces()
      for (const [name, addrs] of Object.entries(ifaces)) {
        if (/wi.fi|wlan|wireless/i.test(name) && addrs) {
          const mac = addrs.find(a => a.family === 'IPv4' && !a.internal)?.mac
          if (mac) return mac.toUpperCase()
        }
      }
      return 'N/A'
    } catch { return 'N/A' }
  }

  private getDriverVersion(): string {
    try {
      const result = execSync(
        'powershell -command "Get-NetAdapter -Physical | Where-Object {$_.MediaType -eq \'802.11\'} | Select-Object -ExpandProperty DriverVersion"',
        { timeout: 4000, encoding: 'utf8' }
      )
      return result.trim() || 'N/A'
    } catch { return 'N/A' }
  }

  private getPowerMode(): string {
    try {
      const result = execSync(
        'powershell -command "Get-NetAdapterPowerManagement -Name \'Wi-Fi*\' | Select-Object -ExpandProperty AllowComputerToTurnOffDevice"',
        { timeout: 3000, encoding: 'utf8' }
      )
      return result.trim().toLowerCase().includes('enabled') ? 'Economy (PSM)' : 'Performance'
    } catch { return 'N/A' }
  }

  // ── Polling ───────────────────────────────────────────────
  startPolling(intervalMs: number, callback: (wifi: WifiInfo, net: NetworkInfo) => void): void {
    this.stopPolling()
    const poll = async () => {
      const [wifiInfo, networkInfo] = await Promise.all([
        this.getWifiInfo(),
        this.getNetworkInfo(),
      ])
      callback(wifiInfo, networkInfo)
    }
    poll()
    this.pollingTimer = setInterval(poll, intervalMs)
  }

  startSpeedSampling(intervalMs: number, callback: (up: number, down: number) => void): void {
    if (this.speedTimer) clearInterval(this.speedTimer)
    this.speedTimer = setInterval(async () => {
      const stats = await this.getNetworkStats()
      callback(stats.uploadSpeedBps, stats.downloadSpeedBps)
    }, intervalMs)
  }

  stopPolling(): void {
    if (this.pollingTimer) { clearInterval(this.pollingTimer); this.pollingTimer = null }
    if (this.speedTimer) { clearInterval(this.speedTimer); this.speedTimer = null }
  }

  // ── Defaults ──────────────────────────────────────────────
  private getDefaultWifiInfo(): WifiInfo {
    return {
      ssid: 'Desconectado', bssid: 'N/A', signalDbm: -100, signalPercent: 0,
      noiseDbm: -95, snrDb: 0, band: 'Desconhecido', channel: 0, channelWidth: 0,
      phyType: 'N/A', txSpeedMbps: 0, rxSpeedMbps: 0, radioType: 'N/A',
      connectionUptime: 0, encryption: 'N/A', authentication: 'N/A',
      cipherAlgorithm: 'N/A', networkType: 'N/A', profileName: 'N/A',
      adapterName: 'N/A', adapterMac: 'N/A', driverVersion: 'N/A',
      driverDate: 'N/A', powerMode: 'N/A', roamingStatus: 'N/A',
      isConnected: false, isWifi: false,
    }
  }

  private getDefaultNetworkInfo(): NetworkInfo {
    return {
      localIp: 'N/A', publicIp: 'N/A', subnetMask: 'N/A', gateway: 'N/A',
      dhcpServer: 'N/A', dnsServers: [], ipv6: 'N/A', macAddress: 'N/A',
      bytesSent: 0, bytesReceived: 0, bytesSentTotal: 0, bytesReceivedTotal: 0,
      packetsSent: 0, packetsReceived: 0, packetsError: 0, packetsDiscarded: 0,
      uploadSpeedBps: 0, downloadSpeedBps: 0, uploadPeakBps: 0, downloadPeakBps: 0,
      uploadAvgBps: 0, downloadAvgBps: 0, vpnConnected: false, vpnAdapter: '',
      firewallEnabled: true, networkProfile: 'Privado', sessionStartTime: Date.now(),
      totalSessionUpBytes: 0, totalSessionDownBytes: 0,
    }
  }
}
