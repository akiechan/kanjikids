import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/translate': {
          target: 'https://api-free.deepl.com',
          changeOrigin: true,
          rewrite: () => '/v2/translate',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `DeepL-Auth-Key ${env.VITE_DEEPL_API_KEY}`)
            })
          },
        },
        '/api/tokenize': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api/ocr': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      }
    }
  }
})
