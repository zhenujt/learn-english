import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/learn-english/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: '句练 · 软件英语',
        short_name: '句练',
        description: '软件职场英语句子记忆与间隔复习',
        lang: 'zh-CN',
        theme_color: '#f7f8f3',
        background_color: '#f7f8f3',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/app-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icons/app-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,mp3}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
})
