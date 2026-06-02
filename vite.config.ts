import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

let commitHash = process.env.VITE_APP_VERSION || process.env.COMMIT_SHA || ''

if (!commitHash) {
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    commitHash = 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(commitHash),
  },
  css: {
    modules: {
      // Allow co-located *.module.css files to keep kebab-case class names
      // while components reference them as camelCase (styles.itemCard).
      localsConvention: 'camelCase',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
