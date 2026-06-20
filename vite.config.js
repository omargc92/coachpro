import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' (no 'autoUpdate'): el SW nuevo NO se activa ni recarga solo.
      // Evita el loop de recarga/cuelgue del main thread; el usuario confirma.
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'CoachPro',
        short_name: 'CoachPro',
        description: 'Seguimiento de coaching fitness: rutinas, nutrición, asistencia y progreso.',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0B0D',
        theme_color: '#0B0B0D',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        // Purga precaches viejos: un usuario con SW anterior no se queda con
        // assets hasheados que ya no existen (causa de pantallas colgadas).
        cleanupOutdatedCaches: true,
        // El SW nuevo toma control de las pestañas abiertas al activarse
        // (tras la confirmación del prompt). No usamos skipWaiting automático.
        clientsClaim: true,
        runtimeCaching: [
          {
            // Datos de Supabase: red primero, cae a caché si no hay conexión.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-data',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ]
})
