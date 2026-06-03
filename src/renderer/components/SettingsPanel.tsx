import { useEffect } from 'react'
import type { MouseEvent } from 'react'
import styles from './SettingsPanel.module.css'
import Button from './ui/Button'
import type { SettingsPanelProps } from '../types'
import type { ThemeMode, WorkflowMode } from '../../shared/types'

interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  ariaLabel: string
  value: T
  options: SegmentedOption<T>[]
  onSelect(value: T): void
}

function Segmented<T extends string>({
  ariaLabel,
  value,
  options,
  onSelect
}: SegmentedProps<T>): JSX.Element {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={active ? `${styles.segment} ${styles.segmentActive}` : styles.segment}
            onClick={() => onSelect(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

const WORKFLOW_OPTIONS: SegmentedOption<WorkflowMode>[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'assisted', label: 'Assisted' }
]

const THEME_OPTIONS: SegmentedOption<ThemeMode>[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
]

const ONOFF_OPTIONS: SegmentedOption<'off' | 'on'>[] = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' }
]

function CloseIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

export default function SettingsPanel({
  open,
  settings,
  project,
  appVersion,
  onClose,
  onChange,
  onChooseDefaultProject
}: SettingsPanelProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onBackdropClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={styles.backdrop} onMouseDown={onBackdropClick}>
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <header className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close settings"
          >
            <CloseIcon />
          </button>
        </header>

        <section className={styles.section}>
          <span className={styles.caption}>Project</span>
          <p className={styles.helper}>
            The folder where prompts and logs are archived as Markdown.
          </p>
          <div className={styles.projectRow}>
            <div className={styles.projectInfo}>
              <span className={styles.path} title={settings.defaultProjectPath ?? undefined}>
                {settings.defaultProjectPath || 'None selected'}
              </span>
              {project?.name ? (
                <span className={styles.projectName}>{project.name}</span>
              ) : null}
            </div>
            <Button variant="secondary" size="sm" onClick={onChooseDefaultProject}>
              Choose folder
            </Button>
          </div>
        </section>

        <section className={styles.section}>
          <span className={styles.caption}>Workflow mode</span>
          <p className={styles.helper}>
            manual = no next-step hints; assisted = highlights the suggested next action.
          </p>
          <Segmented
            ariaLabel="Workflow mode"
            value={settings.workflowMode}
            options={WORKFLOW_OPTIONS}
            onSelect={(workflowMode) => onChange({ workflowMode })}
          />
        </section>

        <section className={styles.section}>
          <span className={styles.caption}>Theme</span>
          <p className={styles.helper}>system follows your Windows appearance.</p>
          <Segmented
            ariaLabel="Theme"
            value={settings.theme}
            options={THEME_OPTIONS}
            onSelect={(theme) => onChange({ theme })}
          />
        </section>

        <section className={styles.section}>
          <span className={styles.caption}>Auto-send</span>
          <p className={styles.helper}>
            Off (recommended): Send only inserts the prompt — you review and press Enter.
            On: the app also submits it for you.
          </p>
          <Segmented
            ariaLabel="Auto-send"
            value={settings.autoSend ? 'on' : 'off'}
            options={ONOFF_OPTIONS}
            onSelect={(value) => onChange({ autoSend: value === 'on' })}
          />
        </section>

        <section className={styles.section}>
          <span className={styles.caption}>Debug logging</span>
          <p className={styles.helper}>
            When on, the activity log shows which selector inserted the prompt, or why it
            failed.
          </p>
          <Segmented
            ariaLabel="Debug logging"
            value={settings.debugMode ? 'on' : 'off'}
            options={ONOFF_OPTIONS}
            onSelect={(value) => onChange({ debugMode: value === 'on' })}
          />
        </section>

        <footer className={styles.footer}>
          <div className={styles.divider} />
          <div className={styles.footerRow}>
            <span className={styles.safety}>
              Prompts are inserted into the composer for you to review. The app never
              submits unless Auto-send is on. No scraping, no background automation.
            </span>
            <span className={styles.version}>v{appVersion}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
