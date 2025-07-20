import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['**/*.test.js'],
    exclude: ['node_modules/**', 'dist/**'],
  },
  esbuild: {
    target: 'es2020'
  }
});