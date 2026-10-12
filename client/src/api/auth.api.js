import { api } from './axios.js';

export const authApi = {
  // Both resolve to { token, user }
  register: (details) => api.post('/auth/register', details).then((res) => res.data),
  login: (credentials) => api.post('/auth/login', credentials).then((res) => res.data),

  // Resolves to the user if the stored token is still valid
  me: () => api.get('/auth/me').then((res) => res.data.user),
};
