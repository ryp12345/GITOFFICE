import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL });

let isRefreshing = false;
let pendingRequests = [];

const runPendingRequests = (nextToken) => {
  pendingRequests.forEach((resolve) => resolve(nextToken));
  pendingRequests = [];
};

const clearSessionAndRedirect = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push((nextToken) => {
          if (!nextToken) {
            reject(error);
            return;
          }
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${nextToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, {
        refreshToken: storedRefreshToken
      });
      const nextSession = refreshResponse.data?.data;
      const nextToken = nextSession?.token;
      const nextRefreshToken = nextSession?.refreshToken;

      if (!nextToken || !nextRefreshToken) {
        throw new Error('Invalid refresh response');
      }

      localStorage.setItem('token', nextToken);
      localStorage.setItem('refreshToken', nextRefreshToken);

      if (nextSession?.user) {
        localStorage.setItem('user', JSON.stringify(nextSession.user));
      }

      runPendingRequests(nextToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      runPendingRequests(null);
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
