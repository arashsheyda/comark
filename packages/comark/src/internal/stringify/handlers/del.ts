import type { State } from '../types'
import type { ComarkElement } from '../../../ast/types'
import { textContent } from '../../../ast/index.ts'

export function del(node: ComarkElement, _: State) {
  return `~~${textContent(node)}~~`
}
