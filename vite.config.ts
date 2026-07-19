import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Solo para compartir la demo local mediante un túnel temporal.
  server: { allowedHosts: true },
})
