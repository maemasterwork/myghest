
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ghestyar/',

  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'قسط‌یار',
        short_name: 'قسط‌یار',
        description: 'ببین از هر درآمد چقدر باید برای اقساط کنار بگذاری',
        lang: 'fa',
        dir: 'rtl',
        start_url: '/ghestyar/',
        scope: '/ghestyar/',
        display: 'standalone',
        background_color: '#f6f7fb',
        theme_color: '#5b5bf0',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/ghestyar/index.html',
      },
    }),
  ],

  test: { environment: 'node' },
})
