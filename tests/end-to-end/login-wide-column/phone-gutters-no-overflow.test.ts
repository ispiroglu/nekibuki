import { describe, expect, test } from 'bun:test'
import {
  GUTTER,
  GUTTER_TOLERANCE,
  PHONE,
  classTokens,
  contentWidth,
  documentScrollWidth,
  loginColumn,
  measureColumn,
  renderLogin,
  styleEngine,
  surfaceRoot,
  viewportLabel,
} from './support'

describe('AC-1.3 — the sign-in surface keeps its phone layout', () => {
  test('keeps a 20px gutter and never scrolls sideways at 390×844, 360×640 and 320×568', async () => {
    const login = renderLogin()
    const engine = await styleEngine(classTokens(login))
    const surface = surfaceRoot(login)
    const column = loginColumn(login)

    for (const viewport of PHONE) {
      const label = viewportLabel(viewport)
      const { gutter } = measureColumn(column, viewport, engine)
      const content = contentWidth(surface, viewport, engine)
      const scrollWidth = Math.round(documentScrollWidth(surface, viewport, engine))
      expect({
        viewport: label,
        gutter: Math.round(gutter),
        content: Math.round(content),
        scrollWidth,
        viewportWidth: viewport.width,
        gutterKept: Math.abs(gutter - GUTTER) <= GUTTER_TOLERANCE,
        noSidewaysScroll: scrollWidth <= viewport.width,
      }).toEqual({
        viewport: label,
        gutter: Math.round(gutter),
        content: Math.round(content),
        scrollWidth,
        viewportWidth: viewport.width,
        gutterKept: true,
        noSidewaysScroll: true,
      })
    }
  })
})
