import React, { useState, useEffect } from 'react'
import { useWifiStore } from '../../store/wifiStore'
import type { AppSettings } from '@shared/types'

export default function Settings() {
  const { settings, setSettings, setTheme, theme } = useWifiStore()
  const [local, setLocal] = useState<AppSettings | null>(settings)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setLocal(settings) }, [settings])

  const update = (key: keyof AppSettings, value: unknown) => {
    setLocal(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const save = async () => {
    if (!local) return
    await window.electronAPI?.saveSettings(local)
    setSettings(local)
    if (local.theme !== 'system') setTheme(local.theme)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!local) return <div style={{ color: 'var(--text2)', padding: '16px 0' }}>Carregando configurações...</div>

  return (
    <div>
      <div className="section-title">Aparência</div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="metric-row">
          <span className="metric-label">Tema</span>
          <select value={local.theme} onChange={e => update('theme', e.target.value)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 12 }}>
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
            <option value="system">Automático (sistema)</option>
          </select>
        </div>
        <div className="metric-row">
          <span className="metric-label">Idioma</span>
          <select value={local.language} onChange={e => update('language', e.target.value)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 12 }}>
            <option value="pt-BR">Português (BR)</option>
            <option value="en-US">English (US)</option>
          </select>
        </div>
      </div>

      <div className="section-title">Monitoramento</div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="metric-row">
          <span className="metric-label">Intervalo de Ping (ms)</span>
          <input type="number" min={500} max={10000} step={100} value={local.pingInterval}
            onChange={e => update('pingInterval', Number(e.target.value))}
            className="input" style={{ width: 100, textAlign: 'right' }} />
        </div>
        <div className="metric-row">
          <span className="metric-label">Atualização das métricas (ms)</span>
          <input type="number" min={1000} max={10000} step={500} value={local.metricsUpdateInterval}
            onChange={e => update('metricsUpdateInterval', Number(e.target.value))}
            className="input" style={{ width: 100, textAlign: 'right' }} />
        </div>
        <div className="metric-row">
          <span className="metric-label">Host de Ping padrão</span>
          <input type="text" value={local.pingTarget}
            onChange={e => update('pingTarget', e.target.value)}
            className="input" style={{ width: 160 }} />
        </div>
        <div className="metric-row">
          <span className="metric-label">Salvar histórico de sessão</span>
          <Toggle checked={local.saveHistory} onChange={v => update('saveHistory', v)} />
        </div>
        <div className="metric-row">
          <span className="metric-label">Dias de histórico</span>
          <input type="number" min={1} max={30} value={local.historyDays}
            onChange={e => update('historyDays', Number(e.target.value))}
            className="input" style={{ width: 80, textAlign: 'right' }} />
        </div>
      </div>

      <div className="section-title">Alertas</div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="metric-row">
          <span className="metric-label">Alerta de spike de latência</span>
          <Toggle checked={local.alertOnLatencySpike} onChange={v => update('alertOnLatencySpike', v)} />
        </div>
        <div className="metric-row">
          <span className="metric-label">Threshold de spike (ms)</span>
          <input type="number" min={50} max={2000} step={10} value={local.alertThresholdMs}
            onChange={e => update('alertThresholdMs', Number(e.target.value))}
            className="input" style={{ width: 100, textAlign: 'right' }} disabled={!local.alertOnLatencySpike} />
        </div>
        <div className="metric-row">
          <span className="metric-label">Alerta de perda de pacotes</span>
          <Toggle checked={local.alertOnPacketLoss} onChange={v => update('alertOnPacketLoss', v)} />
        </div>
        <div className="metric-row">
          <span className="metric-label">Threshold de perda (%)</span>
          <input type="number" min={1} max={50} step={1} value={local.alertPacketLossPercent}
            onChange={e => update('alertPacketLossPercent', Number(e.target.value))}
            className="input" style={{ width: 80, textAlign: 'right' }} disabled={!local.alertOnPacketLoss} />
        </div>
        <div className="metric-row">
          <span className="metric-label">Alerta de desconexão</span>
          <Toggle checked={local.alertOnDisconnect} onChange={v => update('alertOnDisconnect', v)} />
        </div>
        <div className="metric-row">
          <span className="metric-label">Notificações do Windows</span>
          <Toggle checked={local.showNotifications} onChange={v => update('showNotifications', v)} />
        </div>
      </div>

      <div className="section-title">Sistema</div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="metric-row">
          <span className="metric-label">Minimizar para a bandeja</span>
          <Toggle checked={local.minimizeToTray} onChange={v => update('minimizeToTray', v)} />
        </div>
        <div className="metric-row">
          <span className="metric-label">Iniciar com o Windows</span>
          <Toggle checked={local.startWithWindows} onChange={v => update('startWithWindows', v)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={save}>Salvar configurações</button>
        {saved && <span className="badge badge-success">✓ Salvo!</span>}
      </div>

      <div style={{ marginTop: 24, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text2)' }}>WaveNet Monitor v1.0.0</strong><br/>
        Monitoramento exclusivo de conexões Wi-Fi para Windows 10/11.<br/>
        Nenhum dado pessoal é coletado, transmitido ou armazenado externamente.<br/>
        Todos os dados ficam somente no seu computador.
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
        background: checked ? 'var(--accent)' : 'var(--surface2)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
        position: 'relative', transition: 'background 200ms, border-color 200ms',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: checked ? 17 : 2,
        width: 14, height: 14, borderRadius: '50%',
        background: checked ? '#fff' : 'var(--text3)',
        transition: 'left 200ms cubic-bezier(0.34,1.56,0.64,1)',
      }}/>
    </div>
  )
}
