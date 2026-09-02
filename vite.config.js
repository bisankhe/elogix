// FILE: vite.config.js
// eLogix HRMS — Vite Build Configuration
// FIX: Logo.png and other static assets must end up in dist/assets/
//      with content-hash filenames that nginx's /assets/ location can serve.
// eLogix Technologies · www.elogix.com.np

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    // ── Path aliases ────────────────────────────────────────────────
    resolve: {
      alias: {
        '@'        : path.resolve(__dirname, './src'),
        '@assets'  : path.resolve(__dirname, './src/assets'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages'   : path.resolve(__dirname, './src/pages'),
        '@utils'   : path.resolve(__dirname, './src/utils'),
        '@data'    : path.resolve(__dirname, './src/data'),
        '@hooks'   : path.resolve(__dirname, './src/hooks'),
        '@context' : path.resolve(__dirname, './src/context'),
      },
    },

    // ── Build output ────────────────────────────────────────────────
    build: {
      outDir         : 'dist',
      assetsDir      : 'assets',       // All assets go to dist/assets/
      emptyOutDir    : true,

      // ── Asset inlining threshold ──────────────────────────────────
      // Files SMALLER than this are inlined as base64 data URIs.
      // Files LARGER than this are copied to dist/assets/ with hash names.
      // Set to 0 to ALWAYS copy files (never inline) — this ensures
      // Logo.png is always at dist/assets/Logo-{hash}.png
      // and nginx can serve it from /assets/ location block.
      assetsInlineLimit: 0,           // ← KEY FIX: never inline, always file

      // ── Source maps ───────────────────────────────────────────────
      sourcemap: mode === 'development',

      // ── Code splitting ────────────────────────────────────────────
      rollupOptions: {
        output: {
          // Predictable chunk names
          chunkFileNames   : 'assets/[name]-[hash].js',
          entryFileNames   : 'assets/[name]-[hash].js',
          assetFileNames   : (assetInfo) => {
            // Keep images in assets/ with their original extension
            const ext = assetInfo.name?.split('.').pop()?.toLowerCase()
            if (['png','jpg','jpeg','gif','svg','webp','ico'].includes(ext || '')) {
              return 'assets/[name]-[hash][extname]'
            }
            if (['woff','woff2','ttf','eot'].includes(ext || '')) {
              return 'assets/fonts/[name]-[hash][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          },

          // Manual chunks to keep bundle sizes manageable
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) return 'react'
              if (id.includes('recharts') || id.includes('d3-')) return 'charts'
              if (id.includes('lucide')) return 'icons'
              return 'vendor'
            }
            // Split dashboard snapshots into their own chunk
            if (id.includes('dashboard/snapshots')) return 'snapshots'
            if (id.includes('pages/elogix-admin') || id.includes('saas')) return 'admin'
          },
        },
      },

      // ── Minification ──────────────────────────────────────────────
      minify: mode === 'production' ? 'esbuild' : false,
      target: 'es2015',
    },

    // ── Dev server ──────────────────────────────────────────────────
    server: {
      port: 5173,
      host: '0.0.0.0',   // listen on all interfaces — IPv4 + IPv6
      strictPort: true,

      // Proxy API calls to Flask backend during development
      proxy: {
        // ── eLogix API proxy ──────────────────────────────────────────
        // Dev: proxies to Node.js server.js (port 8080) which handles all
        // /api/* routes including tenant registration & approval.
        // server.js runs: npm run server  (or npm run dev:full for both)
        //
        // IPv4 (127.0.0.1) and IPv6 (::1) both supported via ::1 fallback.
        '/api': {
          target      : 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure      : false,
          ws          : true,
          configure   : (proxy) => {
            proxy.on('error', (err, req) => {
              // Try IPv6 loopback if IPv4 refused
              if (err.code === 'ECONNREFUSED' && err.address === '127.0.0.1') {
                console.warn('[proxy] IPv4 refused — is server.js running?')
                console.warn('[proxy] Run: npm run server  (Node.js port 8080)')
              } else {
                console.error('[proxy error]', err.message)
              }
            })
          },
        },
        '/uploads': {
          target      : 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
        '/ws': {
          target      : 'ws://127.0.0.1:8080',
          ws          : true,
          changeOrigin: true,
        },
      },
    },

    // ── Preview server (test production build locally) ───────────────
    preview: {
      port: 4173,
      host: '0.0.0.0',   // listen on all interfaces — IPv4 + IPv6
    },

    // ── CSS ─────────────────────────────────────────────────────────
    css: {
      devSourcemap: true,
    },

    // ── Define env vars available in frontend ────────────────────────
    define: {
      // Expose only safe public env vars to frontend
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '3.0.0'),
    },

    // ── Optimize deps ────────────────────────────────────────────────
    optimizeDeps: {
      include: [
        'react', 'react-dom',
        'recharts',
        'lucide-react',
      ],
      exclude: [],
    },
  }
})
