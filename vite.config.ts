import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    port: 4205,
  },
  // Base URL for GitHub Pages - change 'tpt' to your repo name
  // For custom domain or root deployment, use '/'
  base: '/tpt/',
  build: {
    // Generate source maps for debugging
    sourcemap: false,
    // Optimize chunk size
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        remote: resolve(__dirname, 'remote.html'),
        talent: resolve(__dirname, 'talent.html'),
      },
      output: {
        manualChunks: undefined,
      },
    },
  },
})
