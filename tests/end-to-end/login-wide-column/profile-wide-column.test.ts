import { describe, expect, test } from 'bun:test'
import {
  CENTRE_TOLERANCE,
  MAX_COLUMN,
  WIDTH_TOLERANCE,
  WIDE,
  classTokens,
  loginColumn,
  measureColumn,
  profileColumn,
  renderLogin,
  renderProfile,
  styleEngine,
  viewportLabel,
} from './support'

describe('AC-1.2 — the sign-in column matches the profile surface', () => {
  test('shares the profile column’s measure within 1px, and the profile column stays capped and centred', async () => {
    const login = renderLogin()
    const profile = renderProfile()
    const engine = await styleEngine(classTokens(login, profile))
    const signIn = loginColumn(login)
    const reference = profileColumn(profile)

    for (const viewport of WIDE) {
      const label = viewportLabel(viewport)
      const signInColumn = measureColumn(signIn, viewport, engine)
      const profileSurface = measureColumn(reference, viewport, engine)
      const difference = Math.abs(signInColumn.width - profileSurface.width)
      expect({
        viewport: label,
        signInWidth: Math.round(signInColumn.width),
        profileWidth: Math.round(profileSurface.width),
        sameMeasure: difference <= WIDTH_TOLERANCE,
        profileCapped: profileSurface.width <= MAX_COLUMN,
        profileCentred: Math.abs(profileSurface.leftMargin - profileSurface.rightMargin) <= CENTRE_TOLERANCE,
      }).toEqual({
        viewport: label,
        signInWidth: Math.round(signInColumn.width),
        profileWidth: Math.round(profileSurface.width),
        sameMeasure: true,
        profileCapped: true,
        profileCentred: true,
      })
    }
  })
})
