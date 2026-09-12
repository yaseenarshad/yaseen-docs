/**
 * The renderer's path vocabulary: the shared separator-tolerant helpers (main hands the renderer
 * the OS's own absolute paths, `C:\vault\note.md` on Windows) plus the vault-extension strip.
 */
export { basename, comparablePath, dirname, isAbsolutePath, isUnder, joinPath, pathSep, relativeTo, samePath, stripTrailingSep } from '@shared/paths'

/** File name without its vault extension (`.md` / `.markdown`). */
export const stripExt = (name: string) => name.replace(/\.(md|markdown)$/i, '')
