import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * Preloads fonts from src/assets/fonts, so the hero heading's font starts downloading
 * with the HTML instead of after the CSS has been parsed. Vite hashes font names in
 * the build, so the links are written here rather than in index.html.
 */
function preloadFonts(files: string[]): Plugin {
  const link = (href: string) => ({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href, crossorigin: true }, injectTo: 'head' as const });
  return {
    name: 'preload-fonts',
    transformIndexHtml(_html, ctx) {
      if (!ctx.bundle) return files.map(f => link(`/src/assets/fonts/${f}`));
      const assets = Object.values(ctx.bundle).filter(o => o.type === 'asset');
      return files.map(f => {
        const asset = assets.find(a => a.originalFileNames.some(n => n.endsWith(`assets/fonts/${f}`)));
        if (!asset) throw new Error(`preload-fonts: ${f} is not in the build`);
        return link(`./${asset.fileName}`);
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), preloadFonts(['hubot-sans.woff2', 'mona-sans.woff2', 'monaspace-krypton.woff2'])],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5174, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion-core';
        },
      },
    },
  },
});
