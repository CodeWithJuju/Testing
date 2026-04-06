import React, { useState, useRef, useCallback } from 'react'

type ToolId =
  | 'ping' | 'traceroute' | 'dns' | 'port' | 'speed'
  | 'scan' | 'flushDns' | 'renewIp' | 'resetAdapter' | 'geoip'
  | 'portMulti' | 'stabilityTest' | 'report'

interface Tool {
  id: ToolId; label: string; icon: string; hasInput: boolean; inputPlaceholder?: string; presets?: string[]
}

const TOOLS: Tool[] = [
  { id: 'ping',          label: 'Ping',            icon: '🏓', hasInput: true,  inputPlaceholder: 'Host ou IP (ex: 8.8.8.8)', presets: ['8.8.8.8','1.1.1.1','google.com','cloudflare.com'] },
  { id: 'traceroute',    label: 'Traceroute',      icon: '🗺',  hasInput: true,  inputPlaceholder: 'Host ou IP de destino',      presets: ['google.com','cloudflare.com','amazon.com','youtube.com'] },
  { id: 'dns',           label: 'DNS Lookup',      icon: '🔍', hasInput: true,  inputPlaceholder: 'Domínio (ex: google.com)',    presets: ['google.com','github.com','cloudflare.com'] },
  { id: 'port',          label: 'Port Check',      icon: '🔌', hasInput: true,  inputPlaceholder: 'host:porta (ex: google.com:443)', presets: ['google.com:443','google.com:80','8.8.8.8:53'] },
  { id: 'portMulti',     label: 'Portas Comuns',   icon: '📋', hasInput: true,  inputPlaceholder: 'Host (ex: google.com)' },
  { id: 'speed',         label: 'Speed Test',      icon: '⚡', hasInput: false },
  { id: 'scan',          label: 'Scan de Rede',    icon: '📡', hasInput: false },
  { id: 'geoip',         label: 'Geo IP',          icon: '🌍', hasInput: false },
  { id: 'stabilityTest', label: 'Teste Estab.',    icon: '📊', hasInput: true,  inputPlaceholder: 'Host alvo (ex: 8.8.8.8)' },
  { id: 'flushDns',      label: 'Flush DNS',       icon: '🧹', hasInput: false },
  { id: 'renewIp',       label: 'Renovar IP',      icon: '🔄', hasInput: false },
  { id: 'resetAdapter',  label: 'Reset Adaptador', icon: '⚙',  hasInput: false },
  { id: 'report',        label: 'Gerar Relatório', icon: '📄', hasInput: false },
]

interface OutputLine { type: 'default' | 'success' | 'error' | 'warn' | 'accent' | 'muted' | 'hop'; text: string; ms?: string; hop?: string }

export default function Tools() {
  const [activeTool, setActiveTool] = useState<ToolId>('ping')
  const [inputVal, setInputVal] = useState('8.8.8.8')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<OutputLine[]>([
    { type: 'muted', text: 'Selecione uma ferramenta e clique em Executar.' },
  ])
  const outputRef = useRef<HTMLDivElement>(null)

  const tool = TOOLS.find(t => t.id === activeTool)!

  const addLine = useCallback((line: OutputLine) => {
    setOutput(prev => [...prev, line])
    setTimeout(() => {
      if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
    }, 20)
  }, [])

  const clearOutput = () => setOutput([])

  const selectTool = (id: ToolId) => {
    setActiveTool(id)
    const t = TOOLS.find(x => x.id === id)!
    setInputVal(t.presets?.[0] ?? '')
    setOutput([{ type: 'muted', text: `Ferramenta selecionada: ${t.label}` }])
  }

  const run = async () => {
    if (running) return
    setRunning(true)
    clearOutput()

    try {
      switch (activeTool) {
        case 'ping': await runPing(); break
        case 'traceroute': await runTraceroute(); break
        case 'dns': await runDns(); break
        case 'port': await runPort(); break
        case 'portMulti': await runPortMulti(); break
        case 'speed': await runSpeed(); break
        case 'scan': await runScan(); break
        case 'geoip': await runGeoIp(); break
        case 'stabilityTest': await runStabilityTest(); break
        case 'flushDns': await runFlushDns(); break
        case 'renewIp': await runRenewIp(); break
        case 'resetAdapter': await runResetAdapter(); break
        case 'report': await runReport(); break
      }
    } catch (e) {
      addLine({ type: 'error', text: `Erro: ${String(e)}` })
    } finally {
      setRunning(false)
    }
  }

  // ── Implementações das ferramentas ──────────────────────────

  async function runPing() {
    addLine({ type: 'accent', text: `Pingando ${inputVal}...` })
    const result = await window.electronAPI.runPing(inputVal, 8) as {
      host: string; sent: number; received: number; lostPercent: number
      minMs: number; maxMs: number; avgMs: number
      results: Array<{ seq: number; ms: number | null; timeout: boolean; ttl?: number }>
    }
    result.results.forEach(r => {
      if (r.timeout) {
        addLine({ type: 'error', text: `Seq ${r.seq}: Tempo esgotado` })
      } else {
        addLine({ hop: String(r.seq), ms: `${r.ms} ms`, type: 'hop', text: `Resposta de ${result.host} · TTL=${r.ttl ?? '-'}` })
      }
    })
    addLine({ type: 'muted', text: '──────────────────────────────────' })
    addLine({ type: result.lostPercent === 0 ? 'success' : 'warn', text: `✓ Mín: ${result.minMs}ms  Máx: ${result.maxMs}ms  Méd: ${result.avgMs}ms  Perdidos: ${result.lostPercent}%` })
  }

  async function runTraceroute() {
    addLine({ type: 'accent', text: `Traceroute para ${inputVal}...` })
    addLine({ type: 'muted', text: 'Aguarde, pode levar até 30 segundos...' })
    const result = await window.electronAPI.runTraceroute(inputVal) as {
      host: string; hops: Array<{ hop: number; ip: string; hostname: string; ms: number[]; timeout: boolean }>
      completed: boolean; totalMs: number
    }
    result.hops.forEach(h => {
      if (h.timeout) {
        addLine({ hop: String(h.hop), ms: '* * *', type: 'hop', text: 'Sem resposta' })
      } else {
        const avgMs = h.ms.length ? Math.round(h.ms.reduce((a, b) => a + b, 0) / h.ms.length) : 0
        const host = h.hostname || h.ip
        addLine({ hop: String(h.hop), ms: `${avgMs} ms`, type: 'hop', text: `${host}${h.hostname && h.ip ? ' (' + h.ip + ')' : ''}` })
      }
    })
    addLine({ type: result.completed ? 'success' : 'warn', text: `${result.completed ? '✓ Destino alcançado' : '⚠ Rota incompleta'} · ${result.hops.length} saltos · ${result.totalMs}ms total` })
  }

  async function runDns() {
    addLine({ type: 'accent', text: `DNS Lookup: ${inputVal}` })
    const result = await window.electronAPI.runDnsLookup(inputVal) as {
      host: string; records: Array<{ type: string; value: string; ttl?: number; priority?: number }>
      queryTimeMs: number; server: string
    }
    if (result.records.length === 0) {
      addLine({ type: 'error', text: 'Nenhum registro encontrado.' })
    } else {
      result.records.forEach(r => {
        addLine({ hop: r.type, ms: r.priority ? `prio:${r.priority}` : r.ttl ? `ttl:${r.ttl}` : '', type: 'hop', text: r.value })
      })
    }
    addLine({ type: 'muted', text: `Servidor: ${result.server} · ${result.queryTimeMs}ms` })
  }

  async function runPort() {
    const parts = inputVal.split(':')
    const host = parts[0]
    const port = parseInt(parts[1] ?? '80')
    addLine({ type: 'accent', text: `Verificando ${host}:${port}...` })
    const r = await window.electronAPI.runPortCheck(host, port) as {
      isOpen: boolean; service: string; responseMs: number
    }
    if (r.isOpen) {
      addLine({ type: 'success', text: `✓ Porta ${port} ABERTA · Serviço: ${r.service} · ${r.responseMs}ms` })
    } else {
      addLine({ type: 'error', text: `✗ Porta ${port} FECHADA ou filtrada` })
    }
  }

  async function runPortMulti() {
    const commonPorts = [21, 22, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 3389, 8080]
    addLine({ type: 'accent', text: `Verificando ${commonPorts.length} portas comuns em ${inputVal}...` })
    for (const port of commonPorts) {
      const r = await window.electronAPI.runPortCheck(inputVal, port) as {
        isOpen: boolean; service: string; responseMs: number
      }
      addLine({
        hop: String(port),
        ms: r.isOpen ? `${r.responseMs}ms` : 'fechada',
        type: 'hop',
        text: `${r.service} — ${r.isOpen ? '✓ aberta' : '✗ fechada'}`,
      })
    }
    addLine({ type: 'success', text: 'Verificação de portas concluída.' })
  }

  async function runSpeed() {
    addLine({ type: 'accent', text: 'Iniciando teste de velocidade via Cloudflare...' })
    addLine({ type: 'muted', text: 'Baixando 5 MB de dados de teste...' })
    const r = await window.electronAPI.runSpeedTest() as {
      downloadMbps: number; uploadMbps: number; pingMs: number; server: string
    }
    addLine({ type: 'success', text: `↓ Download:  ${r.downloadMbps.toFixed(2)} Mbps` })
    addLine({ type: 'success', text: `↑ Upload:    ${r.uploadMbps.toFixed(2)} Mbps` })
    addLine({ type: 'accent', text: `⏱ Latência:  ${r.pingMs} ms` })
    addLine({ type: 'muted', text: `Servidor: ${r.server}` })
  }

  async function runScan() {
    addLine({ type: 'accent', text: 'Escaneando rede local (ARP)...' })
    addLine({ type: 'muted', text: 'Aguarde alguns segundos...' })
    const devices = await window.electronAPI.runNetworkScan() as Array<{
      ip: string; mac: string; hostname: string; vendor: string; isGateway: boolean; isCurrentDevice: boolean
    }>
    if (devices.length === 0) {
      addLine({ type: 'warn', text: 'Nenhum dispositivo encontrado. Execute como Administrador.' })
    } else {
      devices.forEach(d => {
        const tag = d.isCurrentDevice ? ' [Este dispositivo]' : d.isGateway ? ' [Gateway]' : ''
        addLine({ hop: '●', ms: d.mac, type: 'hop', text: `${d.ip}  ${d.hostname}  ${d.vendor}${tag}` })
      })
      addLine({ type: 'success', text: `✓ ${devices.length} dispositivos encontrados.` })
    }
  }

  async function runGeoIp() {
    addLine({ type: 'accent', text: 'Obtendo geolocalização do IP público...' })
    const ip = await window.electronAPI.getPublicIp()
    addLine({ hop: 'IP', ms: '', type: 'hop', text: ip })
    addLine({ type: 'muted', text: 'Nota: localização via DNS (sem API externa).' })
  }

  async function runStabilityTest() {
    addLine({ type: 'accent', text: `Teste de estabilidade em ${inputVal} (20 pings)...` })
    const r = await window.electronAPI.runPing(inputVal, 20) as {
      sent: number; received: number; lostPercent: number; minMs: number; maxMs: number; avgMs: number
    }
    const jitter = r.maxMs - r.minMs
    const quality = r.lostPercent === 0 && jitter < 20 ? 'Excelente' : r.lostPercent < 5 ? 'Boa' : 'Instável'
    addLine({ type: 'muted', text: '──── Resultado ────────────────────' })
    addLine({ type: 'success', text: `Enviados: ${r.sent}  Recebidos: ${r.received}  Perdidos: ${r.lostPercent}%` })
    addLine({ type: 'success', text: `Mín/Méd/Máx: ${r.minMs}/${r.avgMs}/${r.maxMs} ms` })
    addLine({ type: 'accent', text: `Jitter estimado: ${jitter} ms` })
    addLine({ type: r.lostPercent === 0 ? 'success' : 'warn', text: `Qualidade da conexão: ${quality}` })
  }

  async function runFlushDns() {
    addLine({ type: 'accent', text: 'Limpando cache DNS...' })
    const r = await window.electronAPI.flushDns()
    addLine({ type: r.success ? 'success' : 'error', text: r.message })
  }

  async function runRenewIp() {
    addLine({ type: 'accent', text: 'Renovando endereço IP via DHCP...' })
    addLine({ type: 'muted', text: 'Liberando IP atual...' })
    const r = await window.electronAPI.renewIp()
    addLine({ type: r.success ? 'success' : 'error', text: r.message })
  }

  async function runResetAdapter() {
    addLine({ type: 'warn', text: '⚠ Reiniciando adaptador Wi-Fi...' })
    addLine({ type: 'muted', text: 'A conexão será interrompida brevemente.' })
    const r = await window.electronAPI.resetAdapter()
    addLine({ type: r.success ? 'success' : 'error', text: r.message })
  }

  async function runReport() {
    addLine({ type: 'accent', text: 'Gerando relatório de diagnóstico...' })
    const r = await window.electronAPI.generateReport()
    if (r.success) {
      addLine({ type: 'success', text: '✓ Relatório salvo na Área de Trabalho:' })
      addLine({ type: 'accent', text: r.path ?? '' })
    } else {
      addLine({ type: 'error', text: `Erro ao gerar relatório: ${r.error}` })
    }
  }

  return (
    <div>
      {/* Tool grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => selectTool(t.id)}
            style={{
              background: activeTool === t.id ? 'rgba(79,142,247,.1)' : 'var(--surface)',
              border: `1px solid ${activeTool === t.id ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '10px 8px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 150ms',
              color: 'var(--text)',
              fontFamily: 'var(--font)',
            }}
            onMouseEnter={e => { if (activeTool !== t.id) { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' } }}
            onMouseLeave={e => { if (activeTool !== t.id) { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' } }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>{t.icon}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)' }}>{t.label}</div>
          </button>
        ))}
      </div>

      {/* Input area */}
      {tool.hasInput && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            className="input"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder={tool.inputPlaceholder ?? ''}
            onKeyDown={e => e.key === 'Enter' && run()}
            style={{ flex: 1 }}
          />
          {tool.presets?.map(p => (
            <button key={p} onClick={() => setInputVal(p)} className="btn btn-ghost" style={{ fontSize: 11, padding: '6px 10px', whiteSpace: 'nowrap' }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Run button */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button className="btn btn-primary" onClick={run} disabled={running} style={{ minWidth: 120 }}>
          {running ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}/>
              Executando...
            </span>
          ) : 'Executar'}
        </button>
        <button className="btn btn-ghost" onClick={clearOutput} style={{ fontSize: 12 }}>Limpar</button>
      </div>

      {/* Terminal output */}
      <div
        ref={outputRef}
        className="terminal"
        style={{ minHeight: 180, maxHeight: 320 }}
      >
        {output.map((line, i) => {
          if (line.type === 'hop') {
            return (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span className="t-hop">{line.hop ?? ''}</span>
                {line.ms && <span className="t-ms">{line.ms}</span>}
                <span style={{ color: 'var(--text)' }}>{line.text}</span>
              </div>
            )
          }
          const cls = {
            success: 't-success', error: 't-error', warn: 't-warn',
            accent: 't-accent', muted: 't-muted', default: '',
          }[line.type] ?? ''
          return <div key={i} className={cls}>{line.text}</div>
        })}
        {running && (
          <div className="t-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, border: '1.5px solid var(--text3)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}/>
            Executando...
          </div>
        )}
      </div>
    </div>
  )
}
