import axios from 'axios';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 8000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach CSRF token from non-HttpOnly cookie for double-submit CSRF protection
api.interceptors.request.use((config) => {
  config.withCredentials = true;
  const csrf = getCookie('csrf_token');
  if (csrf) {
    config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});

// Intercept 401 responses to trigger global auth state invalidation
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('platewise:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
