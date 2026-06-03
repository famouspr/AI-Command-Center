import type { JSX } from 'react'
import type { TopBarProps } from '../types'
import StatusDot from './ui/StatusDot'
import styles from './TopBar.module.css'

function FolderIcon(): JSX.Element {
  return (
    <svg
      className={styles.icon}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 4.25C2 3.56 2.56 3 3.25 3h2.94c.32 0 .63.12.86.34l.96.91c.23.22.54.34.86.34h4.13c.69 0 1.25.56 1.25 1.25V11.5c0 .69-.56 1.25-1.25 1.25H3.25C2.56 12.75 2 12.19 2 11.5V4.25Z" />
    </svg>
  )
}

function GearIcon(): JSX.Element {
  return (
    <svg
      className={styles.icon}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="2.1" />
      <path d="M8 1.5v1.4M8 13.1v1.4M3.4 3.4l1 1M11.6 11.6l1 1M1.5 8h1.4M13.1 8h1.4M3.4 12.6l1-1M11.6 4.4l1-1" />
    </svg>
  )
}

export default function TopBar({
  project,
  chatgpt,
  claude,
  appVersion,
  onChooseProject,
  onOpenSettings
}: TopBarProps): JSX.Element {
  const projectName = project?.name ?? 'Choose project'

  return (
    <header className={styles.bar} role="banner">
      <div className={styles.left}>
        <div className={styles.brand} title={`AI Command Center ${appVersion}`}>
          <span className={styles.mark} aria-hidden="true">
            AC
          </span>
          <span className={styles.wordmark}>AI Command Center</span>
        </div>

        <button
          type="button"
          className={styles.project}
          onClick={onChooseProject}
          title={project ? `Project: ${project.name}` : 'Choose a project folder'}
        >
          <FolderIcon />
          <span className={styles.projectName}>{projectName}</span>
        </button>
      </div>

      <div className={styles.right}>
        <div className={styles.statuses}>
          <span className={styles.status}>
            <StatusDot status={chatgpt.status} title={`ChatGPT — ${chatgpt.status}`} />
            <span className={styles.statusLabel}>ChatGPT</span>
          </span>
          <span className={styles.status}>
            <StatusDot status={claude.status} title={`Claude — ${claude.status}`} />
            <span className={styles.statusLabel}>Claude</span>
          </span>
        </div>

        <button
          type="button"
          className={styles.gear}
          onClick={onOpenSettings}
          title="Settings (Ctrl+,)"
          aria-label="Settings"
        >
          <GearIcon />
        </button>
      </div>
    </header>
  )
}
