import { describe, expect, test } from 'bun:test'
import {
  LANDSCAPE,
  blockContaining,
  classTokens,
  contentWidth,
  findAll,
  placeChildren,
  renderLogin,
  styleEngine,
  surfaceRoot,
  viewportLabel,
} from './support'

describe('AC-1.4 — the sign-in surface keeps its short-landscape split', () => {
  test('shows the copy block and the action block side by side on one row at 844×390', async () => {
    const login = renderLogin()
    const engine = await styleEngine(classTokens(login))
    const surface = surfaceRoot(login)
    const heading = findAll(login, (el) => el.tag === 'h1')[0]
    const action = findAll(login, (el) => el.tag === 'button')[0]

    const boxes = placeChildren(surface, LANDSCAPE, engine)
    const copyBlock = blockContaining(heading, surface, LANDSCAPE, engine)
    const actionBlock = blockContaining(action, surface, LANDSCAPE, engine)
    const copy = boxes.get(copyBlock)!
    const call = boxes.get(actionBlock)!
    const available = contentWidth(surface, LANDSCAPE, engine)

    expect({
      viewport: viewportLabel(LANDSCAPE),
      copy: { x: Math.round(copy.x), width: Math.round(copy.width), row: copy.row },
      action: { x: Math.round(call.x), width: Math.round(call.width), row: call.row },
      available: Math.round(available),
      twoBlocks: copyBlock !== actionBlock,
      oneRow: copy.row === call.row,
      copyLeftOfAction: copy.x + copy.width <= call.x + 0.5,
      fillsRow: Math.abs(copy.x) <= 1 && Math.abs(call.x + call.width - available) <= 1,
      bothVisible: copy.width > 0 && call.width > 0,
    }).toEqual({
      viewport: viewportLabel(LANDSCAPE),
      copy: { x: Math.round(copy.x), width: Math.round(copy.width), row: copy.row },
      action: { x: Math.round(call.x), width: Math.round(call.width), row: call.row },
      available: Math.round(available),
      twoBlocks: true,
      oneRow: true,
      copyLeftOfAction: true,
      fillsRow: true,
      bothVisible: true,
    })
  })
})
