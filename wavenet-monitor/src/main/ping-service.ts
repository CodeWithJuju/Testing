import { exec } from 'child_process'
import { promisify } from 'util'
import type { LatencyStats, PingResult, PingEntry } from '../shared/types'

const execAsync = promisify(exec)

// ============================================================
// PingService — Monitor contínuo de latência
// ============================================================

export class PingService {
  private timer: NodeJS.Timeout | null = null
  private history: number[] = new Array(60).fill(0)
  private spikeCount = 0
  private lastSpikeMs = 0
  private minEver = Infinity
  private maxEver = 0
  private samples: number[] = []
  private readonly SPIKE_THRESHOLD = 100

  // ── Ping contínuo ─────────────────────────────────────────
  startContinuousPing(
    target: string,
    intervalMs: number,
    callback: (stats: LatencyStats) => void
  ): void {
    this.stop()
    const measure = async () => {
      const ms = await this.singlePing(target)
      this.addSample(ms)
      callback(this.buildStats())
    }
    measure()
    this.timer = setInterval(measure, intervalMs)
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
  }

  // ── Ping completo (para ferramenta) ───────────────────────
  async runPing(host: string, count = 8): Promise<PingResult> {
    try {
      const { stdout } = await execAsync(
        `ping -n ${count} ${host}`,
        { timeout: count * 3000 + 2000 }
      )
      return this.parsePingOutput(host, stdout, count)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      // Timeout ou host inatingível
      return this.buildFailedPing(host, count, msg)
    }
  }

  // ── Parse da saída do ping do Windows ────────────────────
  private parsePingOutput(host: string, raw: string, count: number): PingResult {
    const entries: PingEntry[] = []
    const lineRegex = /Resposta de|Reply from/i
    const timeRegex = /tempo[=<]([\d]+)ms|time[=<]([\d]+)ms/i
    const ttlRegex = /TTL=(\d+)/i
    const timeoutRegex = /Esgotado|timed out|Request timeout/i

    const lines = raw.split('\n')
    let seq = 1
    for (const line of lines) {
      if (lineRegex.test(line)) {
        const timeMatch = line.match(timeRegex)
        const ttlMatch = line.match(ttlRegex)
        entries.push({
          seq: seq++,
          ms: timeMatch ? parseInt(timeMatch[1] ?? timeMatch[2]) : null,
          timeout: false,
          ttl: ttlMatch ? parseInt(ttlMatch[1]) : undefined,
        })
      } else if (timeoutRegex.test(line) && seq <= count) {
        entries.push({ seq: seq++, ms: null, timeout: true })
      }
    }

    // Estatísticas da linha de resumo
    const statsLine = raw.match(/Mínimo\s*=\s*(\d+)ms.*Máximo\s*=\s*(\d+)ms.*Média\s*=\s*(\d+)ms|Minimum\s*=\s*(\d+)ms.*Maximum\s*=\s*(\d+)ms.*Average\s*=\s*(\d+)ms/i)
    const lostLine = raw.match(/Perdidos\s*=\s*(\d+)|Lost\s*=\s*(\d+)/i)

    const validMs = entries.filter(e => e.ms !== null).map(e => e.ms as number)

    return {
      host,
      sent: count,
      received: validMs.length,
      lostPercent: Math.round(((count - validMs.length) / count) * 100),
      minMs: statsLine ? parseInt(statsLine[1] ?? statsLine[4]) : Math.min(...validMs),
      maxMs: statsLine ? parseInt(statsLine[2] ?? statsLine[5]) : Math.max(...validMs),
      avgMs: statsLine ? parseInt(statsLine[3] ?? statsLine[6]) : Math.round(validMs.reduce((a, b) => a + b, 0) / (validMs.length || 1)),
      results: entries,
    }
  }

  // ── Ping rápido único (para telemetria) ───────────────────
  private async singlePing(target: string): Promise<number> {
    try {
      const start = Date.now()
      const { stdout } = await execAsync(`ping -n 1 -w 2000 ${target}`, { timeout: 4000 })
      const m = stdout.match(/tempo[=<]([\d]+)ms|time[=<]([\d]+)ms/i)
      if (m) return parseInt(m[1] ?? m[2])
      return Date.now() - start
    } catch {
      return -1 // timeout/unreachable
    }
  }

  // ── Gerenciamento de histórico ─────────────────────────────
  private addSample(ms: number): void {
    const valid = ms > 0 ? ms : 0

    this.history.push(valid)
    if (this.history.length > 60) this.history.shift()

    if (valid > 0) {
      this.samples.push(valid)
      if (this.samples.length > 300) this.samples.shift()
      if (valid < this.minEver) this.minEver = valid
      if (valid > this.maxEver) this.maxEver = valid
    }

    if (valid > this.SPIKE_THRESHOLD) {
      this.spikeCount++
      this.lastSpikeMs = valid
    }
  }

  private buildStats(): LatencyStats {
    const validSamples = this.samples.filter(s => s > 0)
    const avg = validSamples.length > 0
      ? Math.round(validSamples.reduce((a, b) => a + b, 0) / validSamples.length)
      : 0
    const current = this.history[this.history.length - 1] ?? 0

    // Jitter = média das diferenças absolutas consecutivas
    let jitterSum = 0
    let jitterCount = 0
    for (let i = 1; i < this.history.length; i++) {
      if (this.history[i] > 0 && this.history[i - 1] > 0) {
        jitterSum += Math.abs(this.history[i] - this.history[i - 1])
        jitterCount++
      }
    }
    const jitter = jitterCount > 0 ? Math.round(jitterSum / jitterCount) : 0

    // Perda de pacotes nos últimos 60 pings
    const timeouts = this.history.filter(v => v === 0).length
    const packetLoss = Math.round((timeouts / this.history.length) * 100)

    // Score de estabilidade (0-100)
    const stabilityScore = this.calcStabilityScore(avg, jitter, packetLoss)

    return {
      currentMs: current,
      averageMs: avg,
      minMs: this.minEver === Infinity ? 0 : this.minEver,
      maxMs: this.maxEver,
      jitterMs: jitter,
      packetLossPercent: packetLoss,
      latencyHistory: [...this.history],
      spikeCount: this.spikeCount,
      lastSpikeMs: this.lastSpikeMs,
      stabilityScore,
    }
  }

  private calcStabilityScore(avg: number, jitter: number, packetLoss: number): number {
    let score = 100

    // Penalidades por latência
    if (avg > 200) score -= 40
    else if (avg > 100) score -= 25
    else if (avg > 50) score -= 10
    else if (avg > 25) score -= 3

    // Penalidades por jitter
    if (jitter > 50) score -= 30
    else if (jitter > 20) score -= 15
    else if (jitter > 10) score -= 5

    // Penalidades por perda de pacotes
    score -= packetLoss * 2

    return Math.max(0, Math.min(100, score))
  }

  private buildFailedPing(host: string, count: number, reason: string): PingResult {
    return {
      host,
      sent: count,
      received: 0,
      lostPercent: 100,
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      results: Array.from({ length: count }, (_, i) => ({
        seq: i + 1,
        ms: null,
        timeout: true,
      })),
    }
  }
}
