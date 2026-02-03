import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/OpenLight/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
