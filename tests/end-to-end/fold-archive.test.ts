import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Fold criterion: the change spec is archived and the living app documents carry the folded
 * requirements. These cases read the repository itself, so they fail on the released `main`
 * commit where the archive and the living behaviour doc do not exist.
 */
const REPO = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '')
const ARCHIVE = join(REPO, 'docs/changes/archive/FEAT-0001-src-screens-login-screen-tsx-main-at-lin')
const LIVING = join(REPO, 'docs/contexts/app/behavior/reading-measure.md')
const DOMAIN = join(REPO, 'docs/contexts/app/domain-model.md')
const GLOSSARY = join(REPO, 'docs/contexts/app/glossary.md')

const read = (path: string) => readFileSync(path, 'utf8')

describe('fold — archived change spec and living truth', () => {
  test('archives every change-spec file and leaves no copy under docs/changes', () => {
    for (const file of ['scope.md', 'spec.md', 'strategic.md', 'tactical.md', 'tasks.md', 'test-plan.md']) {
      expect(existsSync(join(ARCHIVE, file))).toBe(true)
    }
    expect(existsSync(join(REPO, 'docs/changes/FEAT-0001-src-screens-login-screen-tsx-main-at-lin'))).toBe(false)
  })

  test('carries all six folded requirements in the living behaviour doc', () => {
    const living = read(LIVING)
    for (let n = 1; n <= 6; n += 1) {
      expect(living).toContain(`### APP-REQ-00${n} `)
      expect(living).toContain(`| \`APP-REQ-NEW-${n}\` | \`APP-REQ-00${n}\` |`)
    }
  })

  test('records the change in the domain model and the glossary', () => {
    expect(read(DOMAIN)).toContain('Effect of the reading-measure change')
    const glossary = read(GLOSSARY)
    for (const term of ['Reading measure', 'Full-screen surface', 'Sign-in surface', 'Introduction', 'Profile surface', 'Gutter', 'Wide viewport', 'Short-landscape split', 'Layout check']) {
      expect(glossary).toContain(`**${term}**`)
    }
  })

  test('stamps the released commit and ticks every task in the archived spec', () => {
    expect(read(join(ARCHIVE, 'spec.md'))).toMatch(/^verified_commit: e844f7998f01ae9509d9d6d1d0136e9ce7682363$/m)
    const tasks = read(join(ARCHIVE, 'tasks.md'))
    for (const task of ['S1 —', 'S2 —', 'Fold & archive']) {
      expect(tasks).toContain(`- [x] ${task}`)
    }
    expect(tasks).not.toContain('- [ ]')
  })
})
