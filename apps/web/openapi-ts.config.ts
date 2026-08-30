import { defineConfig } from '@hey-api/openapi-ts'

// The generated client is the contract. Nothing in packages/api-client is hand-written,
// and `npm run generate` is the only thing that writes there.
export default defineConfig({
  input: '../../openapi.json',
  output: {
    path: '../../packages/api-client/src',
    postProcess: ['prettier'],
  },
  plugins: [
    '@hey-api/client-fetch',
    '@hey-api/typescript',
    '@tanstack/react-query',
    'zod',
  ],
})
