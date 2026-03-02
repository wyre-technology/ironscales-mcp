import { defineConfig } from 'tsup';

export default defineConfig([
  // Node.js builds (stdio + HTTP)
  {
    entry: { index: 'src/index.ts', http: 'src/http.ts' },
    format: ['esm'],
    target: 'node22',
    outDir: 'dist',
    clean: true,
    dts: true,
    sourcemap: true,
  },
  // Cloudflare Worker build
  {
    entry: { worker: 'src/worker.ts' },
    format: ['esm'],
    target: 'esnext',
    platform: 'browser',
    outDir: 'dist',
    clean: false,
    noExternal: [/.*/],
    sourcemap: true,
  },
]);
