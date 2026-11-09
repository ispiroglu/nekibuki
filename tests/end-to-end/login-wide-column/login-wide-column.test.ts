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
  test('is at most 768px wide and horizontally centred at 1280×800, 1024×768 and 1440×900', async () => {
    const login = renderLogin()
    const engine = await styleEngine(classTokens(login))
    const column = loginColumn(login)

    for (const viewport of WIDE) {
      const label = viewportLabel(viewport)
      const { width, leftMargin, rightMargin } = measureColumn(column, viewport, engine)
      expect({
        viewport: label,
        width: Math.round(width),
        leftMargin: Math.round(leftMargin),
        rightMargin: Math.round(rightMargin),
        capped: width <= MAX_COLUMN,
        centred: Math.abs(leftMargin - rightMargin) <= CENTRE_TOLERANCE,
      }).toEqual({
        viewport: label,
        width: Math.round(width),
        leftMargin: Math.round(leftMargin),
        rightMargin: Math.round(rightMargin),
        capped: true,
        centred: true,
      })
    }
  })
})
