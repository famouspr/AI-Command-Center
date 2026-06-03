import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type AppInfo,
  type InsertResult,
  type IpcResult,
  type ProjectFileName,
  type ProjectInfo,
  type Rect,
  type Settings,
  type ViewId,
  type ViewStatusEvent,
  type WindowApi
} from '../shared/types'

const api: WindowApi = {
  // embedded views (fire-and-forget)
  setViewBounds: (id: ViewId, rect: Rect) => ipcRenderer.send(IPC.viewSetBounds, id, rect),
  setViewVisible: (id: ViewId, visible: boolean) => ipcRenderer.send(IPC.viewSetVisible, id, visible),
  setAllViewsVisible: (visible: boolean) => ipcRenderer.send(IPC.viewSetAllVisible, visible),
  reloadView: (id: ViewId) => ipcRenderer.send(IPC.viewReload, id),
  goBackView: (id: ViewId) => ipcRenderer.send(IPC.viewGoBack, id),
  loadViewHome: (id: ViewId) => ipcRenderer.send(IPC.viewLoadHome, id),
  openViewExternal: (id: ViewId) => ipcRenderer.send(IPC.viewOpenExternal, id),
  focusView: (id: ViewId) => ipcRenderer.send(IPC.viewFocus, id),
  insertViewText: (id: ViewId, text: string): Promise<InsertResult> =>
    ipcRenderer.invoke(IPC.viewInsertText, id, text),
  submitView: (id: ViewId): Promise<InsertResult> => ipcRenderer.invoke(IPC.viewSubmit, id),
  onViewStatus: (cb: (event: ViewStatusEvent) => void) => {
    const listener = (_e: unknown, event: ViewStatusEvent): void => cb(event)
    ipcRenderer.on(IPC.viewStatus, listener)
    return () => ipcRenderer.removeListener(IPC.viewStatus, listener)
  },

  // settings
  getSettings: (): Promise<Settings> => ipcRenderer.invoke(IPC.getSettings),
  setSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.setSettings, patch),

  // project memory
  chooseProject: (): Promise<IpcResult<ProjectInfo>> => ipcRenderer.invoke(IPC.chooseProject),
  openProject: (path: string): Promise<IpcResult<ProjectInfo>> =>
    ipcRenderer.invoke(IPC.openProject, path),
  getProject: (): Promise<IpcResult<ProjectInfo | null>> => ipcRenderer.invoke(IPC.getProject),
  appendProjectFile: (name: ProjectFileName, content: string): Promise<IpcResult<{ path: string }>> =>
    ipcRenderer.invoke(IPC.appendProjectFile, name, content),
  readProjectFile: (name: ProjectFileName): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IPC.readProjectFile, name),
  revealProject: (): Promise<void> => ipcRenderer.invoke(IPC.revealProject),

  // host helpers
  writeClipboard: (text: string): Promise<void> => ipcRenderer.invoke(IPC.writeClipboard, text),
  openExternalUrl: (url: string): Promise<void> => ipcRenderer.invoke(IPC.openExternalUrl, url),
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC.getAppInfo)
}

contextBridge.exposeInMainWorld('api', api)
