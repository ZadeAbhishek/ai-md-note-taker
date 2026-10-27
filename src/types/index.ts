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

/** Fills in defaults for any fields missing from a settings object (old shape, fresh account, etc). */
export function migrateSettings(raw: Partial<AppSettings> & { repo?: RepoRef | null }): AppSettings {
  const workspaces = raw.workspaces ?? (raw.repo ? [{ id: crypto.randomUUID(), ...raw.repo }] : [])
  return {
    githubToken: raw.githubToken ?? '',
    workspaces,
    activeWorkspaceId: raw.activeWorkspaceId ?? workspaces[0]?.id ?? null,
    autoSaveDelaySeconds: raw.autoSaveDelaySeconds ?? DEFAULT_AUTO_SAVE_DELAY_SECONDS,
    autoSyncIntervalSeconds: raw.autoSyncIntervalSeconds ?? DEFAULT_AUTO_SYNC_INTERVAL_SECONDS,
  }
}

export function emptySettings(): AppSettings {
  return {
    githubToken: '',
    workspaces: [],
    activeWorkspaceId: null,
    autoSaveDelaySeconds: DEFAULT_AUTO_SAVE_DELAY_SECONDS,
    autoSyncIntervalSeconds: DEFAULT_AUTO_SYNC_INTERVAL_SECONDS,
  }
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
