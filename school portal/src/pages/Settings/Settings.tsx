import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { settingsAPI, getAssetUrl, API_BASE_URL } from '../../services/api';
import { Upload, Save, Building2, Mail, Phone, MapPin, Globe, User, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { state } = useAuth();
  const schoolId = state?.user?.schoolId || localStorage.getItem('schoolId');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    principal: {
      name: '',
      email: '',
      phone: ''
    }
  });

  useEffect(() => {
    fetchSchoolInfo();
  }, [schoolId]);

  const fetchSchoolInfo = async () => {
    if (!schoolId) {
      toast.error('School ID not found');
      return;
    }

    setLoading(true);
    try {
      const response = await settingsAPI.getSchoolInfo();
      const schoolData = response?.data || response;
      
      console.log('School settings loaded:', schoolData);
      
      if (schoolData) {
        setFormData({
          name: schoolData.name || '',
          address: schoolData.address || '',
          phone: schoolData.phone || '',
          email: schoolData.email || '',
          website: schoolData.website || '',
          logo: schoolData.logo || '',
          principal: {
            name: schoolData.principal?.name || '',
            email: schoolData.principal?.email || '',
            phone: schoolData.principal?.phone || ''
          }
        });
        
        // Set logo preview if logo exists
        if (schoolData.logo) {
          const logoUrl = schoolData.logo.startsWith('http') 
            ? schoolData.logo 
            : getAssetUrl(schoolData.logo);
          setLogoPreview(logoUrl);
        }
      }
    } catch (error: any) {
      console.error('Error fetching school info:', error);
      toast.error(error.message || 'Failed to load school information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('principal.')) {
      const principalField = name.split('.')[1];
      setFormData({
        ...formData,
        principal: {
          ...formData.principal,
          [principalField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload logo
    try {
      setSaving(true);
      const formDataToSend = new FormData();
      formDataToSend.append('logo', file);
      if (schoolId) {
        formDataToSend.append('schoolId', schoolId);
      }

      const token = localStorage.getItem('school_token');
      const response = await fetch(`${API_BASE_URL}/settings/school-info/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload logo');
      }

      const result = await response.json();
      const logoUrl = result.data?.logo || result.logo || '';
      setFormData({
        ...formData,
        logo: logoUrl
      });
      
      // Update preview with the uploaded logo URL
      if (logoUrl) {
        const fullLogoUrl = logoUrl.startsWith('http') 
          ? logoUrl 
          : getAssetUrl(logoUrl);
        setLogoPreview(fullLogoUrl);
      }
      
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim() || !formData.phone.trim() || !formData.email.trim()) {
      toast.error('Complete the school name, address, phone and email');
      return;
    }
    if (!/^[+()\d\s-]{7,20}$/.test(formData.phone.trim())) {
      toast.error('Enter a valid phone number');
      return;
    }
    
    if (!schoolId) {
      toast.error('School ID not found');
      return;
    }

    setSaving(true);
    try {
      await settingsAPI.updateSchoolInfo({
        ...formData,
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        schoolId
      });
      toast.success('School settings updated successfully');
    } catch (error: any) {
      console.error('Error updating school info:', error);
      toast.error(error.message || 'Failed to update school settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <div className="relative overflow-hidden rounded-[28px] bg-[#20396c] px-6 py-9 text-white sm:px-10">
        <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-white/10" aria-hidden="true" />
        <div className="relative">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-[#ffb17c]">School identity</p>
          <h1 className="font-['Manrope'] text-3xl font-extrabold tracking-tight sm:text-4xl">School settings</h1>
          <p className="mt-2 max-w-xl text-sm text-blue-100">Keep your contact details and school profile accurate for your community.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-[#e2e8f2] bg-white p-5 shadow-md sm:p-8">
        {/* School Logo */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold text-[#20396c] mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            School Logo
          </h2>
          <div className="flex items-center gap-6">
            {logoPreview && (
              <div className="relative">
                <img 
                  src={logoPreview} 
                  alt="School Logo" 
                  className="w-32 h-32 object-contain border-2 border-gray-200 rounded-lg"
                />
              </div>
            )}
            <div>
              <label className="block">
                <span className="sr-only">Choose logo file</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={saving}
                />
              </label>
              <p className="mt-2 text-xs text-gray-500">
                Recommended: Square image, max 5MB. Formats: JPG, PNG, GIF
              </p>
            </div>
          </div>
        </div>

        {/* School Basic Information */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold text-[#20396c] mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://www.example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Principal Information */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-bold text-[#20396c] mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Principal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Principal Name
              </label>
              <input
                type="text"
                name="principal.name"
                value={formData.principal.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Principal Email
              </label>
              <input
                type="email"
                name="principal.email"
                value={formData.principal.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Principal Phone
              </label>
              <input
                type="tel"
                name="principal.phone"
                value={formData.principal.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={fetchSchoolInfo}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
