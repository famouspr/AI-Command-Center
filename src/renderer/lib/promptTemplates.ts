import type { TemplateId, ViewId } from '../../shared/types'

/**
 * Metadata describing a single relay prompt template. Purely declarative — the
 * renderer uses these entries to label buttons, route the composed prompt to a
 * target view, and explain the step to the user.
 */
export interface TemplateMeta {
  id: TemplateId
  label: string
  short: string
  target: ViewId
  description: string
}

/**
 * The three relay templates, in the order they are used across a round trip:
 * direct ChatGPT, hand the instructions to Claude, then send the result back to
 * ChatGPT for review.
 */
export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'chatgpt-director',
    label: 'Director -> ChatGPT',
    short: 'ChatGPT',
    target: 'chatgpt',
    description: 'Turn the task into clear Claude Code implementation instructions.'
  },
  {
    id: 'claude-engineer',
    label: 'Engineer -> Claude',
    short: 'Claude',
    target: 'claude',
    description: 'Have Claude Code implement the instructions safely in the local repo.'
  },
  {
    id: 'review-back',
    label: 'Review -> ChatGPT',
    short: 'Review',
    target: 'chatgpt',
    description: "Send Claude's result back to ChatGPT for review and the next instruction."
  }
]

/**
 * Resolve a template's metadata by id, falling back to the first entry when the
 * id is unknown. Never throws.
 */
export function getTemplateMeta(id: TemplateId): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}

/**
 * Context supplied when formatting a prompt. All fields are optional; missing or
 * blank values are replaced with explicit placeholders so the output is always
 * complete and unambiguous.
 */
export interface FormatArgs {
  task?: string
  chatgptResponse?: string
  claudeResponse?: string
  projectName?: string
}

const BASE_TEXT: Record<TemplateId, string> = {
  'chatgpt-director':
    'You are acting as director/reviewer. Analyze this task and produce clear Claude Code implementation instructions. Preserve existing functionality. Include files likely to change, risks, test steps, and a concise completion checklist.',
  'claude-engineer':
    'You are Claude Code acting as implementation engineer. Follow these instructions carefully. Make changes in the local repo only. Preserve existing behavior unless explicitly asked. After completion, return changed files, commands run, test results, risks, and next steps.',
  'review-back':
    "Review this Claude Code result. Identify issues, missing tests, regressions, security concerns, and the next best instruction to send back to Claude."
}

function clean(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

interface Section {
  heading: string
  body: string
}

function renderSections(base: string, sections: Section[]): string {
  const blocks = sections.map((s) => `## ${s.heading}\n${s.body}`)
  return [base, ...blocks].join('\n\n')
}

/**
 * Build a clean markdown prompt for the given template: the template's base
 * instruction followed by labeled context sections. Inputs are trimmed and
 * blank values are replaced with descriptive placeholders. Pure and never
 * throws.
 */
export function formatPrompt(id: TemplateId, args: FormatArgs): string {
  const meta = getTemplateMeta(id)
  const base = BASE_TEXT[meta.id]

  const task = clean(args.task) || '(no task entered yet)'
  const projectName = clean(args.projectName)

  if (meta.id === 'claude-engineer') {
    const instructions =
      clean(args.chatgptResponse) ||
      "(paste ChatGPT's instructions here — none captured yet)"
    return renderSections(base, [
      { heading: 'Implementation instructions (from ChatGPT)', body: instructions },
      { heading: 'Original task', body: task }
    ])
  }

  if (meta.id === 'review-back') {
    const result =
      clean(args.claudeResponse) ||
      "(paste Claude's result here — none captured yet)"
    return renderSections(base, [
      { heading: "Claude's result", body: result },
      { heading: 'Original task', body: task }
    ])
  }

  // chatgpt-director (and the fallback default)
  const sections: Section[] = [{ heading: 'Master task', body: task }]
  if (projectName) {
    sections.push({ heading: 'Project', body: projectName })
  }
  return renderSections(base, sections)
}
