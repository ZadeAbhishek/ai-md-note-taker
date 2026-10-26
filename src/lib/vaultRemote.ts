import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { EncryptedBlob } from '../types'

/**
 * Mirrors the exact same encrypted blob that's in localStorage (see vaultStorage.ts) under
 * `vaults/{uid}`. Firestore only ever sees ciphertext — the passphrase that decrypts it never
 * leaves this browser, so this adds cross-device sync without weakening the zero-knowledge
 * design of the local vault.
 */
function vaultDocRef(uid: string) {
  if (!db) throw new Error('Firebase is not configured')
  return doc(db, 'vaults', uid)
}

export async function fetchRemoteVault(uid: string): Promise<EncryptedBlob | null> {
  const snap = await getDoc(vaultDocRef(uid))
  return snap.exists() ? (snap.data() as EncryptedBlob) : null
}

export async function pushRemoteVault(uid: string, blob: EncryptedBlob): Promise<void> {
  await setDoc(vaultDocRef(uid), blob)
}

export async function deleteRemoteVault(uid: string): Promise<void> {
  await deleteDoc(vaultDocRef(uid))
}
