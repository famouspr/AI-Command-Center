import styles from './PromptComposer.module.css'
import Button from './ui/Button'
import { TEMPLATES, getTemplateMeta } from '../lib/promptTemplates'
import type { PromptComposerProps } from '../types'

/**
 * Presentational prompt editor: pick a relay template, edit the composed text,
 * then apply the template or copy the result. All state lives in the parent;
 * this component only renders and emits the supplied callbacks.
 */
export default function PromptComposer({
  value,
  templateId,
  onChange,
  onTemplateChange,
  onApplyTemplate,
  onCopy
}: PromptComposerProps): JSX.Element {
  const description = getTemplateMeta(templateId).description

  return (
    <section className={styles.composer} aria-label="Prompt composer">
      <span className={styles.caption}>Prompt</span>

      <div className={styles.segmented} role="group" aria-label="Prompt template">
        {TEMPLATES.map((meta) => {
          const active = meta.id === templateId
          return (
            <button
              key={meta.id}
              type="button"
              className={styles.segment}
              data-active={active || undefined}
              aria-pressed={active}
              title={meta.label}
              onClick={() => onTemplateChange(meta.id)}
            >
              {meta.short ?? meta.label}
            </button>
          )
        })}
      </div>

      {description ? <p className={styles.help}>{description}</p> : null}

      <textarea
        className={styles.textarea}
        value={value}
        spellCheck={false}
        placeholder="Compose or paste the prompt to relay…"
        aria-label="Prompt text"
        onChange={(e) => onChange(e.target.value)}
      />

      <div className={styles.footer}>
        <span className={styles.count}>{value.length + ' chars'}</span>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={onApplyTemplate}>
            Apply template
          </Button>
          <Button variant="ghost" size="sm" onClick={onCopy}>
            Copy
          </Button>
        </div>
      </div>
    </section>
  )
}
