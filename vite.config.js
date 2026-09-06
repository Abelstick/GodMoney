import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest (en vez de generateSW) para poder tener un service
      // worker propio (src/sw.js) que además del precache escuche eventos
      // `push` — necesario para las notificaciones de pagos recurrentes.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'GodMoney',
        short_name: 'GodMoney',
        description: 'Gestión de finanzas personales',
        theme_color: '#6366f1',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'es',
        categories: ['finance', 'productivity'],
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Nuevo ingreso',
            short_name: 'Ingreso',
            url: '/ingresos',
            icons: [{ src: 'icon-192.svg', sizes: '192x192' }],
          },
          {
            name: 'Nuevo gasto',
            short_name: 'Gasto',
            url: '/gastos',
            icons: [{ src: 'icon-192.svg', sizes: '192x192' }],
          },
          {
            name: 'Dashboard',
            short_name: 'Inicio',
            url: '/',
            icons: [{ src: 'icon-192.svg', sizes: '192x192' }],
          },
        ],
      },
      // Con injectManifest, `workbox.runtimeCaching` ya no aplica — esas
      // rutas se reimplementan a mano en src/sw.js con workbox-routing.
      devOptions: {
        enabled: false, // evita conflictos en desarrollo
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
