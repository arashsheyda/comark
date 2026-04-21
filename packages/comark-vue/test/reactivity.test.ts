import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { parse } from 'comark'
import { diffNodes, nodesEqual } from 'comark/utils'
import type { ComarkTree } from 'comark'
import { ComarkRenderer } from '../src/index'

async function mountAndRender(component: any, props: Record<string, any> = {}) {
  const app = createSSRApp({
    setup() {
      return () => h(component, props)
    },
  })
  return renderToString(app as any)
}

describe('reactivity: diffNodes preserves node references', () => {
  it('preserves unchanged heading when paragraph changes', async () => {
    const tree1 = await parse('# Hello\n\nWorld')
    const tree2 = await parse('# Hello\n\nWorld!!')

    const diffed = diffNodes(tree1.nodes, tree2.nodes)

    // Heading node is structurally identical — reference should be preserved
    expect(diffed[0]).toBe(tree1.nodes[0])
    // Paragraph changed — new reference
    expect(diffed[1]).not.toBe(tree1.nodes[1])
  })

  it('preserves all nodes when nothing changes', async () => {
    const tree1 = await parse('# Hello\n\nWorld')
    const tree2 = await parse('# Hello\n\nWorld')

    const diffed = diffNodes(tree1.nodes, tree2.nodes)

    // All nodes unchanged — the old array itself should be returned
    expect(diffed).toBe(tree1.nodes)
  })

  it('works correctly in a streaming simulation', async () => {
    // Simulate incremental streaming: each step appends more text
    const step1 = await parse('# Title\n\nHello')
    const step2 = await parse('# Title\n\nHello World')
    const step3 = await parse('# Title\n\nHello World\n\nNew paragraph')

    // Step 1 → Step 2: heading preserved, paragraph changed
    const diff1 = diffNodes(step1.nodes, step2.nodes)
    expect(diff1[0]).toBe(step1.nodes[0]) // heading preserved

    // Step 2 → Step 3: heading preserved from diff1, old paragraph preserved, new paragraph added
    const diff2 = diffNodes(diff1, step3.nodes)
    expect(diff2[0]).toBe(step1.nodes[0]) // heading still original reference
    expect(diff2.length).toBe(3) // new paragraph added
  })
})

describe('reactivity: ComarkRenderer renders correctly with diffed trees', () => {
  it('renders initial tree correctly', async () => {
    const tree = await parse('# Hello\n\nWorld')
    const html = await mountAndRender(ComarkRenderer, { tree })

    expect(html).toContain('<h1')
    expect(html).toContain('Hello')
    expect(html).toContain('<p')
    expect(html).toContain('World')
  })

  it('renders correctly after diffNodes update', async () => {
    const tree1 = await parse('# Hello\n\nWorld')
    const tree2 = await parse('# Hello\n\nWorld!!')

    // Apply diffNodes to preserve references
    const diffedNodes = diffNodes(tree1.nodes, tree2.nodes)
    const diffedTree: ComarkTree = { ...tree2, nodes: diffedNodes }

    const html = await mountAndRender(ComarkRenderer, { tree: diffedTree })

    expect(html).toContain('Hello')
    expect(html).toContain('World!!')
  })

  it('renders correctly with streaming caret', async () => {
    const tree = await parse('# Hello\n\nWorld')
    const html = await mountAndRender(ComarkRenderer, {
      tree,
      streaming: true,
      caret: true,
    })

    expect(html).toContain('Hello')
    expect(html).toContain('World')
    // Caret is rendered as a span with pulse animation
    expect(html).toContain('animation: pulse')
  })

  it('renders correctly with streaming caret after diffNodes', async () => {
    const tree1 = await parse('# Hello\n\nWorld')
    const tree2 = await parse('# Hello\n\nWorld!!')

    const diffedNodes = diffNodes(tree1.nodes, tree2.nodes)
    const diffedTree: ComarkTree = { ...tree2, nodes: diffedNodes }

    const html = await mountAndRender(ComarkRenderer, {
      tree: diffedTree,
      streaming: true,
      caret: true,
    })

    expect(html).toContain('Hello')
    expect(html).toContain('World!!')
    expect(html).toContain('animation: pulse')
  })

  it('caret does not corrupt preserved node references', async () => {
    const tree1 = await parse('# Hello\n\nWorld')
    const tree2 = await parse('# Hello\n\nWorld!!')

    // Apply diffNodes — heading is preserved
    const diffed = diffNodes(tree1.nodes, tree2.nodes)
    expect(diffed[0]).toBe(tree1.nodes[0])

    // Render with caret (which previously mutated the last node)
    const diffedTree: ComarkTree = { ...tree2, nodes: diffed }
    await mountAndRender(ComarkRenderer, {
      tree: diffedTree,
      streaming: true,
      caret: true,
    })

    // After rendering, the preserved heading should NOT have caret appended
    // (caret should only affect the cloned last node)
    expect(nodesEqual(diffed[0], tree1.nodes[0])).toBe(true)
    // The original heading should still have exactly 3 elements: [tag, attrs, text]
    const heading = diffed[0] as any[]
    expect(heading.length).toBe(3)
  })
})
