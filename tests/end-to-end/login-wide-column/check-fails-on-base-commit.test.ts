import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * AC-1.5 is about the check itself, so this case executes it: `layout:check` must be the package's
 * script, and it must reject a surface it cannot measure with its own exit code (2) instead of
 * printing a misleading pass.
 *
 * The measurement half of AC-1.5 — exit 0 on this branch and exit 1 on the base commit for the
 * wide sign-in column, in a real browser — is `layout-check-browser.test.ts` next to this file. It
 * is a Playwright spec in the pinned suite, unskipped: this agent sandbox cannot launch Chromium
 * and has no reachable dev server, so a run here fails those two cases and the quality report
 * records the limitation in prose; the quality gate runs the suite outside the sandbox, where
 * Playwright can launch a browser, and that run is the evidence.
 */
const REPO = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '')

interface Result {
  exitCode: number
  output: string
}

/** `bun run layout:check <surface>`, or the script it starts where `bun run` cannot resolve the worktree. */
const runLayoutCheck = (surface: string): Result => {
  const spawn = (command: string[]) => {
    const result = Bun.spawnSync(command, {
      cwd: REPO,
      env: { ...process.env, BASE_URL: 'http://127.0.0.1:9' },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 180_000,
    })
    return { exitCode: result.exitCode, output: `${result.stdout.toString()}${result.stderr.toString()}` }
  }
  const scripted = spawn([process.execPath, 'run', 'layout:check', surface])
  // The sandbox cannot read the worktree's parents, so `bun run` aborts before the script starts.
  if (!/CouldntReadCurrentDirectory|error loading current directory/i.test(scripted.output)) return scripted
  return spawn([process.execPath, join(REPO, 'scripts/layout-check.mjs'), surface])
}

test('runs as bun run layout:check and rejects an unknown surface with exit code 2', async () => {
  const packageJson = JSON.parse(await Bun.file(join(REPO, 'package.json')).text()) as {
    scripts: Record<string, string>
  }
  expect(packageJson.scripts['layout:check']).toBe('bun scripts/layout-check.mjs')

  const unknown = runLayoutCheck('not-a-surface')
  expect({ exitCode: unknown.exitCode, namesTheSurface: unknown.output.includes('not-a-surface') }).toEqual({
    exitCode: 2,
    namesTheSurface: true,
  })
})
