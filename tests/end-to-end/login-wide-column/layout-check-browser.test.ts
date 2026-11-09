import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * AC-1.5 in a browser: `bun run layout:check` measures the login column in Chromium and exits 0
 * on this branch, and exits 1 on the base commit with `layout/login-wide-column` as the only
 * failing case.
 *
 * A Playwright spec in the shape of the S2 harness: the pinned suite runs it, the tests start the
 * app's own Vite dev server, the real `bun run layout:check` drives Chromium, and nothing is
 * skipped. The agent sandbox cannot launch Chromium and has no reachable dev server, so a run
 * inside it fails here and the quality report records that limitation in prose; the quality gate
 * runs this suite outside the sandbox where Playwright can launch a browser, and that run is the
 * evidence for AC-1.5.
 */
const REPO = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '')
const BASE_COMMIT = 'ae51078c39d91dff3be39f142e0ccdcc4a6dea8b'
const VITE = join(REPO, 'node_modules/vite/bin/vite.js')

interface DevServer {
  url: string
  stop: () => void
}

const reachable = async (url: string): Promise<boolean> => {
  try {
    return (await fetch(url)).status < 500
  } catch {
    return false
  }
}

/** The app's own Vite dev server, as a child process so the command under test can reach it. */
async function startDevServer(cwd: string): Promise<DevServer> {
  const port = 5400 + Math.floor(Math.random() * 300)
  const child = Bun.spawn(['node', VITE, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd,
    env: { ...process.env, BROWSER: 'none' },
    stdout: 'ignore',
    stderr: 'pipe',
  })
  const url = `http://127.0.0.1:${port}`
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await reachable(url)) return { url, stop: () => child.kill() }
    await Bun.sleep(250)
  }
  child.kill()
  // Say why it never answered: an unreadable worktree or a denied loopback read here.
  const why = (await new Response(child.stderr).text()).trim().split('\n').slice(-3).join(' | ')
  throw new Error(`the dev server on ${url} did not answer${why ? `: ${why}` : ''}`)
}

interface Result {
  exitCode: number
  output: string
}

/** `bun run layout:check <surface>` against `baseUrl`, awaited so the server keeps serving. */
async function runLayoutCheck(baseUrl: string, surface: string): Promise<Result> {
  const spawn = async (command: string[]): Promise<Result> => {
    const child = Bun.spawn(command, {
      cwd: REPO,
      env: { ...process.env, BASE_URL: baseUrl },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const timer = setTimeout(() => child.kill(), 180_000)
    const exitCode = await child.exited
    clearTimeout(timer)
    const output = `${await new Response(child.stdout).text()}${await new Response(child.stderr).text()}`
    return { exitCode, output }
  }
  const scripted = await spawn([process.execPath, 'run', 'layout:check', surface])
  // A seatbelted sandbox cannot read the worktree's parents, so `bun run` aborts before the script
  // starts; the same command is then run directly, which is what the npm script does anyway.
  if (!/CouldntReadCurrentDirectory|error loading current directory/i.test(scripted.output)) return scripted
  return spawn([process.execPath, join(REPO, 'scripts/layout-check.mjs'), surface])
}

/** The case lines the check printed, as [status, id] pairs. */
const caseLines = (output: string): [string, string][] =>
  output
    .split('\n')
    .map((line) => line.match(/^(PASS|FAIL)\s+(\S+)/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => [match[1], match[2]])

const failingIds = (output: string): string[] => [
  ...new Set(caseLines(output).filter(([status]) => status === 'FAIL').map(([, id]) => id)),
]

let branch: DevServer
let base: DevServer | undefined
let baseDir: string | undefined

/** The base commit's own dev server; started by the base case so a branch-case result cannot depend on it. */
async function startBase(): Promise<DevServer> {
  baseDir = await mkdtemp(join(tmpdir(), 'nekibuki-base-'))
  const archive = Bun.spawnSync(['git', 'archive', '--format=tar', BASE_COMMIT], {
    cwd: REPO,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (archive.exitCode !== 0) throw new Error(`git archive ${BASE_COMMIT} failed`)
  const extract = Bun.spawnSync(['tar', '-x', '-C', baseDir], {
    stdin: archive.stdout,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (extract.exitCode !== 0) throw new Error(`extracting ${BASE_COMMIT} failed`)
  await symlink(join(REPO, 'node_modules'), join(baseDir, 'node_modules'), 'dir')
  return startDevServer(baseDir)
}

beforeAll(async () => {
  branch = await startDevServer(REPO)
}, 240_000)

afterAll(async () => {
  base?.stop()
  branch?.stop()
  if (baseDir) await rm(baseDir, { recursive: true, force: true })
})

describe('layout:check in a browser', () => {
  test('passes the wide sign-in column on this branch', async () => {
    const run = await runLayoutCheck(branch.url, 'login')
    expect({ exitCode: run.exitCode, failing: failingIds(run.output) }).toEqual({ exitCode: 0, failing: [] })
    expect(run.output).toContain('PASS  layout/login-wide-column')
  }, 240_000)

  test('fails on the base commit with the wide sign-in column as the failing case', async () => {
    base = await startBase()
    const run = await runLayoutCheck(base.url, 'login')
    expect({ exitCode: run.exitCode, failing: failingIds(run.output) }).toEqual({
      exitCode: 1,
      failing: ['layout/login-wide-column'],
    })
    expect(run.output).toContain('FAIL  layout/login-wide-column')
  }, 240_000)
})
