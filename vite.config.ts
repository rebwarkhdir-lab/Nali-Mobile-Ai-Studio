import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // Pointing to 'src' prevents importing config files by mistake
        '@': path.resolve(__dirname, './src'), 
      },
    },
    server: {
      host: true,
      port: 3000,
      proxy: {
        '/api/currency-rates': {
          target: 'https://cashnrx.innovation-pulsehub.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/currency-rates/, '/api/mobile/currency-rates'),
        },
      },
      hmr: {
        protocol: 'wss',
        clientPort: 443,
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ui': ['lucide-react', 'motion', 'clsx', 'tailwind-merge', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-tabs'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html-to-image'],
            'vendor-utils': ['date-fns', 'zod', 'react-hook-form', 'i18next', 'react-i18next'],
            'vendor-barcode': ['html5-qrcode', 'jsbarcode', 'qrcode.react']
          },
        },
      },
    },
  };
});
