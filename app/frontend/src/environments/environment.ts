// This file is replaced during build based on the target environment
// Import this file in your code, not environment.development.ts or environment.production.ts
export const environment = {
  production: false,
  apiUrl: '/api',
  apiTimeout: 30000,
  enableLogging: true,
  retryAttempts: 3,
  retryDelay: 1000,
  backendUrl: 'http://127.0.0.1:8080',
};
