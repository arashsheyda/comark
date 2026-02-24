import comarkEmoji from './emoji'
import comarkToc from './toc'
import comarkSummary from './summary'
import comarkSecurity from './security'

export const essentials = [
  comarkEmoji(),
  comarkToc(),
  comarkSummary('<!-- more -->'),
  comarkSecurity({
    drop: ['script'],
  }),
]
