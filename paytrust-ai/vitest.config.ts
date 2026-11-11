import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // Live provider tests make real network calls and are run explicitly with
    // `npm run test:ai-live`; they must never block the hermetic unit gate.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'tests/unit/live-*.test.ts'],
    reporters: ['default'],
  },
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
    },
  },
});
