import { describe, expect, it } from 'vitest'
import { createParse } from '../src/index'
import { diffNodes, nodesEqual } from '../src/utils/diff'
import type { ComarkNode, ComarkTree } from '../src/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function measureTimeMs(fn: () => void, iterations: number): number {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  return (performance.now() - start) / iterations
}

function countNodes(nodes: ComarkNode[]): number {
  let count = 0
  for (const node of nodes) {
    count++
    if (Array.isArray(node) && node.length > 2) {
      count += countNodes(node.slice(2) as ComarkNode[])
    }
  }
  return count
}

function countPreservedTopLevel(oldNodes: ComarkNode[], newNodes: ComarkNode[]): number {
  let preserved = 0
  const len = Math.min(oldNodes.length, newNodes.length)
  for (let i = 0; i < len; i++) {
    if (oldNodes[i] === newNodes[i]) preserved++
  }
  return preserved
}

// ---------------------------------------------------------------------------
// Test content
// ---------------------------------------------------------------------------

const document = `# Introduction

This is the **introduction** paragraph with some *italic* text.

## Features

- Fast synchronous parsing
- Streaming support
- Component syntax

### Code Example

\`\`\`javascript
const parse = createParse()
const tree = await parse(content)
console.log(tree.nodes)
\`\`\`

## Architecture

The parser uses a **multi-stage** pipeline:

1. Frontmatter extraction
2. Token generation
3. AST conversion
4. Plugin post-processing

> Comark extends standard Markdown with component syntax, enabling
> rich interactive documents.

::alert{type="info"}
This is an alert component with **bold** content.
::

## Conclusion

Thank you for reading this document.
`

// Simulates streaming: progressively longer content
const streamingSteps = [
  '# Title\n\nHello',
  '# Title\n\nHello World',
  '# Title\n\nHello World\n\n## Section',
  '# Title\n\nHello World\n\n## Section\n\nMore content here.',
  '# Title\n\nHello World\n\n## Section\n\nMore content here.\n\n- Item 1',
  '# Title\n\nHello World\n\n## Section\n\nMore content here.\n\n- Item 1\n- Item 2',
  '# Title\n\nHello World\n\n## Section\n\nMore content here.\n\n- Item 1\n- Item 2\n- Item 3',
  '# Title\n\nHello World\n\n## Section\n\nMore content here.\n\n- Item 1\n- Item 2\n- Item 3\n\n## Another Section\n\nFinal paragraph.',
]

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

describe('diffNodes benchmark — before vs after', () => {
  it('reference preservation: editing last paragraph only', async () => {
    const parse = createParse()

    const tree1 = await parse(document)
    // Change only the last paragraph
    const modified = document.replace('Thank you for reading this document.', 'Thank you for reading this updated document!')
    const tree2 = await parse(modified)

    const totalNodes = tree1.nodes.length
    const preserved = countPreservedTopLevel(tree1.nodes, tree2.nodes)
    const changed = totalNodes - preserved
    const preservedPct = ((preserved / totalNodes) * 100).toFixed(1)

    console.log('\n=== Reference Preservation: Edit Last Paragraph ===')
    console.log(`Total top-level nodes: ${totalNodes}`)
    console.log(`Preserved (same ref):  ${preserved} (${preservedPct}%)`)
    console.log(`Changed (new ref):     ${changed}`)

    expect(preserved).toBeGreaterThan(0)
    expect(preserved).toBe(totalNodes - 1) // Only the last node should change
  })

  it('reference preservation: editing heading only', async () => {
    const parse = createParse()

    const tree1 = await parse(document)
    const modified = document.replace('# Introduction', '# Updated Title')
    const tree2 = await parse(modified)

    const totalNodes = tree2.nodes.length
    const preserved = countPreservedTopLevel(tree1.nodes, tree2.nodes)
    const preservedPct = ((preserved / totalNodes) * 100).toFixed(1)

    console.log('\n=== Reference Preservation: Edit Heading ===')
    console.log(`Total top-level nodes: ${totalNodes}`)
    console.log(`Preserved (same ref):  ${preserved} (${preservedPct}%)`)
    console.log(`Changed (new ref):     ${totalNodes - preserved}`)

    // Everything after the heading should be preserved
    expect(preserved).toBe(totalNodes - 1)
  })

  it('reference preservation: no changes', async () => {
    const parse = createParse()

    const tree1 = await parse(document)
    const tree2 = await parse(document)

    const totalNodes = tree1.nodes.length
    const preserved = countPreservedTopLevel(tree1.nodes, tree2.nodes)

    console.log('\n=== Reference Preservation: No Changes ===')
    console.log(`Total top-level nodes: ${totalNodes}`)
    console.log(`Preserved (same ref):  ${preserved} (100%)`)

    // Same array reference returned when nothing changed
    expect(tree2.nodes).toBe(tree1.nodes)
  })

  it('streaming: progressive reference preservation', async () => {
    const parse = createParse()

    console.log('\n=== Streaming: Progressive Reference Preservation ===')
    console.log('Step'.padEnd(6), 'Nodes'.padEnd(8), 'Preserved'.padEnd(12), 'Changed'.padEnd(10), 'Preservation %')
    console.log('-'.repeat(60))

    let prevTree: ComarkTree | null = null

    for (let step = 0; step < streamingSteps.length; step++) {
      const tree = await parse(streamingSteps[step], { streaming: true })

      if (prevTree) {
        const total = tree.nodes.length
        const preserved = countPreservedTopLevel(prevTree.nodes, tree.nodes)
        const changed = total - preserved
        const pct = ((preserved / total) * 100).toFixed(1)

        console.log(
          `${step + 1}`.padEnd(6),
          `${total}`.padEnd(8),
          `${preserved}`.padEnd(12),
          `${changed}`.padEnd(10),
          `${pct}%`,
        )

        // At least some nodes should be preserved in each step
        if (total > 1) {
          expect(preserved).toBeGreaterThan(0)
        }
      }
      else {
        console.log(`${step + 1}`.padEnd(6), `${tree.nodes.length}`.padEnd(8), '(initial)'.padEnd(12), '-'.padEnd(10), '-')
      }

      prevTree = tree
    }
  })

  it('diffNodes performance: large document', async () => {
    // Generate a large document with 100 nodes
    const lines: string[] = []
    for (let i = 0; i < 50; i++) {
      lines.push(`## Section ${i}\n\nParagraph content for section ${i}.`)
    }
    const largeDoc = lines.join('\n\n')

    const parse = createParse()
    const oldTree = await parse(largeDoc)

    // Change only the last section
    const modifiedDoc = largeDoc.replace('section 49', 'section 49 (modified)')
    const newTree = await parse(modifiedDoc)

    const totalNodes = newTree.nodes.length
    const preserved = countPreservedTopLevel(oldTree.nodes, newTree.nodes)

    // Benchmark: diffNodes speed
    const iterations = 1000
    const withDiffTime = measureTimeMs(
      () => diffNodes(oldTree.nodes, newTree.nodes),
      iterations,
    )

    // Benchmark: full nodesEqual comparison (what you'd do without diffNodes)
    const fullCompareTime = measureTimeMs(() => {
      for (let i = 0; i < newTree.nodes.length; i++) {
        if (i < oldTree.nodes.length) nodesEqual(oldTree.nodes[i], newTree.nodes[i])
      }
    }, iterations)

    // Benchmark: naive approach (no diffing, create all new)
    const naiveTime = measureTimeMs(() => {
      const result = [...newTree.nodes]
      // Simulate accessing all nodes (what renderers do)
      for (let i = 0; i < result.length; i++) {
        const _node = result[i]
      }
    }, iterations)

    console.log(`\n=== diffNodes Performance: ${totalNodes} top-level nodes ===`)
    console.log(`Preserved:              ${preserved}/${totalNodes} (${((preserved / totalNodes) * 100).toFixed(1)}%)`)
    console.log(`diffNodes avg:          ${(withDiffTime * 1000).toFixed(2)}µs`)
    console.log(`nodesEqual compare avg: ${(fullCompareTime * 1000).toFixed(2)}µs`)
    console.log(`naive copy avg:         ${(naiveTime * 1000).toFixed(2)}µs`)
    console.log(`diffNodes overhead:     ${(withDiffTime / naiveTime).toFixed(2)}x vs naive copy`)

    expect(preserved).toBe(totalNodes - 1)
  })

  it('parse-level diffing: full re-parse vs incremental cost', async () => {
    const iterations = 50

    // Without diffing (fresh parser each time — no state carried over)
    const freshTimings: number[] = []
    for (let i = 0; i < iterations; i++) {
      const freshParse = createParse()
      const start = performance.now()
      await freshParse(document)
      const modified = document.replace('Thank you for reading this document.', `Iteration ${i}`)
      await freshParse(modified)
      freshTimings.push(performance.now() - start)
    }
    const avgFreshTime = freshTimings.reduce((a, b) => a + b, 0) / freshTimings.length

    // With diffing (reuse parser — diffNodes kicks in on second parse)
    const reuseTimings: number[] = []
    for (let i = 0; i < iterations; i++) {
      const reuseParse = createParse()
      const start = performance.now()
      const tree1 = await reuseParse(document)
      const modified = document.replace('Thank you for reading this document.', `Iteration ${i}`)
      const tree2 = await reuseParse(modified)
      reuseTimings.push(performance.now() - start)

      // Verify diffing actually works
      const preserved = countPreservedTopLevel(tree1.nodes, tree2.nodes)
      expect(preserved).toBeGreaterThan(0)
    }
    const avgReuseTime = reuseTimings.reduce((a, b) => a + b, 0) / reuseTimings.length

    console.log('\n=== Parse + DiffNodes: Two-Parse Cycle ===')
    console.log(`Fresh parser (no diff state): ${avgFreshTime.toFixed(3)}ms avg`)
    console.log(`Reused parser (with diff):    ${avgReuseTime.toFixed(3)}ms avg`)
    console.log(`Overhead:                     ${((avgReuseTime / avgFreshTime - 1) * 100).toFixed(1)}%`)
    console.log(`(Overhead is the cost of diffNodes; benefit is downstream render skipping)`)
  })

  it('render savings estimate: nodes skipped per framework re-render', async () => {
    const parse = createParse()

    const tree1 = await parse(document)
    const totalNodeCount = countNodes(tree1.nodes)

    // Simulate typical edits and measure what percentage of the tree is preserved
    const edits = [
      { name: 'Edit last paragraph', content: document.replace('Thank you for reading this document.', 'Updated.') },
      { name: 'Edit heading', content: document.replace('# Introduction', '# Intro') },
      { name: 'Edit code block', content: document.replace('const parse = createParse()', 'const p = createParse()') },
      { name: 'Edit alert content', content: document.replace('This is an alert component', 'Updated alert') },
      { name: 'No change', content: document },
    ]

    console.log(`\n=== Render Savings Estimate (${tree1.nodes.length} top-level, ${totalNodeCount} total nodes) ===`)
    console.log('Edit'.padEnd(25), 'Preserved'.padEnd(12), 'Changed'.padEnd(10), 'Top-level skip %')
    console.log('-'.repeat(65))

    for (const edit of edits) {
      const tree2 = await parse(edit.content)
      const preserved = countPreservedTopLevel(tree1.nodes, tree2.nodes)
      const total = tree2.nodes.length
      const pct = ((preserved / total) * 100).toFixed(1)

      console.log(
        edit.name.padEnd(25),
        `${preserved}/${total}`.padEnd(12),
        `${total - preserved}`.padEnd(10),
        `${pct}%`,
      )
    }
  })
})
