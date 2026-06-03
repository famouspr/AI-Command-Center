/**
 * ToastHost — fixed bottom-center stack of transient notifications.
 * Stateless and prop-driven: App.tsx owns the toast queue and dismissal
 * timers; this only renders the cards. Clicking a card dismisses it.
 */
import React from 'react'
import type { ToastKind, ToastHostProps } from '../../types'
import styles from './Toast.module.css'

const KIND_CLASS: Record<ToastKind, string> = {
  info: styles.info,
  success: styles.success,
  warn: styles.warn,
  error: styles.error
}

function ToastHost({ toasts, onDismiss }: ToastHostProps): React.JSX.Element {
  return (
    <div className={styles.host} role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={[styles.toast, KIND_CLASS[toast.kind]].join(' ')}
          onClick={() => onDismiss(toast.id)}
          title="Dismiss"
        >
          <span className={styles.bar} aria-hidden="true" />
          <span className={styles.text}>{toast.text}</span>
        </button>
      ))}
    </div>
  )
}

export { ToastHost }
