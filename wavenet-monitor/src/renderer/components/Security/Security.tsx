import React from 'react'
import { useWifiStore } from '../../store/wifiStore'
import { stabilityLabel } from '../../hooks/useElectronBridge'

function SecRow({
  icon, title, subtitle, badge, badgeType,
}: {
  icon: string; title: string; subtitle: string
  badge: string; badgeType: 'success' | 'warn' | 'danger' | 'info' | 'neutral'
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 10 }}>
      <span style={{ fontSize: 18, flexShrink: 0, width: 28, textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{subtitle}</div>
      </div>
      <span className={`badge badge-${badgeType}`}>{badge}</span>
    </div>
  )
}

function ScoreRing({ score, label, cls }: { score: number; label: string; cls: string }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = cls === 'good' ? '#38d9a9' : cls === 'warn' ? '#f7c94f' : '#f75849'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
      <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface2)" strokeWidth="5"/>
          <circle cx="32" cy="32" r={r} fill="none" stroke={color}
            strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            transform="rotate(-90 32 32)"
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 500, color,
        }}>
          {score}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Estabilidade da conexão</div>
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {score >= 90 && <span className="badge badge-success">Sem spikes</span>}
          {(score >= 75) && <span className="badge badge-success">Latência OK</span>}
          {(score >= 90) && <span className="badge badge-success">0% perda</span>}
          {(score < 75) && <span className="badge badge-warn">Instabilidades</span>}
          {(score < 50) && <span className="badge badge-danger">Crítico</span>}
        </div>
      </div>
    </div>
  )
}

export default function Security() {
  const { wifiInfo, networkInfo, latencyStats } = useWifiStore()

  const enc = wifiInfo?.encryption ?? 'N/A'
  const auth = wifiInfo?.authentication ?? 'N/A'
  const isWpa3 = /wpa3/i.test(enc) || /wpa3/i.test(auth)
  const isWpa2 = /wpa2/i.test(enc) || /wpa2/i.test(auth)
  const isWeak = !isWpa3 && !isWpa2
  const encType = isWpa3 ? 'WPA3' : isWpa2 ? 'WPA2' : enc
  const encBadge = isWpa3 ? 'success' : isWpa2 ? 'success' : 'danger'

  const fw = networkInfo?.firewallEnabled ?? true
  const vpn = networkInfo?.vpnConnected ?? false
  const profile = networkInfo?.networkProfile ?? 'N/A'
  const isPublic = /public|público/i.test(profile)

  const stabScore = latencyStats?.stabilityScore ?? 100
  const { label: stabLabel, cls: stabCls } = stabilityLabel(stabScore)

  // Security Score
  let secScore = 100
  if (isWeak) secScore -= 40
  else if (!isWpa3) secScore -= 5
  if (!fw) secScore -= 25
  if (isPublic) secScore -= 20
  if (!vpn) secScore -= 5
  secScore = Math.max(0, secScore)
  const secCls = secScore >= 80 ? 'good' : secScore >= 55 ? 'warn' : 'bad'
  const secLabel = secScore >= 80 ? 'Boa Segurança' : secScore >= 55 ? 'Atenção' : 'Risco Alto'

  return (
    <div>
      <div className="section-title">Pontuação de Segurança</div>
      <div className="card" style={{ marginBottom: 10 }}>
        <ScoreRing score={secScore} label={secLabel} cls={secCls} />
        {isWeak && <div className="badge badge-danger" style={{ marginTop: 6 }}>⚠ Criptografia fraca ou ausente!</div>}
        {isPublic && <div style={{ marginTop: 6 }}><span className="badge badge-warn">⚠ Rede classificada como Pública</span></div>}
      </div>

      <div className="section-title">Proteção da Conexão</div>
      <div className="card" style={{ marginBottom: 10 }}>
        <SecRow icon="🔒" title="Criptografia" subtitle="Protocolo de proteção Wi-Fi"
          badge={encType} badgeType={encBadge} />
        <SecRow icon="🔑" title="Autenticação" subtitle="Método de verificação de acesso"
          badge={auth} badgeType={isWpa3 || isWpa2 ? 'success' : 'danger'} />
        <SecRow icon="🔐" title="Cifra" subtitle="Algoritmo de codificação de dados"
          badge={wifiInfo?.cipherAlgorithm ?? 'N/A'}
          badgeType={/ccmp|aes/i.test(wifiInfo?.cipherAlgorithm ?? '') ? 'success' : 'warn'} />
        <SecRow icon="📡" title="Rede Aberta/Pública" subtitle="Detecção de rede sem senha"
          badge={isWeak ? 'Detectada!' : 'Não detectada'} badgeType={isWeak ? 'danger' : 'success'} />
      </div>

      <div className="section-title">Firewall & VPN</div>
      <div className="card" style={{ marginBottom: 10 }}>
        <SecRow icon="🛡" title="Firewall do Windows" subtitle="Bloqueio de tráfego não autorizado"
          badge={fw ? 'Ativo' : 'Inativo'} badgeType={fw ? 'success' : 'danger'} />
        <SecRow icon="🔵" title="VPN" subtitle="Rede privada virtual"
          badge={vpn ? `Ativo${networkInfo?.vpnAdapter ? ' · ' + networkInfo.vpnAdapter : ''}` : 'Desconectado'}
          badgeType={vpn ? 'success' : 'neutral'} />
        <SecRow icon="🌐" title="Perfil de Rede" subtitle="Tipo de rede configurado no Windows"
          badge={profile} badgeType={isPublic ? 'warn' : 'success'} />
      </div>

      <div className="section-title">Estabilidade da Conexão</div>
      <div className="card" style={{ marginBottom: 10 }}>
        <ScoreRing score={stabScore} label={stabLabel} cls={stabCls} />
        <div style={{ marginTop: 8 }}>
          <div className="metric-row"><span className="metric-label">Spikes de latência</span><span className={`metric-val ${(latencyStats?.spikeCount ?? 0) === 0 ? 'good' : 'warn'}`}>{latencyStats?.spikeCount ?? 0}</span></div>
          <div className="metric-row"><span className="metric-label">Perda de pacotes</span><span className={`metric-val ${(latencyStats?.packetLossPercent ?? 0) === 0 ? 'good' : 'bad'}`}>{(latencyStats?.packetLossPercent ?? 0).toFixed(1)}%</span></div>
          <div className="metric-row"><span className="metric-label">Jitter</span><span className={`metric-val ${(latencyStats?.jitterMs ?? 0) < 15 ? 'good' : 'warn'}`}>{latencyStats?.jitterMs ?? 0} ms</span></div>
        </div>
      </div>

      <div className="section-title">Recomendações</div>
      <div className="card">
        {isWeak && <Rec icon="⚠" text="Use WPA2 ou WPA3 — redes abertas expõem todo o tráfego." type="danger" />}
        {!fw && <Rec icon="⚠" text="Ative o Firewall do Windows para proteção contra ameaças externas." type="danger" />}
        {isPublic && <Rec icon="⚠" text="Configure o perfil de rede como Privado para maior proteção." type="warn" />}
        {!vpn && <Rec icon="ℹ" text="Usar uma VPN protege sua privacidade em redes públicas." type="info" />}
        {!isWpa3 && isWpa2 && <Rec icon="ℹ" text="WPA3 oferece proteção superior ao WPA2. Verifique se seu roteador suporta." type="info" />}
        {secScore >= 80 && <Rec icon="✓" text="Sua conexão está bem protegida." type="success" />}
      </div>
    </div>
  )
}

function Rec({ icon, text, type }: { icon: string; text: string; type: 'success' | 'warn' | 'danger' | 'info' }) {
  const cls = { success: 'success', warn: 'warn', danger: 'danger', info: 'info' }[type]
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12, alignItems: 'flex-start' }}>
      <span className={`badge badge-${cls}`}>{icon}</span>
      <span style={{ color: 'var(--text)', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}
