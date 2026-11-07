const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://spark-school-management-portal.onrender.com/api';

interface ImportantDate {
  _id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  type: 'holiday' | 'event' | 'meeting' | 'deadline' | 'other';
  priority: 'normal' | 'low' | 'medium' | 'high' | 'critical';
  classes: Array<{
    _id: string;
    name: string;
    section?: string;
  }>;
  applyToAllClasses: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  formattedDate: string;
  isToday: boolean;
  isUpcoming: boolean;
}

interface CreateImportantDateData {
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  type: 'holiday' | 'event' | 'meeting' | 'deadline' | 'other';
  priority?: 'normal' | 'low' | 'medium' | 'high' | 'critical';
  classes?: string[];
  applyToAllClasses?: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  academicYear?: string;
}

type UpdateImportantDateData = Partial<CreateImportantDateData>;

interface GetImportantDatesParams {
  startDate?: string;
  endDate?: string;
  type?: string;
  priority?: string;
  classId?: string;
  page?: number;
  limit?: number;
}

interface GetCalendarImportantDatesParams {
  year: number;
  month: number;
  classId?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

class ImportantDatesAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('school_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.error || `HTTP error! status: ${response.status}`);
        if (data.details) {
          (error as any).details = data.details;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Create a new important date
  async createImportantDate(data: CreateImportantDateData): Promise<ApiResponse<ImportantDate>> {
    return this.request<ImportantDate>('/important-dates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get all important dates
  async getImportantDates(params: GetImportantDatesParams = {}): Promise<ApiResponse<ImportantDate[]>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    return this.request<ImportantDate[]>(`/important-dates${queryString ? `?${queryString}` : ''}`);
  }

  // Get important date by ID
  async getImportantDateById(id: string): Promise<ApiResponse<ImportantDate>> {
    return this.request<ImportantDate>(`/important-dates/${id}`);
  }

  // Update important date
  async updateImportantDate(id: string, data: UpdateImportantDateData): Promise<ApiResponse<ImportantDate>> {
    return this.request<ImportantDate>(`/important-dates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete important date
  async deleteImportantDate(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/important-dates/${id}`, {
      method: 'DELETE',
    });
  }

  // Get important dates for calendar view (monthly)
  async getCalendarImportantDates(params: GetCalendarImportantDatesParams): Promise<ApiResponse<ImportantDate[]>> {
    const queryParams = new URLSearchParams();
    queryParams.append('year', params.year.toString());
    queryParams.append('month', params.month.toString());
    
    if (params.classId) {
      queryParams.append('classId', params.classId);
    }

    return this.request<ImportantDate[]>(`/important-dates/calendar?${queryParams.toString()}`);
  }

  // Get important dates for a specific date range
  async getImportantDatesByDateRange(startDate: string, endDate: string, classId?: string): Promise<ApiResponse<ImportantDate[]>> {
    const params: GetImportantDatesParams = {
      startDate,
      endDate,
      classId,
    };

    return this.getImportantDates(params);
  }

  // Get upcoming important dates (next 30 days)
  async getUpcomingImportantDates(classId?: string): Promise<ApiResponse<ImportantDate[]>> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);

    return this.getImportantDatesByDateRange(
      today.toISOString().split('T')[0],
      futureDate.toISOString().split('T')[0],
      classId
    );
  }

  // Get important dates for today
  async getTodayImportantDates(classId?: string): Promise<ApiResponse<ImportantDate[]>> {
    const today = new Date().toISOString().split('T')[0];
    
    return this.getImportantDatesByDateRange(today, today, classId);
  }
}

export default new ImportantDatesAPI();
export type { ImportantDate, CreateImportantDateData, UpdateImportantDateData, GetImportantDatesParams };
