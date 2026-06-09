import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

      require('../server-sheets/node_modules/dotenv').config({
        path: path.resolve(__dirname, '../server-sheets/.env')
      })

      const express = require('../server-sheets/node_modules/express')
      const sheetsAuthRouter = require('../server-sheets/routes/auth')
      const sheetsBookingsRouter = require('../server-sheets/routes/bookings')
      const sheetsRoomsRouter = require('../server-sheets/routes/rooms')
      const sheets = require('../server-sheets/services/sheets')
      const supabaseDb = require('../server-sheets/services/supabaseDb')

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
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url, 'http://localhost')
        req.query = Object.fromEntries(url.searchParams.entries())
        next()
      })
      server.middlewares.use('/api/auth', sheetsAuthRouter)
      server.middlewares.use('/api/bookings', sheetsBookingsRouter)
      server.middlewares.use('/api/rooms', sheetsRoomsRouter)
      server.middlewares.use('/api/health', async (req, res) => {
        let bookings = []
        let status = 'healthy'
        let error = null
        try {
          bookings = await sheets.getAllBookings()
        } catch (err) {
          status = 'unhealthy'
          error = err.message
        }
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({
          ok: status === 'healthy',
          status,
          mode: 'vite-embedded-sheets',
          database: supabaseDb.isEnabled() ? 'supabase' : 'mock',
          cachedBookings: bookings.length,
          timestamp: new Date().toISOString(),
          ...(error ? { error } : {})
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
