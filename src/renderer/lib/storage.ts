/**
 * Persists the renderer UI working-state to localStorage so a page reload does
 * not lose in-progress work (the typed task, the composed prompt, captured
 * responses, and the advisory relay stage). Dependency-free and defensive: any
 * storage, parse, or serialization failure degrades gracefully to defaults.
 */
import type { UiState } from '../types'

/** localStorage key. Versioned so the schema can evolve without clashes. */
const STORAGE_KEY = 'acc.ui.v1'

/** The pristine working state used on first run and whenever load fails. */
export const DEFAULT_UI: UiState = {
  task: '',
  composer: '',
  activeTemplate: 'chatgpt-director',
  chatgptResponse: '',
  claudeResponse: '',
  stage: 'compose'
}

/**
 * Reads the persisted UI state. Returns a fresh object every call so callers
 * can freely mutate or spread the result. Unknown/missing fields fall back to
 * their defaults; any error (no localStorage, malformed JSON) yields defaults.
 */
export function loadUiState(): UiState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw == null) return { ...DEFAULT_UI }
    const parsed = JSON.parse(raw) as Partial<UiState> | null
    if (parsed == null || typeof parsed !== 'object') {
      return { ...DEFAULT_UI }
    }
    return { ...DEFAULT_UI, ...parsed }
  } catch {
    return { ...DEFAULT_UI }
  }
}

/**
 * Writes the UI state to localStorage. Serialization and quota failures are
 * swallowed so persistence is never able to interrupt the user's session.
 */
export function saveUiState(state: UiState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / serialization errors — persistence is best-effort */
  }
}
