import React from 'react'
import { useWifiStore } from '../../store/wifiStore'
import { formatSpeed, formatBytes, dbmToQuality, latencyToQuality, stabilityLabel } from '../../hooks/useElectronBridge'
import SparklineChart from '../Charts/SparklineChart'

// ── Notice Banner ─────────────────────────────────────────────
function NoticeBanner() {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: 'rgba(79,142,247,.06)', border: '1px solid rgba(79,142,247,.18)',
      borderRadius: 8, padding: '9px 12px', marginBottom: 12, fontSize: 11,
      color: 'var(--text2)', lineHeight: 1.6,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>📡</span>
      <div>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Somente Wi-Fi · </span>
        Este app monitora exclusivamente conexões sem fio (sem suporte a Ethernet/cabo).
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}> Nenhum dado pessoal</span> é coletado, transmitido ou armazenado externamente.
      </div>
    </div>
  )
}

// ── Signal Gauge ──────────────────────────────────────────────
function SignalGauge({ dbm, pct }: { dbm: number; pct: number }) {
  const q = dbmToQuality(dbm)
  // Arc: 0% = início, 100% = fim. stroke-dashoffset controla o preenchimento
  const circumference = 157 // π * r (r=50, semicírculo)
  const offset = circumference - (pct / 100) * circumference
  const arcColor = pct >= 70 ? '#38d9a9' : pct >= 40 ? '#f7c94f' : '#f75849'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0 6px' }}>
      <svg width="130" height="72" viewBox="0 0 130 72" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="arc-g" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f8ef7"/>
            <stop offset="100%" stopColor={arcColor}/>
          </linearGradient>
        </defs>
        {/* Track */}
        <path d="M10 65 A55 55 0 0 1 120 65" fill="none" stroke="var(--surface2)" strokeWidth="9" strokeLinecap="round"/>
        {/* Fill */}
        <path d="M10 65 A55 55 0 0 1 120 65" fill="none" stroke="url(#arc-g)"
          strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        {/* Value */}
        <text x="65" y="60" textAnchor="middle"
          style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 300, fill: 'var(--text)' }}>
          {dbm}
        </text>
        <text x="65" y="72" textAnchor="middle"
          style={{ fontFamily: 'var(--font)', fontSize: 10, fill: 'var(--text3)' }}>
          dBm
        </text>
      </svg>
      <span className={`badge badge-${q.cls === 'good' ? 'success' : q.cls === 'warn' ? 'warn' : 'danger'}`}
        style={{ fontSize: 11, marginTop: 2 }}>
        {q.label} · {pct}%
      </span>
    </div>
  )
}

// ── Speed Block ───────────────────────────────────────────────
function SpeedBlock({ label, bps, color, peak }: { label: string; bps: number; color: string; peak: number }) {
  const barPct = peak > 0 ? Math.min(100, (bps / peak) * 100) : 10
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, letterSpacing: '.6px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 300, color, lineHeight: 1 }}>
        {formatSpeed(bps).split(' ')[0]}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{formatSpeed(bps).split(' ')[1]}</div>
      <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2, background: color,
          width: `${barPct}%`, transition: 'width 500ms ease',
        }}/>
      </div>
    </div>
  )
}

// ── Stability Ring ────────────────────────────────────────────
function StabilityRing({ score }: { score: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const { label, cls } = stabilityLabel(score)
  const color = cls === 'good' ? '#38d9a9' : cls === 'warn' ? '#f7c94f' : '#f75849'

  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--surface2)" strokeWidth="5"/>
        <circle cx="26" cy="26" r={r} fill="none" stroke={color}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 26 26)"
          style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500, color,
      }}>
        {score}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const { wifiInfo, networkInfo, latencyStats, speedHistory } = useWifiStore()

  const latHistory = latencyStats?.latencyHistory ?? new Array(60).fill(0)
  const uploadHistory = speedHistory.slice(-60).map(s => s.up / 1024 / 1024) // MB/s
  const downloadHistory = speedHistory.slice(-60).map(s => s.down / 1024 / 1024)

  const ping = latencyStats?.currentMs ?? 0
  const pq = latencyToQuality(ping)
  const stabScore = latencyStats?.stabilityScore ?? 100
  const { label: stabLabel, cls: stabCls } = stabilityLabel(stabScore)

  const upBps = networkInfo?.uploadSpeedBps ?? 0
  const downBps = networkInfo?.downloadSpeedBps ?? 0
  const upPeak = networkInfo?.uploadPeakBps ?? Math.max(upBps, 1)
  const downPeak = networkInfo?.downloadPeakBps ?? Math.max(downBps, 1)

  return (
    <div>
      <NoticeBanner />

      {/* Row 1: Signal + Speed */}
      <div className="grid-2" style={{ marginBottom: 10 }}>

        {/* Signal card */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 8 }}>Sinal Wi-Fi</div>
          <SignalGauge dbm={wifiInfo?.signalDbm ?? -100} pct={wifiInfo?.signalPercent ?? 0} />
          <div style={{ marginTop: 4 }}>
            <div className="metric-row"><span className="metric-label">SNR</span><span className="metric-val accent">{wifiInfo?.snrDb ?? 0} dB</span></div>
            <div className="metric-row"><span className="metric-label">Banda</span><span className="metric-val accent">{wifiInfo?.band ?? 'N/A'}</span></div>
            <div className="metric-row"><span className="metric-label">Canal</span><span className="metric-val">{wifiInfo?.channel ?? '–'} ({wifiInfo?.channelWidth ?? 0} MHz)</span></div>
            <div className="metric-row"><span className="metric-label">Tipo PHY</span><span className="metric-val">{wifiInfo?.phyType ?? 'N/A'}</span></div>
          </div>
        </div>

        {/* Speed card */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 12 }}>Velocidade em Tempo Real</div>
          <div className="grid-2" style={{ marginBottom: 14, gap: 8 }}>
            <SpeedBlock label="↑ Upload" bps={upBps} color="var(--accent)" peak={upPeak} />
            <SpeedBlock label="↓ Download" bps={downBps} color="var(--accent2)" peak={downPeak} />
          </div>
          <div className="metric-row">
            <span className="metric-label">Ping atual</span>
            <span className={`metric-val ${pq.cls}`}>{ping > 0 ? `${ping} ms` : 'N/A'}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Jitter</span>
            <span className={`metric-val ${latencyToQuality(latencyStats?.jitterMs ?? 0).cls}`}>
              {latencyStats?.jitterMs ?? 0} ms
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Perda de Pacotes</span>
            <span className={`metric-val ${(latencyStats?.packetLossPercent ?? 0) < 1 ? 'good' : 'bad'}`}>
              {(latencyStats?.packetLossPercent ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">TX / RX Link</span>
            <span className="metric-val accent">{wifiInfo?.txSpeedMbps ?? 0} / {wifiInfo?.rxSpeedMbps ?? 0} Mbps</span>
          </div>
        </div>
      </div>

      {/* Latency sparkline */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase' }}>Latência (60s)</span>
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            <span style={{ color: 'var(--text2)' }}>Mín <span style={{ fontFamily: 'var(--mono)', color: 'var(--success)' }}>{latencyStats?.minMs ?? 0}ms</span></span>
            <span style={{ color: 'var(--text2)' }}>Méd <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent2)' }}>{latencyStats?.averageMs ?? 0}ms</span></span>
            <span style={{ color: 'var(--text2)' }}>Máx <span style={{ fontFamily: 'var(--mono)', color: 'var(--warn)' }}>{latencyStats?.maxMs ?? 0}ms</span></span>
          </div>
        </div>
        <SparklineChart data={latHistory} color="#38d9a9" height={68} />
      </div>

      {/* Speed history */}
      {(uploadHistory.length > 2 || downloadHistory.length > 2) && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 8 }}>
            Velocidade — Upload / Download (MB/s)
          </div>
          <div style={{ position: 'relative' }}>
            <SparklineChart data={uploadHistory} color="#4f8ef7" height={50} showDot={false} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
              <SparklineChart data={downloadHistory} color="#38d9a9" height={50} showDot={false} fillColor="rgba(56,217,169,.05)" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 3, background: '#4f8ef7', borderRadius: 2, display: 'inline-block' }}/>Upload
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 3, background: '#38d9a9', borderRadius: 2, display: 'inline-block' }}/>Download
            </span>
          </div>
        </div>
      )}

      {/* Bottom stats */}
      <div className="grid-4">
        <div className="card-sm">
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Estabilidade</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StabilityRing score={stabScore} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: stabCls === 'good' ? 'var(--success)' : stabCls === 'warn' ? 'var(--warn)' : 'var(--danger)' }}>{stabLabel}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>score</div>
            </div>
          </div>
        </div>
        <div className="card-sm">
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Dados Sessão</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 300, color: 'var(--accent2)' }}>{formatBytes(networkInfo?.totalSessionDownBytes ?? 0)}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>recebidos</div>
        </div>
        <div className="card-sm">
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Download Pico</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 300, color: 'var(--accent)' }}>{formatSpeed(downPeak)}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>nesta sessão</div>
        </div>
        <div className="card-sm">
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>SSID</div>
          <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wifiInfo?.ssid ?? 'N/A'}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>{wifiInfo?.bssid?.slice(0, 11) ?? 'N/A'}...</div>
        </div>
      </div>
    </div>
  )
}
