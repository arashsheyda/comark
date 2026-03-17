import { defineNuxtModule, createResolver, addImports, addComponent, extendViteConfig } from '@nuxt/kit'
import fs from 'node:fs/promises'
import type { NodeTransform, ElementNode, DirectiveNode } from '@vue/compiler-core'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from 'nuxt/schema'

// Module options TypeScript interface definition
export interface ComarkModuleOptions {}

export default defineNuxtModule<ComarkModuleOptions>({
  moduleDependencies: {
    '@nuxt/ui': {
      defaults: {
        prose: true,
      },
      optional: true,
    },
  },
  meta: {
    name: 'comark',
    configKey: 'comark',
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  async setup(_options, nuxt) {
    addComponent({
      name: 'Comark',
      export: 'Comark',
      filePath: '@comark/vue',
      priority: 1,
    })
    addComponent({
      name: 'ComarkRenderer',
      export: 'ComarkRenderer',
      filePath: '@comark/vue',
      priority: 1,
    })

    addImports({
      name: 'defineComarkComponent',
      as: 'defineComarkComponent',
      from: '@comark/vue',
    })

    const resolver = createResolver(import.meta.url)

    registerComarkSlotTransformer(resolver)
    // Register user global components
    await registerComarkGlobalComponents(resolver, nuxt as unknown as Nuxt)
  },
})

async function registerComarkGlobalComponents(resolver: Resolver, nuxt: Nuxt) {
  const _layers = [...nuxt.options._layers].reverse()
  for (const layer of _layers) {
    const srcDir = layer.config.srcDir
    const globalComponents = resolver.resolve(srcDir, 'components/prose')
    const dirStat = await fs.stat(globalComponents).catch(() => null)
    if (dirStat && dirStat.isDirectory()) {
      nuxt.hook('components:dirs', (dirs: any[]) => {
        dirs.unshift({
          path: globalComponents,
          global: true,
          pathPrefix: false,
          prefix: '',
        })
      })
    }
  }
}
/**
 * Vite transformer to transform `<slot unwrap="...">` to Comark's special slot renderer
 */
function registerComarkSlotTransformer(resolver: Resolver) {
  extendViteConfig((config) => {
    const compilerOptions = (config as any).vue.template.compilerOptions
    compilerOptions.nodeTransforms = [
      <NodeTransform> function viteComarkSlot(node: ElementNode, context) {
        const isVueSlotWithUnwrap = node.tag === 'slot' && node.props.find(p => p.name === 'unwrap' || (p.name === 'bind' && (p as DirectiveNode).rawName === ':comark-unwrap'))

        if (isVueSlotWithUnwrap) {
          const transform = context.ssr
            ? context.nodeTransforms.find(nt => nt.name === 'ssrTransformSlotOutlet')
            : context.nodeTransforms.find(nt => nt.name === 'transformSlotOutlet')

          return () => {
            node.tag = 'slot'
            node.type = 1
            node.tagType = 2

            transform?.(node, context)

            const codegen = context.ssr ? (node as any).ssrCodegenNode : node.codegenNode
            codegen.callee = context.ssr ? '_ssrRenderComarkSlot' : '_renderComarkSlot'

            const importExp = context.ssr ? '{ ssrRenderSlot as _ssrRenderComarkSlot }' : '{ renderSlot as _renderComarkSlot }'
            if (!context.imports.some(i => String(i.exp) === importExp)) {
              context.imports.push({
                exp: importExp,
                path: resolver.resolve(`./runtime/utils/${context.ssr ? 'ssrSlot' : 'slot'}`),
              })
            }
          }
        }

        if (context.nodeTransforms[0]?.name !== 'viteComarkSlot') {
          const index = context.nodeTransforms.findIndex(f => f.name === 'viteComarkSlot')
          if (index !== -1) {
            const nt = context.nodeTransforms.splice(index, 1)
            context.nodeTransforms.unshift(nt[0]!)
          }
        }
      },
    ]
  })
}
