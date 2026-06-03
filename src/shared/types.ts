/**
 * Shared contract between the Electron main process, the preload bridge, and
 * the React renderer. Keep this file free of any DOM- or Node-specific imports
 * so it can be safely consumed from all three contexts.
 */

// ---------------------------------------------------------------------------
// Embedded browser views (ChatGPT / Claude)
// ---------------------------------------------------------------------------

export type ViewId = 'chatgpt' | 'claude'

export type ViewStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'blocked'
  | 'failed'
  | 'external'

export interface ViewStatusEvent {
  id: ViewId
  status: ViewStatus
  url?: string
  title?: string
  canGoBack?: boolean
  detail?: string
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const VIEW_HOME: Record<ViewId, string> = {
  chatgpt: 'https://chatgpt.com/',
  claude: 'https://claude.ai/'
}

export const VIEW_LABEL: Record<ViewId, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude'
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type WorkflowMode = 'manual' | 'assisted'
export type ThemeMode = 'dark' | 'system'

export interface Settings {
  /** Active project folder; persisted so it reopens on next launch. */
  defaultProjectPath: string | null
  /** manual = no stage hints highlighted; assisted = next-step hints surfaced. */
  workflowMode: WorkflowMode
  /** dark = always dark; system = follow the OS appearance. */
  theme: ThemeMode
  /** When on, "Send" also submits the inserted prompt for you. Default off. */
  autoSend: boolean
  /** When on, relay actions log the selector/method used (diagnostics). */
  debugMode: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  defaultProjectPath: null,
  workflowMode: 'manual',
  theme: 'dark',
  autoSend: false,
  debugMode: false
}

// ---------------------------------------------------------------------------
// Project memory files
// ---------------------------------------------------------------------------

export type ProjectFileName =
  | 'TASKS.md'
  | 'DECISIONS.md'
  | 'AI_LOG.md'
  | 'CLAUDE_PROMPTS.md'
  | 'CHATGPT_PROMPTS.md'

export const PROJECT_FILES: ProjectFileName[] = [
  'TASKS.md',
  'DECISIONS.md',
  'AI_LOG.md',
  'CLAUDE_PROMPTS.md',
  'CHATGPT_PROMPTS.md'
]

export interface ProjectFileInfo {
  name: ProjectFileName
  exists: boolean
  size: number
}

export interface ProjectInfo {
  path: string
  name: string
  files: ProjectFileInfo[]
}

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

export type TemplateId = 'chatgpt-director' | 'claude-engineer' | 'review-back'

// ---------------------------------------------------------------------------
// IPC result envelope
// ---------------------------------------------------------------------------

export interface IpcOk<T> {
  ok: true
  value: T
}
export interface IpcErr {
  ok: false
  error: string
}
export type IpcResult<T> = IpcOk<T> | IpcErr

export interface AppInfo {
  version: string
  platform: string
}

/** Result of trying to insert/submit text inside an embedded view's composer. */
export interface InsertResult {
  ok: boolean
  /** The CSS selector that matched the composer (on success). */
  selector?: string
  /** Which insertion technique was used (on success). */
  method?: string
  /** The matched element's tag name. */
  tag?: string
  /** Why insertion failed (on failure). */
  reason?: string
}

// ---------------------------------------------------------------------------
// IPC channel names (single source of truth for preload + main)
// ---------------------------------------------------------------------------

export const IPC = {
  // fire-and-forget (renderer -> main)
  viewSetBounds: 'view:setBounds',
  viewSetVisible: 'view:setVisible',
  viewSetAllVisible: 'view:setAllVisible',
  viewReload: 'view:reload',
  viewGoBack: 'view:goBack',
  viewLoadHome: 'view:loadHome',
  viewOpenExternal: 'view:openExternal',
  viewFocus: 'view:focus',
  // request/response (renderer -> main)
  viewInsertText: 'view:insertText',
  viewSubmit: 'view:submit',
  // events (main -> renderer)
  viewStatus: 'view:status',
  // request/response (renderer -> main)
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  chooseProject: 'project:choose',
  openProject: 'project:open',
  getProject: 'project:get',
  appendProjectFile: 'project:appendFile',
  readProjectFile: 'project:readFile',
  revealProject: 'project:reveal',
  writeClipboard: 'clipboard:write',
  openExternalUrl: 'shell:openExternal',
  getAppInfo: 'app:getInfo'
} as const

// ---------------------------------------------------------------------------
// The API surface exposed to the renderer via contextBridge as `window.api`
// ---------------------------------------------------------------------------

export interface WindowApi {
  // embedded views
  setViewBounds(id: ViewId, rect: Rect): void
  setViewVisible(id: ViewId, visible: boolean): void
  setAllViewsVisible(visible: boolean): void
  reloadView(id: ViewId): void
  goBackView(id: ViewId): void
  loadViewHome(id: ViewId): void
  openViewExternal(id: ViewId): void
  focusView(id: ViewId): void
  /** Insert text into the embedded site's message composer (no submit). */
  insertViewText(id: ViewId, text: string): Promise<InsertResult>
  /** Submit the composer (used only when auto-send is enabled). */
  submitView(id: ViewId): Promise<InsertResult>
  /** Subscribe to status changes. Returns an unsubscribe function. */
  onViewStatus(cb: (event: ViewStatusEvent) => void): () => void

  // settings
  getSettings(): Promise<Settings>
  setSettings(patch: Partial<Settings>): Promise<Settings>

  // project memory
  chooseProject(): Promise<IpcResult<ProjectInfo>>
  openProject(path: string): Promise<IpcResult<ProjectInfo>>
  getProject(): Promise<IpcResult<ProjectInfo | null>>
  appendProjectFile(
    name: ProjectFileName,
    content: string
  ): Promise<IpcResult<{ path: string }>>
  readProjectFile(name: ProjectFileName): Promise<IpcResult<string>>
  revealProject(): Promise<void>

  // misc host helpers
  writeClipboard(text: string): Promise<void>
  openExternalUrl(url: string): Promise<void>
  getAppInfo(): Promise<AppInfo>
}

declare global {
  // eslint-disable-next-line no-var
  interface Window {
    api: WindowApi
  }
}
