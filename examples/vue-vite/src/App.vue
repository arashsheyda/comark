<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { MDC } from 'mdc-syntax/vue'
import CustomAlert from './components/CustomAlert.vue'
import CustomHeading from './components/CustomHeading.vue'
import StreamingPreview from './components/StreamingPreview.vue'

const sampleMarkdown = `# MDC Syntax for Vue

Welcome to **MDC Syntax** - a powerful markdown parser built for the *AI era*.

## Features

- 🚀 **5.5x faster** than regex-based parsers
- ⚡ O(n) linear-time algorithm
- 🔄 Streaming support for real-time rendering
- 🎨 Custom component support
- 📦 Zero dependencies

## Code Example

Here's a simple Vue example:

\`\`\`vue
<script setup>
import { MDC } from 'mdc-syntax/vue'

const markdown = \`# Hello **World**\`\n<`
  + `/script>

<template>
  <MDC :markdown="markdown" />
</template>
\`\`\`

## Custom Components

MDC supports custom Vue-like components:

::alert{type="success"}
This is a **success** alert with custom styling!
::

::alert{type="warning"}
⚠️ This parser handles streaming markdown correctly, even with incomplete syntax.
::

## Lists

### Ordered List
1. First item
2. Second item
3. Third item

### Unordered List
- React support
- Vue support
- TypeScript support
- Zero dependencies

## Links & Formatting

Visit [MDC Syntax on GitHub](https://github.com/nuxt-content/mdc-syntax) for more information.

You can use *italic*, **bold**, and even ~~strikethrough~~ text.

## Blockquotes

> "The development of full artificial intelligence could spell the end of the human race."
> — Stephen Hawking

## Tables

| Feature | MDC Syntax | Traditional Parsers |
|---------|-----------|---------------------|
| Speed | 5.5x faster | Baseline |
| Streaming | ✅ Auto-close | ❌ Broken |
| Algorithm | O(n) | O(n²) or worse |

---

## Try It Yourself

Edit the markdown below to see it update in real-time!
`

const markdown = ref(sampleMarkdown)
const useCustom = ref(true)
const mode = ref<'editor' | 'streaming'>('editor')

const customComponents = computed<Record<string, Component>>(() => {
  if (!useCustom.value) return {}
  return {
    alert: CustomAlert,
    h1: CustomHeading,
  }
})
</script>

<template>
  <Suspense>
    <div class="h-screen flex flex-col overflow-hidden max-w-[1400px] mx-auto">
      <header class="flex-shrink-0 text-center py-6 px-8 border-b-2 border-neutral-200 dark:border-neutral-700">
        <h1 class="text-4xl bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent">
          MDC Syntax - Vue Example
        </h1>
        <p class="mt-2 text-neutral-500 dark:text-neutral-400">
          Interactive markdown editor with live preview & streaming support
        </p>
      </header>

      <div class="flex-shrink-0 px-8 py-4 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div class="flex items-center gap-4 flex-wrap">
          <button
            :class="[
              'px-4 py-2 rounded-lg transition-colors',
              mode === 'editor'
                ? 'bg-green-500 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600',
            ]"
            @click="mode = 'editor'"
          >
            Editor Mode
          </button>
          <button
            :class="[
              'px-4 py-2 rounded-lg transition-colors',
              mode === 'streaming'
                ? 'bg-green-500 text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600',
            ]"
            @click="mode = 'streaming'"
          >
            Streaming Demo
          </button>
          <label class="flex items-center gap-2 cursor-pointer text-[0.95rem]">
            <input
              v-model="useCustom"
              type="checkbox"
              class="w-5 h-5 cursor-pointer"
            >
            Use custom components
          </label>
        </div>
      </div>

      <div class="flex-1 overflow-hidden px-8 py-6">
        <!-- Editor Mode -->
        <div
          v-if="mode === 'editor'"
          class="grid grid-cols-1 md:grid-cols-2 gap-6 h-full"
        >
          <div class="flex flex-col min-h-0">
            <h2 class="mb-3 text-xl text-neutral-800 dark:text-neutral-100">
              Markdown Input
            </h2>
            <textarea
              v-model="markdown"
              placeholder="Enter markdown here..."
              class="flex-1 w-full p-4 font-mono text-sm leading-relaxed border-2 border-neutral-200 dark:border-neutral-700 rounded-lg resize-none bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 overflow-y-auto"
            />
          </div>

          <div class="flex flex-col min-h-0">
            <h2 class="mb-3 text-xl text-neutral-800 dark:text-neutral-100">
              Live Preview
            </h2>
            <div class="flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-800 overflow-y-auto">
              <div class="leading-relaxed">
                <MDC
                  :markdown="markdown"
                  :components="customComponents"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Streaming Mode -->
        <div
          v-else
          class="h-full flex flex-col space-y-4 overflow-y-auto"
        >
          <div class="flex-shrink-0 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r">
            <h3 class="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              🔄 Streaming Demo
            </h3>
            <p class="text-green-800 dark:text-green-200 text-sm">
              Watch as markdown content streams in character-by-character, with automatic handling of incomplete syntax.
              This demonstrates MDC Syntax's unique ability to render partial markdown correctly.
            </p>
          </div>

          <div class="flex-1 min-h-0">
            <StreamingPreview
              :markdown="markdown"
              :chunk-size="10"
              :delay-ms="30"
              :components="customComponents"
            />
          </div>
        </div>
      </div>
    </div>
  </Suspense>
</template>
