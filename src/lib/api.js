import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Required for httpOnly refresh token cookie
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tm_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 — try to refresh, then retry original request once
api.interceptors.response.use(null, async (err) => {
  const original = err.config;
  if (err.response?.status === 401 && !original._retry && !original.url.endsWith('/auth/refresh')) {
    original._retry = true;
    try {
      const { data } = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      localStorage.setItem('tm_access_token', data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      localStorage.removeItem('tm_access_token');
      window.location.href = '/login';
    }
  }
  return Promise.reject(err);
});

export default api;
