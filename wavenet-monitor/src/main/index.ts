import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from 'electron'
import * as path from 'path'
import { setupIpcHandlers } from './ipc-handlers'
import { WifiScanner } from './wifi-scanner'
import { PingService } from './ping-service'
import { IPC } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let wifiScanner: WifiScanner | null = null
let pingService: PingService | null = null

const isDev = !app.isPackaged

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 860,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#13161e',
      symbolColor: '#e8eaf0',
      height: 40,
    },
    backgroundColor: '#0d0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '../../assets/icon.ico'),
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    const settings = require('./settings-manager').getSettings()
    if (settings.minimizeToTray) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Window controls IPC
  ipcMain.on('window-minimize', () => mainWindow?.minimize())
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window-close', () => mainWindow?.close())
}

function createTray(): void {
  try {
    const iconPath = path.join(__dirname, '../../assets/tray-icon.png')
    const icon = nativeImage.createFromPath(iconPath)
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Abrir WaveNet Monitor', click: () => { mainWindow?.show(); mainWindow?.focus() } },
      { type: 'separator' },
      { label: 'Sair', click: () => { app.quit() } },
    ])

    tray.setToolTip('WaveNet Monitor')
    tray.setContextMenu(contextMenu)
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
  } catch {
    // tray icon optional
  }
}

function startBackgroundServices(): void {
  if (!mainWindow) return

  wifiScanner = new WifiScanner()
  pingService = new PingService()

  // Push Wi-Fi updates every 2 seconds
  wifiScanner.startPolling(2000, (wifiInfo, networkInfo) => {
    mainWindow?.webContents.send(IPC.WIFI_UPDATE, wifiInfo)
    mainWindow?.webContents.send(IPC.NETWORK_UPDATE, networkInfo)
  })

  // Push latency updates every 1 second
  pingService.startContinuousPing('8.8.8.8', 1000, (stats) => {
    mainWindow?.webContents.send(IPC.LATENCY_UPDATE, stats)
  })

  // Speed sampling every 3 seconds
  wifiScanner.startSpeedSampling(3000, (up, down) => {
    mainWindow?.webContents.send(IPC.SPEED_UPDATE, { up, down })
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()

  mainWindow?.webContents.once('did-finish-load', () => {
    startBackgroundServices()
  })

  setupIpcHandlers(ipcMain, () => mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  wifiScanner?.stopPolling()
  pingService?.stop()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  wifiScanner?.stopPolling()
  pingService?.stop()
  tray?.destroy()
})

// Security: prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
})
