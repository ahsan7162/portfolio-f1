// Builds the playground's canvas (src/products/playground/frame) as one classic script and one stylesheet, with
// its fonts inlined. The canvas is a sandboxed page with an opaque origin, which can load a module or a font file
// only over CORS; as a single classic script it loads nothing that way, and no CORS header is ever needed.
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: './',
  publicDir: false,
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
    'import.meta.env.BUILD_YEAR': JSON.stringify(String(new Date().getFullYear())),
  },
  build: {
    outDir: 'dist/products/playground',
    emptyOutDir: false,
    copyPublicDir: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    minify: mode !== 'development',
    lib: { entry: fileURLToPath(new URL('./src/products/playground/frame/main.tsx', import.meta.url)), formats: ['iife'], name: 'canvas', fileName: () => 'frame.js', cssFileName: 'frame' },
  },
}));
