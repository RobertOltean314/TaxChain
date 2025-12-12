export const environment = {
  production: true,
  apiUrl: '/api',
  apiTimeout: 30000,
  enableLogging: false,
  retryAttempts: 3,
  retryDelay: 1000,
  // In production, the backend should be served from the same origin
  // or configured via environment variables at build time
  backendUrl: '/api',
};
