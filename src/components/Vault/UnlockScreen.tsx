import { useState } from 'react'
import { useVaultStore } from '../../store/vaultStore'
import {
  DEFAULT_AUTO_SAVE_DELAY_SECONDS,
  DEFAULT_AUTO_SYNC_INTERVAL_SECONDS,
} from '../../types'

const inputClass =
  'rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-purple-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100'

export function UnlockScreen() {
  const status = useVaultStore((s) => s.status)
  return (
    <div className="flex h-full items-center justify-center bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-1 text-lg font-semibold">MD Note Taker</h1>
        {status === 'no-vault' ? <SetupForm /> : <UnlockForm />}
      </div>
    </div>
  )
}

function UnlockForm() {
  const [passphrase, setPassphrase] = useState('')
  const unlock = useVaultStore((s) => s.unlock)
  const error = useVaultStore((s) => s.error)

  return (
    <form
      className="mt-4 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        void unlock(passphrase)
      }}
    >
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Enter your passphrase to unlock your GitHub token and repo settings.
      </p>
      <input
        type="password"
        autoFocus
        className={inputClass}
        placeholder="Passphrase"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        className="rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500"
      >
        Unlock
      </button>
    </form>
  )
}

function SetupForm() {
  const setupVault = useVaultStore((s) => s.setupVault)
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [owner, setOwner] = useState('')
  const [name, setName] = useState('')
  const [branch, setBranch] = useState('main')
  const [validationError, setValidationError] = useState<string | null>(null)

  return (
    <form
      className="mt-4 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (passphrase.length < 8) {
          setValidationError('Passphrase must be at least 8 characters.')
          return
        }
        if (passphrase !== confirm) {
          setValidationError('Passphrases do not match.')
          return
        }
        setValidationError(null)
        void setupVault(passphrase, {
          githubToken,
          repo: owner && name ? { owner, name, branch: branch || 'main' } : null,
          autoSaveDelaySeconds: DEFAULT_AUTO_SAVE_DELAY_SECONDS,
          autoSyncIntervalSeconds: DEFAULT_AUTO_SYNC_INTERVAL_SECONDS,
        })
      }}
    >
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        First run — set a passphrase to encrypt your keys locally. It's never
        stored, so don't lose it.
      </p>
      <input
        type="password"
        className={inputClass}
        placeholder="New passphrase"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
      />
      <input
        type="password"
        className={inputClass}
        placeholder="Confirm passphrase"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      <hr className="border-neutral-200 dark:border-neutral-800" />

      <input
        type="password"
        className={inputClass}
        placeholder="GitHub Personal Access Token"
        value={githubToken}
        onChange={(e) => setGithubToken(e.target.value)}
      />

      <div className="flex gap-2">
        <input
          className={`w-1/3 ${inputClass}`}
          placeholder="owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
        <input
          className={`w-1/3 ${inputClass}`}
          placeholder="repo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={`w-1/3 ${inputClass}`}
          placeholder="branch"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        />
      </div>

      {validationError && <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>}

      <button
        type="submit"
        className="rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500"
      >
        Save &amp; Continue
      </button>
    </form>
  )
}
