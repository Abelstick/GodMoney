import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
      workbox: {
        // Cachea todos los assets del build
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Estrategia: cache-first para assets, network-first para API
        runtimeCaching: [
          {
            // Supabase API → network-first (datos frescos cuando hay conexión)
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutos
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts (si se agregan en el futuro)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
        ],
      },
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
