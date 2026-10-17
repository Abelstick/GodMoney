import { defineConfig } from 'vitest/config'
import path from 'path'

// Config aparte de vite.config.js para no cargar el plugin PWA en las pruebas.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
