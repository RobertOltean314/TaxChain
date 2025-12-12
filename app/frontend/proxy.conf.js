// Dynamic proxy configuration that reads backend URL from environment variable
// Usage: BACKEND_URL=http://localhost:43877 npm start
const PROXY_CONFIG = {
  "/api": {
    target: process.env.BACKEND_URL || "http://127.0.0.1:8080",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: {},
  },
};

module.exports = PROXY_CONFIG;
