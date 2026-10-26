import { create } from 'zustand'
import { commitFile, getFileContent } from '../lib/github'
import { useStatusStore } from './statusStore'
import type { OpenFile, RepoRef } from '../types'

export type ViewMode = 'edit' | 'view'

interface EditorState {
  openFile: OpenFile | null
  viewMode: ViewMode
  loading: boolean
  saving: boolean
  error: string | null
  setViewMode: (mode: ViewMode) => void
  openPath: (token: string, repo: RepoRef, path: string) => Promise<void>
  setContent: (content: string) => void
  save: (token: string, repo: RepoRef) => Promise<void>
  reset: () => void
}

export const useEditorStore = create<EditorState>((set, get) => {
  const status = () => useStatusStore.getState()

  return {
    openFile: null,
    viewMode: 'edit',
    loading: false,
    saving: false,
    error: null,

    setViewMode: (mode) => set({ viewMode: mode }),

    openPath: async (token, repo, path) => {
      set({ loading: true, error: null })
      status().setLoading(`Opening ${path}…`)
      try {
        const { content, sha } = await getFileContent(token, repo, path)
        set({
          openFile: { path, content, sha, dirty: false },
          loading: false,
        })
        status().setSuccess(`Opened ${path}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to open file'
        set({ error: message, loading: false })
        status().setError(`Open failed: ${message}`)
      }
    },

    setContent: (content) => {
      const { openFile } = get()
      if (!openFile) return
      set({ openFile: { ...openFile, content, dirty: true } })
    },

    save: async (token, repo) => {
      const { openFile } = get()
      if (!openFile) return
      set({ saving: true, error: null })
      status().setLoading(`Saving ${openFile.path}…`)
      try {
        const { sha } = await commitFile(
          token,
          repo,
          openFile.path,
          openFile.content,
          openFile.sha,
          `Update ${openFile.path}`,
        )
        set({ openFile: { ...openFile, sha, dirty: false }, saving: false })
        status().setSuccess(`Saved ${openFile.path}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save file'
        set({ error: message, saving: false })
        status().setError(`Save failed: ${message}`)
      }
    },

    reset: () =>
      set({ openFile: null, viewMode: 'edit', loading: false, saving: false, error: null }),
  }
})
