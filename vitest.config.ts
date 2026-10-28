import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Mesmo atalho "@/..." do tsconfig do Next.
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['core/test/**/*.test.ts', 'test/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
