import { describe, expect, test } from 'bun:test'
import {
  CENTRE_TOLERANCE,
  MAX_COLUMN,
  WIDE,
  classTokens,
  loginColumn,
  measureColumn,
  renderLogin,
  styleEngine,
  viewportLabel,
} from './support'

describe('AC-1.1 — the sign-in content column at wide viewports', () => {
  test('is at most 768px wide and centred at 1280×800, 1024×768 and 1440×900', async () => {
    const login = renderLogin()
    const engine = await styleEngine(classTokens(login))
    const column = loginColumn(login)

    for (const viewport of WIDE) {
      const label = viewportLabel(viewport)
      const { width, leftMargin, rightMargin, gutter, gutterRight } = measureColumn(column, viewport, engine)
      // Measure from the viewport edges, not only from the column's containing block: a column that
      // sits against one edge has equal margins inside its block but not on screen.
      const leftGap = gutter + leftMargin
      const rightGap = gutterRight + rightMargin
      expect({
        viewport: label,
        width: Math.round(width),
        leftGap: Math.round(leftGap),
        rightGap: Math.round(rightGap),
        capped: width <= MAX_COLUMN,
        centred: Math.abs(leftGap - rightGap) <= CENTRE_TOLERANCE,
      }).toEqual({
        viewport: label,
        width: Math.round(width),
        leftGap: Math.round(leftGap),
        rightGap: Math.round(rightGap),
        capped: true,
        centred: true,
      })
    }
  })
})
