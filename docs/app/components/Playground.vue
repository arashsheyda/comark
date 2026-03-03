<script setup lang="ts">
import { parse, stringify, renderFrontmatter } from 'comark'
import { ComarkRenderer } from 'comark/vue'
import { Splitpanes, Pane } from 'splitpanes'
import { defaultMarkdown } from '~/constants'
import { watchDebounced } from '@vueuse/core'
import type { ComarkTree } from 'comark/ast'
import { ProseCallout, ProseNote, ProseTip, ProseWarning, ProseCaution } from '#components'

const props = defineProps<{
  compact?: boolean
}>()

const components = {
  callout: ProseCallout,
  note: ProseNote,
  tip: ProseTip,
  warning: ProseWarning,
  caution: ProseCaution,
}

const markdown = ref<string>(defaultMarkdown.trim())
const tree = ref<ComarkTree | null>(null)
const parseTime = ref<number>(0)
const nodeCount = ref<number>(0)
const error = ref<string | null>(null)
const parsing = ref<boolean>(false)

const activeTab = ref('preview')
const tabs = [
  { label: 'Preview', value: 'preview', icon: 'i-lucide-eye' },
  { label: 'AST', value: 'ast', icon: 'i-lucide-git-branch' },
  { label: 'Formatted', value: 'formatted', icon: 'i-lucide-code' },
]

// In compact mode the tab is always locked to preview
const currentTab = computed(() => props.compact ? 'preview' : activeTab.value)

function countNodes(nodes: unknown[]): number {
  let count = 0
  for (const node of nodes) {
    count++
    if (Array.isArray(node) && node.length > 2) {
      for (let i = 2; i < node.length; i++) {
        if (Array.isArray(node[i])) {
          count += countNodes([node[i]])
        }
        else if (typeof node[i] === 'string') {
          count++
        }
      }
    }
  }
  return count
}

async function parseMarkdown(): Promise<void> {
  if (!markdown.value.trim()) {
    tree.value = null
    parseTime.value = 0
    nodeCount.value = 0
    error.value = null
    return
  }
  parsing.value = true
  const start = performance.now()
  try {
    const result = await parse(markdown.value, {
      autoClose: true,
      autoUnwrap: true,
    })
    tree.value = result
    parseTime.value = Math.round((performance.now() - start) * 10) / 10
    nodeCount.value = countNodes(result.nodes)
    error.value = null
  }
  catch (err: any) {
    error.value = err.message || 'Failed to parse markdown'
  }
  finally {
    parsing.value = false
  }
}

watchDebounced(markdown, parseMarkdown, { debounce: 300 })
parseMarkdown()

function resetComark(): void {
  markdown.value = defaultMarkdown.trim()
}

const astJson = computed(() =>
  tree.value ? JSON.stringify(tree.value, null, 2) : '',
)

const formattedOutput = computed<string>(() => {
  if (!tree.value) return ''
  const fm = tree.value.frontmatter as Record<string, any>
  const content = stringify(tree.value)
  return renderFrontmatter(fm, content) + '\n'
})

const isMatch = computed(() =>
  !!formattedOutput.value && formattedOutput.value.trim() === markdown.value.trim(),
)
</script>

<template>
  <div
    class="flex flex-col overflow-hidden"
    :class="compact ? 'h-[420px] rounded-xl border border-default bg-elevated shadow-lg' : 'h-[calc(100vh-64px)]'"
  >
    <Splitpanes>
      <!-- ── Left pane: Markdown editor ── -->
      <Pane
        :size="50"
        :min-size="20"
      >
        <div class="h-full flex flex-col">
          <div class="shrink-0 flex items-center justify-between px-3 h-9 border-b border-default bg-default">
            <div class="flex items-center gap-1.5">
              <UIcon
                name="i-lucide-pencil"
                class="size-3.5 text-muted"
              />
              <span class="text-xs font-semibold uppercase tracking-wide text-muted">Markdown</span>
            </div>
            <UTooltip text="Reset to default content">
              <UButton
                :disabled="markdown === defaultMarkdown.trim()"
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-rotate-ccw"
                label="Reset"
                @click="resetComark"
              />
            </UTooltip>
          </div>
          <div class="flex-1 min-h-0">
            <Editor v-model="markdown" />
          </div>
        </div>
      </Pane>

      <!-- ── Right pane: Output ── -->
      <Pane
        :size="50"
        :min-size="20"
      >
        <div class="h-full flex flex-col">
          <!-- Right header: Preview label (compact) or tabs (full) -->
          <div class="shrink-0 flex items-center px-3 h-9 border-b border-default bg-default">
            <!-- Roundtrip match indicator (full mode only) -->
            <div
              v-if="!compact && tree && activeTab === 'formatted'"
              class="flex-1 flex items-center gap-1.5"
            >
              <UTooltip :text="isMatch ? 'Stringify output matches source' : 'Stringify output differs from source'">
                <span class="flex items-center gap-1.5 text-xs text-muted cursor-default">
                  <span
                    class="size-2 rounded-full"
                    :class="isMatch ? 'bg-success' : 'bg-error'"
                  />
                  {{ isMatch ? 'Roundtrip match' : 'Roundtrip mismatch' }}
                </span>
              </UTooltip>
            </div>
            <div
              v-else
              class="flex-1"
            />
            <template v-if="compact">
              <UIcon
                name="i-lucide-eye"
                class="size-3.5 text-muted"
              />
              <span class="ml-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Preview</span>
            </template>
            <UTabs
              v-else
              v-model="activeTab"
              :content="false"
              :items="tabs"
              color="neutral"
              variant="link"
              size="xs"
              class="h-full"
              :ui="{ list: 'h-full p-0 border-b-0' }"
            />
          </div>

          <!-- Preview -->
          <template v-if="currentTab === 'preview'">
            <div
              v-if="parsing && !tree"
              class="flex flex-1 flex-col items-center justify-center gap-3 text-muted"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-6 animate-spin text-primary"
              />
              <span class="text-sm">Rendering preview...</span>
            </div>
            <div
              v-else-if="!tree && !error"
              class="flex flex-1 flex-col items-center justify-center gap-3 text-muted"
            >
              <UIcon
                name="i-lucide-eye-off"
                class="size-8 opacity-40"
              />
              <p class="text-sm font-medium">
                Nothing to preview
              </p>
            </div>
            <UScrollArea
              v-else
              class="flex-1 min-h-0"
              :ui="{ viewport: 'p-4 sm:p-6' }"
            >
              <UAlert
                v-if="error"
                color="error"
                variant="soft"
                icon="i-lucide-circle-alert"
                :title="error"
              />
              <div
                v-else-if="tree"
                class="prose prose-sm dark:prose-invert max-w-none"
              >
                <Suspense>
                  <ComarkRenderer
                    :tree="tree"
                    :components="components"
                  />
                </Suspense>
              </div>
            </UScrollArea>
          </template>

          <!-- AST -->
          <UScrollArea
            v-else-if="currentTab === 'ast'"
            class="flex-1 min-h-0"
            :ui="{ viewport: 'p-4' }"
          >
            <pre class="font-mono text-xs leading-relaxed text-default whitespace-pre-wrap break-all">{{ astJson }}</pre>
          </UScrollArea>

          <!-- Formatted -->
          <UScrollArea
            v-else-if="currentTab === 'formatted'"
            class="flex-1 min-h-0"
            :ui="{ viewport: 'p-4' }"
          >
            <pre class="font-mono text-xs leading-relaxed text-default whitespace-pre-wrap">{{ formattedOutput }}</pre>
          </UScrollArea>

          <!-- Status bar (full mode only) -->
          <div
            v-if="!compact"
            class="shrink-0 flex items-center gap-4 px-4 h-7 border-t border-default bg-default"
          >
            <span class="flex items-center gap-1 text-xs text-muted">
              <UIcon
                name="i-lucide-git-branch"
                class="size-3"
              />
              {{ nodeCount }} nodes
            </span>
            <span class="flex items-center gap-1 text-xs text-muted">
              <UIcon
                name="i-lucide-timer"
                class="size-3"
              />
              {{ parseTime }}ms
            </span>
          </div>
        </div>
      </Pane>
    </Splitpanes>
  </div>
</template>

<style lang="scss">
@import 'splitpanes/dist/splitpanes.css';

.splitpanes--vertical > .splitpanes__splitter {
  width: 1px !important;
  background: var(--ui-border);
  margin: 0 !important;
}
</style>
