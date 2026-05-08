import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7248',
        secure: false,
      },
      '/streams': {
        target: 'https://localhost:7248',
        secure: false,
      },
      '/hubs': {
        target: 'https://localhost:7248',
        secure: false,
        ws: true,
      },
    },
  },
})
