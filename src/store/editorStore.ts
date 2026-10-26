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
          openFile: { path, content, savedContent: content, sha, dirty: false },
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
      // Real-diff check, not just "something fired an onChange": typing then undoing back to
      // the saved text must not look dirty, or auto-save could be scheduled for nothing.
      set({ openFile: { ...openFile, content, dirty: content !== openFile.savedContent } })
    },

    // Critical invariant: never commits when there is no actual content difference from what's
    // already saved on GitHub — guarded here centrally so it holds for every caller (the Save
    // button and the 10s auto-save timer alike), not just whichever one remembers to check.
    save: async (token, repo) => {
      const { openFile } = get()
      if (!openFile) return
      if (openFile.content === openFile.savedContent) {
        set({ openFile: { ...openFile, dirty: false } })
        return
      }
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
        set({
          openFile: { ...openFile, sha, savedContent: openFile.content, dirty: false },
          saving: false,
        })
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
