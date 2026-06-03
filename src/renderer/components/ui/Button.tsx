/**
 * Button — the single button primitive used across the app.
 * Presentational, prop-driven, and a real native <button> so it stays
 * keyboard-accessible and inherits focus-visible rings from the design system.
 */
import React from 'react'
import type { ButtonProps } from '../../types'
import styles from './Button.module.css'

function Button({
  variant = 'secondary',
  size = 'md',
  iconLeft,
  block = false,
  loading = false,
  type,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    block ? styles.block : '',
    loading ? styles.loading : '',
    className ?? ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        iconLeft != null && (
          <span className={styles.icon} aria-hidden="true">
            {iconLeft}
          </span>
        )
      )}
      {children != null && <span className={styles.label}>{children}</span>}
    </button>
  )
}

export default Button
