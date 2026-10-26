import { useState } from 'react'
import { useVaultStore } from '../../store/vaultStore'

interface Props {
  onClose: () => void
}

const inputClass =
  'mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-purple-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100'

export function SettingsModal({ onClose }: Props) {
  const settings = useVaultStore((s) => s.settings)
  const updateSettings = useVaultStore((s) => s.updateSettings)

  const [githubToken, setGithubToken] = useState(settings?.githubToken ?? '')
  const [owner, setOwner] = useState(settings?.repo?.owner ?? '')
  const [name, setName] = useState(settings?.repo?.name ?? '')
  const [branch, setBranch] = useState(settings?.repo?.branch ?? 'main')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateSettings({
        githubToken,
        repo: owner && name ? { owner, name, branch: branch || 'main' } : null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        <h2 className="mb-4 text-base font-semibold">Settings</h2>
        <div className="flex flex-col gap-3">
          <label className="text-xs text-neutral-600 dark:text-neutral-400">
            GitHub Personal Access Token
            <input
              type="password"
              className={inputClass}
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <label className="w-1/3 text-xs text-neutral-600 dark:text-neutral-400">
              owner
              <input className={inputClass} value={owner} onChange={(e) => setOwner(e.target.value)} />
            </label>
            <label className="w-1/3 text-xs text-neutral-600 dark:text-neutral-400">
              repo
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="w-1/3 text-xs text-neutral-600 dark:text-neutral-400">
              branch
              <input className={inputClass} value={branch} onChange={(e) => setBranch(e.target.value)} />
            </label>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
