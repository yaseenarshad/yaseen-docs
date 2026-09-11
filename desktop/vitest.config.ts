import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  test: {
    name: 'desktop',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // chokidar tests write right after `ready`; stat polling makes that deterministic (macOS FSEvents start asynchronously).
    env: { CHOKIDAR_USEPOLLING: '1' },
    // The git suites run the real git, and a sync pass on Windows takes 2-4 s (process spawn is
    // slow there, plus Defender on every temp repo): the 5 s default trips under load.
    testTimeout: process.platform === 'win32' ? 20_000 : 5_000,
  },
})
