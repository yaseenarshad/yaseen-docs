import { fileKind } from '@shared/fileKind'
import { isAbsolutePath } from '@shared/paths'

/**
 * Cold-start deep links (E1, GRO-2171): macOS fires `open-url` before `ready`, so
 * `main/index.ts` pushes every URL here and calls `flush()` once `restoreAll()` has run —
 * queued URLs replay in order, and from then on pushes go straight to the handler.
 */
export interface LinkQueue {
  push(url: string): void
  flush(): void
}

export function createLinkQueue(handle: (url: string) => void): LinkQueue {
  const queued: string[] = []
  let ready = false
  return {
    push(url) {
      if (ready) handle(url)
      else queued.push(url)
    },
    flush() {
      ready = true
      for (const url of queued.splice(0)) handle(url)
    },
  }
}

/**
 * Plain file paths in a launch's argv (E2 off-mac): Explorer's "Open with" and a double-clicked
 * associated `.md` hand the path as an ordinary argument, on the first launch (`process.argv`) and
 * on a second one (`second-instance`) alike; macOS fires `open-file` instead and never puts one
 * here. Only an absolute path to a supported file kind counts, so the executable, `--flags`, the
 * `.` of a dev launch and unrelated arguments never route.
 */
export function fileArgs(argv: readonly string[]): string[] {
  return argv.filter((arg) => !arg.startsWith('-') && isAbsolutePath(arg) && fileKind(arg) !== null)
}
