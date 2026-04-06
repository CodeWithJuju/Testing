import React, { useEffect, useRef } from 'react'
import { useWifiStore } from '../../store/wifiStore'
import type { SessionEvent } from '@shared/types'

const EVENT_ICONS: Record<string, string> = {
  connected: '🟢', disconnected: '🔴', roaming: '🔄',
  spike: '⚡', dns_renewed: '🧹', ip_renewed: '🔄',
  warning: '⚠', info: 'ℹ',
}

const EVENT_BADGE: Record<string, string> = {
  connected: 'badge-success', disconnected: 'badge-danger', roaming: 'badge-warn',
  spike: 'badge-warn', dns_renewed: 'badge-info', ip_renewed: 'badge-info',
  warning: 'badge-warn', info: 'badge-neutral',
}

function EventRow({ ev }: { ev: SessionEvent }) {
  const time = new Date(ev.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
      <span style={{ fontFamily: 'var(--mono)', color: 'var(--text3)', minWidth: 62, paddingTop: 2 }}>{time}</span>
      <span className={`badge ${EVENT_BADGE[ev.type] ?? 'badge-neutral'}`} style={{ fontSize: 10, flexShrink: 0 }}>
        {EVENT_ICONS[ev.type] ?? '●'} {ev.type}
      </span>
      <div style={{ flex: 1, color: 'var(--text)', lineHeight: 1.4 }}>
        {ev.message}
        {ev.details && <div style={{ color: 'var(--text3)', marginTop: 1 }}>{ev.details}</div>}
      </div>
    </div>
  )
}

export default function History() {
  const { sessionEvents, speedHistory } = useWifiStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw speed history chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || speedHistory.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.offsetWidth
    const H = 90
    const dpr = window.devicePixelRatio ?? 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const upData = speedHistory.slice(-120).map(s => s.up / 1048576)
    const downData = speedHistory.slice(-120).map(s => s.down / 1048576)
    const allVals = [...upData, ...downData].filter(v => v > 0)
    const hi = Math.max(...allVals, 1)
    const pad = 4
    const n = Math.max(upData.length, downData.length)
    const xStep = (W - pad * 2) / (n - 1)

    const drawLine = (data: number[], color: string, fill: string) => {
      if (data.length < 2) return
      ctx.beginPath()
      data.forEach((v, i) => {
        const x = pad + i * xStep
        const y = H - pad - (Math.max(0, Math.min(hi, v)) / hi) * (H - pad * 2)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.lineTo(pad + (data.length - 1) * xStep, H)
      ctx.lineTo(pad, H)
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
    }

    drawLine(downData, '#38d9a9', 'rgba(56,217,169,.08)')
    drawLine(upData, '#4f8ef7', 'rgba(79,142,247,.08)')
  }, [speedHistory])

  const totalDown = speedHistory.reduce((sum, s) => sum + s.down * 3, 0) // 3s intervals approx
  const totalUp = speedHistory.reduce((sum, s) => sum + s.up * 3, 0)
  const peakDown = Math.max(...speedHistory.map(s => s.down), 0)
  const peakUp = Math.max(...speedHistory.map(s => s.up), 0)

  const fmt = (b: number) => {
    if (b < 1024) return `${b.toFixed(0)} B`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
    if (b < 1073741824) return `${(b / 1048576).toFixed(2)} MB`
    return `${(b / 1073741824).toFixed(2)} GB`
  }
  const fmtBps = (b: number) => {
    if (b < 1024) return `${b.toFixed(0)} B/s`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB/s`
    return `${(b / 1048576).toFixed(2)} MB/s`
  }

  return (
    <div>
      <div className="section-title">Velocidade — Histórico da Sessão</div>
      <div className="card" style={{ marginBottom: 10 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: 90, display: 'block', marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
          <span><span style={{ color: '#4f8ef7' }}>■</span> Upload</span>
          <span><span style={{ color: '#38d9a9' }}>■</span> Download</span>
        </div>
        <div className="grid-4" style={{ gap: 8 }}>
          {[
            { label: 'Total Down', value: fmt(totalDown), color: 'var(--accent2)' },
            { label: 'Total Up', value: fmt(totalUp), color: 'var(--accent)' },
            { label: 'Pico Download', value: fmtBps(peakDown), color: 'var(--accent2)' },
            { label: 'Pico Upload', value: fmtBps(peakUp), color: 'var(--accent)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 300, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">Eventos da Sessão ({sessionEvents.length})</div>
      <div className="card">
        {sessionEvents.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>Nenhum evento registrado ainda.</div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {sessionEvents.map((ev, i) => <EventRow key={i} ev={ev} />)}
          </div>
        )}
      </div>
    </div>
  )
}
