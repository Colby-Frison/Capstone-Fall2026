import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    // Pure-logic tests run in node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock at the top of the file.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      // The shared content package lives outside this Vite root.
      allowExternal: true,
      include: ['**/apps/web/src/**/*.{ts,tsx}', '**/packages/content/**/*.ts'],
      // Globs are prefixed with ** because allowExternal widens the match root.
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/apps/web/src/test/**',
        '**/apps/web/src/imports/**',
        '**/apps/web/src/main.tsx',
        '**/*.d.ts',
        '**/data/types.ts',
      ],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 80,
        branches: 75,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
      '@content': path.resolve(rootDir, '../../packages/content'),
      '@guidance': path.resolve(rootDir, '../../data/guidance'),
    },
  },
});
