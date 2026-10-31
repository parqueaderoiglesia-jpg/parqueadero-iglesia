import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// La app se publica en https://parqueaderoiglesia-jpg.github.io/parqueadero-iglesia/
export default defineConfig({
  base: '/parqueadero-iglesia/',
  plugins: [react()],
})
