import React, { useRef, useEffect } from 'react'

interface Props {
  data: number[]
  color?: string
  fillColor?: string
  height?: number
  showDot?: boolean
  min?: number
  max?: number
}

export default function SparklineChart({
  data,
  color = '#38d9a9',
  fillColor,
  height = 70,
  showDot = true,
  min,
  max,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.offsetWidth
    const H = height

    // HiDPI
    const dpr = window.devicePixelRatio ?? 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, W, H)

    const validData = data.filter(v => v > 0)
    const lo = min ?? Math.min(...validData, 1)
    const hi = max ?? Math.max(...validData, lo + 1)
    const range = hi - lo || 1

    const pad = 4
    const xStep = (W - pad * 2) / (data.length - 1)

    const toX = (i: number) => pad + i * xStep
    const toY = (v: number) => H - pad - ((Math.max(lo, Math.min(hi, v)) - lo) / range) * (H - pad * 2)

    // Build path
    ctx.beginPath()
    let firstValid = true
    for (let i = 0; i < data.length; i++) {
      const x = toX(i)
      const y = data[i] > 0 ? toY(data[i]) : H - pad
      if (firstValid) { ctx.moveTo(x, y); firstValid = false }
      else ctx.lineTo(x, y)
    }

    // Stroke
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()

    // Fill under line
    const fill = fillColor ?? (color + '18')
    ctx.lineTo(toX(data.length - 1), H)
    ctx.lineTo(toX(0), H)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()

    // Last point dot
    if (showDot) {
      const last = data[data.length - 1]
      if (last > 0) {
        const lx = toX(data.length - 1)
        const ly = toY(last)
        ctx.beginPath()
        ctx.arc(lx, ly, 3, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        // Glow ring
        ctx.beginPath()
        ctx.arc(lx, ly, 5, 0, Math.PI * 2)
        ctx.strokeStyle = color + '40'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }
  }, [data, color, fillColor, height, showDot])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, display: 'block' }}
    />
  )
}
