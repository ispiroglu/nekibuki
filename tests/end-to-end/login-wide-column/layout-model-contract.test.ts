import { describe, expect, test } from 'bun:test'
import type { El } from './support'
import { documentScrollWidth, measureColumn, styleEngine, type Engine } from './support'

/**
 * The layout model is what turns the rendered markup into the numbers AC-1.1, AC-1.2, AC-1.3 and
 * AC-1.4 assert, so its own contract is checked here: it must tell a centred column from a
 * left-aligned, right-aligned or auto-margin-less one, and it must see a box that overflows the
 * viewport. Each case is a one-child surface with the classes named, measured at 1280×800 or
 * 320×568.
 */
const surfaceWith = (classes: string[]): El => {
  const root: El = { tag: '#root', attrs: {}, classes: [], children: [], parent: null }
  const surface: El = { tag: 'main', attrs: {}, classes: ['px-5', 'sm:px-6'], children: [], parent: root }
  const column: El = { tag: 'div', attrs: {}, classes, children: [], parent: surface }
  surface.children.push(column)
  root.children.push(surface)
  return root
}

const WIDE = { width: 1280, height: 800 }
const PHONE = { width: 320, height: 568 }

const engineFor = (trees: El[]): Promise<Engine> =>
  styleEngine([
    ...new Set(
      trees.flatMap((tree) => {
        const classes: string[] = []
        const walk = (el: El) => {
          classes.push(...el.classes)
          el.children.forEach(walk)
        }
        walk(tree)
        return classes
      }),
    ),
  ])

describe('layout model contract', () => {
  test('tells auto-margin centring apart from left, right and non-auto alignment', async () => {
    const cases = {
      'mx-auto': { classes: ['mx-auto', 'w-full', 'max-w-2xl'], centred: true },
      'ml-auto': { classes: ['ml-auto', 'w-full', 'max-w-2xl'], centred: false },
      'mr-auto': { classes: ['mr-auto', 'w-full', 'max-w-2xl'], centred: false },
      'no auto margin': { classes: ['w-full', 'max-w-2xl'], centred: false },
    }
    const trees = Object.values(cases).map((entry) => surfaceWith(entry.classes))
    const engine = await engineFor(trees)

    for (const [name, expected] of Object.entries(cases)) {
      const column = surfaceWith(expected.classes).children[0].children[0]
      const { width, leftMargin, rightMargin } = measureColumn(column, WIDE, engine)
      expect({
        name,
        width: Math.round(width),
        centred: Math.abs(leftMargin - rightMargin) <= 2,
      }).toEqual({ name, width: 672, centred: expected.centred })
    }
  })

  test('sees a box wider than the viewport as sideways overflow', async () => {
    const tree = surfaceWith(['w-[900px]'])
    const engine = await engineFor([tree])
    const surface = tree.children[0]

    // 20px surface gutter + the 900px box, which is past the 320px viewport.
    expect({ viewport: PHONE.width, scrollWidth: Math.round(documentScrollWidth(surface, PHONE, engine)) }).toEqual({
      viewport: PHONE.width,
      scrollWidth: 920,
    })
  })
})
