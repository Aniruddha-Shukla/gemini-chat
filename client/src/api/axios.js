import axios from 'axios';

const TOKEN_KEY = 'gemini-chat:token';

// localStorage can throw (private browsing, blocked storage), so every access is guarded.
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage unavailable: the user stays logged in until the page reloads.
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing to clear.
    }
  },
};

// One shared instance for every API call. In dev, '/api' is proxied to Express by Vite.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  // Generous because free hosting tiers (e.g. Render) sleep when idle and take up to a minute to wake.
  timeout: 75_000,
});

// Fire-and-forget request on page load so a sleeping API starts waking up
// while the user is still typing their password.
export function wakeServer() {
  api.get('/health').catch(() => {});
}

// ---- Request interceptor: attach the JWT to every call ----
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Response interceptor: a 401 on an authenticated call means the session is over ----
let handleUnauthorized = () => {};

// AuthContext registers its logout function here.
export function onUnauthorized(handler) {
  handleUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only requests that carried a token can "expire". A 401 from /auth/login
    // just means a wrong password and must not trigger a logout.
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      tokenStorage.clear();
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

// Turns any Axios error into a sentence that can be shown to the user.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const response = error?.response;
  if (response?.data?.message) return response.data.message;
  // No JSON body on a 5xx usually means the dev proxy couldn't reach Express.
  if ((response && response.status >= 500) || error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Make sure the API is running.';
  }
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  return fallback;
}
