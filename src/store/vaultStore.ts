import { create } from 'zustand'
import { decryptJSON, encryptJSON } from '../lib/crypto'
import {
  clearVault,
  hasStoredVault,
  readVaultBlob,
  writeVaultBlob,
} from '../lib/vaultStorage'
import { deleteRemoteVault, fetchRemoteVault, pushRemoteVault } from '../lib/vaultRemote'
import { useAuthStore } from './authStore'
import { useEditorStore } from './editorStore'
import { useRepoStore } from './repoStore'
import { useStatusStore } from './statusStore'
import { migrateSettings } from '../types'
import type { AppSettings, EncryptedBlob, RepoRef } from '../types'

export type VaultStatus = 'checking' | 'no-vault' | 'locked' | 'unlocked'

function activeUid(): string | null {
  return useAuthStore.getState().user?.uid ?? null
}

/** Fire-and-forget push to Firestore — never blocks or fails the local save. */
function syncToCloud(blob: EncryptedBlob) {
  const uid = activeUid()
  if (!uid) return
  pushRemoteVault(uid, blob)
    .then(() => useStatusStore.getState().setSuccess('Synced settings to cloud'))
    .catch((err) => {
      const message = err instanceof Error ? err.message : 'Cloud sync failed'
      useStatusStore.getState().setError(`Cloud sync failed: ${message}`)
    })
}

interface VaultState {
  status: VaultStatus
  settings: AppSettings | null
  passphrase: string | null
  error: string | null
  init: () => Promise<void>
  setupVault: (passphrase: string, settings: AppSettings) => Promise<void>
  unlock: (passphrase: string) => Promise<void>
  updateSettings: (settings: AppSettings) => Promise<void>
  addWorkspace: (repo: RepoRef) => Promise<string>
  removeWorkspace: (id: string) => Promise<void>
  setActiveWorkspace: (id: string) => Promise<void>
  lock: () => void
  logout: () => void
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'checking',
  settings: null,
  passphrase: null,
  error: null,

  init: async () => {
    set({ status: 'checking', error: null })
    const uid = activeUid()
    if (uid) {
      try {
        const remote = await fetchRemoteVault(uid)
        // Cloud is the cross-device source of truth once signed in: pull it down so this
        // browser's cache matches it before deciding no-vault vs. locked.
        if (remote) writeVaultBlob(remote)
      } catch {
        // Offline or no permission yet — fall back to whatever's cached locally.
      }
    }
    set({ status: hasStoredVault() ? 'locked' : 'no-vault' })
  },

  setupVault: async (passphrase, settings) => {
    const blob = await encryptJSON(settings, passphrase)
    writeVaultBlob(blob)
    syncToCloud(blob)
    set({ status: 'unlocked', settings, passphrase, error: null })
  },

  unlock: async (passphrase) => {
    const blob = readVaultBlob()
    if (!blob) {
      set({ status: 'no-vault' })
      return
    }
    try {
      const decrypted = await decryptJSON<AppSettings>(blob, passphrase)
      const settings = migrateSettings(decrypted)
      set({ status: 'unlocked', settings, passphrase, error: null })
    } catch {
      set({ error: 'Incorrect passphrase. Try again.' })
    }
  },

  updateSettings: async (settings) => {
    const { passphrase } = get()
    if (!passphrase) throw new Error('Vault is locked')
    const blob = await encryptJSON(settings, passphrase)
    writeVaultBlob(blob)
    syncToCloud(blob)
    set({ settings })
  },

  addWorkspace: async (repo) => {
    const { settings, updateSettings } = get()
    if (!settings) throw new Error('Vault is locked')
    const id = crypto.randomUUID()
    const workspaces = [...settings.workspaces, { id, ...repo }]
    await updateSettings({
      ...settings,
      workspaces,
      activeWorkspaceId: settings.activeWorkspaceId ?? id,
    })
    return id
  },

  removeWorkspace: async (id) => {
    const { settings, updateSettings } = get()
    if (!settings) throw new Error('Vault is locked')
    const workspaces = settings.workspaces.filter((w) => w.id !== id)
    const wasActive = settings.activeWorkspaceId === id
    if (wasActive) {
      useEditorStore.getState().reset()
      useRepoStore.getState().reset()
    }
    await updateSettings({
      ...settings,
      workspaces,
      activeWorkspaceId: wasActive ? workspaces[0]?.id ?? null : settings.activeWorkspaceId,
    })
  },

  setActiveWorkspace: async (id) => {
    const { settings, updateSettings } = get()
    if (!settings || settings.activeWorkspaceId === id) return
    useEditorStore.getState().reset()
    useRepoStore.getState().reset()
    await updateSettings({ ...settings, activeWorkspaceId: id })
  },

  lock: () => {
    set({ status: 'locked', settings: null, passphrase: null, error: null })
  },

  /** Wipes the encrypted vault everywhere: this browser's cache and the cloud copy. */
  logout: () => {
    clearVault()
    const uid = activeUid()
    if (uid) void deleteRemoteVault(uid)
    useRepoStore.getState().reset()
    useEditorStore.getState().reset()
    set({ status: 'no-vault', settings: null, passphrase: null, error: null })
  },
}))
