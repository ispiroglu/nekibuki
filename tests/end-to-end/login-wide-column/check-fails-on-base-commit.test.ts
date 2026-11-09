import { describe, expect, test } from 'bun:test'
import {
  MAX_COLUMN,
  WIDE,
  classTokens,
  loginColumn,
  measureColumn,
  parseJsx,
  renderLogin,
  styleEngine,
  viewportLabel,
} from './support'

/** The commit the Story is measured against: the sign-in screen before its column was capped. */
const BASE_COMMIT = 'ae51078c39d91dff3be39f142e0ccdcc4a6dea8b'

const gitShow = (path: string): string => {
  const result = Bun.spawnSync(['git', 'show', `${BASE_COMMIT}:${path}`])
  if (result.exitCode !== 0) throw new Error(`git show ${BASE_COMMIT}:${path} failed: ${result.stderr.toString()}`)
  return result.stdout.toString()
}

describe('AC-1.5 — the layout check catches the wide-width sign-in defect', () => {
  test('is wired as bun run layout:check and measures the login, introduction and profile columns', async () => {
    const packageJson = JSON.parse(await Bun.file('package.json').text()) as { scripts: Record<string, string> }
    const script = await Bun.file('scripts/layout-check.mjs').text()

    expect(packageJson.scripts['layout:check']).toBe('bun scripts/layout-check.mjs')
    expect(script).toContain('layout/login-wide-column')
    expect(script).toContain('layout/onboarding-wide-column')
    expect(script).toContain('layout/profile-wide-column')
    expect(script).toContain(String(MAX_COLUMN))
    for (const viewport of WIDE) expect(script).toContain(String(viewport.width))
  })

  test('rejects the base commit’s sign-in layout and accepts the branch’s at every wide viewport', async () => {
    const baseTree = parseJsx(gitShow('src/screens/login-screen.tsx'))
    const baseEngine = await styleEngine(classTokens(baseTree))
    const baseColumn = loginColumn(baseTree)

    const login = renderLogin()
    const engine = await styleEngine(classTokens(login))
    const column = loginColumn(login)

    for (const viewport of WIDE) {
      const label = viewportLabel(viewport)
      const baseWidth = measureColumn(baseColumn, viewport, baseEngine).width
      const branchWidth = measureColumn(column, viewport, engine).width
      expect({
        viewport: label,
        baseWidth: Math.round(baseWidth),
        branchWidth: Math.round(branchWidth),
        baseFails: baseWidth > MAX_COLUMN,
        branchPasses: branchWidth <= MAX_COLUMN,
      }).toEqual({
        viewport: label,
        baseWidth: Math.round(baseWidth),
        branchWidth: Math.round(branchWidth),
        baseFails: true,
        branchPasses: true,
      })
    }
  })
})
