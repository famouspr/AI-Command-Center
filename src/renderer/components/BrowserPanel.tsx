import { useCallback } from 'react'
import styles from './BrowserPanel.module.css'
import StatusDot from './ui/StatusDot'
import Button from './ui/Button'
import type { BrowserPanelProps } from '../types'

function IconBack(): JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 3 5 8l5 5" />
    </svg>
  )
}

function IconReload(): JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 8a5 5 0 1 1-1.46-3.54" />
      <path d="M13 2.5V5h-2.5" />
    </svg>
  )
}

function IconHome(): JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 7 8 2.5 13.5 7" />
      <path d="M3.75 6v7h8.5V6" />
    </svg>
  )
}

function IconExternal(): JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 3h4v4" />
      <path d="M13 3 7.5 8.5" />
      <path d="M12 9.5V12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2.5" />
    </svg>
  )
}

export default function BrowserPanel({
  id,
  label,
  state,
  registerSurface,
  onReload,
  onBack,
  onLoadHome,
  onOpenExternal
}: BrowserPanelProps): JSX.Element {
  const setSurface = useCallback(
    (el: HTMLDivElement | null) => registerSurface(id, el),
    [registerSurface, id]
  )

  const subtitle = state.title || state.url || ''
  const canGoBack = state.canGoBack === true
  const isFailed = state.status === 'failed'
  const isBlocked = state.status === 'blocked'
  const isExternal = state.status === 'external'

  return (
    <section className={styles.panel} aria-label={label}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <StatusDot status={state.status} title={label} />
          <span className={styles.label}>{label}</span>
          {subtitle ? (
            <span className={styles.subtitle} title={subtitle}>
              {subtitle}
            </span>
          ) : null}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onBack}
            disabled={!canGoBack}
            aria-label={`Back in ${label}`}
            title="Back"
          >
            <IconBack />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onReload}
            aria-label={`Reload ${label}`}
            title="Reload"
          >
            <IconReload />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onLoadHome}
            aria-label={`Go to ${label} home`}
            title="Home"
          >
            <IconHome />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onOpenExternal}
            aria-label={`Open ${label} in your browser`}
            title="Open in your browser"
          >
            <IconExternal />
          </button>
        </div>
      </header>

      <div className={styles.surface} ref={setSurface}>
        {isFailed || isBlocked ? (
          <div className={styles.fallback} role="alert">
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                {isBlocked ? `${label} kept reloading` : `${label} didn't load here`}
              </h2>
              <p className={styles.cardText}>
                {state.detail ||
                  (isBlocked
                    ? 'Automatic reloading was stopped to protect your account. Open it in your browser, or try again.'
                    : 'The page could not be displayed in the embedded view. Try again, or open it in your browser.')}
              </p>
              <div className={styles.cardActions}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={isBlocked ? onLoadHome : onReload}
                >
                  Try again
                </Button>
                <Button variant="secondary" size="sm" onClick={onOpenExternal}>
                  Open in browser
                </Button>
              </div>
            </div>
          </div>
        ) : isExternal ? (
          <div className={styles.fallback}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{label} opened in your browser</h2>
              <p className={styles.cardText}>
                {state.detail ||
                  `${label} is now open in your default browser. You can bring it back into this panel at any time.`}
              </p>
              <div className={styles.cardActions}>
                <Button variant="primary" size="sm" onClick={onLoadHome}>
                  Show it here again
                </Button>
                <Button variant="secondary" size="sm" onClick={onOpenExternal}>
                  Open in browser
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
