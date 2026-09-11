# Windows fixes, 2026-09-11

Branch `windows-fixes`. Worked on Windows 11 (Node 24, Git for Windows with the default
`core.autocrlf=true`). Baseline on this machine before any change: typecheck clean, `npm test`
29 failed / 3627 passed in 11 files (the same run gave 24 the first time; the git suites are
timing-sensitive). After: all green, `npm run build` clean.

## Bugs found and fixed

1. **Every renderer path helper assumed `/`.** Main hands the renderer the OS's own absolute
   paths (`C:\vault\note.md`), and the renderer computed parents, names and joins with
   `lastIndexOf('/')`, `startsWith(root + '/')` and `` `${dir}/${name}` ``. On Windows a file
   row's parent came out as the path minus its last character, "New note" under a folder wrote
   `C:\v\su/name.md`, the tab title was the whole path, the sidebar never auto-expanded to the
   open file, folder-page members were parked in a garbage directory, and every root-relative
   check (rename link rewrite, view-only catalog, external rename detector, stale-tab probe)
   silently answered "not under the vault". Fix: `shared/paths.ts`, one separator-tolerant
   vocabulary (`basename`, `dirname`, `joinPath`, `relativeTo`, `isUnder`, `samePath`,
   `isAbsolutePath`). A backslash counts as a separator only inside a Windows-shaped path
   (drive letter or UNC prefix), so macOS file names keep every byte. Sites:
   `client/src/lib/paths.ts`, `lib/treeState.ts`, `lib/urlHash.ts`, `sidebar/createEntry.ts`,
   `sidebar/Sidebar.tsx`, `sidebar/TopicsTree.tsx`, `workspace/pageDrag.ts`, `App.tsx`,
   `links/viewOnlyCatalog.ts`, `links/renameLinks.ts`, `links/renameDetector.ts`,
   `views/engine.ts`, `views/scaffold.ts`, `views/FolderPageContents.tsx`,
   `views/view/OutlineView.tsx`, `editor/wikilink/createFromLink.ts`, `shared/fileKind.ts`.
2. **Deep links rejected every Windows path** (`shared/links.ts` demanded a leading `/`), so
   "Copy link" produced a link the app itself refused, and `resolveLinkTarget`
   (`desktop/src/main/windows.ts`) used `path.posix` and `root + '/'` prefix checks, so a link
   could never land in the window already showing that vault. Fixed with the shared helpers;
   containment is case-blind on Windows.
3. **File association did nothing on Windows.** The NSIS build registers `.md`/`.markdown`, but
   `desktop/src/main/index.ts` only listened for macOS `open-file`; Windows hands the path as a
   plain argv entry on the first launch and on `second-instance`. Added `fileArgs()`
   (`desktop/src/main/linkQueue.ts`) and routed those through the same link queue.
4. **Open in VS Code built a mangled URL** (`desktop/src/main/fs/openInVsCode.ts` split on `/`,
   so `C:\v\a.md` became one percent-encoded segment: `vscode://fileC%3A%5Cv%5Ca.md`). Now the
   documented `vscode://file/C%3A/v/a.md` form.
5. **Store repair after a folder rename or delete used a `/` prefix** (`desktop/src/main/store.ts`
   `renamePath` / `removePath`), so tabs, recents and folder state under a renamed or deleted
   Windows folder were never remapped or dropped. The `ipc/fs` delete test caught this.
6. **Application menu carried macOS-only roles on Windows** (`desktop/src/main/menu.ts`):
   `hide`/`hideOthers`/`unhide` in an app menu Windows never shows properly, `zoom` and `front`
   in Window, and the ⌘⇧]/⌘⇧[ tab duplicates rely on `acceleratorWorksWhenHidden`, which is
   macOS-only. Off-mac the menu is now File (ending in Exit), Edit, View, Window (minimize + the
   Ctrl+Tab pair), Help (with About). macOS output is unchanged.
7. **Atomic save had no tolerance for Windows' transient rename refusals**
   (`desktop/src/main/fs/fsUtils.ts` `atomicWrite`). Renaming the temp file over a note that an
   indexer, sync client or antivirus scan has open at that instant fails EPERM/EBUSY; POSIX
   never does. On win32 the rename is retried a handful of times with a short backoff. The
   store's own write goes through the same function.
8. **CRLF checkouts broke the test suite** (no `.gitattributes`; Git for Windows defaults to
   `core.autocrlf=true`). vitest could not parse the CRLF `tools/migrateFolderPages.mjs`
   ("Invalid or unexpected token") and a fixture comparison pinned LF bytes. Added
   `.gitattributes` (`* text=auto eol=lf`, binaries marked) and normalized the fixture read in
   `client/src/views/migrateFolderBody.test.ts`. Existing checkouts stay CRLF until re-checked
   out; git status is unaffected either way.
9. **Tests with POSIX assumptions** (all confirmed failing on Windows first):
   `ipc/state.test.ts`, `ipc/window.test.ts` (main resolves `/v` to `C:\v` on the current drive;
   expectations now `path.resolve` the same way), `fs/openLink.test.ts` (native expected paths;
   `file://host/share` is a UNC path Windows does open, so that case is platform-gated),
   `fs/openInVsCode.test.ts`, `vaultIndex/live.test.ts` (separator normalization).
10. **Git suites on Windows**: each real-git test takes 2-4 s (spawn cost plus Defender), tripping
    the 5 s default under load, and a git child that has just exited, or a `git-remote-http`
    grandchild still waiting on an unreachable remote, holds the temp repo so the recursive
    delete fails EBUSY. `desktop/vitest.config.ts` gives win32 a 20 s test timeout;
    `git/gitFixture.ts` gained `removeTempDir` (retries, then leaves a still-held dir to the OS
    temp cleanup) and sets `core.autocrlf=false` locally, because a global autocrlf=true made
    `rebase --abort` re-checkout LF blobs as CRLF and guarantee 1 (byte-identical tree) could
    never hold. `docs/CONTRACTS.md` no longer claims paths are POSIX.

## Seen, deliberately not changed

- `git` runs with the user's own config, so with a global `core.autocrlf=true` a rebase abort
  can re-checkout a note as CRLF. Content is identical, the app reads either ending and writes
  LF, and forcing `-c core.autocrlf=false` would make git see every CRLF-checked-out vault file
  as modified, which is worse. Left as git's behaviour.
- `menu.ts` off-mac drops the hidden ⌘⇧]/⌘⇧[ tab duplicates rather than showing two "Next Tab"
  rows; Ctrl+Tab / Ctrl+Shift+Tab remain.
- `protocol.handle('app')` joins the URL pathname without `decodeURIComponent`; every bundled
  asset name is ASCII so it works, and it is not Windows-specific.
- README/LAUNCH still describe the app as macOS-first ("no Windows/Linux" under Out of scope);
  the release workflow already builds the Windows installer, so that is a docs question for the
  owner, not a bug.
- chokidar echo behaviour of the tmp+rename save on Windows (rename events vs change) was not
  changed; the existing `awaitWriteFinish` + mtime echo suppression was left alone because it
  could not be observed in a running app here.
- `git` on Windows: no HOME/USERPROFILE, safe.directory or credential-manager change was needed;
  Git for Windows resolves HOME itself and the candidate list already covers Program Files,
  Program Files (x86) and the per-user `%LOCALAPPDATA%\Programs` install.

## Verified

- `npm run typecheck` clean, `npm test` 224 files / 3719 passed / 1 skipped (the one unhandled
  error is the pre-existing Milkdown timer `removeEventListener is not defined` teardown in a
  jsdom suite, present in the baseline too), `npm run build` clean.
- Smoke launch of the built app (`desktop/out/main/index.js`, Playwright-Electron, temp
  `--user-data-dir`) on Windows: window titled "Yaseen Docs", Welcome screen renders, menu is
  File / Edit / View / Window / Help with Exit at the bottom of File. Gotcha for agents: a shell
  that inherits `ELECTRON_RUN_AS_NODE=1` (Claude Code's does) makes Electron start as plain Node
  and the launch fails on `app.setName`; unset it first.

## Not verified

- No hands-on editing session in the running app (typing, saving, watching a sync folder), so
  the atomic-save retry and chokidar behaviour were not observed live. The Playwright e2e suite
  was not run.
- `npm run desktop:build:win` (electron-builder NSIS packaging) was not run.
