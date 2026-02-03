<script setup lang="ts">
import { ref, type Component } from 'vue'
import { MDC } from 'mdc-syntax/vue'

const props = defineProps<{
  markdown: string
  chunkSize?: number
  delayMs?: number
  components?: Record<string, Component>
}>()

const accumulated = ref('')
const isStreaming = ref(false)
const progress = ref(0)
let abortController: AbortController | null = null

async function startStream() {
  if (isStreaming.value) return

  accumulated.value = ''
  progress.value = 0
  isStreaming.value = true
  abortController = new AbortController()

  const chunkSize = props.chunkSize || 10
  const delayMs = props.delayMs || 30

  for (let i = 0; i < props.markdown.length; i += chunkSize) {
    if (abortController.signal.aborted) break

    accumulated.value = props.markdown.slice(0, i + chunkSize)
    progress.value = Math.min(100, ((i + chunkSize) / props.markdown.length) * 100)

    if (i + chunkSize < props.markdown.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  isStreaming.value = false
  progress.value = 100
}

function reset() {
  if (abortController) {
    abortController.abort()
  }
  isStreaming.value = false
  accumulated.value = ''
  progress.value = 0
  abortController = null
}
</script>

<template>
  <div class="h-full flex flex-col space-y-4">
    <div class="flex-shrink-0 flex items-center gap-4">
      <button
        :disabled="isStreaming"
        class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="startStream"
      >
        {{ isStreaming ? 'Streaming...' : 'Start Stream' }}
      </button>
      <button
        :disabled="!isStreaming && progress === 0"
        class="px-4 py-2 bg-neutral-500 text-white rounded-lg hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="reset"
      >
        Reset
      </button>
      <span
        v-if="progress > 0"
        class="text-sm text-neutral-600 dark:text-neutral-400"
      >
        {{ progress.toFixed(0) }}%
      </span>
    </div>

    <div
      v-if="progress > 0"
      class="flex-shrink-0 w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden"
    >
      <div
        class="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-300"
        :style="{ width: `${progress}%` }"
      />
    </div>

    <div class="flex-1 border-2 border-neutral-200 dark:border-neutral-700 rounded-lg p-6 bg-white dark:bg-neutral-800 overflow-y-auto min-h-0">
      <div
        v-if="accumulated"
        class="leading-relaxed"
      >
        <Suspense>
          <MDC
            :markdown="accumulated"
            :components="components"
            stream
          />
        </Suspense>
      </div>
      <div
        v-else
        class="text-neutral-400 dark:text-neutral-500 italic"
      >
        Click "Start Stream" to see streaming in action...
      </div>
    </div>
  </div>
</template>
