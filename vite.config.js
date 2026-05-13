import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function normalizeOrigin (value) {
  if (!value) return 'http://192.168.1.100:8080'
  const trimmed = value.trim().replace(/\/$/, '')
  return trimmed.replace(/\/api\/v1$/i, '')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = normalizeOrigin(env.VITE_API_ORIGIN)
  const devPort = Number(env.VITE_PORT || 5174)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: Number.isFinite(devPort) ? devPort : 5174,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }
})
