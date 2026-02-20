import comarkEmoji from './emoji'
import comarkToc from './toc'
import comarkSummary from './summary'

export const essentials = [
  comarkEmoji(),
  comarkToc(),
  comarkSummary('<!-- more -->'),
]
