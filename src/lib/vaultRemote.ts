import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { AppSettings } from '../types'

/**
 * Mirrors this user's settings (GitHub token, workspaces, etc.) to Firestore under
 * `settings/{uid}`. No client-side encryption on top: Firestore encrypts data at rest and
 * `firestore.rules` restricts each doc to its own signed-in uid, which is the actual access
 * control here, not a passphrase-derived key.
 */
function settingsDocRef(uid: string) {
  if (!db) throw new Error('Firebase is not configured')
  return doc(db, 'settings', uid)
}

export async function fetchRemoteSettings(uid: string): Promise<AppSettings | null> {
  const snap = await getDoc(settingsDocRef(uid))
  return snap.exists() ? (snap.data() as AppSettings) : null
}

export async function pushRemoteSettings(uid: string, settings: AppSettings): Promise<void> {
  await setDoc(settingsDocRef(uid), settings)
}

export async function deleteRemoteSettings(uid: string): Promise<void> {
  await deleteDoc(settingsDocRef(uid))
}
