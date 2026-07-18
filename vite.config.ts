import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  
  // Alias های مسیر (همگام با tsconfig.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@services': path.resolve(__dirname, './src/services'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  
  // تنظیمات سرور توسعه
  server: {
    port: 5173,
    open: true, // مرورگر به صورت خودکار باز می‌شود
    cors: true,
  },
  
  // تنظیمات build برای production
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          // جدا کردن کتابخانه‌ها برای cache بهتر
          vendor: ['typescript'],
        },
      },
    },
  },
})