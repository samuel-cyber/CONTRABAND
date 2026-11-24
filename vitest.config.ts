import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so tests never load the Devvit build plugin.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
