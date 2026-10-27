import type { AppSettings } from '../types'

// New key: the previous "md-note-taker.vault" held a passphrase-encrypted blob from before
// client-side encryption was removed in favor of Firebase Auth + Firestore's own access
// control and encryption-at-rest. That old key is simply left orphaned, not migrated — it
// can no longer be decrypted without the passphrase prompt that used to ask for it.
const STORAGE_KEY = 'vibe-md.settings'

export function readLocalSettings(): AppSettings | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AppSettings
  } catch {
    return null
  }
}

export function writeLocalSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function clearLocalSettings(): void {
  localStorage.removeItem(STORAGE_KEY)
}
