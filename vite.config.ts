import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Firebase alone is about 630 kB; it is cached on the device after the first visit.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // Libraries in their own files: they change far less often than the app, so after a new release
        // phones only download the app's own code again and keep the libraries they already have.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
})
