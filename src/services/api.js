import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach demo role header from localStorage (defaults to 'admin' for developer convenience)
api.interceptors.request.use((config) => {
  const currentRole = localStorage.getItem('platewise_demo_role') || 'admin';
  config.headers['x-demo-role'] = currentRole;
  return config;
});

export default api;

