import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
}

export function MarkdownPreview({ content }: Props) {
  return (
    <div className="prose dark:prose-invert h-full max-w-none overflow-y-auto bg-white px-6 py-4 text-sm dark:bg-neutral-900">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
