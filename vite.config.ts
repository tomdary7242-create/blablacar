import { defineConfig } from 'vitest/config';

// Chemins relatifs : le build fonctionne tel quel sur GitHub Pages,
// quel que soit le nom du dépôt.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
