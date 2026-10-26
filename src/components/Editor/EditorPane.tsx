import { useEditorStore } from '../../store/editorStore'
import { useVaultStore } from '../../store/vaultStore'
import { MarkdownEditor } from './MarkdownEditor'
import { MarkdownPreview } from './MarkdownPreview'

export function EditorPane() {
  const settings = useVaultStore((s) => s.settings)
  const {
    openFile,
    viewMode,
    loading,
    saving,
    error,
    setViewMode,
    setContent,
    save,
    openPath,
  } = useEditorStore()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading file…
      </div>
    )
  }

  if (!openFile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Select a file from the sidebar to get started.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <span className="truncate">{openFile.path}</span>
          {openFile.dirty && <span className="text-xs text-amber-600 dark:text-amber-400">● unsaved</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-neutral-300 text-xs dark:border-neutral-700">
            <button
              className={`px-2 py-1 ${
                viewMode === 'edit'
                  ? 'bg-neutral-200 text-purple-600 dark:bg-neutral-800 dark:text-purple-400'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
              onClick={() => setViewMode('edit')}
            >
              Edit
            </button>
            <button
              className={`px-2 py-1 ${
                viewMode === 'view'
                  ? 'bg-neutral-200 text-purple-600 dark:bg-neutral-800 dark:text-purple-400'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
              onClick={() => setViewMode('view')}
            >
              View
            </button>
          </div>
          <button
            className="rounded bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
            disabled={!openFile.dirty || saving || !settings?.repo}
            onClick={() => {
              if (settings?.githubToken && settings.repo) {
                void save(settings.githubToken, settings.repo)
              }
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          {error.includes('changed on GitHub') && (
            <button
              className="shrink-0 rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-200 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              onClick={() => {
                if (
                  settings?.githubToken &&
                  settings.repo &&
                  confirm('Reload from GitHub? This discards your unsaved changes to this file.')
                ) {
                  void openPath(settings.githubToken, settings.repo, openFile.path)
                }
              }}
            >
              Reload from GitHub
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {viewMode === 'edit' ? (
          <MarkdownEditor value={openFile.content} onChange={setContent} />
        ) : (
          <MarkdownPreview content={openFile.content} />
        )}
      </div>
    </div>
  )
}
