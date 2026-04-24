import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

let commitHash = 'unknown'
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch (e) {
  console.warn('Failed to get git commit hash')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(commitHash),
  }
})
