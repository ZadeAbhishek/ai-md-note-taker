import { markdown } from '@codemirror/lang-markdown'
import CodeMirror, { type EditorView } from '@uiw/react-codemirror'
import { useState } from 'react'
import { useThemeStore } from '../../store/themeStore'
import { MarkdownToolbar } from './MarkdownToolbar'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function MarkdownEditor({ value, onChange }: Props) {
  const [view, setView] = useState<EditorView | undefined>(undefined)
  const theme = useThemeStore((s) => s.theme)

  return (
    <div className="flex h-full flex-col">
      <MarkdownToolbar view={view} />
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={value}
          height="100%"
          theme={theme}
          extensions={[markdown()]}
          onChange={onChange}
          onCreateEditor={(editorView) => setView(editorView)}
          className="h-full text-sm"
        />
      </div>
    </div>
  )
}
