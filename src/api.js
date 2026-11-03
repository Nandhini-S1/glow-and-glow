import axios from 'axios';

// Using a relative base URL so all requests go through Vite's dev-server proxy
// (configured in vite.config.js: /api → http://127.0.0.1:8000).
// This prevents CORS preflight issues and ERR_CONNECTION_REFUSED errors in dev.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');

    if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token.trim()}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Unwrap response.data so callers receive the backend payload directly.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // If receiving 401 Unauthorized, purge invalid/expired access_token
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login')) {
        localStorage.removeItem('access_token');
      }
    }

    const responseData = error.response?.data;
    const detail = responseData?.detail ?? responseData?.message;

    let userMessage = 'Something went wrong. Please try again.';

    if (Array.isArray(detail)) {
      userMessage = detail
        .map((item) => {
          const field = Array.isArray(item.loc)
            ? item.loc.slice(1).join('.')
            : 'field';

          return `${field}: ${item.msg || 'Invalid value'}`;
        })
        .join(', ');
    } else if (typeof detail === 'string') {
      userMessage = detail;
    } else if (detail && typeof detail === 'object') {
      userMessage = JSON.stringify(detail);
    } else if (error.message) {
      userMessage = error.message;
    }

    error.userMessage = userMessage;

    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  register: (data) => api.post('/auth/register', data),

  login: (data) => api.post('/auth/login', data),

  logout: async () => {
    try {
      return await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
    }
  },

  getProfile: () => api.get('/auth/me'),

  me: () => api.get('/auth/me'),

  updateProfile: (data) => api.put('/auth/me', data),

  forgotPassword: (data) =>
    api.post('/auth/forgot-password', data),

  resetPassword: (data) =>
    api.post('/auth/reset-password', data),
};

// Products API
export const productApi = {
  getAll: (params = {}) =>
    api.get('/products', { params }),

  getById: (id) =>
    api.get(`/products/${id}`),

  getFeatured: (params = {}) =>
    api.get('/products/featured', { params }),

  getCategories: () =>
    api.get('/categories'),

  search: (params = {}) =>
    api.get('/products', { params }),
};

// Cart API
export const cartApi = {
  get: () =>
    api.get('/cart'),

  add: (data, quantity = 1) =>
    api.post('/cart', typeof data === 'object' && data !== null ? data : { product_id: Number(data), quantity }),

  update: (id, quantity) =>
    api.put(`/cart/${id}`, typeof quantity === 'object' && quantity !== null ? quantity : { quantity }),

  remove: (id) =>
    api.delete(`/cart/${id}`),

  clear: () =>
    api.delete('/cart'),
};

// Wishlist API
export const wishlistApi = {
  get: () =>
    api.get('/wishlist'),

  add: (data) =>
    api.post('/wishlist', typeof data === 'object' && data !== null ? data : { product_id: Number(data) }),

  remove: (id) =>
    api.delete(`/wishlist/${id}`),

  moveToCart: (id) =>
    api.post(`/wishlist/${id}/move-to-cart`),
};

// Orders API
export const orderApi = {
  checkout: (data) =>
    api.post('/checkout', data),

  // Paginated order list (used by OrdersModal)
  list: (page = 1, pageSize = 5) =>
    api.get('/orders', { params: { page, page_size: pageSize } }),

  // Fetch all orders (no pagination)
  getAll: (params = {}) =>
    api.get('/orders', { params }),

  getByOrderNumber: (orderNumber) =>
    api.get(`/orders/${encodeURIComponent(orderNumber)}`),

  // Alias used in some components
  getByNumber: (orderNumber) =>
    api.get(`/orders/${encodeURIComponent(orderNumber)}`),

  track: (orderNumber) =>
    api.get(`/orders/${encodeURIComponent(orderNumber)}/track`),

  cancel: (orderNumber) =>
    api.post(`/orders/${encodeURIComponent(orderNumber)}/cancel`),
};

// Admin API
export const adminApi = {
  getStats: () =>
    api.get('/admin/dashboard/stats'),

  getSalesReport: (params = {}) =>
    api.get('/admin/reports/sales', { params }),

  getProducts: (params = {}) =>
    api.get('/admin/products', { params }),

  addProduct: (data) =>
    api.post('/admin/products', data),

  updateProduct: (id, data) =>
    api.put(`/admin/products/${id}`, data),

  deleteProduct: (id) =>
    api.delete(`/admin/products/${id}`),

  toggleProductStatus: (id, isActive) =>
    api.patch(`/admin/products/${id}/status`, { is_active: isActive }),

  updateProductStock: (id, stock) =>
    api.patch(`/admin/products/${id}/stock`, { stock: Number(stock) }),

  getOrders: () =>
    api.get('/admin/orders'),

  updateOrderStatus: (orderNumber, statusOrData) => {
    const payload = typeof statusOrData === 'object' && statusOrData !== null
      ? statusOrData
      : { status: statusOrData };
    return api.patch(
      `/admin/orders/${encodeURIComponent(orderNumber)}/status`,
      payload
    );
  },
};

export default api;
