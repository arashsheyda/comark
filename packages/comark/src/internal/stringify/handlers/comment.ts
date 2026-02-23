import type { State } from '../types'
import type { ComarkElement } from '../../../ast/types'

export function comment(node: ComarkElement, _state: State) {
  if (node[0] === null) {
    return `<!--${node[2]}-->` + _state.context.blockSeparator
  }

  return ''
}
