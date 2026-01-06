import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Only split Firebase because it is large and independent.
              // We let Vite/Rollup handle React and other libs automatically to prevent 
              // "React is undefined" errors caused by circular dependencies or load order.
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'Logo3.png'],
        manifest: {
          name: 'Clazz.lk - Online Teachers Directory',
          short_name: 'Clazz',
          description: 'Sri Lanka\'s Biggest Online Teachers Directory',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'Logo3.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'Logo3.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          // Increase runtime cache size limit if needed, or adjust patterns
          maximumFileSizeToCacheInBytes: 3000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Import Firebase Messaging SW logic into the main Workbox SW
          importScripts: ['firebase-messaging-sw.js']
        },
        devOptions: {
          enabled: true,
          suppressWarnings: true
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
