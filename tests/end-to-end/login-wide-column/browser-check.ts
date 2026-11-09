/**
 * AC-1.5's browser measurement, runnable where a browser exists:
 *
 *   bun tests/end-to-end/login-wide-column/browser-check.ts
 *
 * It starts this worktree's dev server and runs the real `bun run layout:check login` against it:
 * exit 0 with no failing case on this branch, and exit 1 with `layout/login-wide-column` as the
 * only failing case on a checkout of the base commit.
 *
 * This is deliberately not a `bun test` case. Where no browser can be launched the check cannot
 * measure anything, and a skipped test reads as a pass; so the missing-browser path is reported
 * as `blocked` here — a distinct exit code and a plain message — and the quality report records
 * AC-1.5 as blocked rather than skipped. Exit codes: 0 pass, 1 check disagreed, 3 blocked.
 */
import { mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const REPO = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '')
const BASE_COMMIT = 'ae51078c39d91dff3be39f142e0ccdcc4a6dea8b'
const VITE = join(REPO, 'node_modules/vite/bin/vite.js')

const caseLines = (output: string): [string, string][] =>
  output
    .split('\n')
    .map((line) => line.match(/^(PASS|FAIL)\s+(\S+)/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => [match[1], match[2]])

const failingIds = (output: string): string[] => [
  ...new Set(caseLines(output).filter(([status]) => status === 'FAIL').map(([, id]) => id)),
]

async function chromiumAvailable(): Promise<boolean> {
  for (const options of [
    { timeout: 8_000 },
    { channel: 'chrome', timeout: 8_000 },
    { args: ['--no-sandbox'], timeout: 8_000 },
  ]) {
    try {
      const browser = await chromium.launch(options)
      await browser.close()
      return true
    } catch {
      // try the next launch flavour
    }
  }
  return false
}

const reachable = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url)
    return response.status < 500
  } catch {
    return false
  }
}

interface DevServer {
  url: string
  stop: () => void
}

async function startDevServer(cwd: string): Promise<DevServer> {
  const port = 5400 + Math.floor(Math.random() * 300)
  const child = Bun.spawn(['node', VITE, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd,
    env: { ...process.env, BROWSER: 'none' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const url = `http://127.0.0.1:${port}`
  for (let attempt = 0; attempt < 160; attempt += 1) {
    if (await reachable(url)) return { url, stop: () => child.kill() }
    await Bun.sleep(250)
  }
  child.kill()
  throw new Error(`the dev server on ${url} did not answer`)
}

interface Result {
  exitCode: number
  output: string
}

function spawnCheck(command: string[], baseUrl: string): Result {
  const result = Bun.spawnSync(command, {
    cwd: REPO,
    env: { ...process.env, BASE_URL: baseUrl },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 180_000,
  })
  return { exitCode: result.exitCode, output: `${result.stdout.toString()}${result.stderr.toString()}` }
}

function runLayoutCheck(baseUrl: string, surface: string): Result {
  const run = spawnCheck([process.execPath, 'run', 'layout:check', surface], baseUrl)
  // A seatbelted sandbox cannot read the worktree's parents, so `bun run` aborts before the script
  // starts; the same command is then run directly, which is what the npm script does anyway.
  if (/CouldntReadCurrentDirectory|error loading current directory/i.test(run.output)) {
    return spawnCheck([process.execPath, join(REPO, 'scripts/layout-check.mjs'), surface], baseUrl)
  }
  return run
}

async function main(): Promise<number> {
  if (!(await chromiumAvailable())) {
    console.error(
      'BLOCKED  layout/check-fails-on-base-commit — no Chromium could be launched here, so AC-1.5’s\n' +
        'browser measurement was not performed. Run `bun run layout:check` on this branch (exit 0) and\n' +
        'on a base-commit checkout (exit 1) where a browser is available.',
    )
    return 3
  }

  const branch = await startDevServer(REPO)
  let branchRun: Result
  try {
    branchRun = runLayoutCheck(branch.url, 'login')
  } finally {
    branch.stop()
  }
  const branchOk =
    branchRun.exitCode === 0 && failingIds(branchRun.output).length === 0 && branchRun.output.includes('PASS  layout/login-wide-column')

  const base = await mkdtemp(join(tmpdir(), 'nekibuki-base-'))
  let baseRun: Result
  try {
    const archive = Bun.spawnSync(['git', 'archive', '--format=tar', BASE_COMMIT], { cwd: REPO, stdout: 'pipe', stderr: 'pipe' })
    if (archive.exitCode !== 0) throw new Error(`git archive ${BASE_COMMIT} failed`)
    const extract = Bun.spawnSync(['tar', '-x', '-C', base], { stdin: archive.stdout, stdout: 'pipe', stderr: 'pipe' })
    if (extract.exitCode !== 0) throw new Error(`extracting ${BASE_COMMIT} failed`)
    await symlink(join(REPO, 'node_modules'), join(base, 'node_modules'), 'dir')

    const baseServer = await startDevServer(base)
    try {
      baseRun = runLayoutCheck(baseServer.url, 'login')
    } finally {
      baseServer.stop()
    }
  } finally {
    await rm(base, { recursive: true, force: true })
  }
  const baseOk =
    baseRun.exitCode === 1 &&
    failingIds(baseRun.output).length === 1 &&
    failingIds(baseRun.output)[0] === 'layout/login-wide-column' &&
    baseRun.output.includes('FAIL  layout/login-wide-column')

  console.log(`branch: exit ${branchRun.exitCode}, ${branchOk ? 'PASS' : 'unexpected output'}`)
  console.log(`base:   exit ${baseRun.exitCode}, ${baseOk ? 'FAIL on layout/login-wide-column only' : 'unexpected output'}`)
  return branchOk && baseOk ? 0 : 1
}

if (import.meta.main) process.exit(await main())
