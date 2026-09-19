import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        strictPort: true,
        host: '0.0.0.0',
        fs: { deny: ['.env', '.env.*', '**/*.local', '**/*.local.*', '**/*.{crt,pem}', '**/.git/**'] },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        environment: 'jsdom',
        setupFiles: './tests/setup.ts',
        css: true,
        pool: 'threads',
        testTimeout: 15000,
        exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
      }
    };
});
