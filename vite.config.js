import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  // eslint-disable-next-line no-undef
  base: process.env.NODE_ENV === 'production' ? '/read-down-generator/' : '/',
  plugins: [react()],
  server: {
    allowedHosts: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          utils: ['framer-motion', 'lucide-react'],
          pattern: ['jszip', 'file-saver']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
}) 