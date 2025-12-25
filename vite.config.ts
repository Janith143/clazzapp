import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
              // Isolate Firebase as it is huge and independent
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              // Isolate React Core for caching stability
              if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
                return 'vendor-react';
              }
              // Keeping everything else in a single 'vendor' chunk avoids initialization order issues 
              // with libraries that depend on React (like draft-js, headless-ui, etc.)
              return 'vendor';
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    plugins: [react()],
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
