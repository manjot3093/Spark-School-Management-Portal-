// API Service for School Management Portal
// This file contains all API endpoints and their implementations

// Use same-origin /api so requests are proxied (no CORS). Set VITE_API_URL to full URL if not using proxy.
export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

/** Full URL for API path (e.g. /auth/login, /students/documents/x). */
export const getApiFullUrl = (path: string) => {
  const base = API_BASE_URL;
  const p = path.startsWith('/') ? path : '/' + path;
  if (base.startsWith('http')) return base.replace(/\/$/, '') + p;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin + (base.startsWith('/') ? base : '/' + base) + p;
};

/** Full URL for static assets (e.g. /uploads/...). Use when your host proxies both /api and /uploads to backend. */
export const getAssetUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin + (path.startsWith('/') ? path : '/' + path);
};

// Get authentication token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('school_token');
};

// Generic API request function
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  // If the body is a FormData instance, do NOT set Content-Type header and let the browser set it
  const isFormData = options.body instanceof FormData;

  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, defaultOptions);
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem('school_token');
        window.location.href = '/login';
        throw new Error('Authentication failed. Please login again.');
      }

      // Try to get detailed error information
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      if (contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          console.error('Detailed API error:', errorData);
          if (errorData.details && Array.isArray(errorData.details)) {
            errorMessage = `Validation failed: ${errorData.details.map((d: any) => d.msg).join(', ')}`;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
      }

      throw new Error(errorMessage);
    }

    if (!contentType.includes('application/json')) {
      throw new Error(`Backend server returned unexpected non-JSON response from ${url}. Ensure the backend is running.`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

/** Call API; on 404 or "Not Found" response return null without logging (for optional backend features). */
const apiRequestOptional = async (endpoint: string, options: RequestInit = {}): Promise<any | null> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;
  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };
  try {
    const response = await fetch(url, defaultOptions);
    if (!response.ok) {
      const text = await response.text();
      if (response.status === 404 || text.includes('Not Found')) return null;
      try {
        const err = JSON.parse(text);
        if (err?.error && String(err.error).includes('Not Found')) return null;
      } catch { /* ignore */ }
      throw new Error(text || `Request failed: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Not Found')) return null;
    throw err;
  }
};

// General Settings API
export const settingsAPI = {
  getSchoolInfo: () => apiRequest('/settings/school-info'),
  updateSchoolInfo: (data: any) => apiRequest('/settings/school-info', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getBackup: () => apiRequest('/settings/backup'),
  createBackup: () => apiRequest('/settings/backup', { method: 'POST' }),
  restoreBackup: (backupId: string) => apiRequest(`/settings/backup/${backupId}/restore`, { method: 'POST' }),
  getActivityLogs: () => apiRequest('/settings/activity-logs'),
};

// Classes API
export const classesAPI = {
  getAll: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '?limit=1000';
    return apiRequest(`/classes${queryString}`);
  },
  getById: (id: string) => apiRequest(`/classes/${id}`),
  create: (data: any) => apiRequest('/classes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/classes/${id}`, { method: 'DELETE' }),
  getSubjects: (classId: string) => apiRequest(`/classes/${classId}/subjects`),
  assignSubjects: (classId: string, subjectIds: string[]) => apiRequest(`/classes/${classId}/subjects`, {
    method: 'POST',
    body: JSON.stringify({ subjectIds }),
  }),
  getTeacher: (classId: string) => apiRequest(`/classes/${classId}/teacher`),
  assignTeacher: (classId: string, teacherId: string) => apiRequest(`/classes/${classId}/teacher`, {
    method: 'PUT',
    body: JSON.stringify({ teacherId }),
  }),
  getPerformanceReport: (classId: string) => apiRequest(`/classes/${classId}/reports/performance`),
  getAttendanceReport: (classId: string) => apiRequest(`/classes/${classId}/reports/attendance`),
};

// Subjects API
export const subjectsAPI = {
  getAll: () => apiRequest('/subjects'),
  getById: (id: string) => apiRequest(`/subjects/${id}`),
  create: (data: any) => apiRequest('/subjects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/subjects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/subjects/${id}`, { method: 'DELETE' }),
  getCategories: () => apiRequest('/subjects/categories'),
  createCategory: (data: any) => apiRequest('/subjects/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCategory: (id: string, data: any) => apiRequest(`/subjects/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCategory: (id: string) => apiRequest(`/subjects/categories/${id}`, { method: 'DELETE' }),
  getTeachers: (subjectId: string) => apiRequest(`/subjects/${subjectId}/teachers`),
  assignTeacher: (subjectId: string, teacherId: string) => apiRequest(`/subjects/${subjectId}/teachers`, {
    method: 'POST',
    body: JSON.stringify({ teacherId }),
  }),
};

// Syllabus API
export const syllabusAPI = {
  getAll: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/syllabus${queryString}`);
  },
  getById: (id: string) => apiRequest(`/syllabus/${id}`),
  create: (data: any) => {
    // If caller passed a FormData instance (files), forward it as multipart/form-data
    if (data instanceof FormData) {
      return apiRequest('/syllabus', {
        method: 'POST',
        headers: {}, // let apiRequest detect FormData and avoid setting Content-Type
        body: data
      });
    }
    return apiRequest('/syllabus', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, data: any) => {
    if (data instanceof FormData) {
      return apiRequest(`/syllabus/${id}`, {
        method: 'PUT',
        headers: {},
        body: data
      });
    }
    return apiRequest(`/syllabus/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) => apiRequest(`/syllabus/${id}`, { method: 'DELETE' }),
  getByClassAndSubject: (classId: string, subjectId: string, academicYear?: string) => {
    const queryString = academicYear ? `?academicYear=${academicYear}` : '';
    return apiRequest(`/syllabus/class/${classId}/subject/${subjectId}${queryString}`);
  },
};

// Inventory API
export const inventoryAPI = {
  getAll: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/inventory${queryString}`);
  },
  getById: (id: string) => apiRequest(`/inventory/${id}`),
  create: (data: any) => {
    if (data instanceof FormData) {
      return apiRequest('/inventory', {
        method: 'POST',
        headers: {},
        body: data
      });
    }
    return apiRequest('/inventory', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  update: (id: string, data: any) => {
    if (data instanceof FormData) {
      return apiRequest(`/inventory/${id}`, {
        method: 'PUT',
        headers: {},
        body: data
      });
    }
    return apiRequest(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  delete: (id: string) => apiRequest(`/inventory/${id}`, { method: 'DELETE' })
};

// Students API
export const studentsAPI = {
  getAll: () => apiRequest('/students'),
  getById: (id: string) => apiRequest(`/students/${id}`),
  create: (formData: FormData) => apiRequest('/students', {
    method: 'POST',
    // Don't pass headers - let apiRequest handle it properly for FormData
    body: formData,
  }),
  update: (id: string, formData: FormData | any) => {
    // Check if formData is FormData instance or regular object
    const isFormData = formData instanceof FormData;
    return apiRequest(`/students/${id}`, {
      method: 'PUT',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' }, // Don't set Content-Type for FormData
      body: isFormData ? formData : JSON.stringify(formData),
    });
  },
  getAttendance: (studentId: string) => apiRequest(`/students/${studentId}/attendance`),
  markAttendance: (studentId: string, data: any) => apiRequest(`/students/${studentId}/attendance`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getDocuments: (studentId: string) => apiRequest(`/students/${studentId}/documents`),
  uploadDocument: (studentId: string, formData: FormData) => apiRequest(`/students/${studentId}/documents`, {
    method: 'POST',
    headers: {}, // Don't set Content-Type for FormData
    body: formData,
  }),
  deleteDocument: (studentId: string, documentId: string) => apiRequest(`/students/${studentId}/documents/${documentId}`, {
    method: 'DELETE',
  }),
  generateTransferCertificate: (studentId: string, data: any) => apiRequest(`/students/${studentId}/transfer-certificate`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getTransferCertificates: (studentId: string) => apiRequest(`/students/${studentId}/transfer-certificates`),
  exportData: () => apiRequest('/students/export'),
  getPerformanceReport: (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/students/performance-report?${queryString}`);
  },
  toggleStatus: (id: string, status?: 'active' | 'inactive') => {
    return apiRequest(`/students/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(status ? { status } : {})
    });
  },
};

// Houses API
export const housesAPI = {
  getAll: () => apiRequest('/houses'),
  getById: (id: string) => apiRequest(`/houses/${id}`),
  create: (data: any) => apiRequest('/houses', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/houses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/houses/${id}`, { method: 'DELETE' }),
  assignStudents: (id: string, studentIds: string[]) => apiRequest(`/houses/${id}/assign-students`, {
    method: 'POST',
    body: JSON.stringify({ studentIds }),
  }),
  removeStudents: (id: string, studentIds: string[]) => apiRequest(`/houses/${id}/remove-students`, {
    method: 'POST',
    body: JSON.stringify({ studentIds }),
  }),
};

// Employees API
export const employeesAPI = {
  getAll: () => apiRequest('/employees'),
  getById: (id: string) => apiRequest(`/employees/${id}`),
  create: (data: any) => apiRequest('/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),
  getAttendance: () => apiRequest('/employees/attendance'),
  markAttendance: (data: any) => apiRequest('/employees/attendance', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  exportAttendance: () => apiRequest('/employees/attendance/export'),
  getDepartments: () => apiRequest('/employees/departments'),
  createDepartment: (data: any) => apiRequest('/employees/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateDepartment: (id: string, data: any) => apiRequest(`/employees/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteDepartment: (id: string) => apiRequest(`/employees/departments/${id}`, { method: 'DELETE' }),
};

// Fees API
export const feesAPI = {
  // Fee Categories
  getCategories: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/fee-categories${queryString}`);
  },
  getActiveCategories: () => apiRequest('/fee-categories/active/list'),
  createCategory: (data: any) => apiRequest('/fee-categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCategory: (id: string, data: any) => apiRequest(`/fee-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCategory: (id: string) => apiRequest(`/fee-categories/${id}`, { method: 'DELETE' }),

  // Fee Structures
  getStructures: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/fee-structures${queryString}`);
  },
  getStructureById: (id: string) => apiRequest(`/fee-structures/${id}`),
  getActiveStructures: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/fee-structures/active/list${queryString}`);
  },
  createStructure: (data: any) => apiRequest('/fee-structures', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateStructure: (id: string, data: any) => apiRequest(`/fee-structures/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteStructure: (id: string) => apiRequest(`/fee-structures/${id}`, { method: 'DELETE' }),

  // Fee Collections
  getCollections: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/fee-collections${queryString}`);
  },
  getCollectionById: (id: string) => apiRequest(`/fee-collections/${id}`),
  createCollection: (data: any) => apiRequest('/fee-collections', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCollection: (id: string, data: any) => apiRequest(`/fee-collections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCollection: (id: string) => apiRequest(`/fee-collections/${id}`, { method: 'DELETE' }),
  addPayment: (id: string, data: any) => apiRequest(`/fee-collections/${id}/payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  cancelCollection: (id: string, reason: string) => apiRequest(`/fee-collections/${id}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  }),
  getDueCollections: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/fee-collections/due/list${queryString}`);
  },
  getOverdueCollections: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/fee-collections/overdue/list${queryString}`);
  },
  getCollectionStats: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/fee-collections/stats${queryString}`);
  },
  sendReminder: (id: string, type: string) => apiRequest(`/fee-collections/${id}/reminder`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  }),
  generateInstallments: (data: any) => apiRequest('/fee-collections/generate-installments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  generateDues: (data: { studentId: string; academicYear: string }) => apiRequest('/fee-collections/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Student payment plans (annual / monthly / quarterly)
  getPaymentPlans: (params?: { studentId?: string; academicYear?: string }) => {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest(`/student-payment-plans${queryString}`);
  },
  /** Same as getPaymentPlans but returns { success: true, data: [] } if endpoint is not available (no console errors). */
  getPaymentPlansOptional: async (params?: { studentId?: string; academicYear?: string }) => {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    const res = await apiRequestOptional(`/student-payment-plans${queryString}`);
    return res ?? { success: true, data: [] };
  },
  upsertPaymentPlan: (data: { studentId: string; academicYear: string; plan: 'annual' | 'monthly' | 'quarterly' }) =>
    apiRequest('/student-payment-plans', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  /** Same as upsertPaymentPlan but does not throw or log on 404 (optional backend). */
  upsertPaymentPlanOptional: async (data: { studentId: string; academicYear: string; plan: 'annual' | 'monthly' | 'quarterly' }) => {
    const res = await apiRequestOptional('/student-payment-plans', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res ?? { success: false, error: 'Payment plan feature is not available. Restart the backend to enable it.' };
  },
  /** Same as generateDues but does not throw or log on 404 (optional backend). */
  generateDuesOptional: async (data: { studentId: string; academicYear: string }) => {
    const res = await apiRequestOptional('/fee-collections/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res ?? { success: false, error: 'Generate dues is not available. Restart the backend to enable it.' };
  },

  // Fee Receipts
  getReceipts: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/fee-receipts${queryString}`);
  },
  getReceiptById: (id: string) => apiRequest(`/fee-receipts/${id}`),
  getReceiptByNumber: (receiptNumber: string) => apiRequest(`/fee-receipts/number/${receiptNumber}`),
  createReceipt: (data: any) => apiRequest('/fee-receipts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  cancelReceipt: (id: string, reason: string) => apiRequest(`/fee-receipts/${id}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  }),
  getReceiptStats: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/fee-receipts/stats${queryString}`);
  },
  getReceiptsByDateRange: (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/fee-receipts/date-range?${queryString}`);
  },
  getReceiptsByStudent: (studentId: string, params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/fee-receipts/student/${studentId}${queryString}`);
  },
};

// Authentication API
export const authAPI = {
  login: (credentials: { email: string; password: string }) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  refreshToken: () => apiRequest('/auth/refresh', { method: 'POST' }),
  getProfile: () => apiRequest('/auth/profile'),
  updateProfile: (data: any) => apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  firebaseLogin: (idToken: string) => apiRequest('/auth/firebase-login', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  }),
};

// Classroom Management API
export const classroomAPI = {
  // Classes
  getClasses: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '?limit=1000';
    return apiRequest(`/classes${queryString}`);
  },
  getClassById: (id: string) => apiRequest(`/classes/${id}`),
  createClass: (data: any) => apiRequest('/classes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateClass: (id: string, data: any) => apiRequest(`/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteClass: (id: string) => apiRequest(`/classes/${id}`, { method: 'DELETE' }),
  assignTeacher: (id: string, teacherId: string) => apiRequest(`/classes/${id}/assign-teacher`, {
    method: 'PUT',
    body: JSON.stringify({ teacherId }),
  }),
  assignSubjects: (id: string, subjectIds: string[]) => apiRequest(`/classes/${id}/assign-subjects`, {
    method: 'PUT',
    body: JSON.stringify({ subjectIds }),
  }),
  updateSchedule: (id: string, schedule: any) => apiRequest(`/classes/${id}/schedule`, {
    method: 'PUT',
    body: JSON.stringify({ schedule }),
  }),
  getClassStats: () => apiRequest('/classes/stats'),

  // Students
  getStudents: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/students${queryString}`);
  },
  getStudentById: (id: string) => apiRequest(`/students/${id}`),
  createStudent: (data: any) => apiRequest('/students', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateStudent: (id: string, data: any) => apiRequest(`/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteStudent: (id: string) => apiRequest(`/students/${id}`, { method: 'DELETE' }),
  toggleStudentStatus: (id: string, status?: 'active' | 'inactive') => {
    return apiRequest(`/students/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(status ? { status } : {})
    });
  },
  uploadPdfs: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('pdfs', file);
    });

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/students/upload-pdfs`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload PDFs');
    }

    return response.json();
  },
  assignToClass: (id: string, classId: string) => apiRequest(`/students/${id}/assign-class`, {
    method: 'PUT',
    body: JSON.stringify({ classId }),
  }),
  removeFromClass: (id: string) => apiRequest(`/students/${id}/remove-class`, {
    method: 'PUT',
  }),
  markAttendance: (id: string, data: any) => apiRequest(`/students/${id}/attendance`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getStudentAttendanceById: (id: string, params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/students/${id}/attendance${queryString}`);
  },
  uploadDocument: (id: string, data: any) => apiRequest(`/students/${id}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getStudentStats: () => apiRequest('/students/stats'),

  // Student and Parent Login
  studentLogin: (credentials: { email: string; password: string }) => apiRequest('/students/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  parentLogin: (credentials: { email: string; password: string }) => apiRequest('/students/parents/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  // Teachers
  getTeachers: (schoolId?: string) => {
    if (schoolId) {
      return apiRequest(`/schools/${schoolId}/teachers`);
    }
    return apiRequest('/teachers');
  },
  getTeacherStats: () => apiRequest('/teachers/stats'),
  loginTeacher: (credentials: { email: string; password: string }) => {
    return fetch(`${API_BASE_URL}/teachers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then(response => {
      if (!response.ok) {
        return response.json().then(errorData => {
          throw new Error(errorData.error || 'Login failed');
        });
      }
      return response.json();
    });
  },
  getTeacherById: (id: string) => apiRequest(`/teachers/${id}`),
  createTeacher: (data: any) => apiRequest('/auth/create-teacher', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createLibrarian: (data: any) => apiRequest('/auth/create-librarian', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createAccountant: (data: any) => apiRequest('/auth/create-accountant', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateTeacher: (id: string, data: any) => apiRequest(`/teachers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteTeacher: (id: string) => apiRequest(`/teachers/${id}`, { method: 'DELETE' }),
  assignTeacherSubjects: (id: string, subjectIds: string[]) => apiRequest(`/teachers/${id}/assign-subjects`, {
    method: 'PUT',
    body: JSON.stringify({ subjectIds }),
  }),
  assignTeacherClasses: (id: string, classIds: string[]) => apiRequest(`/teachers/${id}/assign-classes`, {
    method: 'PUT',
    body: JSON.stringify({ classIds }),
  }),
  updateTeacherSchedule: (id: string, schedule: any) => apiRequest(`/teachers/${id}/schedule`, {
    method: 'PUT',
    body: JSON.stringify({ schedule }),
  }),
  uploadTeacherDocument: (id: string, data: any) => apiRequest(`/teachers/${id}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Subjects
  getSubjects: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/subjects${queryString}`);
  },
  getSubjectById: (id: string) => apiRequest(`/subjects/${id}`),
  createSubject: (data: any) => apiRequest('/subjects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSubject: (id: string, data: any) => apiRequest(`/subjects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteSubject: (id: string) => apiRequest(`/subjects/${id}`, { method: 'DELETE' }),
  assignSubjectTeacher: (id: string, teacherId: string) => apiRequest(`/subjects/${id}/assign-teacher`, {
    method: 'PUT',
    body: JSON.stringify({ teacherId }),
  }),
  assignSubjectToClass: (id: string, classId: string) => apiRequest(`/subjects/${id}/assign-class`, {
    method: 'PUT',
    body: JSON.stringify({ classId }),
  }),
  removeSubjectFromClass: (id: string) => apiRequest(`/subjects/${id}/remove-class`, {
    method: 'PUT',
  }),
  getSubjectsByCategory: (category: string) => apiRequest(`/subjects/category/${category}`),
  getUnassignedSubjects: () => apiRequest('/subjects/unassigned'),
  getSubjectStats: () => apiRequest('/subjects/stats'),

  // Attendance methods
  getAttendance: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/attendance${queryString}`);
  },
  getClassDateAttendance: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/attendance/class-date${queryString}`);
  },
  getStudentAttendanceStats: (studentId: string, params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/attendance/student/${studentId}${queryString}`);
  },
  getClassAttendanceStats: (classId: string, params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/attendance/class/${classId}${queryString}`);
  },
  getAttendanceSummary: (params?: { classId?: string; date?: string }) => {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest(`/attendance/summary${queryString}`);
  },

  // Teacher Attendance Management methods
  getTeacherAttendance: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/teacher-attendance${queryString}`);
  },
  markTeacherAttendance: (data: any) => apiRequest('/teacher-attendance', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  markBulkTeacherAttendance: (data: any) => apiRequest('/teacher-attendance/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getTeacherAttendanceStats: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/teacher-attendance/stats${queryString}`);
  },
  getTeacherAttendanceByRange: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/teacher-attendance/range${queryString}`);
  },
  updateTeacherAttendance: (id: string, data: any) => apiRequest(`/teacher-attendance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteTeacherAttendance: (id: string) => apiRequest(`/teacher-attendance/${id}`, { method: 'DELETE' }),
};

// Parents API
export const parentsAPI = {
  getAll: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/parents${queryString}`);
  },
};

// Schedule API
export const scheduleAPI = {
  getAll: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/schedules${queryString}`);
  },
  getWeekly: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/schedules/weekly${queryString}`);
  },
  getAvailable: () => apiRequest('/schedules/available'),
  getByTeacher: (teacherId: string, params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/schedules/teacher/${teacherId}${queryString}`);
  },
  getByClass: (classId: string, params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/schedules/class/${classId}${queryString}`);
  },
  getById: (id: string) => apiRequest(`/schedules/${id}`),
  create: (data: any) => apiRequest('/schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/schedules/${id}`, { method: 'DELETE' }),
};

// Transport API
export const transportAPI = {
  // Routes
  getRoutes: (schoolId: string) => apiRequest(`/transport-routes?schoolId=${schoolId}`),
  getRoute: (id: string) => apiRequest(`/transport-routes/${id}`),
  createRoute: (data: any) => apiRequest('/transport-routes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateRoute: (id: string, data: any) => apiRequest(`/transport-routes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteRoute: (id: string) => apiRequest(`/transport-routes/${id}`, { method: 'DELETE' }),
  getActiveRoutes: (schoolId: string) => apiRequest(`/transport-routes/active?schoolId=${schoolId}`),
  getRouteStats: (id: string) => apiRequest(`/transport-routes/${id}/stats`),

  // Vehicles
  getVehicles: (schoolId: string) => apiRequest(`/vehicles?schoolId=${schoolId}`),
  getVehicle: (id: string) => apiRequest(`/vehicles/${id}`),
  createVehicle: (data: any) => apiRequest('/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateVehicle: (id: string, data: any) => apiRequest(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteVehicle: (id: string) => apiRequest(`/vehicles/${id}`, { method: 'DELETE' }),
  getActiveVehicles: (schoolId: string) => apiRequest(`/vehicles/active?schoolId=${schoolId}`),
  getAvailableVehicles: (schoolId: string) => apiRequest(`/vehicles/available?schoolId=${schoolId}`),
  assignRoute: (id: string, routeId: string) => apiRequest(`/vehicles/${id}/assign-route`, {
    method: 'PUT',
    body: JSON.stringify({ routeId }),
  }),
  assignDriver: (id: string, driverId: string) => apiRequest(`/vehicles/${id}/assign-driver`, {
    method: 'PUT',
    body: JSON.stringify({ driverId }),
  }),

  // Drivers
  getDrivers: (schoolId: string) => apiRequest(`/drivers?schoolId=${schoolId}`),
  getDriver: (id: string) => apiRequest(`/drivers/${id}`),
  createDriver: (data: any) => apiRequest('/drivers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateDriver: (id: string, data: any) => apiRequest(`/drivers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteDriver: (id: string) => apiRequest(`/drivers/${id}`, { method: 'DELETE' }),
  getActiveDrivers: (schoolId: string) => apiRequest(`/drivers/active?schoolId=${schoolId}`),
  getAvailableDrivers: (schoolId: string) => apiRequest(`/drivers/available?schoolId=${schoolId}`),

  // Student Transport
  getStudentTransports: (schoolId: string) => apiRequest(`/student-transports?schoolId=${schoolId}`),
  getStudentTransport: (id: string) => apiRequest(`/student-transports/${id}`),
  createStudentTransport: (data: any) => apiRequest('/student-transports', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateStudentTransport: (id: string, data: any) => apiRequest(`/student-transports/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteStudentTransport: (id: string) => apiRequest(`/student-transports/${id}`, { method: 'DELETE' }),
  getStudentsByRoute: (routeId: string) => apiRequest(`/student-transports/route/${routeId}`),
  getActiveTransports: (schoolId: string) => apiRequest(`/student-transports/active?schoolId=${schoolId}`),
  getUnassignedStudents: (schoolId: string) => apiRequest(`/student-transports/unassigned?schoolId=${schoolId}`),
  bulkAssignStudents: (data: any) => apiRequest('/student-transports/bulk-assign', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  addAttendance: (id: string, data: any) => apiRequest(`/student-transports/${id}/attendance`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  // Transport Fee Management
  getStudentsForFeeManagement: (schoolId: string) => {
    const queryString = schoolId ? `?schoolId=${schoolId}` : '';
    return apiRequest(`/student-transports/for-fees${queryString}`);
  },
  updateTransportFee: (id: string, data: { monthlyFee: number }) => apiRequest(`/student-transports/${id}/fee`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  bulkUpdateTransportFees: (data: any) => apiRequest('/student-transports/bulk-update-fees', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  addTransportPayment: (id: string, data: any) => apiRequest(`/student-transports/${id}/payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  generateTransportInstallments: (data: any) => apiRequest('/student-transports/generate-installments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createTransportFeeCollection: (data: any) => apiRequest('/student-transports/fee-collections', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  addTransportFeeCollectionPayment: (id: string, data: any) => apiRequest(`/student-transports/fee-collections/${id}/payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getTransportFeeCollections: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/student-transports/fee-collections${queryString}`);
  },
};

// Student Dormitory API
export const dormitoryAPI = {
  getStudentsForFeeManagement: (schoolId: string) => {
    const queryString = schoolId ? `?schoolId=${schoolId}` : '';
    return apiRequest(`/student-dormitories/for-fees${queryString}`);
  },
  updateDormitoryFee: (id: string, data: { monthlyFee: number }) => apiRequest(`/student-dormitories/${id}/fee`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  bulkUpdateDormitoryFees: (data: any) => apiRequest('/student-dormitories/bulk-update-fees', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  addDormitoryPayment: (id: string, data: any) => apiRequest(`/student-dormitories/${id}/payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  generateDormitoryInstallments: (data: any) => apiRequest('/student-dormitories/generate-installments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createDormitoryFeeCollection: (data: any) => apiRequest('/student-dormitories/fee-collections', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  addDormitoryFeeCollectionPayment: (id: string, data: any) => apiRequest(`/student-dormitories/fee-collections/${id}/payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getDormitoryFeeCollections: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/student-dormitories/fee-collections${queryString}`);
  },
  deleteDormitoryFeeCollection: (id: string) => apiRequest(`/student-dormitories/fee-collections/${id}`, {
    method: 'DELETE',
  }),
  deleteDormitoryFeeCollectionsByDormitory: (studentDormitoryId: string, academicYear?: string) => {
    const queryString = academicYear ? `?academicYear=${academicYear}` : '';
    return apiRequest(`/student-dormitories/fee-collections/by-dormitory/${studentDormitoryId}${queryString}`, {
      method: 'DELETE',
    });
  },
};

// Exams API
export const examsAPI = {
  listPapers: () => apiRequest('/exams/papers'),
  getPaper: (id: string) => apiRequest(`/exams/papers/${id}`),
  generatePaper: (data: unknown) => apiRequest('/exams/papers/generate', { method: 'POST', body: JSON.stringify(data) }),
  updatePaper: (id: string, data: unknown) => apiRequest(`/exams/papers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approvePaper: (id: string) => apiRequest(`/exams/papers/${id}/approve`, { method: 'POST' }),
  // Exams CRUD
  getAll: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/exams${queryString}`);
  },
  getById: (id: string) => apiRequest(`/exams/${id}`),
  create: (data: any) => apiRequest('/exams', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/exams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/exams/${id}`, { method: 'DELETE' }),
  bulkCreate: (exams: any[]) => apiRequest('/exams/bulk', {
    method: 'POST',
    body: JSON.stringify({ exams }),
  }),

  // Statistics and Overview
  getStats: (schoolId: string) => apiRequest(`/exams/stats/overview?schoolId=${schoolId}`),
  getSchedule: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/exams/schedule${queryString}`);
  },
  getDateSheet: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/exams/date-sheet${queryString}`);
  },

  // Exam Marks
  getMarks: (examId: string) => apiRequest(`/exams/${examId}/marks`),
  addMarks: (examId: string, data: any) => apiRequest(`/exams/${examId}/marks`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getAllMarks: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/exams/marks${queryString}`);
  },
  updateMark: (markId: string, data: any) => apiRequest(`/exams/marks/${markId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteMark: (markId: string) => apiRequest(`/exams/marks/${markId}`, { method: 'DELETE' }),
};

// Meetings API
export const meetingsAPI = {
  // Get all meetings for school
  getAll: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/meetings${queryString}`);
  },
  // Get meetings by class
  getByClass: (classId: string, params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/meetings/class/${classId}${queryString}`);
  },
  // Get meetings by teacher
  getByTeacher: (teacherId: string, params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/meetings/teacher/${teacherId}${queryString}`);
  },
  // Get upcoming meetings
  getUpcoming: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/meetings/upcoming${queryString}`);
  },
  // Get past meetings
  getPast: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/meetings/past${queryString}`);
  },
  // Get meeting statistics
  getStats: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/meetings/stats${queryString}`);
  },
};

// Salary API
export const salaryAPI = {
  // Salary CRUD
  getAll: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/salaries${queryString}`);
  },
  getById: (id: string) => apiRequest(`/salaries/${id}`),
  create: (data: any) => apiRequest('/salaries', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/salaries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/salaries/${id}`, { method: 'DELETE' }),

  // Mark as paid
  markAsPaid: (id: string, paymentMethod?: string) => apiRequest(`/salaries/${id}/pay`, {
    method: 'PUT',
    body: JSON.stringify({ paymentMethod }),
  }),

  // Statistics
  getStats: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/salaries/stats/overview${queryString}`);
  },

  // Salary structures
  getStructures: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/salaries/structures${queryString}`);
  },
  getTeacherStructures: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/salaries/teacher-structures${queryString}`);
  },

  // Generate payroll
  generatePayroll: (data: any) => apiRequest('/salaries/generate-payroll', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Deduction settings
  getDeductionSettings: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/salaries/deduction-settings${queryString}`);
  },
  updateDeductionSettings: (data: any) => apiRequest('/salaries/deduction-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// School Products API
export const schoolProductsAPI = {
  getAll: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/school-products${queryString}`);
  },
  getById: (id: string) => apiRequest(`/school-products/${id}`),
  purchase: (id: string, quantity: number, paymentData?: any) => apiRequest(`/school-products/${id}/purchase`, {
    method: 'POST',
    body: JSON.stringify({ quantity, ...paymentData }),
  }),
  getPurchaseHistory: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/school-products/purchases/history${queryString}`);
  },
};

// Payments API
export const paymentsAPI = {
  verify: (paymentData: any) => apiRequest('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  }),
};

// Assignments API
export const assignmentsAPI = {
  // Get all assignments
  getAll: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/assignments${queryString}`);
  },

  // Get single assignment by ID
  getById: (id: string) => apiRequest(`/assignments/${id}`),

  // Create new assignment
  create: (data: any) => apiRequest('/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update assignment
  update: (id: string, data: any) => apiRequest(`/assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Delete assignment
  delete: (id: string) => apiRequest(`/assignments/${id}`, { method: 'DELETE' }),

  // Get teacher's classes with subjects
  getTeacherClasses: () => apiRequest('/assignments/teacher/classes'),

  // Student submissions
  getMySubmissions: () => apiRequest('/assignments/my-submissions'),

  // Submit assignment (student)
  submit: (id: string, formData: FormData) => apiRequest(`/assignments/${id}/submit`, {
    method: 'POST',
    headers: {}, // Don't set Content-Type for FormData
    body: formData,
  }),
};

// Library API
export const libraryAPI = {
  // Books CRUD
  getBooks: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/books${queryString}`);
  },
  getBook: (id: string) => apiRequest(`/books/${id}`),
  createBook: (data: any) => apiRequest('/books', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateBook: (id: string, data: any) => apiRequest(`/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteBook: (id: string) => apiRequest(`/books/${id}`, { method: 'DELETE' }),

  // Book Borrowings
  getBorrowRecords: (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/book-borrowings${queryString}`);
  },
  getBorrowRecord: (id: string) => apiRequest(`/book-borrowings/${id}`),
  borrowBook: (data: any) => apiRequest('/book-borrowings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  returnBook: (id: string, data: any) => apiRequest(`/book-borrowings/${id}/return`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateBorrowRecord: (id: string, data: any) => apiRequest(`/book-borrowings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteBorrowRecord: (id: string) => apiRequest(`/book-borrowings/${id}`, { method: 'DELETE' }),
};

// Export all APIs
export const api = {
  settings: settingsAPI,
  classes: classesAPI,
  subjects: subjectsAPI,
  syllabus: syllabusAPI,
  students: studentsAPI,
  houses: housesAPI,
  employees: employeesAPI,
  fees: feesAPI,
  auth: authAPI,
  classroom: classroomAPI,
  schedule: scheduleAPI,
  transport: transportAPI,
  dormitory: dormitoryAPI,
  exams: examsAPI,
  salary: salaryAPI,
  parents: parentsAPI,
  schoolProducts: schoolProductsAPI,
  payments: paymentsAPI,
  assignments: assignmentsAPI,
  library: libraryAPI,
  inventory: inventoryAPI,
};

// Export apiRequest for custom API calls
export { apiRequest };

export default api;
