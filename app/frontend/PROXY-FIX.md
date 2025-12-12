# Proxy Configuration Fix

## Problem

API requests were being sent to the Angular dev server port (e.g., `http://localhost:44539/api/...`) instead of being proxied to the backend server port (e.g., `http://localhost:8080/api/...`).

**Error Example:**

```
Failed to load entity: Http failure response for http://localhost:44539/api/persoana_fizica/...: 404 Not Found
```

## Root Causes

### 1. withFetch() Breaking the Proxy

The `provideHttpClient(withFetch())` configuration in `app.config.ts` was using the **Fetch API** instead of **XMLHttpRequest**.

**Critical Issue:** Angular's development proxy (`proxy.conf.js`) only intercepts **XMLHttpRequest** calls, NOT Fetch API calls.

When using `withFetch()`:

- ❌ Requests bypass the proxy configuration
- ❌ Requests go directly to the Angular dev server port
- ❌ Backend server is never contacted
- ❌ Results in 404 errors

## Solution

**Removed `withFetch()` from `app.config.ts`:**

```typescript
// BEFORE (Broken)
provideHttpClient(
  withFetch(),  // ❌ This breaks proxy
  withInterceptors([...])
)

// AFTER (Working)
provideHttpClient(
  // withFetch() removed - proxy now works!
  withInterceptors([...])
)
```

Now the HttpClient uses XMLHttpRequest by default, which works with the proxy.

## How It Works Now

1. **Frontend makes request:** `GET /api/persoana_fizica/123`
2. **Proxy intercepts:** Catches all `/api/*` requests
3. **Proxy forwards:** Sends to backend at `http://localhost:8080/api/persoana_fizica/123`
4. **Backend responds:** Returns data through proxy
5. **Frontend receives:** Data arrives successfully

## Configuration

The proxy is configured in `proxy.conf.js`:

```javascript
const PROXY_CONFIG = {
  "/api": {
    target: process.env.BACKEND_URL || "http://127.0.0.1:8080",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
  },
};
```

### 2. Old Dev Server Running with Wrong Config

If an old dev server process is still running with `proxy.conf.json` instead of `proxy.conf.js`, it won't use the new configuration.

**Fix:** Kill old processes and restart:

```bash
# Kill any running ng serve processes
pkill -f "ng serve"

# Or find and kill specific process
ps aux | grep "ng serve"
kill <PID>

# Restart with correct config
npm start
```

### Usage

**Default (port 8080):**

```bash
npm start
```

**Custom port:**

```bash
BACKEND_URL=http://127.0.0.1:43877 npm start
```

**IMPORTANT:** Make sure to **restart the dev server** after any proxy configuration changes. The proxy config is only loaded when the server starts.

## Verification

To verify the proxy is working, check the console logs when starting the dev server:

```
[HPM] Proxy created: /api  -> http://127.0.0.1:8080
[HPM] Proxy rewrite rule created: "^/api" ~> ""
```

When making API calls, you should see proxy logs like:

```
[HPM] GET /api/persoana_fizica/123 -> http://127.0.0.1:8080
```

## Important Notes

1. **Never use `withFetch()` with Angular proxy** - It will break the proxy configuration
2. **Always use relative paths** - Start API calls with `/api/...`
3. **Environment configuration** - Use `environment.apiUrl` which is `/api`
4. **Production builds** - The proxy is only for development; production uses direct API calls or reverse proxy

## Related Files

- `src/app/app.config.ts` - HttpClient configuration
- `proxy.conf.js` - Proxy configuration
- `src/environments/environment.ts` - API URL configuration
- `package.json` - Start script with proxy config

## Testing

After this fix:

1. Start your backend server (note the port)
2. Set BACKEND_URL if needed: `BACKEND_URL=http://127.0.0.1:43877 npm start`
3. API calls should now reach your backend server
4. Check browser network tab - requests should return 200 OK from backend
