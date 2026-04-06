import React from 'react'
import { useWifiStore } from '../../store/wifiStore'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'metrics',   label: 'Métricas' },
  { id: 'tools',     label: 'Ferramentas' },
  { id: 'security',  label: 'Segurança' },
  { id: 'history',   label: 'Histórico' },
  { id: 'settings',  label: 'Config.' },
]

export default function NavTabs() {
  const { activeTab, setActiveTab } = useWifiStore()

  return (
    <div style={{
      display: 'flex',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 16px',
      gap: 2,
      flexShrink: 0,
    }}>
      {TABS.map(tab => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 14px',
              fontSize: 12,
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--accent)' : 'var(--text2)',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'color 150ms, border-color 150ms',
              fontFamily: 'var(--font)',
              whiteSpace: 'nowrap',
              marginBottom: -1,
            }}
            onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.color = 'var(--text)' }}
            onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.color = 'var(--text2)' }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
