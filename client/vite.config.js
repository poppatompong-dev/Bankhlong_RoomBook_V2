import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Toggle: 'sheets' = Google Sheets backend (port 5001)
//         'mongo'  = MongoDB backend (port 5000)
const BACKEND = 'sheets';

const backendPort = BACKEND === 'sheets' ? 5001 : 5000;
const backendUrl = `http://localhost:${backendPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true
      },
      // Socket.io proxy only needed for MongoDB backend
      ...(BACKEND === 'mongo' ? {
        '/socket.io': { target: backendUrl, ws: true }
      } : {})
    }
  }
})
