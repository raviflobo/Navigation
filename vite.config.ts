import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages project site: https://<user>.github.io/<repo>/
// Override with VITE_BASE=/custom/ when needed.
const base = process.env.VITE_BASE || '/Navigation/'

export default defineConfig({
  plugins: [react()],
  base,
})
