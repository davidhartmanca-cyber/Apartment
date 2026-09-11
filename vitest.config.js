import { defineConfig, configDefaults } from 'vitest/config'

// Default test run = unit tests only. The emulator-backed rules tests run via
// `npm run test:rules` (which boots the Firestore/Storage emulators first).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'tests/rules/**'],
  },
})
