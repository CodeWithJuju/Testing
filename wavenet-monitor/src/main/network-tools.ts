import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import * as net from 'net'
import * as os from 'os'
import type {
  TracerouteResult, TracerouteHop,
  DnsResult, DnsRecord,
  PortCheckResult,
  NetworkDevice,
  SpeedTestResult,
} from '../shared/types'

const execAsync = promisify(exec)

// ============================================================
// NetworkTools — Ferramentas de diagnóstico de rede
// ============================================================

export class NetworkTools {

  // ── Traceroute ────────────────────────────────────────────
  async traceroute(host: string, maxHops = 30): Promise<TracerouteResult> {
    return new Promise((resolve) => {
      const hops: TracerouteHop[] = []
      const start = Date.now()

      const proc = spawn('tracert', ['-h', String(maxHops), '-w', '2000', host], {
        timeout: 60000,
      })

      let buffer = ''
      proc.stdout.setEncoding('utf8')

      proc.stdout.on('data', (chunk: string) => {
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const hop = this.parseTracertLine(line)
          if (hop) hops.push(hop)
        }
      })

      proc.on('close', () => {
        resolve({
          host,
          hops,
          completed: hops.some(h => h.hostname === host || h.ip === host),
          totalMs: Date.now() - start,
        })
      })

      proc.on('error', () => {
        resolve({ host, hops, completed: false, totalMs: Date.now() - start })
      })
    })
  }

  private parseTracertLine(line: string): TracerouteHop | null {
    // Windows tracert format: "  1    <1 ms    <1 ms    <1 ms  192.168.1.1"
    const m = line.match(/^\s{1,4}(\d{1,3})\s+([\s\d<*ms]+?)\s+([0-9a-fA-F.:]+|[\w.-]+)\s*$/)
    if (!m) return null

    const hop = parseInt(m[1])
    const timePart = m[2]
    const host = m[3]

    const times = timePart.match(/([\d<]+)\s*ms|\*/g) ?? []
    const msValues = times.map(t => {
      if (t === '*') return -1
      const n = t.replace(/[<ms]/g, '').trim()
      return parseInt(n) || 1
    })

    const timeout = msValues.every(v => v === -1)
    const validMs = msValues.filter(v => v > 0)

    return {
      hop,
      ip: this.isIp(host) ? host : '',
      hostname: this.isIp(host) ? '' : host,
      ms: timeout ? [] : validMs,
      timeout,
    }
  }

  // ── DNS Lookup ────────────────────────────────────────────
  async dnsLookup(host: string): Promise<DnsResult> {
    const start = Date.now()
    const records: DnsRecord[] = []

    try {
      // Resolve A e AAAA via nslookup
      const { stdout } = await execAsync(`nslookup -type=ANY ${host}`, { timeout: 8000 })
      const queryTimeMs = Date.now() - start

      const serverMatch = stdout.match(/Servidor:\s*(.+)|Server:\s*(.+)/)
      const server = serverMatch?.[1]?.trim() ?? serverMatch?.[2]?.trim() ?? 'N/A'

      const lines = stdout.split('\n')
      let inAnswer = false

      for (const line of lines) {
        if (/Resposta não autoritativa|Non-authoritative answer/i.test(line)) {
          inAnswer = true
          continue
        }

        if (inAnswer || true) {
          // A records
          const aMatch = line.match(/Endereço:\s*([\d.]+)|Address:\s*([\d.]+\.\d+)/)
          if (aMatch) records.push({ type: 'A', value: aMatch[1] ?? aMatch[2] })

          // MX
          const mxMatch = line.match(/mail exchanger\s*=\s*([\w.-]+)\s*\(prio:\s*(\d+)\)|MX\s+preference\s*=\s*(\d+),\s*mail exchanger\s*=\s*([\w.-]+)/i)
          if (mxMatch) records.push({
            type: 'MX',
            value: mxMatch[1] ?? mxMatch[4],
            priority: parseInt(mxMatch[2] ?? mxMatch[3]),
          })

          // CNAME
          const cnameMatch = line.match(/nome canônico\s*=\s*([\w.-]+)|canonical name\s*=\s*([\w.-]+)/i)
          if (cnameMatch) records.push({ type: 'CNAME', value: cnameMatch[1] ?? cnameMatch[2] })

          // AAAA
          const aaaaMatch = line.match(/AAAA IPv6 address\s*=\s*([0-9a-fA-F:]+)/i)
          if (aaaaMatch) records.push({ type: 'AAAA', value: aaaaMatch[1] })
        }
      }

      return { host, records: records.filter(r => r.value?.trim()), queryTimeMs, server }
    } catch (e) {
      return { host, records: [], queryTimeMs: Date.now() - start, server: 'Erro' }
    }
  }

  // ── Port Check ────────────────────────────────────────────
  async checkPort(host: string, port: number, timeoutMs = 3000): Promise<PortCheckResult> {
    return new Promise((resolve) => {
      const start = Date.now()
      const socket = new net.Socket()

      socket.setTimeout(timeoutMs)

      socket.connect(port, host, () => {
        const ms = Date.now() - start
        socket.destroy()
        resolve({
          host,
          port,
          protocol: 'TCP',
          isOpen: true,
          service: this.getServiceName(port),
          responseMs: ms,
        })
      })

      socket.on('timeout', () => {
        socket.destroy()
        resolve({ host, port, protocol: 'TCP', isOpen: false, service: this.getServiceName(port), responseMs: timeoutMs })
      })

      socket.on('error', () => {
        resolve({ host, port, protocol: 'TCP', isOpen: false, service: this.getServiceName(port), responseMs: Date.now() - start })
      })
    })
  }

  // ── Network Scan (ARP) ────────────────────────────────────
  async scanLocalNetwork(): Promise<NetworkDevice[]> {
    const devices: NetworkDevice[] = []

    try {
      // Pinga toda a sub-rede para popular a tabela ARP
      const gateway = this.getGateway()
      if (gateway) {
        const subnet = gateway.replace(/\.\d+$/, '')
        // Ping paralelo (rápido)
        const pings = Array.from({ length: 20 }, (_, i) =>
          execAsync(`ping -n 1 -w 200 ${subnet}.${i + 1}`, { timeout: 500 }).catch(() => {})
        )
        await Promise.allSettled(pings)
      }

      // Lê tabela ARP
      const { stdout } = await execAsync('arp -a', { timeout: 5000 })
      const myMac = this.getMyMac()
      const gwIp = gateway ?? '192.168.1.1'

      const lines = stdout.split('\n')
      for (const line of lines) {
        const m = line.match(/([\d.]+)\s+([0-9a-fA-F-]{17})\s+(\w+)/)
        if (!m) continue
        const [, ip, macRaw, type] = m
        if (type === 'static' && !ip.endsWith('.255') && !ip.endsWith('.0')) continue
        const mac = macRaw.toUpperCase().replace(/-/g, ':')
        if (mac === 'FF:FF:FF:FF:FF:FF') continue

        devices.push({
          ip,
          mac,
          hostname: await this.resolveHostname(ip),
          vendor: this.macToVendor(mac),
          isGateway: ip === gwIp,
          isCurrentDevice: mac === myMac,
          lastSeen: Date.now(),
        })
      }
    } catch { /* retorna o que tiver */ }

    return devices.slice(0, 30)
  }

  // ── Speed Test simplificado ────────────────────────────────
  async runSpeedTest(): Promise<SpeedTestResult> {
    // Baixa um arquivo de teste da Cloudflare (privacy-safe, sem conta)
    const start = Date.now()
    try {
      const { stdout: dl } = await execAsync(
        'powershell -command "$start=[DateTime]::Now; Invoke-WebRequest -Uri \'https://speed.cloudflare.com/__down?bytes=5000000\' -UseBasicParsing -OutFile $env:TEMP\\wn_test.tmp; $elapsed=([DateTime]::Now-$start).TotalSeconds; Remove-Item $env:TEMP\\wn_test.tmp -Force; [Math]::Round(5000000*8/1000000/$elapsed,2)"',
        { timeout: 30000 }
      )
      const dlMbps = parseFloat(dl.trim()) || 0

      const { stdout: ul } = await execAsync(
        'powershell -command "$bytes=[System.Text.Encoding]::UTF8.GetBytes(\'x\'*1000000); $start=[DateTime]::Now; Invoke-WebRequest -Uri \'https://speed.cloudflare.com/__up\' -Method POST -Body $bytes -UseBasicParsing | Out-Null; $elapsed=([DateTime]::Now-$start).TotalSeconds; [Math]::Round(1000000*8/1000000/$elapsed,2)"',
        { timeout: 20000 }
      )
      const ulMbps = parseFloat(ul.trim()) || 0

      return {
        downloadMbps: dlMbps,
        uploadMbps: ulMbps,
        pingMs: 0,
        jitterMs: 0,
        server: 'Cloudflare Speed Test',
        timestamp: Date.now(),
      }
    } catch {
      return {
        downloadMbps: 0, uploadMbps: 0, pingMs: 0, jitterMs: 0,
        server: 'Erro ao conectar', timestamp: Date.now(),
      }
    }
  }

  // ── Ações do Sistema ──────────────────────────────────────
  async flushDns(): Promise<{ success: boolean; message: string }> {
    try {
      const { stdout } = await execAsync('ipconfig /flushdns', { timeout: 5000 })
      return { success: true, message: stdout.trim() }
    } catch (e) {
      return { success: false, message: String(e) }
    }
  }

  async renewIp(): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync('ipconfig /release', { timeout: 8000 })
      const { stdout } = await execAsync('ipconfig /renew', { timeout: 15000 })
      return { success: true, message: 'IP renovado com sucesso.\n' + stdout.trim() }
    } catch (e) {
      return { success: false, message: String(e) }
    }
  }

  async resetAdapter(): Promise<{ success: boolean; message: string }> {
    try {
      // Desabilita e reabilita o adaptador Wi-Fi
      await execAsync(
        'powershell -command "Get-NetAdapter -Physical | Where-Object {$_.MediaType -eq \'802.11\'} | Disable-NetAdapter -Confirm:$false"',
        { timeout: 10000 }
      )
      await new Promise(r => setTimeout(r, 2000))
      await execAsync(
        'powershell -command "Get-NetAdapter -Physical | Where-Object {$_.MediaType -eq \'802.11\'} | Enable-NetAdapter -Confirm:$false"',
        { timeout: 10000 }
      )
      return { success: true, message: 'Adaptador Wi-Fi reiniciado com sucesso.' }
    } catch (e) {
      return { success: false, message: 'Erro: ' + String(e) + '\nVerifique se o app está sendo executado como Administrador.' }
    }
  }

  async getPublicIp(): Promise<string> {
    try {
      const { stdout } = await execAsync('nslookup myip.opendns.com resolver1.opendns.com', { timeout: 5000 })
      const m = stdout.match(/Address:\s*([\d.]+)\s*$/)
      return m?.[1] ?? 'N/A'
    } catch { return 'N/A' }
  }

  // ── Helpers ───────────────────────────────────────────────
  private isIp(str: string): boolean {
    return /^[\d.]+$/.test(str)
  }

  private getServiceName(port: number): string {
    const services: Record<number, string> = {
      21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
      53: 'DNS', 80: 'HTTP', 110: 'POP3', 143: 'IMAP',
      443: 'HTTPS', 465: 'SMTPS', 587: 'SMTP(TLS)',
      993: 'IMAPS', 995: 'POP3S', 3389: 'RDP', 8080: 'HTTP-Alt',
      8443: 'HTTPS-Alt', 3306: 'MySQL', 5432: 'PostgreSQL',
      27017: 'MongoDB', 6379: 'Redis', 5900: 'VNC',
    }
    return services[port] ?? 'Desconhecido'
  }

  private macToVendor(mac: string): string {
    const oui = mac.substring(0, 8).toUpperCase()
    const vendors: Record<string, string> = {
      'A4:11:62': 'Arris (Roteador)',
      'B4:2E:99': 'Intel',
      'A8:51:AB': 'Apple',
      '00:1A:2B': 'Cisco',
      'DC:A6:32': 'Raspberry Pi',
      'B8:27:EB': 'Raspberry Pi',
      '00:50:56': 'VMware',
    }
    return vendors[oui] ?? 'Desconhecido'
  }

  private getGateway(): string {
    try {
      const { stdout } = require('child_process').execSync('ipconfig', { encoding: 'utf8', timeout: 3000 })
      const m = stdout.match(/Gateway Padrão[^:]*:\s*([\d.]+)|Default Gateway[^:]*:\s*([\d.]+)/)
      return m?.[1] ?? m?.[2] ?? ''
    } catch { return '' }
  }

  private getMyMac(): string {
    const ifaces = os.networkInterfaces()
    for (const [name, addrs] of Object.entries(ifaces)) {
      if (/wi.fi|wlan|wireless/i.test(name) && addrs) {
        const addr = addrs.find(a => a.family === 'IPv4' && !a.internal)
        if (addr?.mac) return addr.mac.toUpperCase()
      }
    }
    return ''
  }

  private async resolveHostname(ip: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`nslookup ${ip}`, { timeout: 2000 })
      const m = stdout.match(/nome\s*=\s*([\w.-]+)|name\s*=\s*([\w.-]+)/i)
      return m?.[1] ?? m?.[2] ?? ip
    } catch { return ip }
  }
}
