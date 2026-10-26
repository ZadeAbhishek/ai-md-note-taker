import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useRepoStore } from '../../store/repoStore'
import { useVaultStore } from '../../store/vaultStore'
import { FileTree } from './FileTree'

interface Props {
  activePath: string | null
  onSelect: (path: string) => void
  onOpenSettings: () => void
}

type CreateMode = 'file' | 'folder' | null

const WIDTH_STORAGE_KEY = 'md-note-taker.sidebarWidth'
const MIN_WIDTH = 200
const MAX_WIDTH = 520
const DEFAULT_WIDTH = 256

function getInitialWidth(): number {
  const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY))
  if (Number.isFinite(stored) && stored >= MIN_WIDTH && stored <= MAX_WIDTH) return stored
  return DEFAULT_WIDTH
}

function toMarkdownFileName(name: string): string {
  const trimmed = name.trim().replace(/^\/+/, '')
  return trimmed.toLowerCase().endsWith('.md') ? trimmed : `${trimmed}.md`
}

function basename(path: string): string {
  const segments = path.split('/')
  return segments[segments.length - 1]
}

const iconButtonClass =
  'rounded px-1.5 py-1 text-xs text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'

const formInputClass =
  'w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 outline-none focus:border-purple-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'

export function Sidebar({ activePath, onSelect, onOpenSettings }: Props) {
  const settings = useVaultStore((s) => s.settings)
  const { tree, loading, error, sync, createFile, renamePath, deletePath } = useRepoStore()
  const openFile = useEditorStore((s) => s.openFile)
  const openPath = useEditorStore((s) => s.openPath)
  const resetEditor = useEditorStore((s) => s.reset)

  const [collapsed, setCollapsed] = useState(false)
  const [width, setWidth] = useState(getInitialWidth)
  const isResizing = useRef(false)

  const [createMode, setCreateMode] = useState<CreateMode>(null)
  const [newName, setNewName] = useState('')
  const [newFolderFileName, setNewFolderFileName] = useState('README.md')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (settings?.githubToken && settings.repo) {
      void sync(settings.githubToken, settings.repo)
    }
  }, [settings?.githubToken, settings?.repo, sync])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isResizing.current) return
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)))
    }
    function onMouseUp() {
      if (!isResizing.current) return
      isResizing.current = false
      localStorage.setItem(WIDTH_STORAGE_KEY, String(width))
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [width])

  function closeCreateForm() {
    setCreateMode(null)
    setNewName('')
    setNewFolderFileName('README.md')
    setCreateError(null)
  }

  async function handleCreateSubmit() {
    const name = newName.trim()
    if (!settings?.githubToken || !settings.repo || !name || !createMode) return
    const token = settings.githubToken
    const repo = settings.repo

    let path: string
    let content: string
    if (createMode === 'folder') {
      const folderName = name.replace(/^\/+|\/+$/g, '')
      const fileName = toMarkdownFileName(newFolderFileName || 'README.md')
      path = `${folderName}/${fileName}`
      content = `# ${fileName.replace(/\.md$/i, '')}\n`
    } else {
      const fileName = toMarkdownFileName(name)
      path = fileName
      content = `# ${fileName.replace(/\.md$/i, '')}\n`
    }

    setCreating(true)
    setCreateError(null)
    try {
      await createFile(token, repo, path, content)
      closeCreateForm()
      void openPath(token, repo, path)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateFileInFolder(folderPath: string, fileName: string) {
    if (!settings?.githubToken || !settings.repo) throw new Error('No repo configured')
    const name = toMarkdownFileName(fileName)
    const path = `${folderPath}/${name}`
    const content = `# ${name.replace(/\.md$/i, '')}\n`
    await createFile(settings.githubToken, settings.repo, path, content)
    void openPath(settings.githubToken, settings.repo, path)
  }

  async function handleCreateFolderInFolder(
    parentPath: string,
    folderName: string,
    fileName: string,
  ) {
    if (!settings?.githubToken || !settings.repo) throw new Error('No repo configured')
    const subFolder = folderName.trim().replace(/^\/+|\/+$/g, '')
    const name = toMarkdownFileName(fileName)
    const path = `${parentPath}/${subFolder}/${name}`
    const content = `# ${name.replace(/\.md$/i, '')}\n`
    await createFile(settings.githubToken, settings.repo, path, content)
    void openPath(settings.githubToken, settings.repo, path)
  }

  /** If the currently open file was inside `oldPath`, follow it to its new location. */
  function reconcileOpenFileAfterMove(oldPath: string, newPath: string) {
    if (!settings?.githubToken || !settings.repo || !openFile) return
    if (openFile.path === oldPath || openFile.path.startsWith(`${oldPath}/`)) {
      const movedPath = `${newPath}${openFile.path.slice(oldPath.length)}`
      void openPath(settings.githubToken, settings.repo, movedPath)
    }
  }

  async function handleRename(path: string, newName: string, isFile: boolean) {
    if (!settings?.githubToken || !settings.repo) throw new Error('No repo configured')
    const segments = path.split('/')
    let finalName = newName.trim()
    if (isFile) finalName = toMarkdownFileName(finalName)
    segments[segments.length - 1] = finalName
    const newPath = segments.join('/')
    if (newPath === path) return
    await renamePath(settings.githubToken, settings.repo, path, newPath)
    reconcileOpenFileAfterMove(path, newPath)
  }

  async function handleMove(draggedPath: string, targetFolderPath: string) {
    if (!settings?.githubToken || !settings.repo) throw new Error('No repo configured')
    if (targetFolderPath === draggedPath || targetFolderPath.startsWith(`${draggedPath}/`)) {
      alert('Cannot move a folder into itself or one of its own subfolders.')
      return
    }
    const newPath = targetFolderPath ? `${targetFolderPath}/${basename(draggedPath)}` : basename(draggedPath)
    if (newPath === draggedPath) return
    await renamePath(settings.githubToken, settings.repo, draggedPath, newPath)
    reconcileOpenFileAfterMove(draggedPath, newPath)
  }

  async function handleDeletePath(path: string, isFolder: boolean) {
    if (!settings?.githubToken || !settings.repo) throw new Error('No repo configured')
    await deletePath(settings.githubToken, settings.repo, path)
    if (openFile && (openFile.path === path || (isFolder && openFile.path.startsWith(`${path}/`)))) {
      resetEditor()
    }
  }

  if (collapsed) {
    return (
      <aside className="flex h-full w-8 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
        <button
          title="Expand sidebar"
          className={iconButtonClass}
          onClick={() => setCollapsed(false)}
        >
          »
        </button>
      </aside>
    )
  }

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950"
      style={{ width }}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-1">
          <button
            title="Collapse sidebar"
            className={`shrink-0 ${iconButtonClass}`}
            onClick={() => setCollapsed(true)}
          >
            «
          </button>
          <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {settings?.repo ? `${settings.repo.owner}/${settings.repo.name}` : 'No repo set'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            title="New file"
            className={iconButtonClass}
            disabled={!settings?.repo}
            onClick={() => {
              setCreateMode((m) => (m === 'file' ? null : 'file'))
              setNewName('')
              setCreateError(null)
            }}
          >
            +File
          </button>
          <button
            title="New folder"
            className={iconButtonClass}
            disabled={!settings?.repo}
            onClick={() => {
              setCreateMode((m) => (m === 'folder' ? null : 'folder'))
              setNewName('')
              setNewFolderFileName('README.md')
              setCreateError(null)
            }}
          >
            +Folder
          </button>
          <button
            title="Refresh"
            className={iconButtonClass}
            onClick={() => {
              if (settings?.githubToken && settings.repo) {
                void sync(settings.githubToken, settings.repo)
              }
            }}
          >
            ⟳
          </button>
          <button title="Settings" className={iconButtonClass} onClick={onOpenSettings}>
            ⚙
          </button>
        </div>
      </div>

      {createMode && (
        <div className="border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <input
            autoFocus
            className={formInputClass}
            placeholder={createMode === 'folder' ? 'folder-name' : 'filename.md'}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && createMode === 'file') void handleCreateSubmit()
              if (e.key === 'Escape') closeCreateForm()
            }}
          />
          {createMode === 'folder' && (
            <input
              className={`mt-1 ${formInputClass}`}
              placeholder="first file name (e.g. README.md)"
              value={newFolderFileName}
              onChange={(e) => setNewFolderFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreateSubmit()
                if (e.key === 'Escape') closeCreateForm()
              }}
            />
          )}
          {createError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createError}</p>}
          <div className="mt-1 flex justify-end gap-1">
            <button
              className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
              onClick={closeCreateForm}
            >
              Cancel
            </button>
            <button
              className="rounded bg-purple-600 px-2 py-1 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
              disabled={
                creating ||
                !newName.trim() ||
                (createMode === 'folder' && !newFolderFileName.trim())
              }
              onClick={() => void handleCreateSubmit()}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {!settings?.repo && (
          <p className="px-3 py-2 text-xs text-neutral-500">
            Open Settings to connect a GitHub repo.
          </p>
        )}
        {loading && <p className="px-3 py-2 text-xs text-neutral-500">Syncing…</p>}
        {error && <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        {!loading && !error && settings?.repo && (
          <FileTree
            nodes={tree}
            activePath={activePath}
            onSelect={onSelect}
            onCreateFile={handleCreateFileInFolder}
            onCreateFolder={handleCreateFolderInFolder}
            onRename={handleRename}
            onDeletePath={handleDeletePath}
            onMove={handleMove}
          />
        )}
      </div>

      <div
        title="Drag to resize"
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-purple-500/50"
        onMouseDown={(e) => {
          e.preventDefault()
          isResizing.current = true
        }}
      />
    </aside>
  )
}
