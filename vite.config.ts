import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './', // ⬅️ حیاتی برای GitHub Pages
  plugins: [tailwindcss()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    proxy: {
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, '/v1beta/models'),
      },
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/groq/, '/openai/v1'),
      },
    },
  },
});