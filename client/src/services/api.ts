import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Dashboard Service
export const dashboardService = {
  getSummary: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    api.get('/dashboard/summary', { params }),
  getAnalytics: () => api.get('/dashboard/analytics'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};

// Client Service
export const clientService = {
  getClients: (params?: { search?: string; archived?: boolean }) =>
    api.get('/clients', { params }),
  getClientById: (id: string) => api.get(`/clients/${id}`),
  createClient: (data: any) => api.post('/clients', data),
  updateClient: (id: string, data: any) => api.put(`/clients/${id}`, data),
  deleteClient: (id: string) => api.delete(`/clients/${id}`),
};

// Invoice Service
export const invoiceService = {
  getInvoices: (params?: { search?: string; status?: string; clientId?: string; startDate?: string; endDate?: string }) =>
    api.get('/invoices', { params }),
  getInvoiceById: (id: string) => api.get(`/invoices/${id}`),
  createInvoice: (data: any) => api.post('/invoices', data),
  updateInvoice: (id: string, data: any) => api.put(`/invoices/${id}`, data),
  issueInvoice: (id: string) => api.post(`/invoices/${id}/issue`),
  cancelInvoice: (id: string, reason: string) => api.post(`/invoices/${id}/cancel`, { reason }),
  updateStatus: (
    id: string,
    status: string,
    reason?: string,
    extra?: { amount?: number; paymentMethod?: string; transactionReference?: string }
  ) => api.patch(`/invoices/${id}/status`, { status, reason, ...extra }),
  deleteInvoice: (id: string) => api.delete(`/invoices/${id}`),
  getWhatsAppShare: (id: string) => api.get(`/invoices/${id}/whatsapp`),
  getPDFDownloadUrl: (id: string) => `${API_BASE_URL}/invoices/${id}/pdf`,
};

// Quotation Service
export const quotationService = {
  getQuotations: (params?: {
    search?: string;
    status?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/quotations', { params }),
  getQuotationById: (id: string) => api.get(`/quotations/${id}`),
  createQuotation: (data: any) => api.post('/quotations', data),
  updateQuotation: (id: string, data: any) => api.put(`/quotations/${id}`, data),
  issueQuotation: (id: string) => api.post(`/quotations/${id}/issue`),
  sendQuotation: (id: string) => api.post(`/quotations/${id}/send`),
  acceptQuotation: (
    id: string,
    data: {
      approvedBy: string;
      approvalDate?: string;
      approvalMethod?: string;
      approvalNotes?: string;
    }
  ) => api.post(`/quotations/${id}/accept`, data),
  rejectQuotation: (id: string, reason?: string) =>
    api.post(`/quotations/${id}/reject`, { reason }),
  convertToInvoice: (
    id: string,
    invoiceOverrides?: {
      invoiceDate?: string;
      dueDate?: string;
      notes?: string;
      paymentTerms?: string;
    }
  ) => api.post(`/quotations/${id}/convert-to-invoice`, invoiceOverrides),
  deleteQuotation: (id: string) => api.delete(`/quotations/${id}`),
  getWhatsAppShare: (id: string) => api.get(`/quotations/${id}/whatsapp`),
  getPDFDownloadUrl: (id: string) => `${API_BASE_URL}/quotations/${id}/pdf`,
};

// Payment Service
export const paymentService = {
  getPayments: (params?: { search?: string; invoiceId?: string; clientId?: string; status?: string; paymentMethod?: string; startDate?: string; endDate?: string }) =>
    api.get('/payments', { params }),
  getPaymentById: (id: string) => api.get(`/payments/${id}`),
  createPayment: (data: any) => api.post('/payments', data),
  reversePayment: (id: string, reason: string) => api.post(`/payments/${id}/reverse`, { reason }),
};

// Settings Service
export const settingsService = {
  getSettings: () => api.get('/settings'),
  updateCompany: (data: any) => api.put('/settings/company', data),
  updateInvoiceSettings: (data: any) => api.put('/settings/invoice', data),
  updateQuotationSettings: (data: any) => api.put('/settings/quotation', data),
  updateGSTSettings: (data: any) => api.put('/settings/gst', data),
  updateBankDetails: (data: any) => api.put('/settings/bank', data),
};

