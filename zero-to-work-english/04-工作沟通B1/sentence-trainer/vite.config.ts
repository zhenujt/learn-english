import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repositoryDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const appDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  // The shared auth module lives outside this project, so its bare imports are
  // pinned to this app's dependencies to avoid a second React copy.
  resolve: {
    alias: [
      {
        find: /^(react|react-dom|lucide-react|@supabase\/supabase-js)$/,
        replacement: path.join(appDirectory, 'node_modules/$1'),
      },
      {
        find: /^(react|react-dom)\/(.+)$/,
        replacement: path.join(appDirectory, 'node_modules/$1/$2'),
      },
    ],
  },
  server: {
    fs: {
      allow: [repositoryDirectory],
    },
  },
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
