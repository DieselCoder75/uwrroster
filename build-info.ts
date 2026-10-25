import { execFileSync } from 'node:child_process'

/** What the app shows about the release it is running: the pull request it came from, the commit and the build time. */
export interface BuildInfo {
  pr: number | null
  commit: string | null
  date: string
}

/** The pull request number in a commit subject: "Merge pull request #19 from …" or a squash merge's "Title (#19)". */
export function prFromSubject(subject: string): number | null {
  const match = /^Merge pull request #(\d+)\b/.exec(subject) ?? /\(#(\d+)\)\s*$/.exec(subject)
  return match ? Number(match[1]) : null
}

/** Reads the built commit from git, so the deploy on merge to main and a manual `npm run deploy` both get it. */
export function readBuildInfo(now = new Date()): BuildInfo {
  try {
    const [hash, subject] = execFileSync('git', ['log', '-1', '--format=%h%n%s'], { encoding: 'utf8' }).split('\n')
    return { pr: prFromSubject(subject ?? ''), commit: hash || null, date: now.toISOString() }
  } catch {
    return { pr: null, commit: null, date: now.toISOString() }
  }
}
