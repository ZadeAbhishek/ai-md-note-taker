import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

const inputClass =
  'rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-purple-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100'

export function SignInScreen() {
  const error = useAuthStore((s) => s.error)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail)
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail)

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleEmailSubmit() {
    setSubmitting(true)
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-1 text-lg font-semibold">VIBE MD</h1>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          Sign in to sync your workspaces across devices.
        </p>

        {error && (
          <div className="mb-4 rounded border-2 border-red-500 bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          onClick={() => void signInWithGoogle()}
        >
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-2 text-xs text-neutral-500">
          <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          or
          <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void handleEmailSubmit()
          }}
        >
          <input
            type="email"
            autoComplete="email"
            className={inputClass}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className={inputClass}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {submitting
              ? mode === 'signin'
                ? 'Signing in…'
                : 'Signing up…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Sign up'}
          </button>
        </form>

        <button
          className="mt-3 w-full text-center text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
