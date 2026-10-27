import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves project sites at <user>.github.io/<repo>/, so built assets must be
  // referenced relative to that subpath. Left at '/' for `vite dev` so local dev is unaffected.
  base: command === 'build' ? '/ai-md-note-taker/' : '/',
  plugins: [react(), tailwindcss()],
}))
