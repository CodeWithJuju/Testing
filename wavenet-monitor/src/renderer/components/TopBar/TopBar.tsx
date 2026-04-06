import React from 'react'
import { useWifiStore } from '../../store/wifiStore'

const Logo = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <defs>
      <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4f8ef7"/>
        <stop offset="100%" stopColor="#38d9a9"/>
      </linearGradient>
    </defs>
    <rect width="22" height="22" rx="6" fill="url(#lg)"/>
    <path d="M11 18c.6-1.8 1.8-3.6 4.2-4.8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M11 18c-.6-1.8-1.8-3.6-4.2-4.8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M11 14.5c.4-.9 1-2 2.2-2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M11 14.5c-.4-.9-1-2-2.2-2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="11" cy="18" r="1.2" fill="white"/>
    <path d="M4.5 9.5C6.5 7 8.6 6 11 6s4.5 1 6.5 3.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M2 7C4.5 3.5 7.5 2 11 2s6.5 1.5 9 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
  </svg>
)

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M12 7.4A5 5 0 0 1 6.6 2a5 5 0 1 0 5.4 5.4Z" fill="currentColor"/>
  </svg>
)

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="2.5" fill="currentColor"/>
    <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.8 2.8l1.4 1.4M9.8 9.8l1.4 1.4M2.8 11.2l1.4-1.4M9.8 4.2l1.4-1.4"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

export default function TopBar() {
  const { wifiInfo, theme, setTheme } = useWifiStore()
  const isConnected = wifiInfo?.isConnected ?? false
  const ssid = wifiInfo?.ssid ?? '...'
  const signalPct = wifiInfo?.signalPercent ?? 0

  const handleMinimize = () => window.electronAPI?.minimize()
  const handleMaximize = () => window.electronAPI?.maximize()
  const handleClose = () => window.electronAPI?.close()

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: 48,
      padding: '0 16px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      WebkitAppRegion: 'drag',
      flexShrink: 0,
      gap: 10,
    } as React.CSSProperties}>

      {/* Logo + nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Logo />
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.3px' }}>WaveNet</span>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>Monitor</span>
      </div>

      {/* Status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20,
        fontSize: 11, fontWeight: 500,
        background: isConnected ? 'rgba(56,217,169,.1)' : 'rgba(247,88,73,.1)',
        color: isConnected ? 'var(--success)' : 'var(--danger)',
        border: `1px solid ${isConnected ? 'rgba(56,217,169,.2)' : 'rgba(247,88,73,.2)'}`,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: isConnected ? 'var(--success)' : 'var(--danger)',
          animation: isConnected ? 'pulse 2s ease-in-out infinite' : undefined,
        }} className={isConnected ? 'animate-pulse-dot' : ''} />
        {isConnected ? 'Wi-Fi Conectado' : 'Sem conexão Wi-Fi'}
      </div>

      {/* SSID */}
      {isConnected && (
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          color: 'var(--text2)', background: 'var(--surface2)',
          padding: '3px 10px', borderRadius: 6,
          border: '1px solid var(--border)',
          maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {ssid}
        </div>
      )}

      {/* Sinal compacto */}
      {isConnected && (
        <SignalBars pct={signalPct} />
      )}

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          width: 32, height: 32, borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface2)',
          color: 'var(--text2)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitAppRegion: 'no-drag',
          transition: 'all 150ms',
        } as React.CSSProperties}
        title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Window controls */}
      <div style={{ display: 'flex', gap: 6, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {[
          { action: handleMinimize, color: '#f7c94f', title: 'Minimizar' },
          { action: handleMaximize, color: '#38d9a9', title: 'Maximizar' },
          { action: handleClose, color: '#f75849', title: 'Fechar' },
        ].map(({ action, color, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            style={{
              width: 12, height: 12, borderRadius: '50%',
              background: color, border: 'none', cursor: 'pointer',
              opacity: 0.8, transition: 'opacity 150ms, transform 150ms',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '1'; (e.target as HTMLElement).style.transform = 'scale(1.15)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '0.8'; (e.target as HTMLElement).style.transform = 'scale(1)' }}
          />
        ))}
      </div>
    </div>
  )
}

function SignalBars({ pct }: { pct: number }) {
  const bars = 4
  const filled = Math.ceil((pct / 100) * bars)
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warn)' : 'var(--danger)'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: `${((i + 1) / bars) * 100}%`,
            background: i < filled ? color : 'var(--border2)',
            borderRadius: 1,
            transition: 'background 300ms',
          }}
        />
      ))}
    </div>
  )
}
