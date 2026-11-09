import { describe, expect, test } from 'bun:test'
import { findAll, renderLogin } from './support'

describe('AC-1.6 — the sign-in surface mounts cleanly', () => {
  test('renders its copy and action without a console error', () => {
    const errors: unknown[][] = []
    const original = console.error
    console.error = (...args: unknown[]) => {
      errors.push(args)
    }

    let login
    try {
      login = renderLogin()
    } finally {
      console.error = original
    }

    const heading = findAll(login, (el) => el.tag === 'h1')
    const action = findAll(login, (el) => el.tag === 'button')
    expect({ headings: heading.length, actions: action.length, consoleErrors: errors.length }).toEqual({
      headings: 1,
      actions: 1,
      consoleErrors: 0,
    })
  })
})
