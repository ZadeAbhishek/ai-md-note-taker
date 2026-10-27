import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { create } from 'zustand'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { useStatusStore } from './statusStore'
import { useVaultStore } from './vaultStore'

interface AuthState {
  user: User | null
  initializing: boolean
  error: string | null
  init: () => void
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOutUser: () => Promise<void>
}

function describeError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback
  const code = (err as { code?: string }).code
  return code ? `${err.message} (code: ${code})` : err.message
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: isFirebaseConfigured,
  error: null,

  init: () => {
    if (!auth) return
    onAuthStateChanged(auth, (user) => {
      set({ user, initializing: false })
    })
  },

  // Uses signInWithPopup, not signInWithRedirect: redirect was tried as a fix for the popup's
  // COOP "window.closed"/frame-access warnings below, but on localhost it failed in a worse
  // way — the round trip to Google completed fine, but getRedirectResult() came back empty on
  // return (the redirect flow's result handshake is more sensitive to third-party storage
  // restrictions than popup is), landing back on the sign-in screen every time. The COOP
  // warnings popup logs are noisy but don't actually break sign-in here — onAuthStateChanged
  // still picks up a successful popup sign-in regardless of whether the popup's own
  // close-detection polling throws.
  signInWithGoogle: async () => {
    if (!auth) return
    set({ error: null })
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (err) {
      set({ error: describeError(err, 'Sign-in failed') })
    }
  },

  signInWithEmail: async (email, password) => {
    if (!auth) return
    set({ error: null })
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      set({ error: describeError(err, 'Sign-in failed') })
    }
  },

  signUpWithEmail: async (email, password) => {
    if (!auth) return
    set({ error: null })
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (err) {
      set({ error: describeError(err, 'Sign-up failed') })
    }
  },

  // Named signOutUser (not signOut) to avoid shadowing the imported firebase/auth signOut.
  signOutUser: async () => {
    if (!auth) return
    set({ error: null })
    try {
      // Confirm the actual sign-out first. Clearing the local vault view *before* this could
      // succeed was leaving the app stuck on a permanent blank screen (vault status pinned at
      // "loading" with nothing left to move it out) whenever firebaseSignOut failed, since
      // nothing else would ever flip `user` back to null to unblock it.
      await firebaseSignOut(auth)
      useVaultStore.getState().clearSession()
      useStatusStore.getState().setSuccess('Signed out')
    } catch (err) {
      const message = describeError(err, 'Sign-out failed')
      set({ error: message })
      useStatusStore.getState().setError(`Sign-out failed: ${message}`)
    }
  },
}))
