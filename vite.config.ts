import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

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
      output: {
        manualChunks: undefined,
      },
    },
  },
})
