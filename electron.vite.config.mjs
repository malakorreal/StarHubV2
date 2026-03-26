const { resolve } = require('path')
const { defineConfig, externalizeDeps } = require('electron-vite')
const react = require('@vitejs/plugin-react')
const dotenv = require('dotenv')

// Load env variables from .env
dotenv.config()

module.exports = defineConfig({
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
