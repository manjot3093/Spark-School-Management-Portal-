import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  MapPin, 
  Users, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Search
} from 'lucide-react';
import { classroomAPI } from '../../services/api';
import importantDatesAPI, { ImportantDate, CreateImportantDateData } from '../../services/importantDatesAPI';
import socketService from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const ImportantDates: React.FC = () => {
  const { state: authState } = useAuth();
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDate, setEditingDate] = useState<ImportantDate | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // Form state
  const [formData, setFormData] = useState<CreateImportantDateData>({
    title: '',
    description: '',
    date: '',
    endDate: '',
    type: 'event',
    priority: 'normal',
    classes: [],
    applyToAllClasses: true,
    startTime: '',
    endTime: '',
    location: ''
  });

  const [isMultiDay, setIsMultiDay] = useState(false);

  const eventTypes = [
    { value: 'holiday', label: 'Holiday', color: 'bg-green-100 text-green-800' },
    { value: 'event', label: 'Event', color: 'bg-blue-100 text-blue-800' },
    { value: 'meeting', label: 'Meeting', color: 'bg-purple-100 text-purple-800' },
    { value: 'deadline', label: 'Deadline', color: 'bg-orange-100 text-orange-800' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];

  const priorities = [
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchImportantDates();
    fetchClasses();
  }, [selectedMonth, selectedYear, filterType, filterPriority, filterClass]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      socketService.connect(authState.token);

      const handleImportantDateUpdate = (data: any) => {
        console.log('📅 Received important date update:', data);
        
        if (data.type === 'important_date_created' || data.type === 'important_date_updated') {
          toast.success('Important date updated');
          fetchImportantDates();
        } else if (data.type === 'important_date_deleted') {
          toast.success('Important date deleted');
          fetchImportantDates();
        }
      };

      socketService.on('important_date_created', handleImportantDateUpdate);
      socketService.on('important_date_updated', handleImportantDateUpdate);
      socketService.on('important_date_deleted', handleImportantDateUpdate);

      return () => {
        socketService.off('important_date_created', handleImportantDateUpdate);
        socketService.off('important_date_updated', handleImportantDateUpdate);
        socketService.off('important_date_deleted', handleImportantDateUpdate);
      };
    }
  }, [authState.isAuthenticated, authState.token]);

  const fetchImportantDates = async () => {
    try {
      setLoading(true);
      const params: any = {
        year: selectedYear,
        month: selectedMonth
      };

      if (filterType) params.type = filterType;
      if (filterPriority) params.priority = filterPriority;
      if (filterClass) params.classId = filterClass;

      const response = await importantDatesAPI.getCalendarImportantDates(params);
      setImportantDates(response.data);
    } catch (error) {
      console.error('Error fetching important dates:', error);
      toast.error('Failed to load important dates');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classroomAPI.getClasses();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📅 Submitting important date (raw):', formData);
    
    // Client-side validation
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      toast.error(`Validation failed: ${validationErrors.join(', ')}`);
      return;
    }
    
    // Sanitize data before sending
    const dataToSend = {
      ...formData,
      classes: formData.applyToAllClasses ? [] : (formData.classes || [])
    };
    
    console.log('📅 Submitting important date (sanitized):', dataToSend);
    console.log('📅 applyToAllClasses:', dataToSend.applyToAllClasses);
    console.log('📅 classes array:', dataToSend.classes);
    
    try {
      if (editingDate) {
        await importantDatesAPI.updateImportantDate(editingDate._id, dataToSend);
        toast.success('Important date updated successfully');
      } else {
        await importantDatesAPI.createImportantDate(dataToSend);
        toast.success('Important date created successfully');
      }
      
      setShowModal(false);
      setEditingDate(null);
      resetForm();
      fetchImportantDates();
    } catch (error) {
      console.error('Error saving important date:', error);
      
      // Check if it's a validation error and show specific details
      if (error.message === 'Validation failed' && error.details) {
        const validationErrors = error.details.map((detail: any) => detail.msg).join(', ');
        toast.error(`Validation failed: ${validationErrors}`);
      } else {
        toast.error('Failed to save important date');
      }
    }
  };

  const handleEdit = (date: ImportantDate) => {
    setEditingDate(date);
    const hasEndDate = !!date.endDate;
    setIsMultiDay(hasEndDate);
    setFormData({
      title: date.title,
      description: date.description || '',
      date: date.formattedDate,
      endDate: date.endDate || '',
      type: date.type,
      priority: date.priority,
      classes: date.classes.map(cls => cls._id),
      applyToAllClasses: date.applyToAllClasses,
      startTime: date.startTime || '',
      endTime: date.endTime || '',
      location: date.location || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this important date?')) {
      try {
        await importantDatesAPI.deleteImportantDate(id);
        toast.success('Important date deleted successfully');
        fetchImportantDates();
      } catch (error) {
        console.error('Error deleting important date:', error);
        toast.error('Failed to delete important date');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      endDate: '',
      type: 'event',
      priority: 'normal',
      classes: [],
      applyToAllClasses: true,
      startTime: '',
      endTime: '',
      location: ''
    });
    setIsMultiDay(false);
  };

  // Validate form data before submission
  const validateFormData = (data: CreateImportantDateData) => {
    const errors: string[] = [];
    
    if (!data.title || data.title.trim() === '') {
      errors.push('Title is required');
    }
    
    if (!data.date) {
      errors.push('Date is required');
    }
    if (data.date && Number.isNaN(new Date(data.date).getTime())) {
      errors.push('Enter a valid date');
    }
    if (data.endDate && Number.isNaN(new Date(data.endDate).getTime())) {
      errors.push('Enter a valid end date');
    }
    if (data.endDate && data.date && new Date(data.endDate) < new Date(data.date)) {
      errors.push('End date must be on or after the start date');
    }
    
    if (!data.type) {
      errors.push('Event type is required');
    }
    
    // Validate that at least one class is selected if not applying to all classes
    if (!data.applyToAllClasses && (!data.classes || data.classes.length === 0)) {
      errors.push('Please select at least one class or check "Apply to all classes"');
    }
    
    if (data.startTime && data.endTime) {
      const startTime = new Date(`2000-01-01T${data.startTime}`);
      const endTime = new Date(`2000-01-01T${data.endTime}`);
      if (endTime <= startTime) {
        errors.push('End time must be after start time');
      }
    }
    
    return errors;
  };

  const filteredDates = importantDates.filter(date => {
    if (searchTerm && !date.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#20396c] px-6 py-9 text-white sm:px-10">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[34px] border-white/10" aria-hidden="true" />
        <div className="relative">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-[#ffb17c]">School calendar</p>
          <h1 className="font-['Manrope'] text-3xl font-extrabold tracking-tight sm:text-4xl">Important dates</h1>
          <p className="mt-2 max-w-xl text-sm text-blue-100">Events, holidays, exams and deadlines in one place.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#e2e8f2] bg-white p-4 shadow-sm lg:flex-row lg:items-center sm:p-5">
        <div className="flex flex-1 flex-wrap gap-3">
          {/* Month/Year Selector */}
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 1 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filters */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {eventTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>{priority.label}</option>
            ))}
          </select>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls._id} value={cls._id}>
                {cls.name} {cls.section && `- ${cls.section}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search dates..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Add New Button */}
          <button
            onClick={() => {
              setEditingDate(null);
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Date</span>
          </button>
        </div>
      </div>

      {/* Important Dates List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredDates.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDates
              .slice((page - 1) * pageSize, page * pageSize)
              .map((date) => {
            const eventType = eventTypes.find(t => t.value === date.type);
            const priority = priorities.find(p => p.value === date.priority);
            
            return (
              <div key={date._id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${eventType?.color}`}>
                      {eventType?.label}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${priority?.color}`}>
                      {priority?.label}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(date)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(date._id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{date.title}</h3>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(date.date)}
                      {date.endDate && ` - ${formatDate(date.endDate)}`}
                    </span>
                  </div>

                  {date.startTime && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(date.startTime)}
                        {date.endTime && ` - ${formatTime(date.endTime)}`}
                      </span>
                    </div>
                  )}

                  {date.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{date.location}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>
                      {date.applyToAllClasses 
                        ? 'All Classes' 
                        : `${date.classes.length} Class${date.classes.length !== 1 ? 'es' : ''}`
                      }
                    </span>
                  </div>
                </div>

                {date.description && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{date.description}</p>
                )}
              </div>
            );
          })}
        </div>
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={filteredDates.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[9, 18, 36]}
        />
      </>
    ) : (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Important Dates</h3>
          <p className="text-gray-600 mb-4">No important dates found for the selected criteria.</p>
          <button
            onClick={() => {
              setEditingDate(null);
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add First Date
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  {editingDate ? 'Edit Important Date' : 'Add Important Date'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter event title"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="checkbox"
                        id="multiDay"
                        checked={isMultiDay}
                        onChange={(e) => {
                          setIsMultiDay(e.target.checked);
                          if (!e.target.checked) {
                            setFormData({ ...formData, endDate: '' });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="multiDay" className="text-sm font-medium text-gray-700">
                        Multi-day event
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isMultiDay ? 'Start Date *' : 'Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {isMultiDay && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required={isMultiDay}
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        min={formData.date}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter event description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {eventTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {priorities.map(priority => (
                        <option key={priority.value} value={priority.value}>{priority.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter location (optional)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Select start time"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Select end time"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Classes {!formData.applyToAllClasses && <span className="text-red-500">*</span>}
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.applyToAllClasses}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          applyToAllClasses: e.target.checked,
                          classes: e.target.checked ? [] : formData.classes
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Apply to all classes</span>
                    </label>

                    {!formData.applyToAllClasses && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Select at least one class:</p>
                        {classes.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                            {classes.map(cls => (
                              <label key={cls._id} className="flex items-center text-sm">
                                <input
                                  type="checkbox"
                                  checked={formData.classes.includes(cls._id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({ 
                                        ...formData, 
                                        classes: [...formData.classes, cls._id] 
                                      });
                                    } else {
                                      setFormData({ 
                                        ...formData, 
                                        classes: formData.classes.filter(id => id !== cls._id) 
                                      });
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <span>{cls.name} {cls.section && `- ${cls.section}`}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded border border-gray-200">
                            No classes available. Please create classes first.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingDate ? 'Update Date' : 'Create Date'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportantDates;
