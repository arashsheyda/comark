import { bench, run, barplot, group } from 'mitata'
import MarkdownIt from 'markdown-it'
import MarkdownExit from 'markdown-exit'
import pluginMdc from '@comark/markdown-it'
import { createParse } from 'comark'
import { renderHTML } from '../packages/comark-html/src/index.ts'

// Sample markdown content to test with
const sampleMarkdown = `---
title: Benchmark Test
---

# Hello World

This is a **markdown** document with *italic* text and [links](https://example.com).

## Features

- List item 1
- List item 2
- List item 3

### Code Block

\`\`\`javascript
const hello = 'world'
console.log(hello)
\`\`\`

### Tables

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

### MDC Components

::alert{type="info"}
This is an alert component
::

::card{title="My Card"}
Card content here
::

### More Content

1. Numbered list
2. Another item
3. Final item

> This is a blockquote with some **bold** text

~~Strikethrough text~~

`

// Initialize markdown-it with MDC plugin
const markdownIt = new MarkdownIt({
  html: true,
  linkify: true,
})
  .enable(['table', 'strikethrough'])
  .use(pluginMdc)

// Initialize markdown-exit with MDC plugin
const markdownExit = new MarkdownExit({
  html: true,
  linkify: true,
})
  .enable(['table', 'strikethrough'])
  .use(pluginMdc)

const comark = createParse()
const comarkNoClose = createParse({ autoClose: false })
const comarkStreaming = createParse()

// All renderers in one group for direct comparison.
// markdown-it/exit render tokens straight to HTML.
// comark builds a structured AST first, then renders — the AST is what
// Vue/React/Svelte renderers consume directly (no HTML intermediary needed).

barplot(() => {
  group('render', () => {
    bench('markdown-it (tokens → HTML)', () => {
      markdownIt.render(sampleMarkdown)
    })

    bench('markdown-exit (tokens → HTML)', () => {
      markdownExit.render(sampleMarkdown)
    })

    bench('comark (AST → HTML)', async () => {
      const tree = await comark(sampleMarkdown)
      renderHTML(tree)
    })

    bench('comark no auto-close (AST → HTML)', async () => {
      const tree = await comarkNoClose(sampleMarkdown)
      renderHTML(tree)
    })

    bench('comark streaming (AST → HTML)', async () => {
      const tree = await comarkStreaming(sampleMarkdown, { streaming: true })
      renderHTML(tree)
    })
  })
})

// Run all benchmarks
console.log('🏃 Running benchmarks...\n')
await run()
