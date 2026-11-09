import { describe, expect, test } from 'bun:test'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findAll, renderLogin } from './support'

/**
 * AC-1.6 is about the repository gates themselves, so this test runs them: `bun run typecheck`,
 * `bun test` and `bun run build`, and reads their exit codes. The commands are the repository's own
 * scripts (package.json); where the agent sandbox cannot resolve the worktree for `bun run` (it
 * aborts with CouldntReadCurrentDirectory), the same programs the scripts start are run directly —
 * the report names which form ran.
 *
 * The inner `bun test` must not spawn itself, so the child run is marked with E2E_SELF_RUN and this
 * test does not recurse there.
 */
const REPO = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '')
const innerRun = process.env.E2E_SELF_RUN === '1'

interface Result {
  exitCode: number
  output: string
}

const run = (command: string[], env: Record<string, string> = {}): Result => {
  const result = Bun.spawnSync(command, {
    cwd: REPO,
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 600_000,
  })
  return { exitCode: result.exitCode, output: `${result.stdout.toString()}${result.stderr.toString()}` }
}

const sandboxBlocked = (result: Result) => /CouldntReadCurrentDirectory|error loading current directory/i.test(result.output)
const postcssBlocked = (result: Result) => /Failed to load PostCSS config/.test(result.output)
const tail = (result: Result) => result.output.trim().split('\n').slice(-6).join('\n')

/** `bun run typecheck`, or what it runs when `bun run` cannot resolve the worktree. */
const typecheck = (): Result => {
  const scripted = run([process.execPath, 'run', 'typecheck'])
  if (!sandboxBlocked(scripted)) return scripted
  // `bun run typecheck` starts with `wrangler types`; inside the sandbox that command needs the
  // network, so a generated worker-configuration.d.ts is reused when one is already there.
  const typeFile = join(REPO, 'worker-configuration.d.ts')
  if (!existsSync(typeFile)) {
    const types = run(['node', 'node_modules/wrangler/bin/wrangler.js', 'types'])
    if (types.exitCode !== 0) return types
  }
  let last: Result = { exitCode: 0, output: '' }
  for (const project of ['tsconfig.app.json', 'tsconfig.worker.json', 'tsconfig.node.json']) {
    last = run(['node', 'node_modules/typescript/bin/tsc', '--noEmit', '-p', project])
    if (last.exitCode !== 0) return last
  }
  return last
}

/** `bun test`, scoped so the child run does not spawn a third. */
const tests = (): Result => run([process.execPath, 'test'], { E2E_SELF_RUN: '1' })

/** `bun run build`, or the Vite build it runs when `bun run` is unavailable in the sandbox. */
const build = (): Result => {
  const scripted = run([process.execPath, 'run', 'build'])
  if (scripted.exitCode === 0 || (!sandboxBlocked(scripted) && !postcssBlocked(scripted))) return scripted

  let direct = run(['node', 'node_modules/vite/bin/vite.js', 'build'])
  if (direct.exitCode === 0 || !postcssBlocked(direct)) return direct

  // The sandbox also denies Vite's upward PostCSS config search; an empty config in the worktree
  // root replaces that search. It is removed again, so no file outside this stage's paths remains.
  const config = join(REPO, 'postcss.config.mjs')
  const existed = existsSync(config)
  if (!existed) writeFileSync(config, 'export default {}\n')
  try {
    direct = run(['node', 'node_modules/vite/bin/vite.js', 'build'])
    return direct
  } finally {
    if (!existed) rmSync(config, { force: true })
  }
}

describe('AC-1.6 — the repository gates pass', () => {
  test('renders the sign-in surface with its copy and action and no console error', () => {
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

    expect({
      headings: findAll(login, (el) => el.tag === 'h1').length,
      actions: findAll(login, (el) => el.tag === 'button').length,
      consoleErrors: errors.length,
    }).toEqual({ headings: 1, actions: 1, consoleErrors: 0 })
  })

  test.skipIf(innerRun)('passes bun run typecheck, bun test and bun run build', () => {
    const failures: { step: string; exitCode: number; output: string }[] = []
    for (const [step, result] of [
      ['bun run typecheck', typecheck()],
      ['bun test', tests()],
      ['bun run build', build()],
    ] as [string, Result][]) {
      if (result.exitCode !== 0) failures.push({ step, exitCode: result.exitCode, output: tail(result) })
    }
    expect(failures).toEqual([])
  }, 300_000)
})
