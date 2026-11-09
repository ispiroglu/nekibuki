/**
 * Wide-viewport layout contract for the introduction surface.
 *
 * The pixel measurements (column width, equal margins, phone gutters, landscape split) need a
 * browser: `bun run layout:check` measures them, and Quality Assurance covers the same surfaces
 * end to end. Bun has no DOM here, so this test holds the part those measurements rest on — the
 * welcome header, the slide area and the footer each carry the profile surface's centred 42rem
 * column, and the three slides keep their base-commit copy.
 */
import { describe, expect, test } from 'bun:test'

const read = async (path: string) => Bun.file(new URL(`../../${path}`, import.meta.url)).text()

/** Class lists in source order, so a container can be found by a class only it carries. */
const classLists = (source: string): string[] =>
  [...source.matchAll(/className="([^"]*)"/g)].map((match) => match[1] ?? '')

const classListOf = (source: string, marker: string): string[] => {
  const found = classLists(source).filter((list) => list.split(/\s+/).includes(marker))
  if (found.length !== 1) throw new Error(`expected one element carrying ${marker}, got ${found.length}`)
  return (found[0] ?? '').split(/\s+/)
}

/** The profile surface's measure: a full-width box capped at 42rem and centred by auto margins. */
const COLUMN = ['mx-auto', 'w-full', 'max-w-2xl']

const onboarding = await read('src/screens/onboarding-screen.tsx')
const profile = await read('src/screens/profile-screen.tsx')

describe('introduction wide-viewport column', () => {
  test('the welcome header, slide area and footer share the profile column', () => {
    const containers = [
      ['welcome header', 'safe-top'],
      ['slide area', 'no-scrollbar'],
      ['footer', 'safe-bottom'],
    ] as const

    for (const [element, marker] of containers) {
      const classes = classListOf(onboarding, marker)
      for (const utility of COLUMN) {
        expect({ element, missing: classes.includes(utility) ? null : utility }).toEqual({
          element,
          missing: null,
        })
      }
    }
  })

  test('the profile surface keeps the column the introduction matches', () => {
    const classes = classListOf(profile, 'max-w-2xl')
    for (const utility of COLUMN) {
      expect(classes).toContain(utility)
    }

    const counting = onboarding.match(/\bmax-w-2xl\b/g) ?? []
    expect(counting.length).toBe(3)
  })
})

describe('introduction slides preserved', () => {
  const slides = [
    {
      title: 'Point at anything',
      body: 'A tower, a fountain, a carved doorway. Snap it or pick a photo — no typing, no searching.',
    },
    {
      title: 'The story, not the plaque',
      body: 'Every place arrives with a short guide written for you, plus four things worth remembering.',
    },
    {
      title: 'Ask, and come back later',
      body: 'Each discovery keeps its own conversation, so you can revisit the place and the question you left open.',
    },
  ]

  test('exactly three steps, each with its title and copy', () => {
    expect((onboarding.match(/\btitle: t\(/g) ?? []).length).toBe(3)
    expect((onboarding.match(/\bbody: t\(/g) ?? []).length).toBe(3)

    for (const slide of slides) {
      expect(onboarding).toContain(`title: t('${slide.title}'`)
      expect(onboarding).toContain(slide.body)
    }
  })
})
