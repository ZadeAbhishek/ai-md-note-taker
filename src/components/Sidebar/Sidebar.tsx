import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'
import { useRepoStore } from '../../store/repoStore'
import { useVaultStore } from '../../store/vaultStore'
import { getActiveRepo } from '../../types'
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
  const setActiveWorkspace = useVaultStore((s) => s.setActiveWorkspace)
  const repo = getActiveRepo(settings)
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
    if (settings?.githubToken && repo) {
      void sync(settings.githubToken, repo)
    }
  }, [settings?.githubToken, repo, sync])

  // Periodic background refresh, opt-in via Settings (0 = off). Independent of the editor,
  // so it never touches an in-progress edit — it only re-fetches the sidebar's file list.
  useEffect(() => {
    const intervalSeconds = settings?.autoSyncIntervalSeconds ?? 0
    if (!settings?.githubToken || !repo || intervalSeconds <= 0) return
    const token = settings.githubToken
    const id = setInterval(() => {
      void sync(token, repo)
    }, intervalSeconds * 1000)
    return () => clearInterval(id)
  }, [settings?.githubToken, repo, settings?.autoSyncIntervalSeconds, sync])

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
    if (!settings?.githubToken || !repo || !name || !createMode) return
    const token = settings.githubToken

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
    if (!settings?.githubToken || !repo) throw new Error('No repo configured')
    const name = toMarkdownFileName(fileName)
    const path = `${folderPath}/${name}`
    const content = `# ${name.replace(/\.md$/i, '')}\n`
    await createFile(settings.githubToken, repo, path, content)
    void openPath(settings.githubToken, repo, path)
  }

  async function handleCreateFolderInFolder(
    parentPath: string,
    folderName: string,
    fileName: string,
  ) {
    if (!settings?.githubToken || !repo) throw new Error('No repo configured')
    const subFolder = folderName.trim().replace(/^\/+|\/+$/g, '')
    const name = toMarkdownFileName(fileName)
    const path = `${parentPath}/${subFolder}/${name}`
    const content = `# ${name.replace(/\.md$/i, '')}\n`
    await createFile(settings.githubToken, repo, path, content)
    void openPath(settings.githubToken, repo, path)
  }

  /** If the currently open file was inside `oldPath`, follow it to its new location. */
  function reconcileOpenFileAfterMove(oldPath: string, newPath: string) {
    if (!settings?.githubToken || !repo || !openFile) return
    if (openFile.path === oldPath || openFile.path.startsWith(`${oldPath}/`)) {
      const movedPath = `${newPath}${openFile.path.slice(oldPath.length)}`
      void openPath(settings.githubToken, repo, movedPath)
    }
  }

  async function handleRename(path: string, newName: string, isFile: boolean) {
    if (!settings?.githubToken || !repo) throw new Error('No repo configured')
    const segments = path.split('/')
    let finalName = newName.trim()
    if (isFile) finalName = toMarkdownFileName(finalName)
    segments[segments.length - 1] = finalName
    const newPath = segments.join('/')
    if (newPath === path) return
    await renamePath(settings.githubToken, repo, path, newPath)
    reconcileOpenFileAfterMove(path, newPath)
  }

  async function handleMove(draggedPath: string, targetFolderPath: string) {
    if (!settings?.githubToken || !repo) throw new Error('No repo configured')
    if (targetFolderPath === draggedPath || targetFolderPath.startsWith(`${draggedPath}/`)) {
      alert('Cannot move a folder into itself or one of its own subfolders.')
      return
    }
    const newPath = targetFolderPath ? `${targetFolderPath}/${basename(draggedPath)}` : basename(draggedPath)
    if (newPath === draggedPath) return
    await renamePath(settings.githubToken, repo, draggedPath, newPath)
    reconcileOpenFileAfterMove(draggedPath, newPath)
  }

  async function handleDeletePath(path: string, isFolder: boolean) {
    if (!settings?.githubToken || !repo) throw new Error('No repo configured')
    await deletePath(settings.githubToken, repo, path)
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

  const workspaces = settings?.workspaces ?? []

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
          {workspaces.length > 0 ? (
            <select
              title="Switch workspace"
              className="min-w-0 flex-1 truncate rounded border-none bg-transparent text-sm font-medium text-neutral-800 outline-none dark:text-neutral-200"
              value={settings?.activeWorkspaceId ?? ''}
              onChange={(e) => void setActiveWorkspace(e.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.owner}/{w.name} ({w.branch})
                </option>
              ))}
            </select>
          ) : (
            <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
              No repo set
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            title="New file"
            className={iconButtonClass}
            disabled={!repo}
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
            disabled={!repo}
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
            disabled={loading}
            onClick={() => {
              if (settings?.githubToken && repo) {
                void sync(settings.githubToken, repo)
              }
            }}
          >
            <span className={loading ? 'inline-block animate-spin' : 'inline-block'}>⟳</span>
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
        {!repo && (
          <p className="px-3 py-2 text-xs text-neutral-500">
            Open Settings to add a GitHub repo.
          </p>
        )}
        {error && <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        {/* Stays mounted through loading/sync so each folder's local expand/collapse state
            (and any in-progress rename/add forms) survives a refresh instead of resetting. */}
        {repo && (
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
