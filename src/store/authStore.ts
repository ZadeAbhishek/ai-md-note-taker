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

  signInWithGoogle: async () => {
    if (!auth) return
    set({ error: null })
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sign-in failed' })
    }
  },

  signInWithEmail: async (email, password) => {
    if (!auth) return
    set({ error: null })
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sign-in failed' })
    }
  },

  signUpWithEmail: async (email, password) => {
    if (!auth) return
    set({ error: null })
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sign-up failed' })
    }
  },

  // Named signOutUser (not signOut) to avoid shadowing the imported firebase/auth signOut.
  signOutUser: async () => {
    if (!auth) return
    // Re-lock the vault first so a shared/public browser can't be left showing an
    // unlocked workspace after the account session ends.
    useVaultStore.getState().lock()
    await firebaseSignOut(auth)
  },
}))
