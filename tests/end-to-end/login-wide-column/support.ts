/**
 * Browser-free layout model for the sign-in end-to-end tests.
 *
 * The Story's criteria are about the rendered box of the sign-in surface at named viewports. The
 * factory's gate re-runs `bun test tests/end-to-end` in a plain worktree, where no browser and no
 * dev server are guaranteed, so the tests render the real screen components to markup
 * (`react-dom/server`, the same components the app mounts) and resolve the real Tailwind CSS for
 * the classes those screens emit (`tailwindcss`'s own compiler, the same one the Vite build uses).
 * From the resolved declarations the model computes the box a browser would lay out: the column's
 * width, its auto margins, the surface gutter, and the short-landscape grid.
 *
 * Nothing here reads the change's own marker attributes or asserts class names: the column is
 * "the deepest element that holds both the surface heading and its action button", and every
 * measurement comes from the compiled stylesheet, so a different implementation with the same
 * layout passes and the pre-change markup fails.
 */
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { compile } from 'tailwindcss'
import { AuthProvider } from '../../../src/lib/auth'
import { LoginScreen } from '../../../src/screens/login-screen'
import { ProfileScreen } from '../../../src/screens/profile-screen'

export interface Viewport {
  width: number
  height: number
}

export interface El {
  tag: string
  attrs: Record<string, string>
  classes: string[]
  children: El[]
  parent: El | null
}

const REM = 16
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
  'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'stop', 'use', 'ellipse',
])

/** Parse the markup react-dom/server emits: tags with double-quoted attributes, void and self-closed tags. */
export function parseHtml(html: string): El {
  const root: El = { tag: '#root', attrs: {}, classes: [], children: [], parent: null }
  let current = root
  for (const token of html.match(/<!--[\s\S]*?-->|<\/?[^>]*>|[^<]+/g) ?? []) {
    if (token.startsWith('<!--')) continue
    if (token.startsWith('</')) {
      const tag = token.slice(2, -1).trim().toLowerCase()
      let node: El | null = current
      while (node && node.tag !== tag) node = node.parent
      if (node?.parent) current = node.parent
      continue
    }
    if (!token.startsWith('<')) continue
    const selfClosed = token.endsWith('/>')
    const inner = token.slice(1, selfClosed ? -2 : -1).trim()
    const name = inner.match(/^[^\s/>]+/)?.[0] ?? ''
    if (!name) continue
    const attrs: Record<string, string> = {}
    for (const attr of inner.slice(name.length).matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) {
      attrs[attr[1].toLowerCase()] = (attr[2] ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    }
    const el: El = {
      tag: name.toLowerCase(),
      attrs,
      classes: (attrs.class ?? '').split(/\s+/).filter(Boolean),
      children: [],
      parent: current,
    }
    current.children.push(el)
    if (!selfClosed && !VOID.has(el.tag)) current = el
  }
  return root
}

export function findAll(root: El, match: (el: El) => boolean): El[] {
  const found: El[] = []
  const walk = (el: El) => {
    if (match(el)) found.push(el)
    el.children.forEach(walk)
  }
  walk(root)
  return found
}

export function findOne(root: El, match: (el: El) => boolean): El {
  const [first] = findAll(root, match)
  if (!first) throw new Error('layout model: element not found in the rendered surface')
  return first
}

/** The deepest element that contains every given element: the box a browser would size around them. */
export function sharedAncestor(elements: El[]): El {
  const ancestors = (el: El): El[] => {
    const chain: El[] = []
    for (let node: El | null = el; node; node = node.parent) chain.push(node)
    return chain
  }
  const [first, ...rest] = elements.map(ancestors)
  return first.find((candidate) => rest.every((chain) => chain.includes(candidate))) ?? first[0]
}

const heading = (el: El) => /^h[1-6]$/.test(el.tag)
const button = (el: El) => el.tag === 'button'

/** Render the sign-in surface the app mounts, exactly as the router and auth provider mount it. */
export function renderLogin(): El {
  const html = renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(AuthProvider, null, React.createElement(LoginScreen))),
  )
  return parseHtml(html)
}

/** Render the profile surface: the Story's reference measure, which must keep its column. */
export function renderProfile(): El {
  const html = renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(AuthProvider, null, React.createElement(ProfileScreen))),
  )
  return parseHtml(html)
}

/** The surface root: the first element the screen renders (main on sign-in, section on profile). */
export const surfaceRoot = (tree: El): El => {
  const [root] = tree.children
  if (!root) throw new Error('layout model: the surface rendered nothing')
  return root
}

/** The sign-in column: the deepest box holding both the copy block's heading and the action button. */
export const loginColumn = (tree: El): El => sharedAncestor([findOne(tree, heading), findOne(tree, button)])

/** The profile column: the deepest box holding the profile's heading and its stats list. */
export const profileColumn = (tree: El): El =>
  sharedAncestor([findOne(tree, heading), findOne(tree, (el) => el.tag === 'dl')])

export interface Rule {
  selector: string
  media: string[]
  declarations: Record<string, string>
}

export interface Engine {
  rules: Rule[]
  variables: Map<string, string>
}

/** Compile the app's Tailwind CSS for exactly the classes the rendered surfaces emitted. */
export async function styleEngine(tokens: string[]): Promise<Engine> {
  const cwd = process.cwd()
  const compiler = await compile('@import "tailwindcss";', {
    base: cwd,
    loadStylesheet: async (id: string) => {
      const path = `${cwd}/node_modules/${id}/index.css`
      return { path, base: cwd, content: await readFile(path, 'utf8') }
    },
  })
  const css = compiler.build(tokens)
  const variables = new Map<string, string>()
  for (const varRule of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) variables.set(varRule[1], varRule[2].trim())

  const start = css.lastIndexOf('@layer utilities')
  const rules = parseRules(start === -1 ? '' : css.slice(start), [])
  return { rules, variables }
}

function matchingBrace(text: string, open: number): number {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1
    else if (text[index] === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return text.length - 1
}

function parseDeclarations(body: string): Record<string, string> {
  const declarations: Record<string, string> = {}
  for (const part of body.split(';')) {
    const colon = part.indexOf(':')
    if (colon === -1) continue
    declarations[part.slice(0, colon).trim()] = part.slice(colon + 1).trim()
  }
  return declarations
}

function parseRules(text: string, media: string[], out: Rule[] = []): Rule[] {
  let index = 0
  while (index < text.length) {
    const open = text.indexOf('{', index)
    if (open === -1) break
    const header = text.slice(index, open).trim()
    const close = matchingBrace(text, open)
    const body = text.slice(open + 1, close)
    if (header.startsWith('@media')) {
      parseRules(body, [...media, header.slice('@media'.length).trim()], out)
    } else if (header.startsWith('@layer') || header.startsWith('@supports')) {
      parseRules(body, media, out)
    } else if (header.startsWith('.')) {
      out.push({ selector: header, media, declarations: parseDeclarations(body) })
    }
    index = close + 1
  }
  return out
}

const unescapeSelector = (selector: string) => selector.replace(/\\(.)/g, '$1')

const lengthToPx = (value: string): number | null => {
  const match = value.trim().match(/^(-?[\d.]+)(rem|px)?$/)
  if (!match) return null
  const amount = Number(match[1])
  return match[2] === 'rem' ? amount * REM : amount
}

function mediaMatches(media: string[], viewport: Viewport): boolean {
  return media.every((query) =>
    query.split(/\s+and\s+/).every((part) => {
      const condition = part.trim().replace(/^\(/, '').replace(/\)$/, '')
      const compare = condition.match(/^(min-|max-)?(width|height)\s*(?::|>=|<=)\s*(.+)$/)
      if (compare) {
        const [, bound, axis, raw] = compare
        const px = lengthToPx(raw)
        if (px === null) return true
        const actual = axis === 'width' ? viewport.width : viewport.height
        if (bound === 'min-') return actual >= px
        if (bound === 'max-') return actual <= px
        return condition.includes('>=') ? actual >= px : actual <= px
      }
      const orientation = condition.match(/^orientation\s*:\s*(landscape|portrait)$/)
      if (orientation) {
        return orientation[1] === 'landscape' ? viewport.width > viewport.height : viewport.height >= viewport.width
      }
      return true
    }),
  )
}

/** Resolve a declaration value to a number of pixels, a percentage string, or a bare keyword. */
function resolveValue(value: string, engine: Engine, depth = 0): string {
  if (depth > 6) return value
  const substituted = value.replace(/var\(\s*(--[a-z0-9-]+)\s*(?:,[^)]*)?\)/g, (_, name: string) => {
    const themeValue = engine.variables.get(name)
    return themeValue === undefined ? value : resolveValue(themeValue, engine, depth + 1)
  })
  const calc = substituted.match(/^calc\(\s*(.+?)\s*\)$/)
  if (calc) {
    const product = calc[1].replace(/\s+/g, '')
    const times = product.match(/^([\d.]+)(rem|px)\*([\d.]+)$/)
    if (times) return `${Number(times[1]) * Number(times[3]) * (times[2] === 'rem' ? REM : 1)}px`
    const single = lengthToPx(product)
    if (single !== null) return `${single}px`
  }
  return substituted.trim()
}

export type Styles = Record<string, string>

/** The declarations a browser applies to an element at a viewport: real CSS from the real compiler. */
export function stylesOf(el: El, viewport: Viewport, engine: Engine): Styles {
  const styles: Styles = {}
  for (const rule of engine.rules) {
    if (!mediaMatches(rule.media, viewport)) continue
    const selector = unescapeSelector(rule.selector)
    if (!el.classes.some((token) => selector === `.${token}`)) continue
    for (const [property, value] of Object.entries(rule.declarations)) {
      styles[property] = resolveValue(value, engine)
    }
  }
  return styles
}

const px = (value: string | undefined, fallback = 0): number => {
  if (value === undefined) return fallback
  const parsed = lengthToPx(value)
  return parsed ?? fallback
}

const sidePadding = (styles: Styles): [number, number] => {
  const inline = styles['padding-inline']
  if (inline !== undefined) {
    const [block, between] = inline.split(/\s+/)
    return [px(between ?? block), px(between ?? block)]
  }
  return [px(styles['padding-left']), px(styles['padding-right'])]
}

/** The width a browser gives an element's border box in this model: block fill, capped by max-width. */
export function boxWidth(el: El, viewport: Viewport, engine: Engine): number {
  const parent = el.parent
  if (!parent || parent.tag === '#root') return viewport.width
  const parentStyles = stylesOf(parent, viewport, engine)
  const [padLeft, padRight] = sidePadding(parentStyles)
  const parentContent = boxWidth(parent, viewport, engine) - padLeft - padRight
  const styles = stylesOf(el, viewport, engine)
  const cap = styles['max-width'] !== undefined && styles['max-width'] !== 'none' ? lengthToPx(styles['max-width']) : null
  return cap === null ? parentContent : Math.min(parentContent, cap)
}

export interface Column {
  width: number
  parentWidth: number
  leftMargin: number
  rightMargin: number
  gutter: number
}

/** Measure a column inside its containing block, with the auto margins the browser resolves. */
export function measureColumn(el: El, viewport: Viewport, engine: Engine): Column {
  const parent = el.parent
  if (!parent) throw new Error('layout model: the column has no containing block')
  const parentStyles = stylesOf(parent, viewport, engine)
  const [padLeft, padRight] = sidePadding(parentStyles)
  const parentWidth = boxWidth(parent, viewport, engine) - padLeft - padRight
  const width = boxWidth(el, viewport, engine)
  const styles = stylesOf(el, viewport, engine)
  const auto = (styles['margin-inline'] ?? '').includes('auto')
  const left = auto ? (parentWidth - width) / 2 : px(styles['margin-left'])
  const right = auto ? (parentWidth - width) / 2 : px(styles['margin-right'])
  let surface = el
  while (surface.parent && surface.parent.tag !== '#root') surface = surface.parent
  const [gutter] = sidePadding(stylesOf(surface, viewport, engine))
  return { width, parentWidth, leftMargin: left, rightMargin: right, gutter }
}

/** Whether an element paints a box; `display: contents` elements hand their children to the parent. */
export function paintsBox(el: El, viewport: Viewport, engine: Engine): boolean {
  return stylesOf(el, viewport, engine).display !== 'contents'
}

/** The boxes the container lays out as its children: `display: contents` wrappers hand theirs up. */
export function displayedChildren(container: El, viewport: Viewport, engine: Engine): El[] {
  const children: El[] = []
  const visit = (el: El) => {
    if (paintsBox(el, viewport, engine)) children.push(el)
    else el.children.forEach(visit)
  }
  container.children.forEach(visit)
  return children
}

/** The grid item an element is laid out as, skipping `display: contents` wrappers. */
export function gridItem(el: El, container: El, viewport: Viewport, engine: Engine): El {
  const item = displayedChildren(container, viewport, engine).find((candidate) => {
    for (let node: El | null = el; node; node = node.parent) if (node === candidate) return true
    return false
  })
  if (!item) throw new Error('layout model: element is not a grid item of the container')
  return item
}

/** The classes every element across the given rendered trees emits. */
export const classTokens = (...trees: El[]): string[] => [
  ...new Set(trees.flatMap((tree) => findAll(tree, () => true).flatMap((el) => el.classes))),
]

/** The width of an element's content box: its border box minus its own horizontal padding. */
export function contentWidth(el: El, viewport: Viewport, engine: Engine): number {
  const [left, right] = sidePadding(stylesOf(el, viewport, engine))
  return boxWidth(el, viewport, engine) - left - right
}

export const tracks = (template: string | undefined): number =>
  template === undefined ? 0 : template.trim().split(/\s+(?![^(]*\))/).filter(Boolean).length

/**
 * The element tree of a JSX source file, without rendering it: tags and literal className values.
 *
 * Used to measure a commit that is not checked out (the base commit's sign-in screen), so the
 * wide-column rule can be applied to the markup the check is said to fail on. Components are kept
 * as their own elements; only the tags and classes that decide a box are read.
 */
export function parseJsx(source: string): El {
  const root: El = { tag: '#root', attrs: {}, classes: [], children: [], parent: null }
  let current = root
  const tags = /<\/?[A-Za-z][\w.:-]*((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|<>|<\/>/g
  for (const match of source.matchAll(tags)) {
    const token = match[0]
    if (token === '<>') {
      const fragment: El = { tag: '#fragment', attrs: {}, classes: [], children: [], parent: current }
      current.children.push(fragment)
      current = fragment
      continue
    }
    if (token === '</>') {
      if (current.parent) current = current.parent
      continue
    }
    const name = token.match(/^<\/?([A-Za-z][\w.:-]*)/)?.[1] ?? ''
    if (token.startsWith('</')) {
      let node: El | null = current
      while (node && node.tag !== name.toLowerCase()) node = node.parent
      if (node?.parent) current = node.parent
      continue
    }
    const className = token.match(/className="([^"]*)"/)?.[1] ?? ''
    const el: El = {
      tag: name.toLowerCase(),
      attrs: {},
      classes: className.split(/\s+/).filter(Boolean),
      children: [],
      parent: current,
    }
    current.children.push(el)
    if (!match[2]) current = el
  }
  return root
}

/** The three wide viewports and three phone viewports the Story names, plus the short landscape. */
export const WIDE: Viewport[] = [
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]
export const PHONE: Viewport[] = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
]
export const LANDSCAPE: Viewport = { width: 844, height: 390 }

/** The widest a reading column may be at a wide viewport, and the alignment tolerance. */
export const MAX_COLUMN = 768
export const CENTRE_TOLERANCE = 2
export const WIDTH_TOLERANCE = 1
export const GUTTER = 20
export const GUTTER_TOLERANCE = 1

export const viewportLabel = (viewport: Viewport) => `${viewport.width}×${viewport.height}`
