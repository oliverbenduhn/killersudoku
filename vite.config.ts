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
    port: 8083,
    strictPort: true,
    // Verhindert den "Blocked request"-Fehler von vite preview, wenn das
    // Bundle hinter einem Reverse-Proxy unter einer anderen Host-Adresse
    // aufgerufen wird. CDN-/Tunnel-Setups (killer.obxy.de, killer.benduhn.de,
    // killersudoku.benduhn.de -> :8083).
    allowedHosts: [
      'killer.obxy.de',
      'killer.benduhn.de',
      'killersudoku.benduhn.de',
      'localhost',
      '127.0.0.1',
      '192.168.2.36',
    ],
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
        // Manueller Chunk-Split. Cache-Granularität: ein App-Code-Update
        // invalidiert nur das App-Bundle. Vendor bleibt im Browser-Cache.
        //
        // Vorher hatten wir react und chakra getrennt — das führte zu
        // Zirkelimporten zwischen den Chunks, weil Chakra React nutzt und
        // React (über jsx-runtime) Chakra-Komponenten referenziert.
        // Symptom war "Cannot read properties of undefined (reading
        // 'jsxs'/'ForwardRef')" beim Boot. Ein einziger vendor-Chunk
        // für React + Chakra + framer-motion ist die robuste Lösung.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/@chakra-ui') ||
              id.includes('node_modules/@emotion') ||
              id.includes('node_modules/framer-motion')) {
            return 'vendor.ui';
          }
          if (id.includes('node_modules/localforage')) {
            return 'vendor.storage';
          }
          return undefined;
        },
      },
    },
  },
});
