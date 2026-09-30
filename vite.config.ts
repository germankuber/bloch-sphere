import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { APP_DEV_PORT, APP_PREVIEW_PORT } from './src/protocol/ports.ts'

export default defineConfig({
  plugins: [react()],
  server: { port: APP_DEV_PORT, strictPort: true },
  preview: { port: APP_PREVIEW_PORT, strictPort: true },
})
