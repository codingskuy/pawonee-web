import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// Konfigurasi terpisah: uji Pact memakai pustaka native dan menulis ke pacts/, jadi tidak ikut `bun run test`.
export default defineConfig({
  plugins: [sveltekit()],
  test: { include: ['pact/**/*.pact.test.ts'], pool: 'forks', testTimeout: 30_000 }
});
