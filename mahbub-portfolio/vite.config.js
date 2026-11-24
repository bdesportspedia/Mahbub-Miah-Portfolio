import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Two pages: the public site (index.html) and the private admin app (admin/index.html).
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin/index.html', import.meta.url))
      }
    }
  }
});
