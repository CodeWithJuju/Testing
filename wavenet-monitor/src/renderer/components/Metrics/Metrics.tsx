import React, { useEffect, useState } from 'react'
import { useWifiStore } from '../../store/wifiStore'
import { formatBytes, formatSpeed } from '../../hooks/useElectronBridge'

interface NearbyAP {
  ssid: string; bssid: string; signalDbm: number; channel: number; band: string; encryption: string
}

export default function Metrics() {
  const { wifiInfo, networkInfo, latencyStats } = useWifiStore()
  const [nearbyAPs, setNearbyAPs] = useState<NearbyAP[]>([])
  const [channelData, setChannelData] = useState<Record<number, number>>({})

  useEffect(() => {
    window.electronAPI?.getNearbyAPs().then((aps: unknown) => {
      const list = aps as NearbyAP[]
      setNearbyAPs(list)
      const map: Record<number, number> = {}
      list.forEach(ap => { map[ap.channel] = (map[ap.channel] ?? 0) + 1 })
      setChannelData(map)
    }).catch(() => {})
  }, [])

  const Section = ({ title }: { title: string }) => (
    <div className="section-title">{title}</div>
  )

  const Row = ({ label, value, cls = '' }: { label: string; value: string; cls?: string }) => (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <span className={`metric-val ${cls}`}>{value}</span>
    </div>
  )

  const channelEntries = Object.entries(channelData).sort((a, b) => Number(a[0]) - Number(b[0]))
  const maxChCount = Math.max(...Object.values(channelData), 1)

  return (
    <div>
      <Section title="Rede & Endereçamento" />
      <div className="card" style={{ marginBottom: 10 }}>
        <Row label="SSID" value={wifiInfo?.ssid ?? 'N/A'} cls="accent" />
        <Row label="BSSID (MAC do AP)" value={wifiInfo?.bssid ?? 'N/A'} />
        <Row label="Perfil de Rede" value={wifiInfo?.profileName ?? 'N/A'} />
        <Row label="IP Local (IPv4)" value={networkInfo?.localIp ?? 'N/A'} cls="accent" />
        <Row label="IP Público" value={networkInfo?.publicIp ?? 'N/A'} cls="accent" />
        <Row label="IPv6 (Link-Local)" value={networkInfo?.ipv6 ?? 'N/A'} />
        <Row label="Máscara de Sub-rede" value={networkInfo?.subnetMask ?? 'N/A'} />
        <Row label="Gateway Padrão" value={networkInfo?.gateway ?? 'N/A'} />
        <Row label="Servidor DHCP" value={networkInfo?.dhcpServer ?? 'N/A'} />
        <Row label="DNS Primário" value={networkInfo?.dnsServers?.[0] ?? 'N/A'} />
        <Row label="DNS Secundário" value={networkInfo?.dnsServers?.[1] ?? 'N/A'} />
        <Row label="MAC do Adaptador" value={networkInfo?.macAddress ?? 'N/A'} />
      </div>

      <Section title="Sinal & Radiofrequência" />
      <div className="grid-2" style={{ marginBottom: 10 }}>
        <div className="card">
          <Row label="RSSI" value={`${wifiInfo?.signalDbm ?? 0} dBm`} cls={sigCls(wifiInfo?.signalDbm ?? -100)} />
          <Row label="Qualidade do Sinal" value={`${wifiInfo?.signalPercent ?? 0}%`} cls={sigCls(wifiInfo?.signalDbm ?? -100)} />
          <Row label="Nível de Ruído" value={`${wifiInfo?.noiseDbm ?? -95} dBm`} />
          <Row label="SNR" value={`${wifiInfo?.snrDb ?? 0} dB`} cls={(wifiInfo?.snrDb ?? 0) > 25 ? 'good' : 'warn'} />
        </div>
        <div className="card">
          <Row label="Banda" value={wifiInfo?.band ?? 'N/A'} cls="accent" />
          <Row label="Canal" value={String(wifiInfo?.channel ?? 0)} />
          <Row label="Largura do Canal" value={`${wifiInfo?.channelWidth ?? 0} MHz`} />
          <Row label="Tipo PHY" value={wifiInfo?.phyType ?? 'N/A'} cls="accent" />
        </div>
      </div>

      <Section title="Velocidade do Link & Dados" />
      <div className="grid-2" style={{ marginBottom: 10 }}>
        <div className="card">
          <Row label="Velocidade TX" value={`${wifiInfo?.txSpeedMbps ?? 0} Mbps`} cls="accent" />
          <Row label="Velocidade RX" value={`${wifiInfo?.rxSpeedMbps ?? 0} Mbps`} cls="accent" />
          <Row label="Upload em Tempo Real" value={formatSpeed(networkInfo?.uploadSpeedBps ?? 0)} cls="accent" />
          <Row label="Download em Tempo Real" value={formatSpeed(networkInfo?.downloadSpeedBps ?? 0)} cls="accent2" />
          <Row label="Pico de Upload" value={formatSpeed(networkInfo?.uploadPeakBps ?? 0)} />
          <Row label="Pico de Download" value={formatSpeed(networkInfo?.downloadPeakBps ?? 0)} />
          <Row label="Média de Upload" value={formatSpeed(networkInfo?.uploadAvgBps ?? 0)} />
          <Row label="Média de Download" value={formatSpeed(networkInfo?.downloadAvgBps ?? 0)} />
        </div>
        <div className="card">
          <Row label="Bytes Enviados" value={formatBytes(networkInfo?.bytesSent ?? 0)} />
          <Row label="Bytes Recebidos" value={formatBytes(networkInfo?.bytesReceived ?? 0)} />
          <Row label="Total Enviado (Sessão)" value={formatBytes(networkInfo?.totalSessionUpBytes ?? 0)} />
          <Row label="Total Recebido (Sessão)" value={formatBytes(networkInfo?.totalSessionDownBytes ?? 0)} />
        </div>
      </div>

      <Section title="Latência & Estabilidade" />
      <div className="grid-2" style={{ marginBottom: 10 }}>
        <div className="card">
          <Row label="Ping Atual" value={`${latencyStats?.currentMs ?? 0} ms`} cls={pCls(latencyStats?.currentMs ?? 0)} />
          <Row label="Ping Médio" value={`${latencyStats?.averageMs ?? 0} ms`} cls={pCls(latencyStats?.averageMs ?? 0)} />
          <Row label="Ping Mínimo" value={`${latencyStats?.minMs ?? 0} ms`} cls="good" />
          <Row label="Ping Máximo" value={`${latencyStats?.maxMs ?? 0} ms`} cls={pCls(latencyStats?.maxMs ?? 0)} />
        </div>
        <div className="card">
          <Row label="Jitter" value={`${latencyStats?.jitterMs ?? 0} ms`} cls={(latencyStats?.jitterMs ?? 0) < 10 ? 'good' : 'warn'} />
          <Row label="Perda de Pacotes" value={`${(latencyStats?.packetLossPercent ?? 0).toFixed(1)}%`} cls={(latencyStats?.packetLossPercent ?? 0) < 1 ? 'good' : 'bad'} />
          <Row label="Spikes de Latência" value={String(latencyStats?.spikeCount ?? 0)} cls={(latencyStats?.spikeCount ?? 0) === 0 ? 'good' : 'warn'} />
          <Row label="Pontuação Estabilidade" value={`${latencyStats?.stabilityScore ?? 100}/100`} cls={(latencyStats?.stabilityScore ?? 100) >= 80 ? 'good' : 'warn'} />
        </div>
      </div>

      <Section title="Pacotes & Erros" />
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="grid-2" style={{ gap: 0 }}>
          <div>
            <Row label="Pacotes Enviados" value={(networkInfo?.packetsSent ?? 0).toLocaleString('pt-BR')} />
            <Row label="Pacotes Recebidos" value={(networkInfo?.packetsReceived ?? 0).toLocaleString('pt-BR')} />
          </div>
          <div>
            <Row label="Erros TX/RX" value={String(networkInfo?.packetsError ?? 0)} cls={(networkInfo?.packetsError ?? 0) === 0 ? 'good' : 'bad'} />
            <Row label="Pacotes Descartados" value={String(networkInfo?.packetsDiscarded ?? 0)} cls={(networkInfo?.packetsDiscarded ?? 0) === 0 ? 'good' : 'warn'} />
          </div>
        </div>
      </div>

      <Section title="Adaptador Wi-Fi" />
      <div className="card" style={{ marginBottom: 10 }}>
        <Row label="Nome do Adaptador" value={wifiInfo?.adapterName ?? 'N/A'} />
        <Row label="MAC do Adaptador" value={wifiInfo?.adapterMac ?? 'N/A'} />
        <Row label="Versão do Driver" value={wifiInfo?.driverVersion ?? 'N/A'} />
        <Row label="Tipo de Rádio" value={wifiInfo?.radioType ?? 'N/A'} />
        <Row label="Modo de Energia" value={wifiInfo?.powerMode ?? 'N/A'} cls={(wifiInfo?.powerMode ?? '').toLowerCase().includes('perf') ? 'good' : 'warn'} />
        <Row label="Status de Roaming" value={wifiInfo?.roamingStatus ?? 'N/A'} />
        <Row label="Tipo de Rede" value={wifiInfo?.networkType ?? 'N/A'} />
      </div>

      <Section title="Análise de Canal & Vizinhança" />
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>
          APs detectados por canal — {nearbyAPs.length} redes no total
        </div>
        {channelEntries.length > 0 ? (
          <>
            {/* Bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56, marginBottom: 4 }}>
              {channelEntries.map(([ch, count]) => {
                const isMine = Number(ch) === wifiInfo?.channel
                const h = Math.max(10, (count / maxChCount) * 48)
                return (
                  <div key={ch} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
                    <div style={{
                      height: h, width: '100%', minWidth: 16,
                      background: isMine ? 'var(--accent2)' : 'rgba(79,142,247,.35)',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 500ms ease',
                    }}/>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: isMine ? 'var(--accent2)' : 'var(--text3)' }}>{ch}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
              <span style={{ color: 'var(--accent2)' }}>■</span> Canal atual &nbsp;
              <span style={{ color: 'rgba(79,142,247,.7)' }}>■</span> Outros canais
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text3)', padding: '8px 0' }}>Escaneando redes próximas...</div>
        )}

        {nearbyAPs.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase' }}>Redes Próximas</div>
            <div style={{ maxHeight: 160, overflowY: 'auto' }}>
              {nearbyAPs.slice(0, 12).map((ap, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 0', borderBottom: '1px solid var(--border)',
                  fontSize: 11,
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{ap.ssid || 'Oculto'}</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text3)', fontSize: 10 }}>ch{ap.channel}</span>
                  <span style={{ fontFamily: 'var(--mono)', color: ap.signalDbm >= -65 ? 'var(--success)' : ap.signalDbm >= -75 ? 'var(--warn)' : 'var(--danger)', minWidth: 50, textAlign: 'right' }}>{ap.signalDbm} dBm</span>
                  <span className="badge badge-neutral" style={{ fontSize: 9 }}>{ap.encryption}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Section title="VPN, Firewall & Segurança de Rede" />
      <div className="card" style={{ marginBottom: 10 }}>
        <Row label="VPN Ativa" value={networkInfo?.vpnConnected ? 'Conectado' : 'Desconectado'} cls={networkInfo?.vpnConnected ? 'good' : ''} />
        <Row label="Adaptador VPN" value={networkInfo?.vpnAdapter || 'Nenhum detectado'} />
        <Row label="Firewall do Windows" value={networkInfo?.firewallEnabled ? 'Ativo' : 'Inativo'} cls={networkInfo?.firewallEnabled ? 'good' : 'bad'} />
        <Row label="Perfil de Rede" value={networkInfo?.networkProfile ?? 'N/A'} cls={networkInfo?.networkProfile?.toLowerCase().includes('priv') ? 'good' : 'warn'} />
        <Row label="Criptografia" value={wifiInfo?.encryption ?? 'N/A'} cls={isStrongEncryption(wifiInfo?.encryption ?? '') ? 'good' : 'warn'} />
        <Row label="Autenticação" value={wifiInfo?.authentication ?? 'N/A'} cls={isStrongEncryption(wifiInfo?.authentication ?? '') ? 'good' : 'warn'} />
        <Row label="Algoritmo Cifra" value={wifiInfo?.cipherAlgorithm ?? 'N/A'} />
      </div>
    </div>
  )
}

function sigCls(dbm: number): string {
  if (dbm >= -60) return 'good'
  if (dbm >= -70) return 'warn'
  return 'bad'
}

function pCls(ms: number): string {
  if (ms <= 0) return ''
  if (ms < 50) return 'good'
  if (ms < 100) return 'warn'
  return 'bad'
}

function isStrongEncryption(s: string): boolean {
  return /wpa3|wpa2|ccmp|aes/i.test(s)
}
