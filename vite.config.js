import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'remove-crossorigin',
      transformIndexHtml: (html) => html.replace(/ crossorigin/g, '')
    }
  ],
})
