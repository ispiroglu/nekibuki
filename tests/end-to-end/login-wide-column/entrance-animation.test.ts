import { describe, expect, test } from 'bun:test'
import { findAll, loginColumn, renderLogin } from './support'

/**
 * The sign-in blocks keep the base commit's fade-and-slide entrance: each block ships its initial
 * state in the markup (opacity 0, shifted 16px down) and motion animates it in on mount. The
 * redirect made that behaviour part of the spec, so dropping the animation — a plain `div`, or
 * `motion.div` without the initial state — must fail here.
 *
 * The assertion reads the rendered inline style, not a class name or a marker attribute, so any
 * mechanism that ships the same initial state passes; a server render cannot observe the finished
 * animation, so this pins the entrance state and the report names that limit.
 */
const initialStyle = (style: string) => ({
  opacity: Number(style.match(/(?:^|;)\s*opacity\s*:\s*([\d.]+)/)?.[1] ?? Number.NaN),
  translateY: Number(style.match(/translateY\(\s*(-?[\d.]+)px\s*\)/)?.[1] ?? Number.NaN),
})

describe('sign-in entrance animation', () => {
  test('ships the fade-and-slide entrance state for the copy block and the action block', () => {
    const tree = renderLogin()
    const column = loginColumn(tree)
    const blocks = column.children
    const copy = blocks.find((block) => findAll(block, (el) => /^h[1-6]$/.test(el.tag)).length > 0)
    const action = blocks.find((block) => findAll(block, (el) => el.tag === 'button').length > 0)

    expect(copy).toBeDefined()
    expect(action).toBeDefined()
    expect(initialStyle(copy!.attrs.style ?? '')).toEqual({ opacity: 0, translateY: 16 })
    expect(initialStyle(action!.attrs.style ?? '')).toEqual({ opacity: 0, translateY: 16 })
  })
})
