import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// ¿Por qué este archivo existe?
// Vite necesita saber cómo compilar el proyecto. Sin configuración,
// Vite no sabría que usamos React JSX ni que queremos generar una PWA.
//
// ¿Por qué VitePWA?
// Genera automáticamente el Service Worker con Workbox (la librería oficial
// de Google para caching de PWAs). Sin esto, tendrías que escribir ~200 líneas
// de Service Worker boilerplate para manejar cache, offline, actualizaciones, etc.
//
// ¿Por qué strategy: 'injectManifest'?
// Nos da control total sobre el Service Worker. La alternativa 'generateSW'
// genera uno automáticamente, pero nosotros necesitamos lógica custom para
// programar notificaciones. Con 'injectManifest', Workbox inyecta su lógica
// de precaching en nuestro SW custom (src/sw.ts).

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Butler — Tu Mayordomo Digital',
        short_name: 'Butler',
        description: 'Recordatorios elegantes al estilo de un mayordomo de lujo',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
