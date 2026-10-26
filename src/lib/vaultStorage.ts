import type { EncryptedBlob } from '../types'

const STORAGE_KEY = 'md-note-taker.vault'

export function hasStoredVault(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

export function readVaultBlob(): EncryptedBlob | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return JSON.parse(raw) as EncryptedBlob
}

export function writeVaultBlob(blob: EncryptedBlob): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob))
}

export function clearVault(): void {
  localStorage.removeItem(STORAGE_KEY)
}
