import { heading } from './heading.ts'
import { p } from './p.ts'
import { strong } from './strong.ts'
import { em } from './em.ts'
import { del } from './del.ts'
import { code } from './code.ts'
import { pre } from './pre.ts'
import { a } from './a.ts'
import { blockquote } from './blockquote.ts'
import { ul } from './ul.ts'
import { ol } from './ol.ts'
import { li } from './li.ts'
import { hr } from './hr.ts'
import { br } from './br.ts'
import { img } from './img.ts'
import { table, thead, tbody, tr, th, td } from './table.ts'
import { comment } from './comment.ts'
import { template } from './template.ts'
import type { NodeHandler } from 'comark/render'

export const handlers: Record<string, NodeHandler> = {
  h1: heading,
  h2: heading,
  h3: heading,
  h4: heading,
  h5: heading,
  h6: heading,
  p,
  strong,
  em,
  del,
  code,
  pre,
  a,
  blockquote,
  ul,
  ol,
  li,
  hr,
  br,
  img,
  table,
  thead,
  tbody,
  tr,
  th,
  td,
  comment,
  template,
}
