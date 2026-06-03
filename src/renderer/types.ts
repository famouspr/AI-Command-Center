/**
 * Renderer-internal types: relay state machine, activity log, toasts, and the
 * prop contracts for every component. Components are presentational and
 * prop-driven; App.tsx owns all state and behaviour and passes it down.
 */
import type React from 'react'
import type {
  ProjectInfo,
  ProjectFileName,
  Settings,
  TemplateId,
  ViewId,
  ViewStatus
} from '../shared/types'

// ---------------------------------------------------------------------------
// Relay state machine (advisory only — never auto-advances)
// ---------------------------------------------------------------------------

export type RelayStage =
  | 'compose'
  | 'sent-to-chatgpt'
  | 'captured-chatgpt'
  | 'sent-to-claude'
  | 'captured-claude'
  | 'review'

export const RELAY_STAGE_LABEL: Record<RelayStage, string> = {
  compose: 'Compose task',
  'sent-to-chatgpt': 'Sent to ChatGPT',
  'captured-chatgpt': 'Captured ChatGPT reply',
  'sent-to-claude': 'Sent to Claude',
  'captured-claude': 'Captured Claude reply',
  review: 'Review loop'
}

// ---------------------------------------------------------------------------
// Activity log + toasts
// ---------------------------------------------------------------------------

export type LogLevel = 'info' | 'action' | 'success' | 'warn' | 'error'

export interface LogEntry {
  id: string
  ts: string // ISO timestamp
  level: LogLevel
  message: string
  detail?: string
}

export type ToastKind = 'info' | 'success' | 'warn' | 'error'

export interface ToastMessage {
  id: string
  kind: ToastKind
  text: string
}

// ---------------------------------------------------------------------------
// Per-panel live state (driven by main-process view status events)
// ---------------------------------------------------------------------------

export interface PanelState {
  status: ViewStatus
  url?: string
  title?: string
  canGoBack?: boolean
  detail?: string
}

export const EMPTY_PANEL_STATE: PanelState = { status: 'idle' }

// ---------------------------------------------------------------------------
// Persisted UI working state (localStorage)
// ---------------------------------------------------------------------------

export interface UiState {
  task: string
  composer: string
  activeTemplate: TemplateId
  chatgptResponse: string
  claudeResponse: string
  stage: RelayStage
}

// ---------------------------------------------------------------------------
// Component prop contracts
// ---------------------------------------------------------------------------

export interface TopBarProps {
  project: ProjectInfo | null
  chatgpt: PanelState
  claude: PanelState
  appVersion: string
  onChooseProject(): void
  onOpenSettings(): void
}

export interface BrowserPanelProps {
  id: ViewId
  label: string
  state: PanelState
  /** Host wires the placeholder element so the native view tracks its bounds. */
  registerSurface(id: ViewId, el: HTMLDivElement | null): void
  onReload(): void
  onBack(): void
  onLoadHome(): void
  onOpenExternal(): void
}

export interface PromptComposerProps {
  value: string
  templateId: TemplateId
  onChange(value: string): void
  onTemplateChange(id: TemplateId): void
  onApplyTemplate(): void
  onCopy(): void
}

export interface ControlPanelProps {
  ui: UiState
  project: ProjectInfo | null
  workflowMode: Settings['workflowMode']
  onTaskChange(value: string): void
  onComposerChange(value: string): void
  onTemplateChange(id: TemplateId): void
  onApplyTemplate(): void
  onCopyComposer(): void
  /** Apply the relevant template and stage the composer for a target. */
  onPrepare(target: 'chatgpt' | 'claude' | 'review'): void
  /** Copy composed prompt to clipboard, focus the panel, log + persist it. */
  onSend(target: ViewId): void
  onResponseChange(source: ViewId, value: string): void
  /** Feed a captured response into the composer via the next template. */
  onUseResponse(source: ViewId): void
  onCopyLastResponse(): void
  onSaveProjectFile(name: ProjectFileName): void
}

export interface ActivityLogProps {
  entries: LogEntry[]
  onClear(): void
  onExport(): void
  onCopy(): void
}

export interface SettingsPanelProps {
  open: boolean
  settings: Settings
  project: ProjectInfo | null
  appVersion: string
  onClose(): void
  onChange(patch: Partial<Settings>): void
  onChooseDefaultProject(): void
}

// ---------------------------------------------------------------------------
// UI primitive prop contracts
// ---------------------------------------------------------------------------

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  iconLeft?: React.ReactNode
  block?: boolean
  loading?: boolean
}

export interface StatusDotProps {
  status: ViewStatus | 'ok' | 'idle'
  title?: string
  withLabel?: boolean
}

export interface ToastHostProps {
  toasts: ToastMessage[]
  onDismiss(id: string): void
}
