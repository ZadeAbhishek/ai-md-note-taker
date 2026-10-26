import { useState } from 'react'
import type { FileNode } from '../../types'

export interface FileTreeHandlers {
  onSelect: (path: string) => void
  onCreateFile: (folderPath: string, fileName: string) => Promise<void>
  onCreateFolder: (parentPath: string, folderName: string, fileName: string) => Promise<void>
  onRename: (path: string, newName: string, isFile: boolean) => Promise<void>
  onDeletePath: (path: string, isFolder: boolean) => Promise<void>
  onMove: (draggedPath: string, targetFolderPath: string) => Promise<void>
}

interface Props extends FileTreeHandlers {
  nodes: FileNode[]
  activePath: string | null
}

const inputClass =
  'w-full rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs text-neutral-900 outline-none focus:border-purple-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'

const menuButtonClass =
  'rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'

export function FileTree({ nodes, activePath, ...handlers }: Props) {
  const [rootDragOver, setRootDragOver] = useState(false)

  return (
    <ul
      className={`flex min-h-full flex-col ${rootDragOver ? 'bg-neutral-200/60 dark:bg-neutral-900/60' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setRootDragOver(true)
      }}
      onDragLeave={() => setRootDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setRootDragOver(false)
        const draggedPath = e.dataTransfer.getData('text/plain')
        if (draggedPath) void handlers.onMove(draggedPath, '')
      }}
    >
      {nodes.length === 0 ? (
        <p className="px-3 py-2 text-xs text-neutral-500">No markdown files found.</p>
      ) : (
        nodes.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            activePath={activePath}
            depth={0}
            {...handlers}
          />
        ))
      )}
    </ul>
  )
}

type AddMode = 'file' | 'folder' | null

function FileTreeNode({
  node,
  activePath,
  depth,
  onSelect,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDeletePath,
  onMove,
}: FileTreeHandlers & {
  node: FileNode
  activePath: string | null
  depth: number
}) {
  const isFile = node.type === 'file'

  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(node.name)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Only relevant for folders, but declared unconditionally per the Rules of Hooks.
  const [addMode, setAddMode] = useState<AddMode>(null)
  const [newFileName, setNewFileName] = useState('')
  const [newFolderFileName, setNewFolderFileName] = useState('README.md')
  const [dragOver, setDragOver] = useState(false)

  function cancelRename() {
    setRenaming(false)
    setRenameValue(node.name)
    setLocalError(null)
  }

  async function submitRename() {
    const name = renameValue.trim()
    if (!name || name === node.name) {
      cancelRename()
      return
    }
    setBusy(true)
    setLocalError(null)
    try {
      await onRename(node.path, name, isFile)
      // On success the tree re-syncs and this node is replaced by one keyed on
      // the new path, so there's no local "renaming" state left to reset here.
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to rename')
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setLocalError(null)
    try {
      await onDeletePath(node.path, !isFile)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to delete')
      setBusy(false)
    }
  }

  function cancelAdd() {
    setAddMode(null)
    setNewFileName('')
    setNewFolderFileName('README.md')
    setLocalError(null)
  }

  async function submitAddFile() {
    const name = newFileName.trim()
    if (!name) return
    setBusy(true)
    setLocalError(null)
    try {
      await onCreateFile(node.path, name)
      cancelAdd()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create file')
    } finally {
      setBusy(false)
    }
  }

  async function submitAddFolder() {
    const folderName = newFileName.trim()
    const fileName = newFolderFileName.trim()
    if (!folderName || !fileName) return
    setBusy(true)
    setLocalError(null)
    try {
      await onCreateFolder(node.path, folderName, fileName)
      cancelAdd()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create folder')
    } finally {
      setBusy(false)
    }
  }

  const indent = { paddingLeft: `${12 + depth * 14}px` }
  const childIndent = { paddingLeft: `${12 + (depth + 1) * 14}px` }

  const renameRow = (
    <div className="flex w-full items-center gap-1">
      <input
        autoFocus
        className={inputClass}
        value={renameValue}
        disabled={busy}
        onChange={(e) => setRenameValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submitRename()
          if (e.key === 'Escape') cancelRename()
        }}
      />
      <button
        title="Save rename"
        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-emerald-600 hover:bg-neutral-200 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-neutral-800"
        disabled={busy}
        onClick={() => void submitRename()}
      >
        ✓
      </button>
      <button
        title="Cancel"
        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
        disabled={busy}
        onClick={cancelRename}
      >
        ✕
      </button>
    </div>
  )

  if (isFile) {
    const isActive = node.path === activePath
    return (
      <li>
        <div className="flex items-center gap-1 px-3 py-1.5" style={indent}>
          {renaming ? (
            renameRow
          ) : (
            <>
              <button
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', node.path)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className={`min-w-0 flex-1 truncate text-left text-sm hover:text-neutral-900 dark:hover:text-neutral-100 ${
                  isActive ? 'text-purple-600 dark:text-purple-400' : 'text-neutral-700 dark:text-neutral-300'
                }`}
                onClick={() => onSelect(node.path)}
              >
                {node.name}
              </button>
              <button
                title="Actions"
                className={`shrink-0 ${menuButtonClass}`}
                onClick={() => setMenuOpen((v) => !v)}
              >
                ⋯
              </button>
            </>
          )}
        </div>
        {menuOpen && !renaming && (
          <div className="flex items-center gap-1 px-3 py-1" style={indent}>
            <button
              className={menuButtonClass}
              onClick={() => {
                setRenameValue(node.name)
                setRenaming(true)
                setMenuOpen(false)
              }}
            >
              Rename
            </button>
            <button
              className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-neutral-200 dark:text-red-400 dark:hover:bg-neutral-800"
              onClick={() => {
                setMenuOpen(false)
                if (confirm(`Delete "${node.path}"? This commits the deletion to GitHub.`)) {
                  void handleDelete()
                }
              }}
            >
              Delete
            </button>
          </div>
        )}
        {localError && (
          <p className="px-3 py-1 text-xs text-red-600 dark:text-red-400" style={indent}>
            {localError}
          </p>
        )}
      </li>
    )
  }

  return (
    <li
      className={dragOver ? 'rounded bg-neutral-200/60 dark:bg-neutral-800/60' : undefined}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
        const draggedPath = e.dataTransfer.getData('text/plain')
        if (draggedPath) void onMove(draggedPath, node.path)
      }}
    >
      <div className="flex items-center justify-between gap-1 px-3 py-1.5" style={indent}>
        {renaming ? (
          renameRow
        ) : (
          <>
            <span
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', node.path)
                e.dataTransfer.effectAllowed = 'move'
              }}
              className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wide text-neutral-600 dark:text-neutral-500"
            >
              {node.name}
            </span>
            <button
              title="Actions"
              className={`shrink-0 ${menuButtonClass}`}
              onClick={() => setMenuOpen((v) => !v)}
            >
              ⋯
            </button>
          </>
        )}
      </div>

      {menuOpen && !renaming && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-1" style={indent}>
          <button
            className={menuButtonClass}
            onClick={() => {
              setAddMode('file')
              setMenuOpen(false)
              setLocalError(null)
            }}
          >
            +File
          </button>
          <button
            className={menuButtonClass}
            onClick={() => {
              setAddMode('folder')
              setMenuOpen(false)
              setLocalError(null)
            }}
          >
            +Folder
          </button>
          <button
            className={menuButtonClass}
            onClick={() => {
              setRenameValue(node.name)
              setRenaming(true)
              setMenuOpen(false)
              setLocalError(null)
            }}
          >
            Rename
          </button>
          <button
            className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-neutral-200 dark:text-red-400 dark:hover:bg-neutral-800"
            onClick={() => {
              setMenuOpen(false)
              if (
                confirm(
                  `Delete folder "${node.path}" and everything inside it? This commits the deletion to GitHub.`,
                )
              ) {
                void handleDelete()
              }
            }}
          >
            Delete
          </button>
        </div>
      )}

      {addMode === 'file' && (
        <div className="flex items-center gap-1 px-3 py-1" style={childIndent}>
          <input
            autoFocus
            className={inputClass}
            placeholder="filename.md"
            value={newFileName}
            disabled={busy}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submitAddFile()
              if (e.key === 'Escape') cancelAdd()
            }}
          />
          <button
            title="Create file"
            className="shrink-0 rounded px-1.5 py-0.5 text-xs text-emerald-600 hover:bg-neutral-200 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-neutral-800"
            disabled={busy}
            onClick={() => void submitAddFile()}
          >
            ✓
          </button>
          <button
            title="Cancel"
            className="shrink-0 rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
            disabled={busy}
            onClick={cancelAdd}
          >
            ✕
          </button>
        </div>
      )}
      {addMode === 'folder' && (
        <div className="flex flex-col gap-1 px-3 py-1" style={childIndent}>
          <input
            autoFocus
            className={inputClass}
            placeholder="subfolder-name"
            value={newFileName}
            disabled={busy}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cancelAdd()
            }}
          />
          <div className="flex items-center gap-1">
            <input
              className={inputClass}
              placeholder="first file (e.g. README.md)"
              value={newFolderFileName}
              disabled={busy}
              onChange={(e) => setNewFolderFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitAddFolder()
                if (e.key === 'Escape') cancelAdd()
              }}
            />
            <button
              title="Create folder"
              className="shrink-0 rounded px-1.5 py-0.5 text-xs text-emerald-600 hover:bg-neutral-200 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-neutral-800"
              disabled={busy}
              onClick={() => void submitAddFolder()}
            >
              ✓
            </button>
            <button
              title="Cancel"
              className="shrink-0 rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
              disabled={busy}
              onClick={cancelAdd}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {localError && (
        <p className="px-3 py-1 text-xs text-red-600 dark:text-red-400" style={childIndent}>
          {localError}
        </p>
      )}

      <ul>
        {node.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            activePath={activePath}
            depth={depth + 1}
            onSelect={onSelect}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onRename={onRename}
            onDeletePath={onDeletePath}
            onMove={onMove}
          />
        ))}
      </ul>
    </li>
  )
}
