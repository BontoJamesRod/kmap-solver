import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/kmap-solver/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
