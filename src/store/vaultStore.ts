import { create } from 'zustand'
import { decryptJSON, encryptJSON } from '../lib/crypto'
import {
  clearVault,
  hasStoredVault,
  readVaultBlob,
  writeVaultBlob,
} from '../lib/vaultStorage'
import { useEditorStore } from './editorStore'
import { useRepoStore } from './repoStore'
import type { AppSettings } from '../types'

export type VaultStatus = 'checking' | 'no-vault' | 'locked' | 'unlocked'

interface VaultState {
  status: VaultStatus
  settings: AppSettings | null
  passphrase: string | null
  error: string | null
  init: () => void
  setupVault: (passphrase: string, settings: AppSettings) => Promise<void>
  unlock: (passphrase: string) => Promise<void>
  updateSettings: (settings: AppSettings) => Promise<void>
  lock: () => void
  logout: () => void
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: 'checking',
  settings: null,
  passphrase: null,
  error: null,

  init: () => {
    set({ status: hasStoredVault() ? 'locked' : 'no-vault', error: null })
  },

  setupVault: async (passphrase, settings) => {
    const blob = await encryptJSON(settings, passphrase)
    writeVaultBlob(blob)
    set({ status: 'unlocked', settings, passphrase, error: null })
  },

  unlock: async (passphrase) => {
    const blob = readVaultBlob()
    if (!blob) {
      set({ status: 'no-vault' })
      return
    }
    try {
      const settings = await decryptJSON<AppSettings>(blob, passphrase)
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
    set({ settings })
  },

  lock: () => {
    set({ status: 'locked', settings: null, passphrase: null, error: null })
  },

  /** Wipes the encrypted vault from this browser entirely (GitHub token, repo, everything). */
  logout: () => {
    clearVault()
    useRepoStore.getState().reset()
    useEditorStore.getState().reset()
    set({ status: 'no-vault', settings: null, passphrase: null, error: null })
  },
}))
