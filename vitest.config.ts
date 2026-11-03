import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Tests that load the whole content corpus take a few seconds, and longer on a busy machine.
    testTimeout: 20000,
    reporters: ['default'],
  },
});
