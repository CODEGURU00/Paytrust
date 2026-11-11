import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

// Runs only the live provider smoke tests, which make real network calls.
// The default vitest.config.ts excludes `live-*.test.ts` so the hermetic unit
// gate never depends on the network. Invoke via `npm run test:ai-live`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/live-nvidia.test.ts'],
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
    },
  },
});
