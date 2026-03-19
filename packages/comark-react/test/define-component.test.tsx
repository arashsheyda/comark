import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToReadableStream } from 'react-dom/server'
import { parse } from 'comark'
import emoji from 'comark/plugins/emoji'
import { defineComarkComponent, defineComarkRendererComponent } from '../src/index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderAsync(element: React.ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element)
  await stream.allReady
  return new Response(stream).text()
}

function makeAlert(className: string): React.FC<{ children?: React.ReactNode }> {
  function Alert({ children }: { children?: React.ReactNode }) {
    return <div className={className}>{children}</div>
  }
  Alert.displayName = `Alert_${className}`
  return Alert
}

const AlertBase = makeAlert('alert-base')
const AlertChild = makeAlert('alert-child')
const AlertProp = makeAlert('alert-prop')

const CardBase = makeAlert('card-base')

// ---------------------------------------------------------------------------
// defineComarkComponent
// ---------------------------------------------------------------------------

describe('defineComarkComponent — component inheritance via extends', () => {
  it('child inherits parent components when none of its own are defined', async () => {
    const Base = defineComarkComponent({ name: 'Base', components: { alert: AlertBase } })
    const Child = defineComarkComponent({ name: 'Child', extends: Base })

    const html = await renderAsync(<Child markdown="::alert&#10;hello&#10;::" />)

    expect(html).toContain('alert-base')
  })

  it('child components override the same tag from parent', async () => {
    const Base = defineComarkComponent({ name: 'Base', components: { alert: AlertBase } })
    const Child = defineComarkComponent({ name: 'Child', extends: Base, components: { alert: AlertChild } })

    const html = await renderAsync(<Child markdown={'::alert\nhello\n::'} />)

    expect(html).toContain('alert-child')
    expect(html).not.toContain('alert-base')
  })

  it('child keeps parent components that it does not override', async () => {
    const Base = defineComarkComponent({ name: 'Base', components: { alert: AlertBase, card: CardBase } })
    const Child = defineComarkComponent({ name: 'Child', extends: Base, components: { alert: AlertChild } })

    const html = await renderAsync(<Child markdown={'::alert\nA\n::\n\n::card\nB\n::'} />)

    expect(html).toContain('alert-child')
    expect(html).toContain('card-base')
  })

  it('prop-level components override child and parent config', async () => {
    const Base = defineComarkComponent({ name: 'Base', components: { alert: AlertBase } })
    const Child = defineComarkComponent({ name: 'Child', extends: Base, components: { alert: AlertChild } })

    const html = await renderAsync(
      <Child markdown={'::alert\nhello\n::'} components={{ alert: AlertProp }} />,
    )

    expect(html).toContain('alert-prop')
    expect(html).not.toContain('alert-child')
    expect(html).not.toContain('alert-base')
  })
})

describe('defineComarkComponent — plugin inheritance via extends', () => {
  it('child inherits parent plugins', async () => {
    const Base = defineComarkComponent({ name: 'Base', plugins: [emoji()] })
    const Child = defineComarkComponent({ name: 'Child', extends: Base })

    const html = await renderAsync(<Child markdown=":smile:" />)

    expect(html).toContain('😄')
  })

  it('parent and child plugins both run', async () => {
    const Base = defineComarkComponent({ name: 'Base', plugins: [emoji()] })
    const Child = defineComarkComponent({ name: 'Child', extends: Base })

    const html = await renderAsync(<Child markdown=":smile: :heart:" />)

    expect(html).toContain('😄')
    expect(html).toContain('❤️')
  })

  it('prop plugins are appended after config plugins', async () => {
    const Base = defineComarkComponent({ name: 'Base', plugins: [emoji()] })
    const Child = defineComarkComponent({ name: 'Child', extends: Base })

    const html = await renderAsync(<Child markdown=":smile:" plugins={[emoji()]} />)

    expect(html).toContain('😄')
  })

  it('multi-level extends stacks plugins correctly', async () => {
    const Base = defineComarkComponent({ name: 'Base', plugins: [emoji()] })
    const Middle = defineComarkComponent({ name: 'Middle', extends: Base })
    const Child = defineComarkComponent({ name: 'Child', extends: Middle })

    const html = await renderAsync(<Child markdown=":smile: :heart:" />)

    expect(html).toContain('😄')
    expect(html).toContain('❤️')
  })
})

// ---------------------------------------------------------------------------
// defineComarkRendererComponent
// ---------------------------------------------------------------------------

describe('defineComarkRendererComponent — component inheritance via extends', () => {
  it('renders with config components', async () => {
    const Renderer = defineComarkRendererComponent({
      name: 'TestRenderer',
      components: { alert: AlertBase },
    })
    const tree = await parse('::alert\nhello\n::')
    const html = await renderAsync(<Renderer tree={tree} />)

    expect(html).toContain('alert-base')
  })

  it('child inherits parent components when none of its own are defined', async () => {
    const Base = defineComarkRendererComponent({ name: 'BaseRenderer', components: { alert: AlertBase } })
    const Child = defineComarkRendererComponent({ name: 'ChildRenderer', extends: Base })

    const tree = await parse('::alert\nhello\n::')
    const html = await renderAsync(<Child tree={tree} />)

    expect(html).toContain('alert-base')
  })

  it('child components override the same tag from parent', async () => {
    const Base = defineComarkRendererComponent({ name: 'BaseRenderer', components: { alert: AlertBase } })
    const Child = defineComarkRendererComponent({ name: 'ChildRenderer', extends: Base, components: { alert: AlertChild } })

    const tree = await parse('::alert\nhello\n::')
    const html = await renderAsync(<Child tree={tree} />)

    expect(html).toContain('alert-child')
    expect(html).not.toContain('alert-base')
  })

  it('child keeps parent components that it does not override', async () => {
    const Base = defineComarkRendererComponent({ name: 'BaseRenderer', components: { alert: AlertBase, card: CardBase } })
    const Child = defineComarkRendererComponent({ name: 'ChildRenderer', extends: Base, components: { alert: AlertChild } })

    const tree = await parse('::alert\nA\n::\n\n::card\nB\n::')
    const html = await renderAsync(<Child tree={tree} />)

    expect(html).toContain('alert-child')
    expect(html).toContain('card-base')
  })

  it('prop-level components override child and parent config', async () => {
    const Base = defineComarkRendererComponent({ name: 'BaseRenderer', components: { alert: AlertBase } })
    const Child = defineComarkRendererComponent({ name: 'ChildRenderer', extends: Base, components: { alert: AlertChild } })

    const tree = await parse('::alert\nhello\n::')
    const html = await renderAsync(<Child tree={tree} components={{ alert: AlertProp }} />)

    expect(html).toContain('alert-prop')
    expect(html).not.toContain('alert-child')
    expect(html).not.toContain('alert-base')
  })

  it('multi-level extends stacks component maps correctly', async () => {
    const Base = defineComarkRendererComponent({ name: 'BaseRenderer', components: { alert: AlertBase, card: CardBase } })
    const Middle = defineComarkRendererComponent({ name: 'MiddleRenderer', extends: Base, components: { alert: AlertChild } })
    const Child = defineComarkRendererComponent({ name: 'ChildRenderer', extends: Middle })

    const tree = await parse('::alert\nA\n::\n\n::card\nB\n::')
    const html = await renderAsync(<Child tree={tree} />)

    expect(html).toContain('alert-child')
    expect(html).toContain('card-base')
  })
})
