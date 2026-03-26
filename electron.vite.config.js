import { resolve } from 'path'
import { defineConfig, externalizeDeps } from 'electron-vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

// Load env variables from .env
dotenv.config()

export default defineConfig({
  main: {
    plugins: [externalizeDeps()],
    // Inject environment variables into the main process
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
      'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY),
    },
  },
  preload: {
    plugins: [externalizeDeps()],
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
      },
    },
    plugins: [react()],
  },
})
