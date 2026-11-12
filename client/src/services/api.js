import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';
export const api = axios.create({ baseURL, withCredentials: true });

let accessToken = null;
export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;

export function guestId() {
  let id = localStorage.getItem('farmcity_guest_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('farmcity_guest_id', id);
  }
  return id;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  else config.headers['X-Guest-Id'] = guestId();
  return config;
});

let refreshing = null;
api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  const url = original?.url || '';
  if (error.response?.status === 401 && original && !original._retry && !url.includes('/auth/')) {
    original._retry = true;
    try {
      if (!refreshing) {
        refreshing = axios.post(`${baseURL}/api/auth/refresh`, {}, { withCredentials: true })
          .finally(() => { refreshing = null; });
      }
      const { data } = await refreshing;
      setAccessToken(data.data.accessToken);
      original.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return api(original);
    } catch {
      setAccessToken(null);
    }
  }
  return Promise.reject(error);
});

export const get = (url, config) => api.get(url, config).then((res) => res.data);
export const post = (url, body, config) => api.post(url, body, config).then((res) => res.data);
export const put = (url, body) => api.put(url, body).then((res) => res.data);
export const patch = (url, body) => api.patch(url, body).then((res) => res.data);
export const del = (url) => api.delete(url).then((res) => res.data);
