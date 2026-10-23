import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Rules tests need the Firestore emulator; run them with `npm run test:rules`.
    exclude: process.env.RULES_TESTS ? [] : ['tests/firestore.rules.test.ts'],
  },
})
