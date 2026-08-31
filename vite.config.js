// FILE: vite.config.js
// eLogix HRMS — Vite Configuration
// Proxy: /api/* → Node.js server.js (port 8080) — works without Flask in dev
// IPv4 (127.0.0.1) + IPv6 (::1) both supported
// eLogix Technologies · www.elogix.com.np

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // ── Backend target (IPv4 + IPv6 fallback) ──────────────────────────
  // server.js runs on 8080. Vite proxies all /api calls there.
  // Flask (5000) is for production Docker only — not needed locally.
  const API_TARGET = env.VITE_API_URL || 'http://127.0.0.1:8080'

  return {
    plugins: [react()],

    // ── Path aliases ─────────────────────────────────────────────────
    resolve: {
      alias: {
        '@'          : path.resolve(__dirname, './src'),
        '@assets'    : path.resolve(__dirname, './src/assets'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages'     : path.resolve(__dirname, './src/pages'),
        '@utils'     : path.resolve(__dirname, './src/utils'),
        '@data'      : path.resolve(__dirname, './src/data'),
        '@hooks'     : path.resolve(__dirname, './src/hooks'),
        '@context'   : path.resolve(__dirname, './src/context'),
      },
    },

    // ── Dev server ───────────────────────────────────────────────────
    server: {
      port      : 5173,
      strictPort: false,
      // Listen on all interfaces → supports IPv4 AND IPv6
      host      : '0.0.0.0',

      proxy: {
        // ALL /api calls → Node.js server.js on port 8080
        // server.js handles: tenant registration, companies, auth, health
        '/api': {
          target      : API_TARGET,
          changeOrigin: true,
          secure      : false,
          ws          : true,
          configure   : (proxy) => {
            proxy.on('error', (err) => {
              // Give a clear message instead of cryptic ECONNREFUSED
              if (err.code === 'ECONNREFUSED') {
                console.error('\n[eLogix] ❌ Backend not running!')
                console.error('   Run in a second terminal: npm run server')
                console.error('   Or run both: npm run dev:full\n')
              }
            })
            proxy.on('proxyRes', (res, req) => {
              if (res.statusCode >= 400) {
                console.warn(`[proxy] ${req.method} ${req.url} → ${res.statusCode}`)
              }
            })
          },
        },

        '/uploads': { target: API_TARGET, changeOrigin: true },
        '/ws'     : { target: API_TARGET.replace('http','ws'), ws: true, changeOrigin: true },
      },
    },

    // ── Preview server ───────────────────────────────────────────────
    preview: { port: 4173, host: '0.0.0.0' },

    // ── Build ────────────────────────────────────────────────────────
    build: {
      outDir           : 'dist',
      assetsDir        : 'assets',
      emptyOutDir      : true,
      assetsInlineLimit: 0,
      sourcemap        : mode === 'development',
      minify           : mode === 'production' ? 'esbuild' : false,
      target           : 'es2015',
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (info) => {
            const ext = info.name?.split('.').pop()?.toLowerCase()
            if (['png','jpg','jpeg','gif','svg','webp','ico'].includes(ext||''))
              return 'assets/[name]-[hash][extname]'
            if (['woff','woff2','ttf','eot'].includes(ext||''))
              return 'assets/fonts/[name]-[hash][extname]'
            return 'assets/[name]-[hash][extname]'
          },
          manualChunks: (id) => {
            if (!id.includes('node_modules')) {
              if (id.includes('dashboard/snapshots')) return 'snapshots'
              if (id.includes('elogix-admin') || id.includes('saas')) return 'admin'
              return
            }
            if (id.includes('react') || id.includes('react-dom')) return 'react'
            if (id.includes('recharts') || id.includes('d3-'))     return 'charts'
            if (id.includes('lucide'))                              return 'icons'
            return 'vendor'
          },
        },
      },
    },

    css: { devSourcemap: true },

    optimizeDeps: {
      include: ['react','react-dom','recharts','lucide-react'],
    },

    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '3.0.0'),
    },
  }
})
