import { describe, expect, test } from 'bun:test'
import {
  GUTTER,
  GUTTER_TOLERANCE,
  PHONE,
  classTokens,
  contentWidth,
  loginColumn,
  measureColumn,
  renderLogin,
  styleEngine,
  viewportLabel,
} from './support'

describe('AC-1.3 — the sign-in surface keeps its phone layout', () => {
  test('keeps a 20px gutter and no content wider than the viewport at 390×844, 360×640 and 320×568', async () => {
    const login = renderLogin()
    const engine = await styleEngine(classTokens(login))
    const column = loginColumn(login)

    for (const viewport of PHONE) {
      const label = viewportLabel(viewport)
      const { gutter } = measureColumn(column, viewport, engine)
      const content = contentWidth(column, viewport, engine)
      const available = viewport.width - GUTTER * 2
      expect({
        viewport: label,
        gutter: Math.round(gutter),
        content: Math.round(content),
        available,
        gutterKept: Math.abs(gutter - GUTTER) <= GUTTER_TOLERANCE,
        fits: content <= available,
      }).toEqual({
        viewport: label,
        gutter: Math.round(gutter),
        content: Math.round(content),
        available,
        gutterKept: true,
        fits: true,
      })
    }
  })
})
