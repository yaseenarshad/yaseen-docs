import { describe, expect, it } from 'vitest'
import { basename, dirname, isAbsolutePath, isUnder, joinPath, relativeTo, stripExt } from './paths'

describe('basename', () => {
  it('returns the last segment, ignoring trailing slashes', () => {
    expect(basename('/a/b/c.md')).toBe('c.md')
    expect(basename('/a/b/')).toBe('b')
    expect(basename('/')).toBe('/')
  })
})

describe('stripExt', () => {
  it('strips markdown extensions, case-insensitive', () => {
    expect(stripExt('note.md')).toBe('note')
    expect(stripExt('note.MARKDOWN')).toBe('note')
  })

  it('leaves other names alone', () => {
    expect(stripExt('notes.txt')).toBe('notes.txt')
    expect(stripExt('Tasks.base')).toBe('Tasks.base') // not a vault extension since YAZ-844
    expect(stripExt('database')).toBe('database')
  })
})

describe('Windows-shaped paths (the main process hands the renderer the OS’s own paths)', () => {
  it('basename / dirname split on the backslash', () => {
    expect(basename('C:\\v\\sub\\c.md')).toBe('c.md')
    expect(basename('C:\\v\\sub\\')).toBe('sub')
    expect(dirname('C:\\v\\sub\\c.md')).toBe('C:\\v\\sub')
    expect(dirname('/a/b/c.md')).toBe('/a/b')
    expect(dirname('c.md')).toBe('')
  })

  it('a backslash inside a POSIX path is a file-name character, not a separator', () => {
    expect(basename('/a/we\\ird.md')).toBe('we\\ird.md')
    expect(dirname('/a/we\\ird.md')).toBe('/a')
  })

  it('joinPath uses the directory’s own separator and never doubles one', () => {
    expect(joinPath('C:\\v', 'note.md')).toBe('C:\\v\\note.md')
    expect(joinPath('C:\\v\\', 'note.md')).toBe('C:\\v\\note.md')
    expect(joinPath('C:\\v', 'a/b', 'note.md')).toBe('C:\\v\\a\\b\\note.md')
    expect(joinPath('/r', 'note.md')).toBe('/r/note.md')
    expect(joinPath('/', 'note.md')).toBe('/note.md')
  })

  it('isAbsolutePath knows drives and UNC shares', () => {
    expect(isAbsolutePath('C:\\v')).toBe(true)
    expect(isAbsolutePath('c:/v')).toBe(true)
    expect(isAbsolutePath('\\\\server\\share')).toBe(true)
    expect(isAbsolutePath('/v')).toBe(true)
    expect(isAbsolutePath('v\\a.md')).toBe(false)
    expect(isAbsolutePath('rel.md')).toBe(false)
  })

  it('relativeTo / isUnder answer in `/` form, by segment, case-blind on Windows only', () => {
    expect(relativeTo('C:\\v', 'C:\\v\\sub\\a.md')).toBe('sub/a.md')
    expect(relativeTo('c:\\V\\', 'C:\\v\\a.md')).toBe('a.md')
    expect(relativeTo('C:\\v', 'C:\\vault\\a.md')).toBeNull()
    expect(relativeTo('/r', '/r/a/b.md')).toBe('a/b.md')
    expect(relativeTo('/r', '/R/a/b.md')).toBeNull()
    expect(relativeTo('/', '/a.md')).toBe('a.md')
    expect(isUnder('/r', '/r')).toBe(false)
    expect(isUnder('/r', '/rx/a.md')).toBe(false)
  })
})
