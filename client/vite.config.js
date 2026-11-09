import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lets the client import ../shared/plans.js
    fs: { allow: ['..'] },
    proxy: { '/api': 'http://localhost:4000' },
  },
});
