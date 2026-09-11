import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base must match the GitHub Pages repo name exactly, e.g. '/Apartment/'.
// Update this once the GitHub repo name is finalized (see Task 11 / DEPLOY.md).
export default defineConfig({
  plugins: [vue()],
  base: '/Apartment/',
})
