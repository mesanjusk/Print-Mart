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
  sendOTP: (data) => api.post('/auth/send-otp', data),
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  resetPasswordWithOTP: (userId, otp, password) => api.post('/auth/reset-password-otp', { userId, otp, password }),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  verifyOTP: (otp, purpose) => api.post('/auth/verify-otp', { otp, purpose }),
  resendVerification: () => api.post('/auth/resend-verification'),
  magicLogin: (token) => api.get(`/auth/magic-login?token=${token}`),
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
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
};

export const inquiryAPI = {
  create: (data) => api.post('/inquiries', data),
  getBuyerInquiries: () => api.get('/inquiries/buyer'),
  getSellerInquiries: () => api.get('/inquiries/seller'),
  accept: (id) => api.put(`/inquiries/${id}/accept`),
  reply: (id, data) => api.post(`/inquiries/${id}/reply`, data),
  close: (id) => api.put(`/inquiries/${id}/close`),
};

export const pushAPI = {
  subscribe: (subscription) => api.post('/push/subscribe', subscription),
  unsubscribe: () => api.post('/push/unsubscribe'),
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
  replyToConversation: (phone, data) => api.post(`/admin/whatsapp/conversation/${phone}/reply`, data),
  getSessions: (params) => api.get('/admin/whatsapp/sessions', { params }),
  sendBroadcast: (data) => api.post('/admin/whatsapp/broadcast', data),
  sendDirect: (data) => api.post('/admin/whatsapp/send', data),
  // Campaigns
  getCampaigns: (params) => api.get('/admin/whatsapp/campaigns', { params }),
  createCampaign: (data) => api.post('/admin/whatsapp/campaigns', data),
  updateCampaign: (id, data) => api.put(`/admin/whatsapp/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/admin/whatsapp/campaigns/${id}`),
  runCampaign: (id) => api.post(`/admin/whatsapp/campaigns/${id}/run`),
  // Opt-outs
  getOptOuts: () => api.get('/admin/whatsapp/optouts'),
  addOptOut: (data) => api.post('/admin/whatsapp/optouts', data),
  removeOptOut: (id) => api.delete(`/admin/whatsapp/optouts/${id}`),
  // 24h window
  getWindowStatus: () => api.get('/admin/whatsapp/window-status'),
  // Templates
  getTemplates: () => api.get('/admin/whatsapp/templates'),
  syncTemplates: () => api.post('/admin/whatsapp/templates/sync'),
  // Bot Commands
  getBotCommands: () => api.get('/admin/whatsapp/bot-commands'),
  createBotCommand: (data) => api.post('/admin/whatsapp/bot-commands', data),
  updateBotCommand: (id, data) => api.put(`/admin/whatsapp/bot-commands/${id}`, data),
  deleteBotCommand: (id) => api.delete(`/admin/whatsapp/bot-commands/${id}`),
  resetBotCommand: (id) => api.post(`/admin/whatsapp/bot-commands/${id}/reset`),
};

export const compareAPI = {
  compare: (params) => api.get('/products/compare', { params }),
  updatePrintSpecs: (id, specs) => api.put(`/products/${id}/print-specs`, specs),
};

export const userAPI = {
  getAll: () => api.get('/users'),
  toggleStatus: (id) => api.put(`/users/${id}/status`),
  togglePremium: (id) => api.put(`/users/${id}/premium`),
  changeRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  getMyPlan: () => api.get('/users/me/plan'),
};

export const designAPI = {
  upload: (formData) => api.post('/designs', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: () => api.get('/designs'),
  remove: (id) => api.delete(`/designs/${id}`),
};

export const offerAPI = {
  getAll: (params) => api.get('/offers', { params }),
  getMy: () => api.get('/offers/my'),
  create: (data) => api.post('/offers', data),
  update: (id, data) => api.put(`/offers/${id}`, data),
  remove: (id) => api.delete(`/offers/${id}`),
};

export const bulkAPI = {
  getCategories: () => api.get('/admin/bulk/catalog'),
  importCategories: (data) => api.post('/admin/bulk/categories', data),
  importProducts: (data) => api.post('/admin/bulk/products', data),
  importSellers: (data) => api.post('/admin/bulk/sellers', data),
  confirmSellerOTP: (email, otp) => api.post('/admin/bulk/sellers/confirm-otp', { email, otp }),
  addSeller: (data) => api.post('/admin/bulk/seller', data),
};

export default api;
