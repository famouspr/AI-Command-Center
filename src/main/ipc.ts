import { app, clipboard, ipcMain, shell, type BrowserWindow } from 'electron'
import {
  IPC,
  type ProjectFileName,
  type Rect,
  type Settings,
  type ViewId
} from '../shared/types'
import type { ProjectFs } from './projectFs'
import type { SettingsStore } from './store'
import type { ViewManager } from './viewManager'

interface Deps {
  win: BrowserWindow
  views: ViewManager
  store: SettingsStore
  project: ProjectFs
}

/** Registers every IPC handler. Call once after the window exists. */
export function registerIpc({ win, views, store, project }: Deps): void {
  // ---- embedded views: fire-and-forget ----
  ipcMain.on(IPC.viewSetBounds, (_e, id: ViewId, rect: Rect) => views.setBounds(id, rect))
  ipcMain.on(IPC.viewSetVisible, (_e, id: ViewId, visible: boolean) => views.setVisible(id, visible))
  ipcMain.on(IPC.viewSetAllVisible, (_e, visible: boolean) => views.setAllVisible(visible))
  ipcMain.on(IPC.viewReload, (_e, id: ViewId) => views.reload(id))
  ipcMain.on(IPC.viewGoBack, (_e, id: ViewId) => views.goBack(id))
  ipcMain.on(IPC.viewLoadHome, (_e, id: ViewId) => views.loadHome(id))
  ipcMain.on(IPC.viewOpenExternal, (_e, id: ViewId) => views.openExternal(id))
  ipcMain.on(IPC.viewFocus, (_e, id: ViewId) => views.focus(id))

  // ---- embedded views: request/response ----
  ipcMain.handle(IPC.viewInsertText, (_e, id: ViewId, text: string) =>
    views.insertComposerText(id, text)
  )
  ipcMain.handle(IPC.viewSubmit, (_e, id: ViewId) => views.submitComposer(id))

  // ---- settings ----
  ipcMain.handle(IPC.getSettings, () => store.get())
  ipcMain.handle(IPC.setSettings, (_e, patch: Partial<Settings>) => store.set(patch))

  // ---- project memory ----
  ipcMain.handle(IPC.chooseProject, () => project.choose(win))
  ipcMain.handle(IPC.openProject, (_e, path: string) => project.open(path))
  ipcMain.handle(IPC.getProject, () => project.get())
  ipcMain.handle(IPC.appendProjectFile, (_e, name: ProjectFileName, content: string) =>
    project.append(name, content)
  )
  ipcMain.handle(IPC.readProjectFile, (_e, name: ProjectFileName) => project.read(name))
  ipcMain.handle(IPC.revealProject, () => project.reveal())

  // ---- host helpers ----
  ipcMain.handle(IPC.writeClipboard, (_e, text: string) => clipboard.writeText(text ?? ''))
  ipcMain.handle(IPC.openExternalUrl, (_e, url: string) => {
    if (/^https?:\/\//i.test(url)) return shell.openExternal(url)
    return undefined
  })
  ipcMain.handle(IPC.getAppInfo, () => ({ version: app.getVersion(), platform: process.platform }))
}
