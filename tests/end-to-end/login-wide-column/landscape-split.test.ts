import { describe, expect, test } from 'bun:test'
import {
  LANDSCAPE,
  classTokens,
  displayedChildren,
  findAll,
  gridItem,
  renderLogin,
  styleEngine,
  stylesOf,
  surfaceRoot,
  tracks,
  viewportLabel,
} from './support'

describe('AC-1.4 — the sign-in surface keeps its short-landscape split', () => {
  test('lays the copy block and the action block side by side in two columns at 844×390', async () => {
    const login = renderLogin()
    const engine = await styleEngine(classTokens(login))
    const surface = surfaceRoot(login)
    const styles = stylesOf(surface, LANDSCAPE, engine)
    const heading = findAll(login, (el) => el.tag === 'h1')[0]
    const action = findAll(login, (el) => el.tag === 'button')[0]

    const items = displayedChildren(surface, LANDSCAPE, engine)
    const headingItem = gridItem(heading, surface, LANDSCAPE, engine)
    const actionItem = gridItem(action, surface, LANDSCAPE, engine)

    expect({
      viewport: viewportLabel(LANDSCAPE),
      display: styles.display,
      columns: tracks(styles['grid-template-columns']),
      items: items.length,
      copyAndActionApart: headingItem !== actionItem,
    }).toEqual({
      viewport: viewportLabel(LANDSCAPE),
      display: 'grid',
      columns: 2,
      items: 2,
      copyAndActionApart: true,
    })
  })
})
