import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
      '@content': path.resolve(rootDir, '../../packages/content'),
      '@guidance': path.resolve(rootDir, '../../data/guidance'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: parseInt(process.env.PORT || '5173', 10),
  },
  preview: {
    host: '127.0.0.1',
    port: parseInt(process.env.PORT || '5173', 10),
  },
})
