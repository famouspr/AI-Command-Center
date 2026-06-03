/**
 * ActivityLog — the full-width bottom dock that records every relay action.
 * Presentational and prop-driven: App.tsx owns the entries and the three
 * actions (copy / export / clear). Newest entries arrive first; this view only
 * renders them. Collapse state is local, ephemeral UI and lives here.
 */
import React, { useState } from 'react'
import type { ActivityLogProps, LogEntry, LogLevel } from '../types'
import Button from './ui/Button'
import styles from './ActivityLog.module.css'

const LEVEL_LABEL: Record<LogLevel, string> = {
  info: 'Info',
  action: 'Action',
  success: 'Success',
  warn: 'Warning',
  error: 'Error'
}

function formatTime(ts: string): string {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleTimeString()
}

function ChevronIcon({ collapsed }: { collapsed: boolean }): React.JSX.Element {
  return (
    <svg
      className={collapsed ? styles.chevronCollapsed : styles.chevron}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

function LogRow({ entry }: { entry: LogEntry }): React.JSX.Element {
  return (
    <li className={styles.row}>
      <span
        className={`${styles.level} ${styles[`level_${entry.level}`]}`}
        title={LEVEL_LABEL[entry.level]}
        aria-hidden="true"
      />
      <time className={styles.time} dateTime={entry.ts}>
        {formatTime(entry.ts)}
      </time>
      <div className={styles.body}>
        <span className={styles.message}>{entry.message}</span>
        {entry.detail != null && entry.detail !== '' && (
          <span className={styles.detail}>{entry.detail}</span>
        )}
      </div>
    </li>
  )
}

function ActivityLog({
  entries,
  onClear,
  onExport,
  onCopy
}: ActivityLogProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const empty = entries.length === 0

  return (
    <section className={styles.root} aria-label="Activity log">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand activity log' : 'Collapse activity log'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronIcon collapsed={collapsed} />
          </button>
          <span className={styles.caption}>Activity</span>
          <span className={styles.count} aria-label={`${entries.length} entries`}>
            {entries.length}
          </span>
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={onCopy}>
            Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            title="Append to AI_LOG.md"
          >
            Export
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      </header>

      {!collapsed && (
        <div className={styles.body_scroll}>
          {empty ? (
            <p className={styles.emptyState}>
              No activity yet — prepare a task to begin.
            </p>
          ) : (
            <ul className={styles.list}>
              {entries.map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default ActivityLog
