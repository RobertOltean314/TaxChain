import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const api = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach Bearer token + active entity headers on every request
api.interceptors.request.use((config) => {
  const token = (window as any).__tc_token as string | undefined;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject entity context headers from localStorage so the backend can
  // scope data to the currently selected entity without needing React context.
  const entityId = localStorage.getItem("tc_entity_id");
  const entityType = localStorage.getItem("tc_entity_type");
  if (entityId && entityType) {
    config.headers = config.headers ?? {};
    config.headers["X-Entity-Id"] = entityId;
    config.headers["X-Entity-Type"] = entityType;
  }

  return config;
});

// 401 → auto-refresh with request queue
let refreshing = false;
let queue: Array<{
  resolve: (t: string) => void;
  reject: (e: unknown) => void;
}> = [];

const flushQueue = (err: unknown, token: string | null) => {
  queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)));
  queue = [];
};

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const orig = error.config;
    if (error.response?.status !== 401 || orig._retry)
      return Promise.reject(error);

    if (refreshing) {
      return new Promise((resolve, reject) =>
        queue.push({ resolve, reject }),
      ).then((token) => {
        orig.headers["Authorization"] = `Bearer ${token}`;
        return api(orig);
      });
    }

    orig._retry = true;
    refreshing = true;
    const rt = localStorage.getItem("tc_rt");

    if (!rt) {
      refreshing = false;
      window.location.href = "/login";
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${BASE}/auth/refresh`, {
        refresh_token: rt,
      });
      (window as any).__tc_token = data.access_token;
      localStorage.setItem("tc_rt", data.refresh_token);
      orig.headers["Authorization"] = `Bearer ${data.access_token}`;
      flushQueue(null, data.access_token);
      return api(orig);
    } catch (e) {
      flushQueue(e, null);
      localStorage.removeItem("tc_rt");
      window.location.href = "/login";
      return Promise.reject(e);
    } finally {
      refreshing = false;
    }
  },
);

export default api;
