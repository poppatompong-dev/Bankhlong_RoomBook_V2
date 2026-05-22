import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Toggle: 'sheets' = Google Sheets backend (port 5001)
//         'mongo'  = MongoDB backend (port 5000)
const BACKEND = 'sheets';

const backendPort = BACKEND === 'sheets' ? 5001 : 5000;
const backendUrl = `http://localhost:${backendPort}`;

function embeddedSheetsApi() {
  return {
    name: 'embedded-sheets-api',
    configureServer(server) {
      if (BACKEND !== 'sheets') return

      const express = require('../server-sheets/node_modules/express')
      const sheetsAuthRouter = require('../server-sheets/routes/auth')
      const sheetsBookingsRouter = require('../server-sheets/routes/bookings')
      const sheetsRoomsRouter = require('../server-sheets/routes/rooms')

      server.middlewares.use(express.json({ limit: '1mb' }))
      server.middlewares.use((req, res, next) => {
        res.status = (code) => {
          res.statusCode = code
          return res
        }
        res.json = (body) => {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }
        next()
      })
      server.middlewares.use('/api/auth', sheetsAuthRouter)
      server.middlewares.use('/api/bookings', sheetsBookingsRouter)
      server.middlewares.use('/api/rooms', sheetsRoomsRouter)
      server.middlewares.use('/api/health', async (req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({
          ok: true,
          status: 'healthy',
          mode: 'vite-embedded-sheets',
          timestamp: new Date().toISOString()
        }))
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), embeddedSheetsApi()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      ...(BACKEND !== 'sheets' ? {
        '/api': {
          target: backendUrl,
          changeOrigin: true
        }
      } : {}),
      // Socket.io proxy only needed for MongoDB backend
      ...(BACKEND === 'mongo' ? {
        '/socket.io': { target: backendUrl, ws: true }
      } : {})
    }
  }
})
