import React from 'react'

export default function LoadingScreen() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      gap: 16,
    }}>
      {/* Animated wifi icon */}
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <defs>
            <linearGradient id="wl" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f8ef7"/>
              <stop offset="100%" stopColor="#38d9a9"/>
            </linearGradient>
          </defs>
          <rect width="56" height="56" rx="16" fill="url(#wl)" opacity="0.15"/>
          <path d="M28 44c1.2-3.6 3.6-7.2 8.4-9.6" stroke="url(#wl)" strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0s' }}/>
          <path d="M28 44c-1.2-3.6-3.6-7.2-8.4-9.6" stroke="url(#wl)" strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0s' }}/>
          <path d="M28 37c.8-1.8 2-4 4.4-5" stroke="url(#wl)" strokeWidth="2.2" strokeLinecap="round"
            style={{ animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.2s' }}/>
          <path d="M28 37c-.8-1.8-2-4-4.4-5" stroke="url(#wl)" strokeWidth="2.2" strokeLinecap="round"
            style={{ animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.2s' }}/>
          <circle cx="28" cy="44" r="2.5" fill="url(#wl)"
            style={{ animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.4s' }}/>
          <path d="M14 27C17.5 22 22.5 19.5 28 19.5s10.5 2.5 14 7.5" stroke="url(#wl)" strokeWidth="2.2" strokeLinecap="round"
            style={{ animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.6s' }}/>
          <path d="M9 22C13.5 15.5 20.5 12 28 12s14.5 3.5 19 10" stroke="url(#wl)" strokeWidth="2" strokeLinecap="round" opacity="0.5"
            style={{ animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.8s' }}/>
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>WaveNet Monitor</div>
        <div style={{ fontSize: 12, color: 'var(--text2)' }}>Conectando ao adaptador Wi-Fi...</div>
      </div>

      {/* Progress bar */}
      <div style={{ width: 160, height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          borderRadius: 2,
          background: 'linear-gradient(90deg, #4f8ef7, #38d9a9)',
          animation: 'loadbar 1.8s ease-in-out infinite',
        }}/>
      </div>

      <style>{`
        @keyframes loadbar {
          0%   { width: 0%; margin-left: 0%; }
          50%  { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}
