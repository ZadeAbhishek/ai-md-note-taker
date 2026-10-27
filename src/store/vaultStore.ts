import { create } from 'zustand'
import { clearLocalSettings, readLocalSettings, writeLocalSettings } from '../lib/vaultStorage'
import { deleteRemoteSettings, fetchRemoteSettings, pushRemoteSettings } from '../lib/vaultRemote'
import { useAuthStore } from './authStore'
import { useEditorStore } from './editorStore'
import { useRepoStore } from './repoStore'
import { useStatusStore } from './statusStore'
import { emptySettings, migrateSettings } from '../types'
import type { AppSettings, RepoRef } from '../types'

export type VaultStatus = 'loading' | 'ready'

function activeUid(): string | null {
  return useAuthStore.getState().user?.uid ?? null
}

/** Fire-and-forget push to Firestore — never blocks or fails the local save. */
function syncToCloud(settings: AppSettings) {
  const uid = activeUid()
  if (!uid) return
  pushRemoteSettings(uid, settings)
    .then(() => useStatusStore.getState().setSuccess('Synced settings to cloud'))
    .catch((err) => {
      const message = err instanceof Error ? err.message : 'Cloud sync failed'
      useStatusStore.getState().setError(`Cloud sync failed: ${message}`)
    })
}

interface VaultState {
  status: VaultStatus
  settings: AppSettings
  init: () => Promise<void>
  updateSettings: (settings: AppSettings) => Promise<void>
  addWorkspace: (repo: RepoRef) => Promise<string>
  removeWorkspace: (id: string) => Promise<void>
  setActiveWorkspace: (id: string) => Promise<void>
  /** Clears only this browser's in-memory/local view (used on sign-out) — cloud data is kept. */
  clearSession: () => void
  /** Erases settings from this browser AND the cloud. Destructive, used by the Reset button. */
  reset: () => void
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'loading',
  settings: emptySettings(),

  init: async () => {
    set({ status: 'loading' })
    const uid = activeUid()
    let loaded: AppSettings | null = null
    if (uid) {
      try {
        loaded = await fetchRemoteSettings(uid)
      } catch {
        // Offline or not permitted yet — fall back to whatever's cached locally below.
      }
    }
    if (!loaded) loaded = readLocalSettings()
    const resolved = migrateSettings(loaded ?? {})
    writeLocalSettings(resolved)
    set({ status: 'ready', settings: resolved })
  },

  updateSettings: async (settings) => {
    writeLocalSettings(settings)
    syncToCloud(settings)
    set({ settings })
  },

  addWorkspace: async (repo) => {
    const { settings, updateSettings } = get()
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
    if (settings.activeWorkspaceId === id) return
    useEditorStore.getState().reset()
    useRepoStore.getState().reset()
    await updateSettings({ ...settings, activeWorkspaceId: id })
  },

  clearSession: () => {
    clearLocalSettings()
    useRepoStore.getState().reset()
    useEditorStore.getState().reset()
    set({ status: 'loading', settings: emptySettings() })
  },

  reset: () => {
    clearLocalSettings()
    const uid = activeUid()
    if (uid) void deleteRemoteSettings(uid)
    useRepoStore.getState().reset()
    useEditorStore.getState().reset()
    set({ status: 'ready', settings: emptySettings() })
  },
}))
