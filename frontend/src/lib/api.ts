const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('govedms_token') : null;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorData: any;
    try {
      errorData = await res.json();
    } catch {
      errorData = { message: await res.text() };
    }
    throw new ApiError(
      errorData.message || errorData.error || `HTTP ${res.status}`,
      res.status,
      errorData
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  logout: () =>
    request<any>('/auth/logout', {
      method: 'POST',
    }),
  getMe: () => request<any>('/auth/me'),
  updateProfile: (payload: { fullName?: string; phone?: string; avatarUrl?: string }) =>
    request<any>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<any>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Dashboard
  getDashboardKPIs: () => request<any>('/dashboard/kpis'),
  getDashboardAnalytics: () => request<any>('/dashboard/analytics'),

  // Letters
  getLetters: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<any>(`/letters${query}`);
  },
  getLetter: (id: string) => request<any>(`/letters/${id}`),
  createLetter: (formData: FormData) =>
    request<any>('/letters', {
      method: 'POST',
      body: formData,
    }),
  linkLetterToFile: (letterId: string, payload: { fileId: string; linkRole: string; folioNumber?: string; attachedNote?: string }) =>
    request<any>(`/letters/${letterId}/link-files`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteLetter: (id: string, reason: string) =>
    request<any>(`/letters/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),

  // Downmarking
  downmarkLetter: (letterId: string, payload: { markedToId: string; instructions: string; deadline?: string }) =>
    request<any>(`/letters/${letterId}/downmark`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  respondDownmark: (id: string, payload: { status: string; closingRemarks?: string }) =>
    request<any>(`/downmarkings/${id}/respond`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Physical Custody
  checkoutPhysical: (letterId: string, payload: { issuedToUserId?: string; issuedToExternal?: string; issuedToDesignation: string; purpose: string; expectedReturnAt: string }) =>
    request<any>(`/letters/${letterId}/physical-checkout`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  checkinPhysical: (letterId: string) =>
    request<any>(`/letters/${letterId}/physical-checkin`, {
      method: 'POST',
    }),
  getOverdueCustody: () => request<any>('/custody/overdue'),
  getCustodyRegister: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<any>(`/custody/register${query}`);
  },

  // Files, Cases, Projects
  getFiles: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<any>(`/files${query}`);
  },
  getFile: (id: string) => request<any>(`/files/${id}`),
  createFile: (payload: any) =>
    request<any>('/files', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMergePdfUrl: (fileId: string, letterIds?: string[]) => {
    const query = letterIds && letterIds.length > 0 ? `?letterIds=${letterIds.join(',')}` : '';
    return `${API_BASE}/files/${fileId}/merge-pdf${query}`;
  },
  lookupBarcode: (barcode: string) => request<any>(`/barcode/${barcode}`),

  // Search Engine
  searchLetters: (params?: Record<string, string | number | undefined | null>) => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') cleanParams[k] = String(v);
      });
    }
    const query = Object.keys(cleanParams).length > 0 ? `?${new URLSearchParams(cleanParams).toString()}` : '';
    return request<any>(`/search${query}`);
  },

  // Users & Access Control
  getUsers: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<any[]>(`/users${query}`);
  },
  getUser: (id: string) => request<any>(`/users/${id}`),
  createUser: (payload: any) =>
    request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUser: (id: string, payload: any) =>
    request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  toggleUserStatus: (id: string, isActive: boolean) =>
    request<any>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  resetUserPassword: (id: string, newPassword: string) =>
    request<any>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  updateUserAccessMatrix: (id: string, permissions: any[]) =>
    request<any>(`/users/${id}/access-matrix`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),
  setUserFolderPermission: (id: string, payload: { fileId: string; canRead?: boolean; canWrite?: boolean; canCheckout?: boolean }) =>
    request<any>(`/users/${id}/folder-permissions`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  revokeUserFolderPermission: (id: string, fileId: string) =>
    request<any>(`/users/${id}/folder-permissions/${fileId}`, {
      method: 'DELETE',
    }),

  // Departments
  getDepartments: () => request<any>('/departments'),
  getDepartmentUsers: (deptId: string) => request<any>(`/departments/${deptId}/users`),

  // Dynamic Permissions & Matrix
  updateUserPermissions: (userId: string, payload: { deptAccess?: any[]; folderPermissions?: any[]; removeDeptIds?: string[]; removeFileIds?: string[] }) =>
    request<any>(`/admin/users/${userId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  revokeUserDeptAccess: (userId: string, deptId: string) =>
    request<any>(`/users/${userId}/access-matrix/${deptId}`, {
      method: 'DELETE',
    }),

  // Letter Stream & Minute Notes
  getLetterStreamUrl: (letterId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('govedms_token') : null;
    return `${API_BASE}/letters/${letterId}/stream${token ? `?token=${token}` : ''}`;
  },
  getLetterNotes: (letterId: string) => request<any[]>(`/letters/${letterId}/notes`),
  addLetterNote: (letterId: string, payload: { noteText: string; isInternal?: boolean }) =>
    request<any>(`/letters/${letterId}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Secure External Share
  createShareLink: (letterId: string, payload: { password: string; expiresInHours?: number; allowDownload?: boolean; recipientLabel?: string }) =>
    request<any>(`/letters/${letterId}/share`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getShareLinks: (letterId: string) => request<any[]>(`/letters/${letterId}/shares`),
  revokeShareLink: (letterId: string, shareId: string) =>
    request<any>(`/letters/${letterId}/shares/${shareId}`, {
      method: 'DELETE',
    }),
  verifySharedLink: (token: string, password: string) =>
    request<any>(`/shared/${token}/verify`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  getSharedStreamUrl: (token: string) => `${API_BASE}/shared/${token}/stream`,
  getSharedDownloadUrl: (token: string) => `${API_BASE}/shared/${token}/download`,

  // System Settings & Branding
  getSettings: () => request<any>('/admin/settings'),
  updateSettings: (payload: { portalTitle?: string; logoUrl?: string; logoBase64?: string; watermarkText?: string }) =>
    request<any>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  uploadLogo: (payload: { logoBase64: string; portalTitle?: string; watermarkText?: string }) =>
    request<any>('/admin/settings/logo', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Full File Download URL
  getDownloadAllFilePdfUrl: (fileId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('govedms_token') : null;
    return `${API_BASE}/files/${fileId}/download-all${token ? `?token=${token}` : ''}`;
  },

  // Audit Logs
  getAuditLogs: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<any>(`/audit-logs${query}`);
  },
};
