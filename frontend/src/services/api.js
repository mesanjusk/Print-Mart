import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://print-mart-dv0h.onrender.com/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getBySlug: (slug) => api.get(`/products/${slug}`),
  getFeatured: () => api.get('/products/featured'),
  getMine: () => api.get('/products/my'),
  create: (data) => api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/products/${id}`),
  addReview: (id, data) => api.post(`/products/${id}/reviews`, data),
};

export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
};

export const inquiryAPI = {
  create: (data) => api.post('/inquiries', data),
  getBuyerInquiries: () => api.get('/inquiries/buyer'),
  getSellerInquiries: () => api.get('/inquiries/seller'),
  reply: (id, data) => api.post(`/inquiries/${id}/reply`, data),
  close: (id) => api.put(`/inquiries/${id}/close`),
};

export const supplierAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  saveProduct: (productId) => api.post('/suppliers/save', { productId }),
  getSaved: () => api.get('/suppliers/saved'),
};

export const quotationAPI = {
  create: (data) => api.post('/quotations', data),
  getSellerQuotations: () => api.get('/quotations/seller'),
  getBuyerQuotations: () => api.get('/quotations/buyer'),
  getById: (id) => api.get(`/quotations/${id}`),
  sendWhatsApp: (id) => api.post(`/quotations/${id}/send-whatsapp`),
  updateStatus: (id, status) => api.put(`/quotations/${id}/status`, { status }),
};

export const orderAPI = {
  createFromQuotation: (quotationId, data) => api.post(`/orders/from-quotation/${quotationId}`, data),
  getMyOrders: (params) => api.get('/orders/my', { params }),
  getVendorOrders: (params) => api.get('/orders/vendor', { params }),
  getAllOrders: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  confirmPayment: (id, data) => api.put(`/orders/${id}/payment`, data),
  dispatch: (id, data) => api.put(`/orders/${id}/dispatch`, data),
  deliver: (id) => api.put(`/orders/${id}/deliver`),
  cancel: (id, data) => api.put(`/orders/${id}/cancel`, data),
  getStats: () => api.get('/orders/stats'),
};

export const waAdminAPI = {
  getStats: () => api.get('/admin/whatsapp/stats'),
  getLogs: (params) => api.get('/admin/whatsapp/logs', { params }),
  getConversations: (params) => api.get('/admin/whatsapp/conversations', { params }),
  getConversationByPhone: (phone, params) => api.get(`/admin/whatsapp/conversation/${phone}`, { params }),
  getSessions: (params) => api.get('/admin/whatsapp/sessions', { params }),
  sendBroadcast: (data) => api.post('/admin/whatsapp/broadcast', data),
  sendDirect: (data) => api.post('/admin/whatsapp/send', data),
};

export default api;
