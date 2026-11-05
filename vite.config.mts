import { copyFileSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const outputDirectory = fileURLToPath(new URL('./dist', import.meta.url));
const outputHTML = fileURLToPath(new URL('./dist/index.html', import.meta.url));
const publishedHTML = fileURLToPath(new URL('./index.html', import.meta.url));

export default defineConfig({
  root: 'src/ui',
  base: './',
  plugins: [
    react(),
    viteSingleFile(),
    {
      name: 'publish-standalone-html',
      apply: 'build',
      closeBundle() {
        const files = readdirSync(outputDirectory);
        if (files.length !== 1 || files[0] !== 'index.html') {
          throw new Error('The standalone build must contain only dist/index.html.');
        }
        const html = readFileSync(outputHTML, 'utf8');
        if (!html.includes('<script') || /<(?:script|link)\b[^>]*(?:src|href)\s*=/i.test(html)) {
          throw new Error('The standalone build must embed its JavaScript and CSS.');
        }
        copyFileSync(outputHTML, publishedHTML);
      },
    },
  ],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
});
