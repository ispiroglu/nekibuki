import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * AC-1.5 is about the check itself, so this case executes it: `layout:check` must be the package's
 * script, and it must reject a surface it cannot measure with its own exit code (2) instead of
 * printing a misleading pass.
 *
 * The measurement half of AC-1.5 — exit 0 on this branch and exit 1 on the base commit for the
 * wide sign-in column, in a real browser — is `browser-check.ts` next to this file. It is not a
 * `bun test` case on purpose: a case that cannot run here would have to skip, and a skip reads as
 * a pass. This agent sandbox can launch no Chromium and reach no dev server, so the quality report
 * records that half as `blocked`, and `browser-check.ts` says so itself (exit 3) instead of
 * skipping. Where a browser exists it runs the same base-versus-branch comparison and exits 1 on a
 * disagreement.
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
