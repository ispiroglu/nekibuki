import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const src = fileURLToPath(new URL('./src', import.meta.url))
const shared = fileURLToPath(new URL('./shared', import.meta.url))

/**
 * The web app manifest accepts a media-scoped list of theme colours, so the
 * installed app's splash and task-switcher strip follow the OS scheme instead
 * of staying paper at night. Paper and dark paper come from DESIGN.md.
 */
const MANIFEST_THEME_COLOR = [
  { color: '#faf9f5', media: '(prefers-color-scheme: light)' },
  { color: '#1f1e1d', media: '(prefers-color-scheme: dark)' },
]

const MANIFEST_BACKGROUND_COLOR = [
  { color: '#faf9f5', media: '(prefers-color-scheme: light)' },
  { color: '#1f1e1d', media: '(prefers-color-scheme: dark)' },
]

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png', 'mask-icon.svg'],
      manifest: {
        name: 'Nekibuki — A guide in your pocket',
        short_name: 'Nekibuki',
        description:
          'Point your camera at a place and understand it. Photo recognition and stories for travellers.',
        // The manifest spec allows a media-scoped list here; the plugin's own
        // types only declare the single-colour form, so the arrays are cast
        // once, at the only place they are used.
        theme_color: MANIFEST_THEME_COLOR as unknown as string,
        background_color: MANIFEST_BACKGROUND_COLOR as unknown as string,
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['travel', 'education', 'photo'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}'],
        // The first visit on a weak connection should not pay for glyphs the
        // browser never asks for: the Newsreader `latin-ext` and `vietnamese`
        // subsets are gated by `unicode-range` and only requested for those
        // scripts.
        globIgnores: [
          '**/assets/newsreader-latin-ext-*.woff2',
          '**/assets/newsreader-vietnamese-*.woff2',
        ],
        navigateFallback: '/index.html',
        // User photos and history come from /api and must never be precached.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'remote-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': src,
      '@shared': shared,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // The TypeScript helpers are shared with the app chunks, so they
              // keep their own chunk.
              name: 'tslib',
              test: /node_modules[\\/]tslib[\\/]/,
              priority: 20,
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
})
