import { describe, expect, it } from 'vitest'
import { diffNodes, nodesEqual } from '../src/utils/diff'
import type { ComarkElement, ComarkNode } from '../src/types'

describe('nodesEqual', () => {
  it('returns true for identical string nodes', () => {
    expect(nodesEqual('hello', 'hello')).toBe(true)
  })

  it('returns false for different string nodes', () => {
    expect(nodesEqual('hello', 'world')).toBe(false)
  })

  it('returns true for same reference', () => {
    const node: ComarkElement = ['p', {}, 'text']
    expect(nodesEqual(node, node)).toBe(true)
  })

  it('returns false for string vs element', () => {
    expect(nodesEqual('text', ['p', {}, 'text'])).toBe(false)
    expect(nodesEqual(['p', {}, 'text'], 'text')).toBe(false)
  })

  it('returns true for structurally identical elements', () => {
    const a: ComarkElement = ['p', { class: 'intro' }, 'Hello']
    const b: ComarkElement = ['p', { class: 'intro' }, 'Hello']
    expect(nodesEqual(a, b)).toBe(true)
  })

  it('returns false for different tags', () => {
    const a: ComarkElement = ['p', {}, 'text']
    const b: ComarkElement = ['div', {}, 'text']
    expect(nodesEqual(a, b)).toBe(false)
  })

  it('returns false for different attributes', () => {
    const a: ComarkElement = ['p', { class: 'a' }, 'text']
    const b: ComarkElement = ['p', { class: 'b' }, 'text']
    expect(nodesEqual(a, b)).toBe(false)
  })

  it('returns false for different attribute count', () => {
    const a: ComarkElement = ['p', { class: 'a', id: 'x' }, 'text']
    const b: ComarkElement = ['p', { class: 'a' }, 'text']
    expect(nodesEqual(a, b)).toBe(false)
  })

  it('returns false for different children', () => {
    const a: ComarkElement = ['p', {}, 'Hello']
    const b: ComarkElement = ['p', {}, 'World']
    expect(nodesEqual(a, b)).toBe(false)
  })

  it('returns false for different child count', () => {
    const a: ComarkElement = ['p', {}, 'Hello', ' World']
    const b: ComarkElement = ['p', {}, 'Hello']
    expect(nodesEqual(a, b)).toBe(false)
  })

  it('ignores $ metadata key in attributes', () => {
    const a: ComarkElement = ['p', { class: 'x', $: { line: 1 } }, 'text']
    const b: ComarkElement = ['p', { class: 'x', $: { line: 99 } }, 'text']
    expect(nodesEqual(a, b)).toBe(true)
  })

  it('treats missing $ as equal to present $', () => {
    const a: ComarkElement = ['p', { class: 'x' }, 'text']
    const b: ComarkElement = ['p', { class: 'x', $: { line: 1 } }, 'text']
    expect(nodesEqual(a, b)).toBe(true)
  })

  it('compares nested elements recursively', () => {
    const a: ComarkElement = ['div', {}, ['p', {}, 'Hello ', ['strong', {}, 'World']]]
    const b: ComarkElement = ['div', {}, ['p', {}, 'Hello ', ['strong', {}, 'World']]]
    expect(nodesEqual(a, b)).toBe(true)
  })

  it('detects deep nested change', () => {
    const a: ComarkElement = ['div', {}, ['p', {}, 'Hello ', ['strong', {}, 'World']]]
    const b: ComarkElement = ['div', {}, ['p', {}, 'Hello ', ['strong', {}, 'Earth']]]
    expect(nodesEqual(a, b)).toBe(false)
  })

  it('handles elements with no children', () => {
    const a: ComarkElement = ['hr', {}]
    const b: ComarkElement = ['hr', {}]
    expect(nodesEqual(a, b)).toBe(true)
  })
})

describe('diffNodes', () => {
  it('returns the new array when old is empty', () => {
    const newNodes: ComarkNode[] = [['p', {}, 'text']]
    const result = diffNodes([], newNodes)
    expect(result).toEqual(newNodes)
  })

  it('returns old array when nothing changed', () => {
    const nodes: ComarkNode[] = [
      ['h1', { id: 'title' }, 'Title'],
      ['p', {}, 'Body text'],
    ]
    // Create structurally identical new nodes
    const newNodes: ComarkNode[] = [
      ['h1', { id: 'title' }, 'Title'],
      ['p', {}, 'Body text'],
    ]
    const result = diffNodes(nodes, newNodes)
    // Should return the old array reference since nothing changed
    expect(result).toBe(nodes)
  })

  it('preserves reference for unchanged nodes', () => {
    const heading: ComarkElement = ['h1', { id: 'hello' }, 'Hello']
    const paragraph: ComarkElement = ['p', {}, 'World']
    const oldNodes: ComarkNode[] = [heading, paragraph]

    // Only the paragraph changed
    const newNodes: ComarkNode[] = [
      ['h1', { id: 'hello' }, 'Hello'],
      ['p', {}, 'World!!'],
    ]

    const result = diffNodes(oldNodes, newNodes)

    // Heading should be the SAME reference (preserved)
    expect(result[0]).toBe(heading)
    // Paragraph should be a DIFFERENT reference (changed)
    expect(result[1]).not.toBe(paragraph)
    expect(result[1]).toBe(newNodes[1])
  })

  it('handles new nodes being longer', () => {
    const heading: ComarkElement = ['h1', {}, 'Title']
    const oldNodes: ComarkNode[] = [heading]
    const newNodes: ComarkNode[] = [
      ['h1', {}, 'Title'],
      ['p', {}, 'New paragraph'],
    ]

    const result = diffNodes(oldNodes, newNodes)
    expect(result.length).toBe(2)
    expect(result[0]).toBe(heading) // preserved
    expect(result[1]).toBe(newNodes[1]) // new
  })

  it('handles new nodes being shorter', () => {
    const heading: ComarkElement = ['h1', {}, 'Title']
    const oldNodes: ComarkNode[] = [heading, ['p', {}, 'Removed']]
    const newNodes: ComarkNode[] = [['h1', {}, 'Title']]

    const result = diffNodes(oldNodes, newNodes)
    expect(result.length).toBe(1)
    expect(result[0]).toBe(heading) // preserved
  })

  it('handles empty new array', () => {
    const oldNodes: ComarkNode[] = [['p', {}, 'text']]
    const result = diffNodes(oldNodes, [])
    expect(result).toEqual([])
  })

  it('preserves multiple unchanged nodes in a streaming scenario', () => {
    // Simulate streaming: each update appends to the last node
    const h1: ComarkElement = ['h1', { id: 'hello' }, 'Hello']
    const p1: ComarkElement = ['p', {}, 'First paragraph']
    const p2: ComarkElement = ['p', {}, 'Second paragraph']
    const oldNodes: ComarkNode[] = [h1, p1, p2]

    // Only p2 changed (streaming appends text)
    const newNodes: ComarkNode[] = [
      ['h1', { id: 'hello' }, 'Hello'],
      ['p', {}, 'First paragraph'],
      ['p', {}, 'Second paragraph with more text'],
    ]

    const result = diffNodes(oldNodes, newNodes)
    expect(result[0]).toBe(h1) // preserved
    expect(result[1]).toBe(p1) // preserved
    expect(result[2]).not.toBe(p2) // changed
    expect(result[2]).toBe(newNodes[2]) // uses new reference
  })

  it('ignores $ metadata in diff comparison', () => {
    const oldNode: ComarkElement = ['p', { $: { line: 1 } }, 'text']
    const newNode: ComarkElement = ['p', { $: { line: 5 } }, 'text']
    const result = diffNodes([oldNode], [newNode])
    // Nodes are structurally equal (ignoring $), so old reference should be preserved
    expect(result[0]).toBe(oldNode)
  })
})
