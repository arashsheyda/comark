import type { ComarkElement, ComarkElementAttributes, ComarkNode } from '../types'

/**
 * Compare two attribute objects for equality, ignoring the `$` metadata key.
 * Uses `for...in` to avoid intermediate array allocations.
 */
function attrsEqual(a: ComarkElementAttributes, b: ComarkElementAttributes): boolean {
  if (a === b) return true
  let aCount = 0
  for (const key in a) {
    if (key === '$') continue
    aCount++
    if (a[key] !== b[key]) return false
  }
  let bCount = 0
  for (const key in b) {
    if (key !== '$') bCount++
  }
  return aCount === bCount
}

/**
 * Deep structural equality check for two Comark nodes.
 *
 * Compares tags, attributes (excluding `$` metadata), and children recursively.
 * Returns `true` if the nodes are structurally identical, `false` otherwise.
 *
 * @param a - First node
 * @param b - Second node
 * @returns Whether the nodes are structurally equal
 */
export function nodesEqual(a: ComarkNode, b: ComarkNode): boolean {
  // Same reference — fast path
  if (a === b) return true
  // Text nodes
  if (typeof a === 'string') return a === b
  if (typeof b === 'string') return false
  // Both are element/comment arrays
  const aArr = a as ComarkElement
  const bArr = b as ComarkElement
  if (aArr.length !== bArr.length) return false
  // Compare tag (or null for comments)
  if (aArr[0] !== bArr[0]) return false
  // Compare attributes
  if (!attrsEqual(aArr[1], bArr[1])) return false
  // Compare children recursively
  for (let i = 2; i < aArr.length; i++) {
    if (!nodesEqual(aArr[i] as ComarkNode, bArr[i] as ComarkNode)) return false
  }
  return true
}

/**
 * Diff two node arrays and return a new array where unchanged nodes
 * preserve their original reference. This enables downstream consumers
 * (e.g. Vue, React) to skip re-rendering nodes that haven't changed,
 * achieving fine-grained, node-level reactivity.
 *
 * @param oldNodes - The previous node array
 * @param newNodes - The new node array
 * @returns A new array with preserved references for unchanged nodes
 *
 * @example
 * ```typescript
 * import { diffNodes } from 'comark/utils'
 *
 * const oldTree = await parse('# Hello\n\nWorld')
 * const newTree = await parse('# Hello\n\nWorld!!')
 *
 * // Preserve reference for the unchanged heading node
 * newTree.nodes = diffNodes(oldTree.nodes, newTree.nodes)
 * // newTree.nodes[0] === oldTree.nodes[0]  // true — heading unchanged
 * // newTree.nodes[1] === oldTree.nodes[1]  // false — paragraph changed
 * ```
 */
export function diffNodes(oldNodes: ComarkNode[], newNodes: ComarkNode[]): ComarkNode[] {
  const len = newNodes.length
  if (len === 0) return newNodes

  const result: ComarkNode[] = Array.from({ length: len })
  let changed = false

  for (let i = 0; i < len; i++) {
    if (i < oldNodes.length && nodesEqual(oldNodes[i], newNodes[i])) {
      // Preserve old reference — enables downstream caching
      result[i] = oldNodes[i]
    }
    else {
      result[i] = newNodes[i]
      changed = true
    }
  }

  // If nothing changed and length is the same, return the old array
  if (!changed && len === oldNodes.length) return oldNodes
  return result
}
