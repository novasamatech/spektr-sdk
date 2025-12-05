import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { externalizeDeps } from 'vite-plugin-externalize-deps';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    hmr: false,
  },
  build: {
    rollupOptions: {
      output: {
        preserveModules: true,
      },
    },
    lib: {
      name: 'host-papp-ui',
      entry: ['src/index.ts'],
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
      cssFileName: 'index',
    },
  },
  plugins: [externalizeDeps(), react(), dts()],
});
