import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_SETTINGS, type Settings } from '../shared/types'

/**
 * Minimal, dependency-free JSON settings store persisted to the OS userData
 * directory. Reads/writes are synchronous — the payload is tiny.
 */
export class SettingsStore {
  private readonly file: string
  private cache: Settings

  constructor() {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.file = join(dir, 'settings.json')
    this.cache = this.read()
  }

  private read(): Settings {
    try {
      if (!existsSync(this.file)) return { ...DEFAULT_SETTINGS }
      const raw = JSON.parse(readFileSync(this.file, 'utf-8')) as Partial<Settings>
      return { ...DEFAULT_SETTINGS, ...raw }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  get(): Settings {
    return { ...this.cache }
  }

  set(patch: Partial<Settings>): Settings {
    this.cache = { ...this.cache, ...patch }
    try {
      writeFileSync(this.file, JSON.stringify(this.cache, null, 2), 'utf-8')
    } catch {
      // Persisting settings is best-effort; keep the in-memory cache regardless.
    }
    return this.get()
  }
}
