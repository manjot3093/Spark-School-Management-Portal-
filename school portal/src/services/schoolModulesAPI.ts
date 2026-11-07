import { apiRequest } from './api';

// API Service for Homework Management
const HOMEWORK_API = {
    getAll: async () => {
        return await apiRequest('/homework');
    },

    getById: async (id: string) => {
        return await apiRequest(`/homework/${id}`);
    },

    create: async (homework: Omit<Homework, 'id'>) => {
        return await apiRequest('/homework', {
            method: 'POST',
            body: JSON.stringify(homework)
        });
    },

    update: async (id: string, homework: Partial<Homework>) => {
        return await apiRequest(`/homework/${id}`, {
            method: 'PUT',
            body: JSON.stringify(homework)
        });
    },

    delete: async (id: string) => {
        return await apiRequest(`/homework/${id}`, {
            method: 'DELETE'
        });
    },

    submitHomework: async (submission: Omit<HomeworkSubmission, 'id'>) => {
        return await apiRequest('/homework-submissions', {
            method: 'POST',
            body: JSON.stringify(submission)
        });
    },

    getSubmissions: async (homeworkId: string) => {
        return await apiRequest(`/homework/${homeworkId}/submissions`);
    }
};

// API Service for Calendar Management
const CALENDAR_API = {
    getEvents: async () => {
        return await apiRequest('/events');
    },

    createEvent: async (event: CalendarEvent) => {
        return await apiRequest('/events', {
            method: 'POST',
            body: JSON.stringify(event)
        });
    },

    updateEvent: async (id: string, event: Partial<CalendarEvent>) => {
        return await apiRequest(`/events/${id}`, {
            method: 'PUT',
            body: JSON.stringify(event)
        });
    },

    deleteEvent: async (id: string) => {
        return await apiRequest(`/events/${id}`, {
            method: 'DELETE'
        });
    }
};

// API Service for Announcements/Notice Board
const ANNOUNCEMENTS_API = {
    getAll: async () => {
        // apiRequest already returns parsed JSON
        return await apiRequest('/announcements');
    },

    create: async (announcement: Announcement) => {
        return await apiRequest('/announcements', {
            method: 'POST',
            body: JSON.stringify(announcement)
        });
    },

    update: async (id: string, announcement: Partial<Announcement>) => {
        return await apiRequest(`/announcements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(announcement)
        });
    },

    delete: async (id: string) => {
        return await apiRequest(`/announcements/${id}`, {
            method: 'DELETE'
        });
    }
};

// API Service for Admissions Management
const ADMISSIONS_API = {
    getApplications: async () => {
        return await apiRequest('/admissions');
    },

    submitApplication: async (application: AdmissionApplication) => {
        return await apiRequest('/admissions', {
            method: 'POST',
            body: JSON.stringify(application)
        });
    },

    updateStatus: async (id: string, status: string) => {
        return await apiRequest(`/admissions/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    },

    getApplicationById: async (id: string) => {
        return await apiRequest(`/admissions/${id}`);
    }
};

// Export all API services
export { HOMEWORK_API, CALENDAR_API, ANNOUNCEMENTS_API, ADMISSIONS_API };

// Types
export interface HomeworkSubmission {
    id?: string;
    homeworkId: string;
    studentId: string;
    submissionDate: string;
    content: string;
    attachments: string[];
}

export interface Homework {
    id?: string;
    title: string;
    subject: string;
    class: string;
    dueDate: string;
    description: string;
    attachments: string[];
    submissions?: HomeworkSubmission[];
}

export interface CalendarEvent {
    id?: string;
    title: string;
    start: string;
    end: string;
    description: string;
    category: string;
}

export interface Announcement {
    id?: string;
    title: string;
    content: string;
    category: string;
    date: string;
    priority: 'high' | 'medium' | 'low';
}

export interface AdmissionApplication {
    id?: string;
    studentName: string;
    dateOfBirth: string;
    gender: string;
    class: string;
    parentName: string;
    contact: string;
    email: string;
    address: string;
    previousSchool: string;
    status: 'pending' | 'approved' | 'rejected';
}