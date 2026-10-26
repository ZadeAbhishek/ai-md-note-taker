import { create } from 'zustand'
import {
  buildFileTree,
  createFile as createFileApi,
  deletePath as deletePathApi,
  listMarkdownFiles,
  renamePath as renamePathApi,
} from '../lib/github'
import { useStatusStore } from './statusStore'
import type { FileNode, RepoRef } from '../types'

interface RepoState {
  tree: FileNode[]
  loading: boolean
  error: string | null
  sync: (token: string, repo: RepoRef) => Promise<void>
  createFile: (
    token: string,
    repo: RepoRef,
    path: string,
    content: string,
  ) => Promise<void>
  renamePath: (
    token: string,
    repo: RepoRef,
    oldPath: string,
    newPath: string,
  ) => Promise<void>
  deletePath: (token: string, repo: RepoRef, path: string) => Promise<void>
  reset: () => void
}

function flattenPaths(nodes: FileNode[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.type === 'file') {
      paths.push(node.path)
    } else if (node.children) {
      paths.push(...flattenPaths(node.children))
    }
  }
  return paths
}

export const useRepoStore = create<RepoState>((set, get) => {
  const status = () => useStatusStore.getState()

  return {
    tree: [],
    loading: false,
    error: null,

    sync: async (token, repo) => {
      set({ loading: true, error: null })
      status().setLoading('Syncing with GitHub…')
      try {
        const tree = await listMarkdownFiles(token, repo)
        set({ tree, loading: false })
        status().setSuccess('Synced with GitHub')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync repo'
        set({ error: message, loading: false })
        status().setError(`Sync failed: ${message}`)
      }
    },

    // Each mutation below commits to GitHub first, then updates the local tree directly
    // from the known change (no extra fetch) so the UI reflects it immediately and can't
    // be left stuck if a *second* network call were to fail after the commit succeeded.
    createFile: async (token, repo, path, content) => {
      status().setLoading(`Creating ${path}…`)
      try {
        await createFileApi(token, repo, path, content, `Create ${path}`)
        const paths = [...flattenPaths(get().tree), path].sort()
        set({ tree: buildFileTree(paths) })
        status().setSuccess(`Created ${path} and synced`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create file'
        status().setError(`Create failed: ${message}`)
        throw err
      }
    },

    renamePath: async (token, repo, oldPath, newPath) => {
      status().setLoading(`Renaming ${oldPath}…`)
      try {
        await renamePathApi(token, repo, oldPath, newPath)
        const paths = flattenPaths(get().tree)
          .map((p) =>
            p === oldPath || p.startsWith(`${oldPath}/`)
              ? `${newPath}${p.slice(oldPath.length)}`
              : p,
          )
          .sort()
        set({ tree: buildFileTree(paths) })
        status().setSuccess(`Moved ${oldPath} → ${newPath} and synced`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to rename/move'
        status().setError(`Rename failed: ${message}`)
        throw err
      }
    },

    deletePath: async (token, repo, path) => {
      status().setLoading(`Deleting ${path}…`)
      try {
        await deletePathApi(token, repo, path)
        const paths = flattenPaths(get().tree).filter(
          (p) => p !== path && !p.startsWith(`${path}/`),
        )
        set({ tree: buildFileTree(paths) })
        status().setSuccess(`Deleted ${path} and synced`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete'
        status().setError(`Delete failed: ${message}`)
        throw err
      }
    },

    reset: () => set({ tree: [], loading: false, error: null }),
  }
})
