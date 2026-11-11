import { copyFile, mkdir } from 'node:fs/promises';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    rollupOptions: {
      input: 'index.html',
      onLog(level, log, handler) {
        if (log.code === 'MODULE_LEVEL_DIRECTIVE' && log.message.includes('use client')) return;
        handler(level, log);
      },
    },
  },
  plugins: [{
    name: 'portfolio-static-files',
    async writeBundle() {
      await mkdir('dist/assets', { recursive: true });
      for (const [source, destination] of [
        ['assets/Joemon-Joy-Resume.pdf', 'assets/Joemon-Joy-Resume.pdf'],
        ['assets/portfolio-preview.png', 'assets/portfolio-preview.png'],
        ['assets/type/geist-OFL.txt', 'assets/geist-OFL.txt'],
        ['components/REACT-BITS-LICENSE.txt', 'assets/REACT-BITS-LICENSE.txt'],
        ['.nojekyll', '.nojekyll'],
      ]) {
        await copyFile(source, 'dist/' + destination);
      }
    },
  }],
});
