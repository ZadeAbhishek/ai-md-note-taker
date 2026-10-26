import { useState } from 'react'
import { parseRepoInput } from '../../lib/githubUrl'
import { useVaultStore } from '../../store/vaultStore'
import {
  DEFAULT_AUTO_SAVE_DELAY_SECONDS,
  DEFAULT_AUTO_SYNC_INTERVAL_SECONDS,
} from '../../types'

interface Props {
  onClose: () => void
}

const inputClass =
  'mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-purple-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100'

export function SettingsModal({ onClose }: Props) {
  const settings = useVaultStore((s) => s.settings)
  const updateSettings = useVaultStore((s) => s.updateSettings)
  const addWorkspace = useVaultStore((s) => s.addWorkspace)
  const removeWorkspace = useVaultStore((s) => s.removeWorkspace)
  const setActiveWorkspace = useVaultStore((s) => s.setActiveWorkspace)

  const [githubToken, setGithubToken] = useState(settings?.githubToken ?? '')
  const [autoSaveDelay, setAutoSaveDelay] = useState(
    String(settings?.autoSaveDelaySeconds ?? DEFAULT_AUTO_SAVE_DELAY_SECONDS),
  )
  const [autoSyncInterval, setAutoSyncInterval] = useState(
    String(settings?.autoSyncIntervalSeconds ?? DEFAULT_AUTO_SYNC_INTERVAL_SECONDS),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [repoInput, setRepoInput] = useState('')
  const [repoBranch, setRepoBranch] = useState('')
  const [addingRepo, setAddingRepo] = useState(false)
  const [addRepoError, setAddRepoError] = useState<string | null>(null)

  async function handleSave() {
    const parsedAutoSave = Math.max(2, Math.round(Number(autoSaveDelay) || DEFAULT_AUTO_SAVE_DELAY_SECONDS))
    const parsedAutoSync = Math.max(0, Math.round(Number(autoSyncInterval) || 0))

    setSaving(true)
    setError(null)
    try {
      const current = useVaultStore.getState().settings
      if (!current) throw new Error('Vault is locked')
      // Spread the latest store settings (not local state) so any workspace add/remove/switch
      // already done in this modal session isn't clobbered by a stale snapshot.
      await updateSettings({
        ...current,
        githubToken,
        autoSaveDelaySeconds: parsedAutoSave,
        autoSyncIntervalSeconds: parsedAutoSync,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddWorkspace() {
    const parsed = parseRepoInput(repoInput)
    if (!parsed) {
      setAddRepoError('Could not parse that as a GitHub repo URL or "owner/repo".')
      return
    }
    setAddingRepo(true)
    setAddRepoError(null)
    try {
      await addWorkspace({
        owner: parsed.owner,
        name: parsed.name,
        branch: repoBranch.trim() || parsed.branch || 'main',
      })
      setRepoInput('')
      setRepoBranch('')
    } catch (err) {
      setAddRepoError(err instanceof Error ? err.message : 'Failed to add workspace')
    } finally {
      setAddingRepo(false)
    }
  }

  const workspaces = settings?.workspaces ?? []

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

          <hr className="border-neutral-200 dark:border-neutral-800" />

          <div>
            <p className="mb-1 text-xs text-neutral-600 dark:text-neutral-400">Workspaces</p>
            {workspaces.length === 0 ? (
              <p className="text-xs text-neutral-500">No repos added yet.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {workspaces.map((w) => {
                  const isActive = w.id === settings?.activeWorkspaceId
                  return (
                    <li
                      key={w.id}
                      className="flex items-center justify-between gap-2 rounded border border-neutral-200 px-2 py-1.5 dark:border-neutral-700"
                    >
                      <button
                        className={`min-w-0 flex-1 truncate text-left text-xs ${
                          isActive
                            ? 'font-medium text-purple-600 dark:text-purple-400'
                            : 'text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100'
                        }`}
                        onClick={() => void setActiveWorkspace(w.id)}
                      >
                        {isActive ? '● ' : ''}
                        {w.owner}/{w.name}{' '}
                        <span className="text-neutral-500">({w.branch})</span>
                      </button>
                      <button
                        title="Remove"
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-neutral-200 dark:text-red-400 dark:hover:bg-neutral-800"
                        onClick={() => {
                          if (
                            confirm(
                              `Remove ${w.owner}/${w.name} from your workspaces? This only removes it from this app, not from GitHub.`,
                            )
                          ) {
                            void removeWorkspace(w.id)
                          }
                        }}
                      >
                        ✕
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="mt-2 flex gap-2">
              <input
                className={`flex-1 ${inputClass} mt-0`}
                placeholder="Paste a GitHub repo URL (or owner/repo)"
                value={repoInput}
                disabled={addingRepo}
                onChange={(e) => setRepoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleAddWorkspace()
                }}
              />
              <input
                className={`w-20 ${inputClass} mt-0`}
                placeholder="branch"
                value={repoBranch}
                disabled={addingRepo}
                onChange={(e) => setRepoBranch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleAddWorkspace()
                }}
              />
              <button
                className="shrink-0 rounded bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                disabled={addingRepo || !repoInput.trim()}
                onClick={() => void handleAddWorkspace()}
              >
                {addingRepo ? 'Adding…' : 'Add'}
              </button>
            </div>
            {addRepoError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{addRepoError}</p>}
          </div>

          <hr className="border-neutral-200 dark:border-neutral-800" />

          <div className="flex gap-2">
            <label className="w-1/2 text-xs text-neutral-600 dark:text-neutral-400">
              Auto-save delay (seconds)
              <input
                type="number"
                min={2}
                max={300}
                className={inputClass}
                value={autoSaveDelay}
                onChange={(e) => setAutoSaveDelay(e.target.value)}
              />
            </label>
            <label className="w-1/2 text-xs text-neutral-600 dark:text-neutral-400">
              Auto-refresh interval (seconds, 0 = off)
              <input
                type="number"
                min={0}
                max={3600}
                className={inputClass}
                value={autoSyncInterval}
                onChange={(e) => setAutoSyncInterval(e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-neutral-500">
            Auto-save delay is how long after you stop typing before an edit commits on its own.
            Auto-refresh periodically re-syncs the active workspace's file list in the
            background; 0 disables it (you can still sync manually with ⟳).
          </p>
        </div>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
            onClick={onClose}
          >
            Close
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
