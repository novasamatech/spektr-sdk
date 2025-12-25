import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { externalizeDeps } from 'vite-plugin-externalize-deps';
import { default as wasm } from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    hmr: false,
  },
  css: {
    modules: {
      generateScopedName: 'papp_[name]_[local]_[contenthash:base64:5]',
      hashPrefix: 'papp-ui',
    },
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

  plugins: [
    externalizeDeps(),
    react(),
    dts(),
    // @ts-expect-error wasm module types are broken in our setup
    wasm(),
  ],
});
