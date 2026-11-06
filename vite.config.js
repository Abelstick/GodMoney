import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt': el service worker nuevo queda en espera hasta que el usuario
      // pulse "Actualizar" (UpdatePrompt). Así una versión nueva nunca
      // reemplaza en caliente los chunks de una pestaña abierta.
      registerType: 'prompt',
      injectRegister: false,
      // injectManifest (en vez de generateSW) para poder tener un service
      // worker propio (src/sw.js) que además del precache escuche eventos
      // `push` — necesario para las notificaciones de pagos recurrentes.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'badge-96.png'],
      manifest: {
        id: '/',
        name: 'GodMoney',
        short_name: 'GodMoney',
        description: 'Gestión de finanzas personales',
        // Coinciden con el fondo claro de la app: la splash y la barra de
        // estado no "saltan" de color al terminar de cargar.
        theme_color: '#f3f4f8',
        background_color: '#f3f4f8',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        // Sin bloqueo de orientación (WCAG 1.3.4): la app es usable en ambas.
        scope: '/',
        start_url: '/',
        lang: 'es-PE',
        dir: 'ltr',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
        shortcuts: [
          {
            name: 'Nuevo gasto',
            short_name: 'Gasto',
            url: '/gastos?nuevo=1',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Nuevo ingreso',
            short_name: 'Ingreso',
            url: '/ingresos?nuevo=1',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Movimientos',
            short_name: 'Movimientos',
            url: '/movimientos',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
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
  build: {
    rollupOptions: {
      output: {
        // Sin recharts a propósito: como chunk manual, el principal le tomaba
        // prestados dos helpers y descargaba los 429 KB en todas las pantallas.
        manualChunks: {
          mantine: ['@mantine/core', '@mantine/hooks'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
