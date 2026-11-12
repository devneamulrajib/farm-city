import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setupEnv.js'],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 20000,
  },
});
