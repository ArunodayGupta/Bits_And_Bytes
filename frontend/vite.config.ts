import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname || process.cwd(), './src'),
    },
  },
  // @ts-expect-error vitest config
  test: {
    globals: true,
    environment: 'happy-dom',
  },
})
