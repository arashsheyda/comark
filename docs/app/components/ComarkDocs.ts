import { defineComarkComponent } from 'comark/vue'
import comarkMath from '@comark/math'
import comarkMermaid from '@comark/mermaid'
import { Math } from '@comark/math/vue'
import { Mermaid } from '@comark/mermaid/vue'
import comarkCjk from '@comark/cjk'
import ProsePre from './landing/ProsePre.vue'

export default defineComarkComponent({
  name: 'ComarkDocs',
  plugins: [
    comarkMath(),
    comarkMermaid(),
    comarkCjk(),
  ],
  components: {
    Math,
    Mermaid,
    ProsePre,
  },
  highlight: {
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
})
