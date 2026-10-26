export interface RepoRef {
  owner: string
  name: string
  branch: string
}

export interface Workspace extends RepoRef {
  id: string
}

export interface AppSettings {
  githubToken: string
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  /** Seconds of inactivity after an edit before it auto-saves. */
  autoSaveDelaySeconds?: number
  /** Seconds between automatic background file-tree refreshes. 0 or unset disables it. */
  autoSyncIntervalSeconds?: number
}

export const DEFAULT_AUTO_SAVE_DELAY_SECONDS = 10
export const DEFAULT_AUTO_SYNC_INTERVAL_SECONDS = 0

/** The repo backing the currently active workspace, or null if there isn't one yet. */
export function getActiveRepo(settings: AppSettings | null): RepoRef | null {
  if (!settings) return null
  return settings.workspaces.find((w) => w.id === settings.activeWorkspaceId) ?? null
}

/**
 * Settings encrypted before multi-repo support only had a single `repo` field. Called once on
 * unlock so an existing local vault keeps working as a one-workspace setup instead of breaking.
 */
export function migrateSettings(
  raw: AppSettings & { repo?: RepoRef | null },
): AppSettings {
  if (raw.workspaces) return raw
  const workspaces: Workspace[] = raw.repo ? [{ id: crypto.randomUUID(), ...raw.repo }] : []
  return {
    githubToken: raw.githubToken,
    workspaces,
    activeWorkspaceId: workspaces[0]?.id ?? null,
    autoSaveDelaySeconds: raw.autoSaveDelaySeconds,
    autoSyncIntervalSeconds: raw.autoSyncIntervalSeconds,
  }
}

export interface EncryptedBlob {
  salt: string
  iv: string
  ciphertext: string
}

export interface FileNode {
  path: string
  name: string
  type: 'file' | 'dir'
  children?: FileNode[]
}

export interface OpenFile {
  path: string
  content: string
  /** Content as of the last load/save, for a real content-diff check before ever committing. */
  savedContent: string
  sha: string
  dirty: boolean
}
