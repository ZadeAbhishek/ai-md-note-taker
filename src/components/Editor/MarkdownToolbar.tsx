import type { EditorView } from '@uiw/react-codemirror'
import {
  insertCodeBlock,
  insertHorizontalRule,
  insertLink,
  setHeadingLevel,
  toggleLinePrefix,
  wrapSelection,
} from '../../lib/markdownCommands'

interface Props {
  view: EditorView | undefined
}

function ToolbarButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-40 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      {children}
    </button>
  )
}

export function MarkdownToolbar({ view }: Props) {
  const disabled = !view

  function run(fn: (view: EditorView) => void) {
    if (view) fn(view)
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-neutral-50 px-2 py-1 dark:border-neutral-800 dark:bg-neutral-950">
      <ToolbarButton title="Heading 1" disabled={disabled} onClick={() => run((v) => setHeadingLevel(v, 1))}>
        H1
      </ToolbarButton>
      <ToolbarButton title="Heading 2" disabled={disabled} onClick={() => run((v) => setHeadingLevel(v, 2))}>
        H2
      </ToolbarButton>
      <ToolbarButton title="Heading 3" disabled={disabled} onClick={() => run((v) => setHeadingLevel(v, 3))}>
        H3
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-neutral-300 dark:bg-neutral-800" />
      <ToolbarButton title="Bold" disabled={disabled} onClick={() => run((v) => wrapSelection(v, '**'))}>
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton title="Italic" disabled={disabled} onClick={() => run((v) => wrapSelection(v, '*'))}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" disabled={disabled} onClick={() => run((v) => wrapSelection(v, '~~'))}>
        <span className="line-through">S</span>
      </ToolbarButton>
      <ToolbarButton title="Inline code" disabled={disabled} onClick={() => run((v) => wrapSelection(v, '`'))}>
        {'</>'}
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-neutral-300 dark:bg-neutral-800" />
      <ToolbarButton title="Bulleted list" disabled={disabled} onClick={() => run((v) => toggleLinePrefix(v, '- '))}>
        • List
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        disabled={disabled}
        onClick={() => run((v) => toggleLinePrefix(v, '1. '))}
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        title="Task list"
        disabled={disabled}
        onClick={() => run((v) => toggleLinePrefix(v, '- [ ] '))}
      >
        Task
      </ToolbarButton>
      <ToolbarButton title="Quote" disabled={disabled} onClick={() => run((v) => toggleLinePrefix(v, '> '))}>
        Quote
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-neutral-300 dark:bg-neutral-800" />
      <ToolbarButton title="Link" disabled={disabled} onClick={() => run(insertLink)}>
        Link
      </ToolbarButton>
      <ToolbarButton title="Code block" disabled={disabled} onClick={() => run(insertCodeBlock)}>
        {'{ }'} Block
      </ToolbarButton>
      <ToolbarButton title="Horizontal rule" disabled={disabled} onClick={() => run(insertHorizontalRule)}>
        Rule
      </ToolbarButton>
    </div>
  )
}
