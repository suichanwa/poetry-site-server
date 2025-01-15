// poetry-site-server/config.ts
export const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-backend-url.railway.app'
  : 'http://localhost:3001';