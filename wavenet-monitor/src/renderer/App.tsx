import React, { useEffect } from 'react'
import { useElectronBridge } from './hooks/useElectronBridge'
import { useWifiStore } from './store/wifiStore'
import TopBar from './components/TopBar/TopBar'
import NavTabs from './components/NavTabs/NavTabs'
import Dashboard from './components/Dashboard/Dashboard'
import Metrics from './components/Metrics/Metrics'
import Tools from './components/Tools/Tools'
import Security from './components/Security/Security'
import History from './components/History/History'
import Settings from './components/Settings/Settings'
import LoadingScreen from './components/shared/LoadingScreen'

const PANELS: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  metrics: Metrics,
  tools: Tools,
  security: Security,
  history: History,
  settings: Settings,
}

export default function App() {
  useElectronBridge()

  const { activeTab, theme, isLoading } = useWifiStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  if (isLoading) return <LoadingScreen />

  const Panel = PANELS[activeTab] ?? Dashboard

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      overflow: 'hidden',
    }}>
      <TopBar />
      <NavTabs />
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div
          key={activeTab}
          className="animate-fade-in"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px',
            scrollbarWidth: 'thin',
          }}
        >
          <Panel />
        </div>
      </div>
    </div>
  )
}
