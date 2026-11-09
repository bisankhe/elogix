// FILE: vite.config.js
// eLogix HRMS — Vite Configuration
// Proxy split:
//   /api/elogix-admin/*  →  Node.js server.js  (port 8080)
//   /uploads             →  Node.js server.js  (port 8080)
//   /api/*               →  Flask app.py        (port 5000)
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
      // ── Admin API → Node.js on 8080 ──────────────────────────────────
      // IMPORTANT: more-specific rules MUST come before the generic '/api'
      '/api/elogix-admin': {
        target      : 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure      : false,
        configure   : (proxy) => {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
              console.error('\n[eLogix] ❌ server.js is NOT running on port 8080!')
              console.error('[eLogix] Start it: node server.js')
              console.error('[eLogix] Or:       npm run dev\n')
            }
          })
        },
      },

      // ── Static uploads → Node.js on 8080 ─────────────────────────────
      '/uploads': {
        target      : 'http://127.0.0.1:8080',
        changeOrigin: true,
      },

      // ── Tenant/HRMS API → Flask on 5000 ──────────────────────────────
      // Generic catch-all — must come AFTER the specific rules above
      '/api': {
        target      : 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure      : false,
        ws          : true,
        configure   : (proxy) => {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
              console.error('\n[eLogix] ❌ Flask app.py is NOT running on port 5000!')
              console.error('[eLogix] Start it: flask run  (or python app.py)\n')
            }
          })
        },
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