/**
 * Thin, safe wrapper over `window.api` for project memory files.
 *
 * Both helpers funnel through the typed IPC bridge and normalise any thrown
 * error into the standard `IpcErr` envelope, so callers can rely on a single
 * `IpcResult` shape and never need their own try/catch around the bridge.
 */
import {
  PROJECT_FILES,
  type IpcResult,
  type ProjectFileName
} from '../../shared/types'

export { PROJECT_FILES }

/**
 * Append `content` to the named project memory file.
 * Returns the standard IPC envelope; never throws.
 */
export async function saveEntry(
  name: ProjectFileName,
  content: string
): Promise<IpcResult<{ path: string }>> {
  try {
    return await window.api.appendProjectFile(name, content)
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * Read the full text of the named project memory file.
 * Returns the standard IPC envelope; never throws.
 */
export async function readEntry(
  name: ProjectFileName
): Promise<IpcResult<string>> {
  try {
    return await window.api.readProjectFile(name)
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
