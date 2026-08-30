import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { client } from '@elogix/api-client/client'

import App from './App'
import './index.css'

// Empty baseUrl: requests go to /api/... on the same origin and Vite proxies them to
// the API in development. In production the built bundle is served by the same host.
client.setConfig({ baseUrl: '' })

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
