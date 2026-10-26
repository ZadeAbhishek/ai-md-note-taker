export interface RepoRef {
  owner: string
  name: string
  branch: string
}

export interface AppSettings {
  githubToken: string
  repo: RepoRef | null
  /** Seconds of inactivity after an edit before it auto-saves. */
  autoSaveDelaySeconds?: number
  /** Seconds between automatic background file-tree refreshes. 0 or unset disables it. */
  autoSyncIntervalSeconds?: number
}

export const DEFAULT_AUTO_SAVE_DELAY_SECONDS = 10
export const DEFAULT_AUTO_SYNC_INTERVAL_SECONDS = 0

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
