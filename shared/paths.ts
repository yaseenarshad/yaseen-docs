/**
 * Separator-tolerant path helpers for BOTH processes (no `node:path`: the renderer is sandboxed
 * and this file is shared). Main hands the renderer the OS's own absolute paths, so on Windows
 * every path looks like `C:\vault\note.md`, and a POSIX-only `lastIndexOf('/')` computes a
 * garbled parent, a whole-path "basename" or a mixed-separator join. A backslash counts as a
 * separator ONLY inside a Windows-shaped path (drive letter or UNC prefix): on macOS and Linux a
 * backslash is a legal file-name character and stays one, so nothing changes there.
 */

const WINDOWS_ABS_RE = /^(?:[A-Za-z]:[\\/]|\\\\)/

/** `C:\...`, `C:/...` or a `\\server\share` UNC path. */
export const isWindowsPath = (p: string): boolean => WINDOWS_ABS_RE.test(p)

/** Absolute on either OS: a POSIX root slash or a Windows drive / UNC prefix. */
export const isAbsolutePath = (p: string): boolean => p.startsWith('/') || isWindowsPath(p)

/** The separator a path of `p`'s shape joins with. */
export const pathSep = (p: string): '/' | '\\' => (isWindowsPath(p) ? '\\' : '/')

const isSepChar = (p: string, ch: string): boolean => ch === '/' || (ch === '\\' && isWindowsPath(p))

/** Index of the last separator in `p`, -1 when there is none. */
export function lastSeparatorIndex(p: string): number {
  return isWindowsPath(p) ? Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')) : p.lastIndexOf('/')
}

/** Trailing separators off, never a root's own (`/` and `C:\` stay as they are). */
export function stripTrailingSep(p: string): string {
  const min = isWindowsPath(p) && p[1] === ':' ? 3 : 1
  let end = p.length
  while (end > min && isSepChar(p, p[end - 1])) end--
  return p.slice(0, end)
}

/** Last path segment (trailing separators ignored); the input itself for a bare root. */
export function basename(p: string): string {
  const trimmed = stripTrailingSep(p)
  return trimmed.slice(lastSeparatorIndex(trimmed) + 1) || p
}

/** Everything before the last separator; '' when there is none (a bare name). */
export function dirname(p: string): string {
  const i = lastSeparatorIndex(p)
  return i === -1 ? '' : p.slice(0, i)
}

/**
 * `dir` + separator + each `part`, in `dir`'s own separator, so a Windows directory never grows a
 * `/`-joined tail the tree and the watcher would spell differently. A `/`-separated relative part
 * (`sub/deeper`) is re-joined natively; an existing trailing separator on `dir` is not doubled.
 */
export function joinPath(dir: string, ...parts: string[]): string {
  const sep = pathSep(dir)
  let out = dir
  for (const part of parts) {
    for (const piece of sep === '\\' ? part.split('/') : [part]) {
      if (piece === '') continue
      out = out !== '' && isSepChar(out, out[out.length - 1]) ? out + piece : `${out}${sep}${piece}`
    }
  }
  return out
}

/** The form two paths are compared in: Windows paths fold separators to `/` and case; POSIX paths are themselves. */
export const comparablePath = (p: string): string => (isWindowsPath(p) ? p.replace(/\\/g, '/').toLowerCase() : p)

/** The `/`-separated path of `p` relative to `root`, or null unless `p` is strictly under `root` (segment-wise). */
export function relativeTo(root: string, p: string): string | null {
  const r = comparablePath(stripTrailingSep(root))
  const prefix = r.endsWith('/') ? r : `${r}/`
  const c = comparablePath(p)
  if (c.length <= prefix.length || !c.startsWith(prefix)) return null
  const rel = p.slice(prefix.length)
  return isWindowsPath(p) ? rel.replace(/\\/g, '/') : rel
}

/** `p` lies strictly under `root`, by segment: `/a/b` never contains `/a/bc/x.md`. */
export const isUnder = (root: string, p: string): boolean => relativeTo(root, p) !== null

/** The same location, ignoring a trailing separator and, on Windows, separator style and case. */
export const samePath = (a: string, b: string): boolean => comparablePath(stripTrailingSep(a)) === comparablePath(stripTrailingSep(b))
