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

/**
 * Pushes to Firestore and reports to the status bar either way. Returns the error message on
 * failure (instead of swallowing it) so callers like updateSettings() can also surface it
 * somewhere the user is actually already looking — the status bar toast alone auto-dismisses
 * in a few seconds and was easy to miss, which is how a cloud sync could keep failing
 * silently across multiple saves without ever being noticed.
 */
async function syncToCloud(settings: AppSettings): Promise<string | null> {
  const uid = activeUid()
  if (!uid) return null
  try {
    await pushRemoteSettings(uid, settings)
    useStatusStore.getState().setSuccess('Synced settings to cloud')
    return null
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cloud sync failed'
    useStatusStore.getState().setError(`Cloud sync failed: ${message}`)
    return message
  }
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

  // Hardened to always reach status: 'ready', no matter what fails along the way — this used
  // to leave status pinned at 'loading' forever (a permanent blank screen with no way out,
  // not even a refresh) if, say, writeLocalSettings() threw because storage was full or
  // disabled. A stuck loading screen after signing in looks indistinguishable from "sign-in
  // doesn't work" even though auth itself succeeded.
  init: async () => {
    set({ status: 'loading' })
    const uid = activeUid()
    let loaded: AppSettings | null = null

    if (uid) {
      try {
        loaded = await fetchRemoteSettings(uid)
      } catch (err) {
        // Falls back to whatever's cached locally below, but surface *why* — a silent
        // swallow here is exactly how a Firestore rules/permission problem goes unnoticed
        // until data looks like it vanished.
        const message = err instanceof Error ? err.message : 'Could not reach Firestore'
        useStatusStore.getState().setError(`Could not load cloud settings: ${message}`)
      }
    }

    if (!loaded) {
      try {
        loaded = readLocalSettings()
      } catch {
        // readLocalSettings already guards internally; this is just extra defense.
      }
    }

    const resolved = migrateSettings(loaded ?? {})

    try {
      writeLocalSettings(resolved)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      useStatusStore
        .getState()
        .setError(`Could not save settings locally (storage may be full or disabled): ${message}`)
    }

    set({ status: 'ready', settings: resolved })
  },

  updateSettings: async (settings) => {
    writeLocalSettings(settings)
    set({ settings })
    // Local save already succeeded and is reflected above either way — but still throw on a
    // cloud failure so it reaches whichever UI called this (e.g. SettingsModal's own inline
    // error), not just the auto-dismissing status bar toast.
    const cloudError = await syncToCloud(settings)
    if (cloudError) throw new Error(`Saved locally, but cloud sync failed: ${cloudError}`)
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

  // Deliberately does NOT clear the local cache: cloud sync can fail silently (e.g. Firestore
  // rules not matching), and wiping the only remaining copy on every sign-out turned that into
  // guaranteed data loss — you'd have to re-enter your GitHub token on every sign-in. The local
  // cache is only ever overwritten by a *successful* fetch in init(), never blindly discarded.
  clearSession: () => {
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
