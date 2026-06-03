import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './App.module.css'
import TopBar from './components/TopBar'
import BrowserPanel from './components/BrowserPanel'
import ControlPanel from './components/ControlPanel'
import ActivityLog from './components/ActivityLog'
import SettingsPanel from './components/SettingsPanel'
import { ToastHost } from './components/ui/Toast'
import { formatPrompt, getTemplateMeta } from './lib/promptTemplates'
import { DEFAULT_UI, loadUiState, saveUiState } from './lib/storage'
import { saveEntry } from './lib/projectFiles'
import {
  EMPTY_PANEL_STATE,
  RELAY_STAGE_LABEL,
  type LogEntry,
  type LogLevel,
  type PanelState,
  type ToastKind,
  type ToastMessage,
  type UiState
} from './types'
import {
  DEFAULT_SETTINGS,
  VIEW_LABEL,
  type ProjectFileName,
  type ProjectInfo,
  type Settings,
  type TemplateId,
  type ViewId
} from '../shared/types'

const VIEWS: ViewId[] = ['chatgpt', 'claude']

export default function App(): JSX.Element {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [ui, setUi] = useState<UiState>(() => loadUiState())
  const [panels, setPanels] = useState<Record<ViewId, PanelState>>({
    chatgpt: EMPTY_PANEL_STATE,
    claude: EMPTY_PANEL_STATE
  })
  const [log, setLog] = useState<LogEntry[]>([])
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appVersion, setAppVersion] = useState('0.1.0')

  const surfaces = useRef<Record<ViewId, HTMLDivElement | null>>({ chatgpt: null, claude: null })
  const observers = useRef<Record<ViewId, ResizeObserver | null>>({ chatgpt: null, claude: null })
  const uiRef = useRef(ui)
  uiRef.current = ui
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const handleSendRef = useRef<(target: ViewId) => void>(() => {})

  // ---- small helpers -----------------------------------------------------

  const addLog = useCallback((level: LogLevel, message: string, detail?: string) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      level,
      message,
      detail
    }
    setLog((prev) => [entry, ...prev].slice(0, 500))
  }, [])

  const toast = useCallback((kind: ToastKind, text: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, kind, text }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400)
  }, [])

  const patchUi = useCallback((patch: Partial<UiState>) => {
    setUi((prev) => {
      const next = { ...prev, ...patch }
      saveUiState(next)
      return next
    })
  }, [])

  const refreshProject = useCallback(async () => {
    const res = await window.api.getProject()
    if (res.ok) setProject(res.value)
  }, [])

  // ---- bounds syncing for the native views -------------------------------

  const syncBounds = useCallback((id: ViewId) => {
    const el = surfaces.current[id]
    if (!el) return
    const r = el.getBoundingClientRect()
    window.api.setViewBounds(id, { x: r.left, y: r.top, width: r.width, height: r.height })
  }, [])

  const registerSurface = useCallback(
    (id: ViewId, el: HTMLDivElement | null) => {
      observers.current[id]?.disconnect()
      surfaces.current[id] = el
      if (el) {
        const ro = new ResizeObserver(() => syncBounds(id))
        ro.observe(el)
        observers.current[id] = ro
        syncBounds(id)
      }
    },
    [syncBounds]
  )

  // ---- bootstrap ---------------------------------------------------------

  useEffect(() => {
    let active = true
    void (async () => {
      const [loadedSettings, projectRes, info] = await Promise.all([
        window.api.getSettings(),
        window.api.getProject(),
        window.api.getAppInfo()
      ])
      if (!active) return
      setSettings(loadedSettings)
      if (projectRes.ok) setProject(projectRes.value)
      setAppVersion(info.version)
    })()
    return () => {
      active = false
    }
  }, [])

  // view status events
  useEffect(() => {
    const off = window.api.onViewStatus((e) => {
      setPanels((prev) => ({
        ...prev,
        [e.id]: {
          status: e.status,
          url: e.url ?? prev[e.id].url,
          title: e.title ?? prev[e.id].title,
          canGoBack: e.canGoBack ?? prev[e.id].canGoBack,
          detail: e.detail
        }
      }))
      if (e.status === 'failed') addLog('warn', `${VIEW_LABEL[e.id]} could not load`, e.detail)
      else if (e.status === 'blocked')
        addLog('warn', `${VIEW_LABEL[e.id]} reload loop stopped`, e.detail)
    })
    return off
  }, [addLog])

  // window resize -> re-sync both views
  useEffect(() => {
    const onResize = (): void => VIEWS.forEach(syncBounds)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      VIEWS.forEach((id) => observers.current[id]?.disconnect())
    }
  }, [syncBounds])

  // visibility: hide native views behind overlays or when a panel falls back
  useEffect(() => {
    VIEWS.forEach((id) => {
      const blocked =
        panels[id].status === 'failed' ||
        panels[id].status === 'external' ||
        panels[id].status === 'blocked'
      const visible = !settingsOpen && !blocked
      window.api.setViewVisible(id, visible)
      if (visible) requestAnimationFrame(() => syncBounds(id))
    })
  }, [settingsOpen, panels.chatgpt.status, panels.claude.status, syncBounds])

  // theme
  useEffect(() => {
    const apply = (): void => {
      const dark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    }
    apply()
    if (settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
    return undefined
  }, [settings.theme])

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === '1') {
        e.preventDefault()
        window.api.focusView('chatgpt')
      } else if (e.key === '2') {
        e.preventDefault()
        window.api.focusView('claude')
      } else if (e.key === ',') {
        e.preventDefault()
        setSettingsOpen((o) => !o)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const target = getTemplateMeta(uiRef.current.activeTemplate).target
        void handleSendRef.current(target)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- project -----------------------------------------------------------

  const chooseProject = useCallback(async () => {
    const res = await window.api.chooseProject()
    if (res.ok) {
      setProject(res.value)
      setSettings((prev) => ({ ...prev, defaultProjectPath: res.value.path }))
      addLog('info', `Project set: ${res.value.name}`, res.value.path)
      toast('success', `Project: ${res.value.name}`)
    } else if (res.error !== 'Selection cancelled.') {
      toast('error', res.error)
    }
  }, [addLog, toast])

  // ---- relay handlers ----------------------------------------------------

  const applyTemplate = useCallback(
    (id: TemplateId): string => {
      const u = uiRef.current
      return formatPrompt(id, {
        task: u.task,
        chatgptResponse: u.chatgptResponse,
        claudeResponse: u.claudeResponse,
        projectName: project?.name
      })
    },
    [project?.name]
  )

  const handleApplyTemplate = useCallback(() => {
    const text = applyTemplate(uiRef.current.activeTemplate)
    patchUi({ composer: text })
    addLog('action', `Applied template: ${getTemplateMeta(uiRef.current.activeTemplate).label}`)
  }, [applyTemplate, patchUi, addLog])

  const handlePrepare = useCallback(
    (target: 'chatgpt' | 'claude' | 'review') => {
      const id: TemplateId =
        target === 'chatgpt'
          ? 'chatgpt-director'
          : target === 'claude'
            ? 'claude-engineer'
            : 'review-back'
      const text = applyTemplate(id)
      patchUi({ activeTemplate: id, composer: text })
      addLog('action', `Prepared ${getTemplateMeta(id).label}`)
      toast('info', 'Composer updated from template')
    },
    [applyTemplate, patchUi, addLog, toast]
  )

  const handleSend = useCallback(
    async (target: ViewId) => {
      const text = uiRef.current.composer.trim()
      if (!text) {
        toast('warn', 'Nothing to send — the composer is empty.')
        return
      }
      const label = VIEW_LABEL[target]
      const debug = settingsRef.current.debugMode

      // Archive the prompt (best-effort), regardless of insertion outcome.
      const file: ProjectFileName = target === 'chatgpt' ? 'CHATGPT_PROMPTS.md' : 'CLAUDE_PROMPTS.md'
      let archiveDetail: string | undefined
      if (project) {
        const res = await saveEntry(file, text)
        archiveDetail = res.ok ? `archived to ${file}` : `archive failed: ${res.error}`
        if (res.ok) void refreshProject()
      }

      // Try to insert directly into the site's composer (no submit).
      const result = await window.api.insertViewText(target, text)

      if (result.ok) {
        patchUi({ stage: target === 'chatgpt' ? 'sent-to-chatgpt' : 'sent-to-claude' })
        const dbg = debug ? `selector ${result.selector} · ${result.method}` : undefined
        const detail = [dbg, archiveDetail].filter(Boolean).join(' · ') || undefined
        addLog('success', `Inserted prompt into ${label} composer`, detail)

        if (settingsRef.current.autoSend) {
          const sub = await window.api.submitView(target)
          if (sub.ok) {
            addLog('action', `Auto-sent prompt in ${label}`, debug ? sub.method : undefined)
            toast('success', `Inserted & auto-sent in ${label}`)
          } else {
            addLog('warn', `Inserted into ${label}, but auto-send failed`, debug ? sub.reason : undefined)
            toast('warn', `Inserted in ${label} — press Enter to send`)
          }
        } else {
          toast('success', `Inserted into ${label} — review, then press Enter`)
        }
      } else {
        // Fallback: copy to clipboard, focus the panel, tell the user to paste.
        await window.api.writeClipboard(text)
        window.api.focusView(target)
        const detail =
          [debug ? result.reason : undefined, archiveDetail].filter(Boolean).join(' · ') || undefined
        addLog('warn', `Could not find ${label} composer. Copied to clipboard instead.`, detail)
        toast('warn', `Couldn't find ${label}'s box — copied. Paste with Ctrl+V.`)
      }
    },
    [project, patchUi, addLog, toast, refreshProject]
  )
  handleSendRef.current = handleSend

  const handleUseResponse = useCallback(
    (source: ViewId) => {
      if (source === 'chatgpt') {
        const text = formatPrompt('claude-engineer', {
          task: uiRef.current.task,
          chatgptResponse: uiRef.current.chatgptResponse,
          projectName: project?.name
        })
        patchUi({ activeTemplate: 'claude-engineer', composer: text, stage: 'captured-chatgpt' })
      } else {
        const text = formatPrompt('review-back', {
          task: uiRef.current.task,
          claudeResponse: uiRef.current.claudeResponse,
          projectName: project?.name
        })
        patchUi({ activeTemplate: 'review-back', composer: text, stage: 'captured-claude' })
      }
      addLog('action', `Loaded ${VIEW_LABEL[source]} response into composer`)
      toast('info', `Composer updated from ${VIEW_LABEL[source]} response`)
    },
    [project?.name, patchUi, addLog, toast]
  )

  const handleCopyLastResponse = useCallback(async () => {
    const u = uiRef.current
    const text = u.claudeResponse.trim() || u.chatgptResponse.trim()
    if (!text) {
      toast('warn', 'No captured response yet.')
      return
    }
    await window.api.writeClipboard(text)
    toast('success', 'Copied last response to clipboard')
  }, [toast])

  const handleSaveProjectFile = useCallback(
    async (name: ProjectFileName) => {
      if (!project) {
        toast('warn', 'Choose a project folder first.')
        return
      }
      const u = uiRef.current
      const content =
        name === 'TASKS.md'
          ? `**Task:** ${u.task.trim() || '(empty)'}\n\n**Stage:** ${RELAY_STAGE_LABEL[u.stage]}`
          : u.composer.trim() || u.claudeResponse.trim() || u.chatgptResponse.trim() || '(nothing to save)'
      const res = await saveEntry(name, content)
      if (res.ok) {
        addLog('success', `Saved to ${name}`, res.value.path)
        toast('success', `Saved to ${name}`)
        void refreshProject()
      } else {
        addLog('error', `Failed to save ${name}`, res.error)
        toast('error', res.error)
      }
    },
    [project, addLog, toast, refreshProject]
  )

  // ---- activity log actions ---------------------------------------------

  const logToText = useCallback(
    () =>
      log
        .slice()
        .reverse()
        .map(
          (e) =>
            `- [${e.ts}] (${e.level}) ${e.message}${e.detail ? ` — ${e.detail}` : ''}`
        )
        .join('\n'),
    [log]
  )

  const handleExportLog = useCallback(async () => {
    if (!project) {
      toast('warn', 'Choose a project folder first.')
      return
    }
    if (log.length === 0) {
      toast('warn', 'The activity log is empty.')
      return
    }
    const res = await saveEntry('AI_LOG.md', logToText())
    if (res.ok) {
      toast('success', 'Exported log to AI_LOG.md')
      void refreshProject()
    } else {
      toast('error', res.error)
    }
  }, [project, log.length, logToText, toast, refreshProject])

  const handleCopyLog = useCallback(async () => {
    if (log.length === 0) {
      toast('warn', 'The activity log is empty.')
      return
    }
    await window.api.writeClipboard(logToText())
    toast('success', 'Copied activity log')
  }, [log.length, logToText, toast])

  // ---- settings ----------------------------------------------------------

  const changeSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = await window.api.setSettings(patch)
    setSettings(next)
  }, [])

  // ---- render ------------------------------------------------------------

  return (
    <div className={styles.app}>
      <TopBar
        project={project}
        chatgpt={panels.chatgpt}
        claude={panels.claude}
        appVersion={appVersion}
        onChooseProject={chooseProject}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className={styles.main}>
        <BrowserPanel
          id="chatgpt"
          label={VIEW_LABEL.chatgpt}
          state={panels.chatgpt}
          registerSurface={registerSurface}
          onReload={() => window.api.reloadView('chatgpt')}
          onBack={() => window.api.goBackView('chatgpt')}
          onLoadHome={() => window.api.loadViewHome('chatgpt')}
          onOpenExternal={() => window.api.openViewExternal('chatgpt')}
        />

        <ControlPanel
          ui={ui}
          project={project}
          workflowMode={settings.workflowMode}
          onTaskChange={(v) => patchUi({ task: v })}
          onComposerChange={(v) => patchUi({ composer: v })}
          onTemplateChange={(id) => patchUi({ activeTemplate: id })}
          onApplyTemplate={handleApplyTemplate}
          onCopyComposer={async () => {
            await window.api.writeClipboard(uiRef.current.composer)
            toast('success', 'Copied composer to clipboard')
          }}
          onPrepare={handlePrepare}
          onSend={handleSend}
          onResponseChange={(source, v) =>
            patchUi(source === 'chatgpt' ? { chatgptResponse: v } : { claudeResponse: v })
          }
          onUseResponse={handleUseResponse}
          onCopyLastResponse={handleCopyLastResponse}
          onSaveProjectFile={handleSaveProjectFile}
        />

        <BrowserPanel
          id="claude"
          label={VIEW_LABEL.claude}
          state={panels.claude}
          registerSurface={registerSurface}
          onReload={() => window.api.reloadView('claude')}
          onBack={() => window.api.goBackView('claude')}
          onLoadHome={() => window.api.loadViewHome('claude')}
          onOpenExternal={() => window.api.openViewExternal('claude')}
        />
      </div>

      <div className={styles.logDock}>
        <ActivityLog
          entries={log}
          onClear={() => setLog([])}
          onExport={handleExportLog}
          onCopy={handleCopyLog}
        />
      </div>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        project={project}
        appVersion={appVersion}
        onClose={() => setSettingsOpen(false)}
        onChange={changeSettings}
        onChooseDefaultProject={chooseProject}
      />

      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  )
}
