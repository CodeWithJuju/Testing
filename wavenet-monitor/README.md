# 🛜 WaveNet Monitor

Monitor avançado de conexões Wi-Fi para Windows 10/11.

> **Somente Wi-Fi** — Este aplicativo monitora exclusivamente conexões sem fio.  
> **Privacidade total** — Nenhum dado pessoal é coletado, transmitido ou armazenado externamente.

---

## 📋 Requisitos

- **Windows 10** (versão 1903 ou superior) ou **Windows 11**
- **Node.js** v18 ou superior → https://nodejs.org
- **NPM** v9 ou superior (incluído com o Node.js)
- **Modo Administrador** recomendado (necessário para: reset de adaptador, scan de rede, renovar IP)

---

## 🚀 Instalação e Execução em Modo de Desenvolvimento

```bash
# 1. Clone ou extraia o projeto
cd wavenet-monitor

# 2. Instale as dependências
npm install

# 3. Execute em modo de desenvolvimento (abre o app automaticamente)
npm run dev
```

---

## 📦 Gerar Instalador para Windows

```bash
# Gera instalador NSIS (.exe) e versão portátil
npm run dist

# Ou apenas a versão portátil (sem instalação)
npm run dist:portable
```

Os arquivos gerados ficam na pasta `release/`.

---

## 🗂 Estrutura do Projeto

```
wavenet-monitor/
├── src/
│   ├── main/                    ← Processo principal Electron (Node.js)
│   │   ├── index.ts             ← Ponto de entrada, cria a janela
│   │   ├── preload.ts           ← Bridge segura para o renderer
│   │   ├── ipc-handlers.ts      ← Registra todos os canais IPC
│   │   ├── wifi-scanner.ts      ← Coleta dados via netsh/ipconfig
│   │   ├── ping-service.ts      ← Monitor contínuo de latência
│   │   ├── network-tools.ts     ← Ping, traceroute, DNS, port check, scan
│   │   └── settings-manager.ts  ← Config + logger + gerador de relatório
│   ├── renderer/                ← Interface React (TypeScript)
│   │   ├── App.tsx              ← Componente raiz
│   │   ├── store/               ← Estado global (Zustand)
│   │   ├── hooks/               ← Bridge Electron ↔ React
│   │   ├── styles/              ← CSS global
│   │   └── components/
│   │       ├── TopBar/          ← Barra superior (logo, status, controles)
│   │       ├── NavTabs/         ← Navegação por abas
│   │       ├── Dashboard/       ← Painel principal com métricas-chave
│   │       ├── Metrics/         ← Todas as 50+ métricas detalhadas
│   │       ├── Tools/           ← 13+ ferramentas de diagnóstico
│   │       ├── Security/        ← Pontuação de segurança e proteção
│   │       ├── History/         ← Histórico de eventos e velocidade
│   │       ├── Settings/        ← Configurações do aplicativo
│   │       └── Charts/          ← Componentes de gráfico (sparkline)
│   └── shared/
│       └── types.ts             ← Tipos TypeScript compartilhados
├── assets/                      ← Ícones do app
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.main.json
```

---

## 🔧 Funcionalidades

### 📊 50+ Métricas Wi-Fi
- Sinal (RSSI, dBm, %, SNR, Ruído)
- Banda, Canal, Largura, Tipo PHY
- Velocidade TX/RX do link
- Upload/Download em tempo real, pico e média
- Bytes enviados/recebidos
- Pacotes, erros, retransmissões, descartes
- Ping, jitter, perda de pacotes, spikes
- Pontuação de estabilidade (0–100)
- IP local/público, gateway, DNS, DHCP, IPv6
- Criptografia, autenticação, cifra
- VPN, Firewall, perfil de rede
- Adaptador, driver, MAC, modo de energia
- APs vizinhos, interferência de canal

### 🔧 13+ Ferramentas
| Ferramenta | Descrição |
|---|---|
| Ping | Com presets (Google, Cloudflare) e contagem customizável |
| Traceroute | Rota completa até o destino |
| DNS Lookup | Resolve A, AAAA, MX, CNAME |
| Port Check | Verifica porta única TCP |
| Portas Comuns | Verifica 14 portas de uma vez |
| Speed Test | Via Cloudflare (sem conta) |
| Scan de Rede | Dispositivos via ARP |
| Geo IP | Localização do IP público |
| Teste Estabilidade | 20 pings com análise completa |
| Flush DNS | Limpa cache DNS |
| Renovar IP | Release + Renew via DHCP |
| Reset Adaptador | Desliga e religa o Wi-Fi |
| Gerar Relatório | Exporta diagnóstico em TXT para a Área de Trabalho |

---

## 🔒 Privacidade

- **Zero telemetria** — Nenhum dado é enviado para servidores externos
- **Coleta local apenas** — Todos os dados ficam no seu computador
- **Sem rastreamento** — Sem analytics, sem logs remotos
- **IP Público** — Obtido via DNS (nslookup), sem chamada HTTP a APIs externas
- **Speed Test** — Usa endpoint público da Cloudflare, sem conta ou token

---

## 🛠 Tecnologias

| Tecnologia | Uso |
|---|---|
| Electron 28 | Shell nativo Windows |
| React 18 + TypeScript | Interface do usuário |
| Vite 5 | Bundler do renderer |
| Zustand | Estado global |
| Chart.js | Gráficos de velocidade |
| netsh / ipconfig | Coleta de dados Wi-Fi |
| ping / tracert / nslookup | Ferramentas de diagnóstico |
| PowerShell | Driver, adaptador, firewall |
| electron-builder | Empacotamento e instalador |

---

## ⚠ Notas Importantes

1. **Execute como Administrador** para desbloquear: reset de adaptador, renovar IP, scan de rede
2. O app funciona **apenas em notebooks/PCs com adaptador Wi-Fi** — não suporta Ethernet
3. Os dados de velocidade em tempo real são amostrados a cada 3 segundos via `netstat`
4. O Speed Test usa a Cloudflare e requer conexão ativa com a internet

---

*WaveNet Monitor — Desenvolvido para monitoramento local de Wi-Fi.*
