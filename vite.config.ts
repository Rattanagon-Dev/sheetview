import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  worker: { format: 'es' },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'samples/*'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,xlsx,csv}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: 'SheetView', short_name: 'SheetView',
        description: 'View and edit Excel (.xlsx) and CSV files',
        display: 'standalone', start_url: './', scope: './',
        background_color: '#ffffff', theme_color: '#0E7C66',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        file_handlers: [{ action: './', accept: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'text/csv': ['.csv'] } }],
      } as any, // file_handlers is not in the plugin's types
    }),
  ],
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
} as any);
