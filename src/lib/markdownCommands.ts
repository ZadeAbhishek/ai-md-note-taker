import { EditorSelection, type EditorView } from '@uiw/react-codemirror'

/** Wraps each selection range with `before`/`after`, placing the cursor inside an empty wrap. */
export function wrapSelection(view: EditorView, before: string, after: string = before) {
  const { state } = view
  const changes = state.changeByRange((range) => {
    const selectedText = state.sliceDoc(range.from, range.to)
    const insert = `${before}${selectedText}${after}`
    const newRange = selectedText
      ? EditorSelection.range(
          range.from + before.length,
          range.from + before.length + selectedText.length,
        )
      : EditorSelection.cursor(range.from + before.length)
    return { changes: { from: range.from, to: range.to, insert }, range: newRange }
  })
  view.dispatch(state.update(changes))
  view.focus()
}

/** Adds (or removes, if already present) a fixed prefix on every line touched by the selection. */
export function toggleLinePrefix(view: EditorView, prefix: string) {
  const { state } = view
  const changes: { from: number; to: number; insert: string }[] = []
  const linesTouched = new Set<number>()

  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number
    const endLine = state.doc.lineAt(range.to).number
    for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
      if (linesTouched.has(lineNo)) continue
      linesTouched.add(lineNo)
      const line = state.doc.line(lineNo)
      if (line.text.startsWith(prefix)) {
        changes.push({ from: line.from, to: line.from + prefix.length, insert: '' })
      } else {
        changes.push({ from: line.from, to: line.from, insert: prefix })
      }
    }
  }

  view.dispatch(state.update({ changes }))
  view.focus()
}

/** Sets (or clears, if already at that level) an ATX heading level on every selected line. */
export function setHeadingLevel(view: EditorView, level: 1 | 2 | 3) {
  const { state } = view
  const prefix = `${'#'.repeat(level)} `
  const changes: { from: number; to: number; insert: string }[] = []
  const linesTouched = new Set<number>()

  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number
    const endLine = state.doc.lineAt(range.to).number
    for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
      if (linesTouched.has(lineNo)) continue
      linesTouched.add(lineNo)
      const line = state.doc.line(lineNo)
      const existing = /^#{1,6}\s+/.exec(line.text)
      if (existing) {
        const replacement = existing[0].trimEnd() === prefix.trimEnd() ? '' : prefix
        changes.push({ from: line.from, to: line.from + existing[0].length, insert: replacement })
      } else {
        changes.push({ from: line.from, to: line.from, insert: prefix })
      }
    }
  }

  view.dispatch(state.update({ changes }))
  view.focus()
}

/** Inserts a `[text](https://)` link, selecting the url placeholder for quick editing. */
export function insertLink(view: EditorView) {
  const { state } = view
  const url = 'https://'
  const changes = state.changeByRange((range) => {
    const selectedText = state.sliceDoc(range.from, range.to) || 'link text'
    const insert = `[${selectedText}](${url})`
    const urlFrom = range.from + 1 + selectedText.length + 2
    const urlTo = urlFrom + url.length
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(urlFrom, urlTo),
    }
  })
  view.dispatch(state.update(changes))
  view.focus()
}

/** Wraps the selection in a fenced code block on its own lines. */
export function insertCodeBlock(view: EditorView) {
  const { state } = view
  const changes = state.changeByRange((range) => {
    const selectedText = state.sliceDoc(range.from, range.to)
    const insert = `\`\`\`\n${selectedText}\n\`\`\``
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(range.from + 4, range.from + 4 + selectedText.length),
    }
  })
  view.dispatch(state.update(changes))
  view.focus()
}

/** Inserts a horizontal rule at the cursor, on its own blank-padded line. */
export function insertHorizontalRule(view: EditorView) {
  const { state } = view
  const pos = state.selection.main.to
  view.dispatch(state.update({ changes: { from: pos, to: pos, insert: '\n\n---\n\n' } }))
  view.focus()
}
