/**
 * StatusDot — an 8px coloured dot that mirrors a view/connection status.
 * Optionally renders a short muted text label. Color and label are derived
 * purely from the `status` prop so callers stay declarative.
 */
import React from 'react'
import type { StatusDotProps } from '../../types'
import styles from './StatusDot.module.css'

type DotStatus = StatusDotProps['status']

const TONE: Record<DotStatus, string> = {
  loading: styles.loading,
  ready: styles.ready,
  ok: styles.ready,
  failed: styles.danger,
  blocked: styles.danger,
  external: styles.external,
  idle: styles.idle
}

const LABEL: Record<DotStatus, string> = {
  loading: 'Loading',
  ready: 'Ready',
  ok: 'Ready',
  failed: 'Offline',
  blocked: 'Blocked',
  external: 'External',
  idle: 'Idle'
}

function StatusDot({
  status,
  title,
  withLabel = false
}: StatusDotProps): React.JSX.Element {
  const label = LABEL[status]
  const tooltip = title ?? label

  return (
    <span className={styles.root} title={tooltip}>
      <span
        className={[styles.dot, TONE[status]].join(' ')}
        role="img"
        aria-label={tooltip}
      />
      {withLabel && <span className={styles.label}>{label}</span>}
    </span>
  )
}

export default StatusDot
