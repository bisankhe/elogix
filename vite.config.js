// FILE: vite.config.js
// eLogix HRMS — Vite Configuration
// Proxy: /api/* → Node.js server.js (port 8080)
// IPv4 (127.0.0.1) + IPv6 (::1) both supported
// eLogix Technologies · www.elogix.com.np

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@'          : path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages'     : path.resolve(__dirname, './src/pages'),
      '@utils'     : path.resolve(__dirname, './src/utils'),
      '@hooks'     : path.resolve(__dirname, './src/hooks'),
      '@context'   : path.resolve(__dirname, './src/context'),
    },
  },

  server: {
    port      : 5173,
    host      : '0.0.0.0',   // IPv4 + IPv6
    strictPort: false,
    proxy: {
      '/api': {
        target      : 'http://127.0.0.1:8080',  // Node.js server.js
        changeOrigin: true,
        secure      : false,
        ws          : true,
        configure   : (proxy) => {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
              console.error('\n[eLogix] ❌ server.js is NOT running!')
              console.error('[eLogix] Run in a separate terminal: node server.js')
              console.error('[eLogix] Or use: npm run dev (starts both)\n')
            }
          })
        },
      },
      '/uploads': {
        target      : 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },

  preview: {
    port: 4173,
    host: '0.0.0.0',
  },

  build: {
    outDir   : 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor' : ['react', 'react-dom'],
          'chart-vendor' : ['recharts'],
          'icon-vendor'  : ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
