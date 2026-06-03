import { useMemo } from 'react'
import styles from './ControlPanel.module.css'
import Button from './ui/Button'
import PromptComposer from './PromptComposer'
import { RELAY_STAGE_LABEL, type ControlPanelProps, type RelayStage } from '../types'

/**
 * Identifiers for the next-step hint surfaced only in assisted workflow mode.
 * In manual mode no hint is highlighted.
 */
type HintTarget =
  | 'prepare-chatgpt'
  | 'prepare-claude'
  | 'send-chatgpt'
  | 'capture-chatgpt'
  | 'use-chatgpt'
  | 'send-claude'
  | 'capture-claude'
  | 'use-claude'
  | 'prepare-review'

/** Map the advisory relay stage to the single next logical action to nudge. */
const NEXT_HINT: Record<RelayStage, HintTarget> = {
  compose: 'prepare-chatgpt',
  'sent-to-chatgpt': 'capture-chatgpt',
  'captured-chatgpt': 'use-chatgpt',
  'sent-to-claude': 'capture-claude',
  'captured-claude': 'use-claude',
  review: 'prepare-review'
}

export default function ControlPanel(props: ControlPanelProps): JSX.Element {
  const {
    ui,
    project,
    workflowMode,
    onTaskChange,
    onComposerChange,
    onTemplateChange,
    onApplyTemplate,
    onCopyComposer,
    onPrepare,
    onSend,
    onResponseChange,
    onUseResponse,
    onCopyLastResponse,
    onSaveProjectFile
  } = props

  const assisted = workflowMode === 'assisted'
  const hint = useMemo<HintTarget | null>(
    () => (assisted ? NEXT_HINT[ui.stage] : null),
    [assisted, ui.stage]
  )

  const ringClass = (target: HintTarget): string | undefined =>
    hint === target ? styles.hint : undefined

  const noProject = project === null

  return (
    <section className={styles.panel} aria-label="Control">
      {/* (1) Header ------------------------------------------------------- */}
      <header className={styles.header}>
        <h2 className={styles.title}>Control</h2>
        <span className={styles.stagePill} title="Current relay stage (advisory)">
          {RELAY_STAGE_LABEL[ui.stage]}
        </span>
      </header>

      {/* (2) Master task -------------------------------------------------- */}
      <section className={styles.section}>
        <p className={styles.caption}>Master task</p>
        <textarea
          className={styles.taskInput}
          value={ui.task}
          onChange={(e) => onTaskChange(e.target.value)}
          placeholder="Describe the task you want ChatGPT and Claude to work on together."
          spellCheck={false}
          rows={3}
        />
      </section>

      <hr className={styles.divider} />

      {/* (3) Prompt composer --------------------------------------------- */}
      <section className={styles.section}>
        <PromptComposer
          value={ui.composer}
          templateId={ui.activeTemplate}
          onChange={onComposerChange}
          onTemplateChange={onTemplateChange}
          onApplyTemplate={onApplyTemplate}
          onCopy={onCopyComposer}
        />
      </section>

      <hr className={styles.divider} />

      {/* (4) Relay actions ------------------------------------------------ */}
      <section className={styles.section}>
        <p className={styles.caption}>Relay</p>

        <div className={styles.btnRow}>
          <Button
            variant="secondary"
            size="sm"
            block
            className={ringClass('prepare-chatgpt')}
            onClick={() => onPrepare('chatgpt')}
          >
            Prepare for ChatGPT
          </Button>
          <Button
            variant="secondary"
            size="sm"
            block
            className={ringClass('prepare-claude')}
            onClick={() => onPrepare('claude')}
          >
            Prepare for Claude
          </Button>
          <Button
            variant="secondary"
            size="sm"
            block
            className={ringClass('prepare-review')}
            onClick={() => onPrepare('review')}
          >
            Review &rarr; ChatGPT
          </Button>
        </div>

        <div className={styles.btnRowTwo}>
          <Button
            variant="primary"
            block
            className={ringClass('send-chatgpt')}
            onClick={() => onSend('chatgpt')}
          >
            Send to ChatGPT
          </Button>
          <Button
            variant="primary"
            block
            className={ringClass('send-claude')}
            onClick={() => onSend('claude')}
          >
            Send to Claude
          </Button>
        </div>

        <Button variant="ghost" block onClick={onCopyLastResponse}>
          Copy last response
        </Button>

        <p className={styles.note}>
          Send inserts the prompt into that panel&rsquo;s composer for you to review, then
          press Enter. If the box can&rsquo;t be found, it falls back to the clipboard.
        </p>
      </section>

      <hr className={styles.divider} />

      {/* (5) Capture ------------------------------------------------------ */}
      <section className={styles.section}>
        <p className={styles.caption}>Capture</p>

        <div className={styles.captureBlock}>
          <label className={styles.fieldLabel} htmlFor="cp-chatgpt-response">
            ChatGPT response
          </label>
          <textarea
            id="cp-chatgpt-response"
            className={`${styles.responseInput} ${ringClass('capture-chatgpt') ?? ''}`}
            value={ui.chatgptResponse}
            onChange={(e) => onResponseChange('chatgpt', e.target.value)}
            placeholder="Paste ChatGPT's reply here to capture it."
            spellCheck={false}
            rows={4}
          />
          <div className={styles.captureAction}>
            <Button
              variant="secondary"
              size="sm"
              className={ringClass('use-chatgpt')}
              onClick={() => onUseResponse('chatgpt')}
            >
              Use as input &rarr; Claude
            </Button>
          </div>
        </div>

        <div className={styles.captureBlock}>
          <label className={styles.fieldLabel} htmlFor="cp-claude-response">
            Claude response
          </label>
          <textarea
            id="cp-claude-response"
            className={`${styles.responseInput} ${ringClass('capture-claude') ?? ''}`}
            value={ui.claudeResponse}
            onChange={(e) => onResponseChange('claude', e.target.value)}
            placeholder="Paste Claude's reply here to capture it."
            spellCheck={false}
            rows={4}
          />
          <div className={styles.captureAction}>
            <Button
              variant="secondary"
              size="sm"
              className={ringClass('use-claude')}
              onClick={() => onUseResponse('claude')}
            >
              Use as input &rarr; Review
            </Button>
          </div>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* (6) Save to project --------------------------------------------- */}
      <section className={styles.section}>
        <p className={styles.caption}>Save to project</p>
        <div className={styles.btnRowTwo}>
          <Button
            variant="secondary"
            block
            disabled={noProject}
            title={noProject ? 'Choose a project folder first' : undefined}
            onClick={() => onSaveProjectFile('TASKS.md')}
          >
            Save to TASKS.md
          </Button>
          <Button
            variant="secondary"
            block
            disabled={noProject}
            title={noProject ? 'Choose a project folder first' : undefined}
            onClick={() => onSaveProjectFile('DECISIONS.md')}
          >
            Save to DECISIONS.md
          </Button>
        </div>
        {noProject && (
          <p className={styles.hintText}>Choose a project folder to enable saving.</p>
        )}
      </section>
    </section>
  )
}
