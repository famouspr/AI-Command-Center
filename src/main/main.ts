import { app, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { ProjectFs } from './projectFs'
import { SettingsStore } from './store'
import { ViewManager } from './viewManager'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const store = new SettingsStore()
  const project = new ProjectFs(store)

  const win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    backgroundColor: '#0B0C0E',
    title: 'AI Command Center',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0B0C0E',
      symbolColor: '#9BA1A8',
      height: 44
    },
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  mainWindow = win
  const views = new ViewManager(win)
  registerIpc({ win, views, store, project })

  // IMPORTANT: ready-to-show can fire more than once (e.g. re-triggered when
  // child views are added). Use once() together with an idempotent createAll()
  // so the embedded views are created exactly one time — otherwise every re-fire
  // would recreate both views and reload their URLs, an endless reload loop.
  win.once('ready-to-show', () => {
    win.show()
    views.createAll()
  })

  win.on('closed', () => {
    mainWindow = null
  })

  if (isDev) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'] as string)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Honour the saved theme preference at the OS-integration level too.
function applyTheme(): void {
  try {
    const store = new SettingsStore()
    nativeTheme.themeSource = store.get().theme === 'system' ? 'system' : 'dark'
  } catch {
    nativeTheme.themeSource = 'dark'
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    applyTheme()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
