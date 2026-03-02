import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    // Use node environment by default for better compatibility with transformers.js
    environment: 'node',
    // Override environment for specific test patterns
    environmentMatchGlobs: [
      // Use jsdom for component tests
      ['**/components/**/*.test.{ts,tsx}', 'jsdom'],
      ['**/app/**/*.test.{ts,tsx}', 'jsdom'],
    ],
    setupFiles: ['./lib/rag/__tests__/setup.ts'],
    testTimeout: 30000,
    // Run tests sequentially to avoid memory issues with embedding model
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
