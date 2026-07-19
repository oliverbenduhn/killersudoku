// Vite-Config für Killer Sudoku.
// CRA-Nachfolger: Dev-Server, Build, PWA-Plugin. Manifest wird in public/ erwartet.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Kein injectManifest — wir liefern kein eigenes SW-Hand-Lying,
      // autoUpdate reicht für anonyme PWA ohne Push-Notifications.
      manifest: {
        name: 'Killer Sudoku PWA',
        short_name: 'KillerSudoku',
        description: 'Spiele Killer Sudoku als Progressive Web App.',
        theme_color: '#2196F3',
        background_color: '#f5f5f5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [], // Icons folgen in Phase 1 (Branding)
      },
      workbox: {
        // Level-JSONs statisch vorcachen — App soll offline spielbar bleiben.
        globPatterns: ['**/*.{js,css,html,json,png,ico,svg}'],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    rollupOptions: {
      // Manueller Chunk-Split. Hintergrund: Chakra (~150 KB) und framer-motion
      // (~120 KB) ändern sich selten. Sie als eigenes Vendor-Bundle zu führen
      // heißt: ein App-Code-Update invalidiert nur das App-Bundle im Browser-Cache,
      // Vendor bleibt warm. Bei 561 KB Bundle ist das noch nicht zwingend, aber
      // billig genug zum Mitnehmen.
      output: {
        manualChunks: {
          'vendor.chakra': ['@chakra-ui/react', '@chakra-ui/icons', '@emotion/react', '@emotion/styled'],
          'vendor.motion': ['framer-motion'],
          'vendor.storage': ['localforage'],
        },
      },
    },
  },
});
