import { apiRequest } from './api';

export interface HomeworkSubmission {
    id: string;
    homeworkId: string;
    studentId: string;
    submissionDate: string;
    content: string;
    attachments: string[];
}

export interface Homework {
    id: string;
    title: string;
    subject: string;
    class: string;
    dueDate: string;
    description: string;
    attachments: string[];
    submissions?: HomeworkSubmission[];
}

export const homeworkAPI = {
    getAll: () => apiRequest('/homework'),
    getById: (id: string) => apiRequest(`/homework/${id}`),
    create: (homework: Omit<Homework, 'id'>) => apiRequest('/homework', { method: 'POST', body: JSON.stringify(homework) }),
    update: (id: string, homework: Partial<Homework>) => apiRequest(`/homework/${id}`, { method: 'PUT', body: JSON.stringify(homework) }),
    delete: (id: string) => apiRequest(`/homework/${id}`, { method: 'DELETE' }),
    submitHomework: (submission: Omit<HomeworkSubmission, 'id'>) => apiRequest('/homework-submissions', { method: 'POST', body: JSON.stringify(submission) }),
    getSubmissions: (homeworkId: string) => apiRequest(`/homework/${homeworkId}/submissions`),
};