import { expect, test } from 'bun:test'
import { mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

/**
 * AC-1.5 is about the check itself: `bun run layout:check` must reject the base commit's sign-in
 * layout and accept this branch's. So this test runs the real command, against a real dev server,
 * and reads its real exit code — it does not read the script's source or re-derive its verdict.
 *
 * The check needs Chromium. Where no browser can be launched (a bare sandbox), the browser case is
 * skipped rather than failed; the always-on case still executes the command and asserts its exit
 * code contract (0 pass, 1 failed case, 2 unknown surface).
 */
const REPO = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '')
const BASE_COMMIT = 'ae51078c39d91dff3be39f142e0ccdcc4a6dea8b'
const VITE = join(REPO, 'node_modules/vite/bin/vite.js')

const chromiumAvailable = async (): Promise<boolean> => {
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

const hasBrowser = await chromiumAvailable()

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

const startDevServer = async (cwd: string): Promise<DevServer> => {
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

const spawnCheck = (command: string[], baseUrl: string) => {
  const result = Bun.spawnSync(command, {
    cwd: REPO,
    env: { ...process.env, BASE_URL: baseUrl },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 180_000,
  })
  return { exitCode: result.exitCode, output: `${result.stdout.toString()}${result.stderr.toString()}` }
}

const runLayoutCheck = (baseUrl: string, surface: string) => {
  const run = spawnCheck([process.execPath, 'run', 'layout:check', surface], baseUrl)
  // A seatbelted sandbox cannot read the worktree's parents, so `bun run` aborts before the script
  // starts; the same command is then run directly, which is what the npm script does anyway.
  if (/CouldntReadCurrentDirectory|error loading current directory/i.test(run.output)) {
    return spawnCheck([process.execPath, join(REPO, 'scripts/layout-check.mjs'), surface], baseUrl)
  }
  return run
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

test('runs as bun run layout:check and rejects an unknown surface with exit code 2', async () => {
  const packageJson = JSON.parse(await Bun.file(join(REPO, 'package.json')).text()) as {
    scripts: Record<string, string>
  }
  expect(packageJson.scripts['layout:check']).toBe('bun scripts/layout-check.mjs')

  const unknown = runLayoutCheck('http://127.0.0.1:9', 'not-a-surface')
  expect({ exitCode: unknown.exitCode, namesTheSurface: unknown.output.includes('not-a-surface') }).toEqual({
    exitCode: 2,
    namesTheSurface: true,
  })
})

test.skipIf(!hasBrowser)(
  'exits 0 on this branch and 1 on the base commit for the wide sign-in column',
  async () => {
    const branch = await startDevServer(REPO)
    try {
      const run = runLayoutCheck(branch.url, 'login')
      expect({ exitCode: run.exitCode, failing: failingIds(run.output) }).toEqual({ exitCode: 0, failing: [] })
      expect(run.output).toContain('PASS  layout/login-wide-column')
    } finally {
      branch.stop()
    }

    const base = await mkdtemp(join(tmpdir(), 'nekibuki-base-'))
    try {
      const archive = Bun.spawnSync(['git', 'archive', '--format=tar', BASE_COMMIT], {
        cwd: REPO,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      expect(archive.exitCode).toBe(0)
      const extract = Bun.spawnSync(['tar', '-x', '-C', base], { stdin: archive.stdout, stdout: 'pipe', stderr: 'pipe' })
      expect(extract.exitCode).toBe(0)
      await symlink(join(REPO, 'node_modules'), join(base, 'node_modules'), 'dir')

      const baseServer = await startDevServer(base)
      try {
        const run = runLayoutCheck(baseServer.url, 'login')
        expect({ exitCode: run.exitCode, failing: failingIds(run.output) }).toEqual({
          exitCode: 1,
          failing: ['layout/login-wide-column'],
        })
        expect(run.output).toContain('FAIL  layout/login-wide-column')
      } finally {
        baseServer.stop()
      }
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  },
  240_000,
)
