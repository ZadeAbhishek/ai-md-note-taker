import { useEffect, useState } from 'react'
import { EditorPane } from './components/Editor/EditorPane'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SettingsModal } from './components/Settings/SettingsModal'
import { StatusBar } from './components/StatusBar'
import { UnlockScreen } from './components/Vault/UnlockScreen'
import { useEditorStore } from './store/editorStore'
import { useThemeStore } from './store/themeStore'
import { useVaultStore } from './store/vaultStore'

function App() {
  const status = useVaultStore((s) => s.status)
  const init = useVaultStore((s) => s.init)
  const settings = useVaultStore((s) => s.settings)
  const lock = useVaultStore((s) => s.lock)
  const logout = useVaultStore((s) => s.logout)
  const openFile = useEditorStore((s) => s.openFile)
  const openPath = useEditorStore((s) => s.openPath)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  if (status === 'checking') return null

  if (status !== 'unlocked') {
    return <UnlockScreen />
  }

  function handleSelectFile(path: string) {
    if (!settings?.githubToken || !settings.repo) return
    void openPath(settings.githubToken, settings.repo, path)
  }

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-200 px-3 py-1.5 dark:border-neutral-800">
        <span className="text-sm font-semibold">MD Note Taker</span>
        <div className="flex items-center gap-1">
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
                  'Log out and erase the GitHub token and repo settings stored in this browser?',
                )
              ) {
                logout()
              }
            }}
          >
            Logout
          </button>
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
