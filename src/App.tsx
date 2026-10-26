import { useEffect, useState } from 'react'
import { SignInScreen } from './components/Auth/SignInScreen'
import { EditorPane } from './components/Editor/EditorPane'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SettingsModal } from './components/Settings/SettingsModal'
import { StatusBar } from './components/StatusBar'
import { UnlockScreen } from './components/Vault/UnlockScreen'
import { isFirebaseConfigured } from './lib/firebase'
import { useAuthStore } from './store/authStore'
import { useEditorStore } from './store/editorStore'
import { useThemeStore } from './store/themeStore'
import { useVaultStore } from './store/vaultStore'
import { getActiveRepo } from './types'

function App() {
  const authUser = useAuthStore((s) => s.user)
  const authInitializing = useAuthStore((s) => s.initializing)
  const initAuth = useAuthStore((s) => s.init)
  const signOutUser = useAuthStore((s) => s.signOutUser)

  const status = useVaultStore((s) => s.status)
  const initVault = useVaultStore((s) => s.init)
  const settings = useVaultStore((s) => s.settings)
  const lock = useVaultStore((s) => s.lock)
  const logout = useVaultStore((s) => s.logout)
  const openFile = useEditorStore((s) => s.openFile)
  const openPath = useEditorStore((s) => s.openPath)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Without Firebase configured, the vault behaves exactly as a local-only app (no auth gate).
  // With it configured, the vault only loads once we know who's signed in — and re-loads
  // (pulling that account's cloud copy) whenever the signed-in user changes.
  useEffect(() => {
    if (!isFirebaseConfigured) {
      void initVault()
      return
    }
    if (!authInitializing && authUser) {
      void initVault()
    }
  }, [authInitializing, authUser, initVault])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  if (isFirebaseConfigured) {
    if (authInitializing) return null
    if (!authUser) return <SignInScreen />
  }

  if (status === 'checking') return null

  if (status !== 'unlocked') {
    return <UnlockScreen />
  }

  function handleSelectFile(path: string) {
    const repo = getActiveRepo(settings)
    if (!settings?.githubToken || !repo) return
    void openPath(settings.githubToken, repo, path)
  }

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-200 px-3 py-1.5 dark:border-neutral-800">
        <span className="text-sm font-semibold">VIBE MD</span>
        <div className="flex items-center gap-1">
          {authUser && (
            <span className="truncate px-1 text-xs text-neutral-500" title={authUser.email ?? undefined}>
              {authUser.email ?? authUser.displayName}
            </span>
          )}
          <button
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
          <button
            className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            onClick={lock}
          >
            Lock
          </button>
          <button
            className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-200 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-red-400"
            onClick={() => {
              if (
                confirm(
                  isFirebaseConfigured
                    ? 'Log out and erase the GitHub token and repo settings stored in this browser and in the cloud?'
                    : 'Log out and erase the GitHub token and repo settings stored in this browser?',
                )
              ) {
                logout()
              }
            }}
          >
            Logout
          </button>
          {isFirebaseConfigured && authUser && (
            <button
              className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              onClick={() => void signOutUser()}
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          activePath={openFile?.path ?? null}
          onSelect={handleSelectFile}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <main className="min-w-0 flex-1">
          <EditorPane />
        </main>
      </div>

      <StatusBar />

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

export default App
