import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  server: {
    allowedHosts: 'all'
  },
  plugins: [
    base44({
      legacySupport: true
    }),
    react()
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})