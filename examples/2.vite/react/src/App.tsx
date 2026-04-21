import { useState, useEffect, useCallback, memo } from 'react'
import { ComarkRenderer } from '@comark/react'
import { createParse } from 'comark'
import type { ComarkTree, ComarkNode, ComarkElement } from 'comark'
import Alert from './components/Alert'
import './index.css'

const defaultMarkdown = `# Hello *World*

This is a **paragraph** with some text.

## Features

- Fast parsing
- Streaming support
- Component syntax

::alert{type="info"}
This is an alert!
::

## Conclusion

Thanks for reading.
`

const parse = createParse()

// Memoized AST node viewer — react-scan will highlight when this re-renders
const ASTNode = memo(function ASTNode({ node, index }: { node: ComarkNode, index: number }) {
  if (typeof node === 'string') {
    return (
      <div className="pl-4 py-0.5 text-sm font-mono text-emerald-600 dark:text-emerald-400">
        "{node.length > 60 ? node.slice(0, 60) + '…' : node}"
      </div>
    )
  }
  const el = node as ComarkElement
  const tag = el[0]
  const attrs = el[1]
  const attrStr = Object.keys(attrs).filter(k => k !== '$').length > 0
    ? ` ${Object.entries(attrs).filter(([k]) => k !== '$').map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')}`
    : ''

  return (
    <div className="pl-4 py-0.5 border-l border-gray-200 dark:border-gray-700">
      <span className="text-sm font-mono">
        <span className="text-blue-600 dark:text-blue-400">&lt;{tag}</span>
        {attrStr && <span className="text-amber-600 dark:text-amber-400">{attrStr}</span>}
        <span className="text-blue-600 dark:text-blue-400">&gt;</span>
        <span className="text-gray-400 text-xs ml-2">#{index}</span>
      </span>
    </div>
  )
})

export default function App() {
  const [markdown, setMarkdown] = useState(defaultMarkdown)
  const [tree, setTree] = useState<ComarkTree | null>(null)
  const [parseTime, setParseTime] = useState(0)

  const doParse = useCallback(async (md: string) => {
    const start = performance.now()
    const result = await parse(md)
    setParseTime(Math.round((performance.now() - start) * 10) / 10)
    setTree(result)
  }, [])

  useEffect(() => { doParse(markdown) }, [markdown, doParse])

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 h-10 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <span className="text-sm font-semibold">Comark React + react-scan</span>
        <span className="text-xs text-gray-500">{parseTime}ms · {tree?.nodes.length ?? 0} nodes</span>
      </div>

      {/* Three-pane layout */}
      <div className="flex-1 flex min-h-0">
        {/* Editor */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            Editor
          </div>
          <textarea
            className="flex-1 p-4 font-mono text-sm resize-none bg-transparent focus:outline-none"
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            Preview
          </div>
          <div className="flex-1 overflow-auto p-4 prose prose-sm dark:prose-invert max-w-none">
            {tree && <ComarkRenderer tree={tree} components={{ Alert }} />}
          </div>
        </div>

        {/* AST */}
        <div className="w-1/3 flex flex-col">
          <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            AST Nodes (watch react-scan highlights)
          </div>
          <div className="flex-1 overflow-auto p-2">
            {tree?.nodes.map((node, i) => (
              <ASTNode key={i} node={node} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
