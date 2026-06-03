import { dialog, shell, type BrowserWindow } from 'electron'
import { existsSync, mkdirSync, readFileSync, statSync, appendFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import {
  PROJECT_FILES,
  type IpcResult,
  type ProjectFileInfo,
  type ProjectFileName,
  type ProjectInfo
} from '../shared/types'
import type { SettingsStore } from './store'

const FILE_HEADERS: Record<ProjectFileName, string> = {
  'TASKS.md': '# Tasks\n\nMaster tasks and their relay history, newest entries appended below.\n',
  'DECISIONS.md': '# Decisions\n\nKey decisions captured during the ChatGPT ↔ Claude relay.\n',
  'AI_LOG.md': '# AI Activity Log\n\nExported activity timeline from AI Command Center.\n',
  'CLAUDE_PROMPTS.md': '# Claude Prompts\n\nPrompts prepared and sent to Claude.\n',
  'CHATGPT_PROMPTS.md': '# ChatGPT Prompts\n\nPrompts prepared and sent to ChatGPT.\n'
}

/**
 * Guards every filesystem write/read: only whitelisted filenames, and the
 * resolved path must stay directly inside the chosen project folder.
 */
export class ProjectFs {
  constructor(private store: SettingsStore) {}

  private get dir(): string | null {
    return this.store.get().defaultProjectPath
  }

  private safePath(name: ProjectFileName): IpcResult<string> {
    const dir = this.dir
    if (!dir) return { ok: false, error: 'No project folder selected.' }
    if (!PROJECT_FILES.includes(name)) {
      return { ok: false, error: `Refused to access non-whitelisted file: ${name}` }
    }
    const target = resolve(dir, name)
    if (dirname(target) !== resolve(dir)) {
      return { ok: false, error: 'Path traversal blocked.' }
    }
    return { ok: true, value: target }
  }

  info(dir: string | null = this.dir): ProjectInfo | null {
    if (!dir || !existsSync(dir)) return null
    const files: ProjectFileInfo[] = PROJECT_FILES.map((name) => {
      const p = join(dir, name)
      const exists = existsSync(p)
      return { name, exists, size: exists ? statSync(p).size : 0 }
    })
    return { path: dir, name: basename(dir) || dir, files }
  }

  async choose(win: BrowserWindow): Promise<IpcResult<ProjectInfo>> {
    const res = await dialog.showOpenDialog(win, {
      title: 'Choose project folder',
      properties: ['openDirectory', 'createDirectory']
    })
    if (res.canceled || res.filePaths.length === 0) {
      return { ok: false, error: 'Selection cancelled.' }
    }
    return this.open(res.filePaths[0])
  }

  open(dir: string): IpcResult<ProjectInfo> {
    try {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      this.store.set({ defaultProjectPath: dir })
      const info = this.info(dir)
      if (!info) return { ok: false, error: 'Folder is not accessible.' }
      return { ok: true, value: info }
    } catch (err) {
      return { ok: false, error: errMessage(err) }
    }
  }

  get(): IpcResult<ProjectInfo | null> {
    return { ok: true, value: this.info() }
  }

  append(name: ProjectFileName, content: string): IpcResult<{ path: string }> {
    const safe = this.safePath(name)
    if (!safe.ok) return safe
    try {
      const path = safe.value
      if (!existsSync(path)) writeFileSync(path, FILE_HEADERS[name], 'utf-8')
      const stamp = new Date().toISOString()
      appendFileSync(path, `\n## ${stamp}\n\n${content.trim()}\n`, 'utf-8')
      return { ok: true, value: { path } }
    } catch (err) {
      return { ok: false, error: errMessage(err) }
    }
  }

  read(name: ProjectFileName): IpcResult<string> {
    const safe = this.safePath(name)
    if (!safe.ok) return safe
    try {
      if (!existsSync(safe.value)) return { ok: true, value: '' }
      return { ok: true, value: readFileSync(safe.value, 'utf-8') }
    } catch (err) {
      return { ok: false, error: errMessage(err) }
    }
  }

  reveal(): void {
    const dir = this.dir
    if (dir && existsSync(dir)) shell.openPath(dir)
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
