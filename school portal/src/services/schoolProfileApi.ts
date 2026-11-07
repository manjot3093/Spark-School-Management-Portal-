// School Profile Setup API Service
// This service handles all API calls related to school profile configuration

export interface SchoolProfileData {
  // Step 1: School Name
  schoolName: string;
  schoolUrl: string;
  aboutSchool: string;
  schoolAddress: string;
  state: string;
  city: string;
  pincode: string;
  contactNumber: string;
  alternateNumber: string;
  contactEmail: string;
  schoolWebsite: string;
  schoolLogo: File | null;
  
  // Step 2: Principal Message
  principalName: string;
  principalMessage: string;
  principalImage: File | null;
  
  // Step 3: About School
  detailedAbout: string;
  vision: string;
  mission: string;
  history: string;
  
  // Step 4: Features & Facilities
  features: string[];
  facilities: string[];
  
  // Step 5: Results & Toppers
  academicResults: string;
  toppers: Array<{
    name: string;
    class: string;
    percentage: string;
    year: string;
  }>;
  
  // Step 6: Social Media
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  
  // Step 7: Gallery
  galleryImages: File[];
  
  // Step 8: SEO
  metaTitle: string;
  metaDescription: string;
  keywords: string;
}

import { API_BASE_URL } from './api';

// Generic API request function
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// School Profile Setup API Functions
export const schoolProfileApi = {
  // Get existing school profile data
  getSchoolProfile: async (schoolId: string) => {
    return apiRequest(`/school-profile/${schoolId}`);
  },

  // Save step data
  saveStepData: async (schoolId: string, step: number, data: Partial<SchoolProfileData>) => {
    return apiRequest(`/school-profile/${schoolId}/step/${step}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Upload school logo
  uploadSchoolLogo: async (schoolId: string, logoFile: File) => {
    const formData = new FormData();
    formData.append('logo', logoFile);
    
    return apiRequest(`/school-profile/${schoolId}/logo`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  },

  // Upload principal image
  uploadPrincipalImage: async (schoolId: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('principalImage', imageFile);
    
    return apiRequest(`/school-profile/${schoolId}/principal-image`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  },

  // Upload gallery images
  uploadGalleryImages: async (schoolId: string, images: File[]) => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append(`galleryImages`, image);
    });
    
    return apiRequest(`/school-profile/${schoolId}/gallery`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  },

  // Complete school profile setup
  completeSetup: async (schoolId: string, profileData: SchoolProfileData) => {
    return apiRequest(`/school-profile/${schoolId}/complete`, {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },

  // Validate school URL
  validateSchoolUrl: async (schoolUrl: string) => {
    return apiRequest(`/school-profile/validate-url`, {
      method: 'POST',
      body: JSON.stringify({ schoolUrl }),
    });
  },

  // Get available states
  getStates: async () => {
    return apiRequest('/school-profile/states');
  },

  // Get cities by state
  getCitiesByState: async (state: string) => {
    return apiRequest(`/school-profile/cities/${state}`);
  },

  // Get school profile preview
  getProfilePreview: async (schoolId: string) => {
    return apiRequest(`/school-profile/${schoolId}/preview`);
  },

  // Publish school profile
  publishProfile: async (schoolId: string) => {
    return apiRequest(`/school-profile/${schoolId}/publish`, {
      method: 'POST',
    });
  },

  // Get setup progress
  getSetupProgress: async (schoolId: string) => {
    return apiRequest(`/school-profile/${schoolId}/progress`);
  },
};

// TODO: Backend API Endpoints to implement:
/*
GET /api/school-profile/:schoolId - Get school profile data
PUT /api/school-profile/:schoolId/step/:stepNumber - Save step data
POST /api/school-profile/:schoolId/logo - Upload school logo
POST /api/school-profile/:schoolId/principal-image - Upload principal image
POST /api/school-profile/:schoolId/gallery - Upload gallery images
POST /api/school-profile/:schoolId/complete - Complete setup
POST /api/school-profile/validate-url - Validate school URL
GET /api/school-profile/states - Get available states
GET /api/school-profile/cities/:state - Get cities by state
GET /api/school-profile/:schoolId/preview - Get profile preview
POST /api/school-profile/:schoolId/publish - Publish profile
GET /api/school-profile/:schoolId/progress - Get setup progress
*/
