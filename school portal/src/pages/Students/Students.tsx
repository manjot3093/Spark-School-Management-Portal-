import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { api, getApiFullUrl } from '../../services/api';
import {
  Edit,
  Trash2,
  Users,
  UserPlus,
  BookOpen,
  Calendar,
  Phone,
  Mail,
  MapPin,
  X,
  FileText,
  Download,
  Home
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const Students: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState('manage');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showFullProfileModal, setShowFullProfileModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [fullProfileStudent, setFullProfileStudent] = useState<any>(null);
  const [loadingFullProfile, setLoadingFullProfile] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [studentListPage, setStudentListPage] = useState(1);
  const [studentListPageSize, setStudentListPageSize] = useState(10);
  const [profilePage, setProfilePage] = useState(1);
  const [profilePageSize, setProfilePageSize] = useState(12);

  // Search and multi-criteria filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [admissionNumberFilter, setAdmissionNumberFilter] = useState('');
  const [profileSearchTerm, setProfileSearchTerm] = useState('');

  // Daily attendance summary metrics
  const [attendanceSummary, setAttendanceSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentage: 100,
    hasMarkedToday: false
  });

  // Modal validation and submission state
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  const tabs = [
    { id: 'manage', label: 'Manage Students' },
    { id: 'profiles', label: 'Student Profiles' }
  ];

  const [newStudent, setNewStudent] = useState({
    name: '',
    class: '',
    rollNumber: '',
    admissionNumber: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    admissionDate: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive',
    // Parent/Guardian Information
    fatherName: '',
    fatherPhone: '',
    fatherEmail: '',
    fatherPassword: '',
    motherName: '',
    motherPhone: '',
    motherEmail: '',
    motherPassword: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianPassword: ''
  });
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);

  const [editStudent, setEditStudent] = useState({
    name: '',
    class: '',
    rollNumber: '',
    email: '',
    address: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    admissionDate: '',
    status: ''
  });

  // Fetch classes, houses and students on component mount
  useEffect(() => {
    fetchClasses();
    fetchHouses();
    fetchStudents();
  }, []);

  const fetchHouses = async () => {
    try {
      const response = await api.houses.getAll();
      const housesData = response?.data || response || [];
      setHouses(Array.isArray(housesData) ? housesData : []);
    } catch (error) {
      console.error('Error fetching houses:', error);
      // Don't show error toast for houses, just log it
    }
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await api.classroom.getClasses();
      console.log('Classes API response:', response);

      // Handle API response structure - backend returns {success, count, data}
      const classesData = response?.data || response || [];
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to fetch classes');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Fetch all students by setting a high limit
      const response = await api.classroom.getStudents({ limit: 1000 });
      console.log('Students API response:', response);

      // Handle API response structure - backend returns {success, count, data}
      const studentsData = response?.data || response || [];
      const list = Array.isArray(studentsData) ? studentsData : [];
      setStudents(list);
      fetchDailyAttendance(list);
      console.log(`📊 Fetched ${studentsData.length} students`);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch today's attendance summary via GET /api/attendance/summary
  const fetchDailyAttendance = async (studentList: any[] = students) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const response = await api.classroom.getAttendanceSummary({ date: todayStr });
      const summary = response?.data;

      if (summary) {
        const totalActive = summary.totalStudents || (studentList.filter((s: any) => s.status === 'active').length);
        setAttendanceSummary({
          total: totalActive,
          present: summary.present || 0,
          absent: summary.absent || 0,
          percentage: Math.round(summary.attendancePercentage || 0),
          hasMarkedToday: summary.markedStudents > 0
        });
        return;
      }
    } catch (err) {
      console.warn('Could not fetch daily attendance summary, using fallback:', err);
    }

    // Fallback calculation if summary API returns null or errors
    const totalActive = studentList.length > 0
      ? studentList.filter((s: any) => s.status === 'active').length
      : studentList.length;

    setAttendanceSummary({
      total: totalActive,
      present: totalActive,
      absent: 0,
      percentage: totalActive > 0 ? 100 : 0,
      hasMarkedToday: false
    });
  };

  // Toggle student active/inactive status via PATCH /api/students/:id/status
  const handleToggleStatus = async (studentId: string, currentStatus?: string) => {
    try {
      setTogglingStatusId(studentId);
      const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const res = await api.classroom.toggleStudentStatus(studentId, nextStatus);

      toast.success(`Student status updated to ${nextStatus}`);

      // Optimistically update students list with new status & update timestamp
      setStudents(prev => prev.map(s => {
        if ((s._id || s.id) === studentId) {
          return {
            ...s,
            status: nextStatus,
            statusUpdatedAt: res?.data?.statusUpdatedAt || new Date().toISOString()
          };
        }
        return s;
      }));

      // Update fullProfileStudent if it's currently selected
      if (fullProfileStudent && (fullProfileStudent._id || fullProfileStudent.id) === studentId) {
        setFullProfileStudent((prev: any) => ({
          ...prev,
          status: nextStatus,
          statusUpdatedAt: res?.data?.statusUpdatedAt || new Date().toISOString()
        }));
      }
    } catch (error: any) {
      console.error('Error toggling student status:', error);
      toast.error(error.message || 'Failed to update student status');
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    // Comprehensive form validation checks
    const errs: Record<string, string> = {};
    if (!newStudent.name?.trim()) errs.name = 'Student name is required';
    if (!newStudent.class) errs.class = 'Class selection is required';
    if (!newStudent.email?.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStudent.email)) {
      errs.email = 'Please provide a valid email format';
    } else if (/[A-Z]/.test(newStudent.email)) {
      errs.email = 'Email address must be in lowercase';
    }
    if (!newStudent.password || newStudent.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (!newStudent.phone?.trim()) {
      errs.phone = 'Phone number is required';
    }
    if (!newStudent.dateOfBirth) {
      errs.dateOfBirth = 'Date of birth is required';
    } else if (new Date(newStudent.dateOfBirth) > new Date()) {
      errs.dateOfBirth = 'Date of birth cannot be in the future';
    }
    if (!newStudent.gender) {
      errs.gender = 'Gender is required';
    }

    // Check parent information
    const hasFather = newStudent.fatherName && newStudent.fatherEmail && newStudent.fatherPassword;
    const hasMother = newStudent.motherName && newStudent.motherEmail && newStudent.motherPassword;
    const hasGuardian = newStudent.guardianName && newStudent.guardianEmail && newStudent.guardianPassword;

    if (!hasFather && !hasMother && !hasGuardian) {
      errs.parent = 'Please provide Name, Email, and Password for at least one parent or guardian';
    }

    if (Object.keys(errs).length > 0) {
      setModalErrors(errs);
      toast.error('Please fix the highlighted errors');
      return;
    }

    setModalErrors({});
    setIsSubmittingModal(true);

    try {
      // Upload PDF files first if any
      let pdfUrls: string[] = [];
      if (pdfFiles.length > 0) {
        try {
          const uploadResponse = await api.classroom.uploadPdfs(pdfFiles);
          if (uploadResponse.success && uploadResponse.data) {
            pdfUrls = uploadResponse.data;
          }
        } catch (uploadError: any) {
          console.error('PDF upload error:', uploadError);
          toast.error(`Failed to upload PDFs: ${uploadError.message || 'Unknown error'}`);
          return;
        }
      }

      // Map frontend fields to backend fields
      const studentData = {
        name: newStudent.name,
        email: newStudent.email,
        password: newStudent.password,
        rollNumber: newStudent.rollNumber,
        admissionNumber: newStudent.admissionNumber,
        dateOfBirth: newStudent.dateOfBirth,
        gender: newStudent.gender,
        phone: newStudent.phone, // Add phone field
        admissionDate: new Date(newStudent.admissionDate), // Convert to Date object
        classId: newStudent.class, // Store the class ID
        address: {
          street: newStudent.address || '',
          city: '',
          state: '',
          zipCode: ''
        },
        pdfs: pdfUrls,
        parentInfo: {
          fatherName: newStudent.fatherName || '',
          fatherPhone: newStudent.fatherPhone || '',
          fatherEmail: newStudent.fatherEmail || '',
          fatherPassword: newStudent.fatherPassword || '',
          motherName: newStudent.motherName || '',
          motherPhone: newStudent.motherPhone || '',
          motherEmail: newStudent.motherEmail || '',
          motherPassword: newStudent.motherPassword || '',
          guardianName: newStudent.guardianName || '',
          guardianPhone: newStudent.guardianPhone || '',
          guardianEmail: newStudent.guardianEmail || '',
          guardianPassword: newStudent.guardianPassword || ''
        }
      };

      console.log('📤 Sending student data:', studentData);
      const response = await api.classroom.createStudent(studentData);
      console.log('📥 Student creation response:', response);

      // Refresh students list
      await fetchStudents();

      // Also refresh classes list to update counts
      await fetchClasses();

      setNewStudent({
        name: '',
        class: '',
        rollNumber: '',
        admissionNumber: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        gender: '',
        admissionDate: new Date().toISOString().split('T')[0],
        status: 'active',
        // Reset parent/guardian information
        fatherName: '',
        fatherPhone: '',
        fatherEmail: '',
        fatherPassword: '',
        motherName: '',
        motherPhone: '',
        motherEmail: '',
        motherPassword: '',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
        guardianPassword: ''
      });
      setPdfFiles([]);

      setShowAddStudentModal(false);

      // Show success message with parent account info
      if (response.data?.parentAccounts?.length > 0) {
        toast.success(`Student enrolled successfully! ${response.data.parentAccounts.length} parent account(s) created.`, {
          duration: 5000,
        });
      } else {
        toast.success('Student enrolled successfully!');
      }
    } catch (error: any) {
      console.error('Error enrolling student:', error);
      const errorMessage = error.response?.data?.error || 'Failed to enroll student';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editStudent.name || !editStudent.class || !editStudent.rollNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedStudent || !selectedStudent._id) {
      toast.error('No student selected');
      return;
    }

    try {
      setLoading(true);

      // Prepare update data - map frontend fields to backend fields
      const updateData: any = {
        name: editStudent.name,
        rollNumber: editStudent.rollNumber,
        email: editStudent.email || selectedStudent.email,
        address: editStudent.address ? {
          street: editStudent.address,
          city: '',
          state: '',
          zipCode: ''
        } : undefined
      };

      // If class is being changed, update classId
      if (editStudent.class) {
        updateData.classId = editStudent.class;
      }

      // If status is being changed
      if (editStudent.status) {
        updateData.status = editStudent.status;
      }

      // If admission date is being changed
      if (editStudent.admissionDate) {
        updateData.admissionDate = new Date(editStudent.admissionDate);
      }

      // Call API to update student
      const response = await api.classroom.updateStudent(selectedStudent._id, updateData);

      if (response.success) {
        // Refresh students list
        await fetchStudents();

        // Update local state
        dispatch({ type: 'UPDATE_STUDENT', payload: response.data });

        setShowEditStudentModal(false);
        setSelectedStudent(null);
        setEditStudent({
          name: '',
          class: '',
          rollNumber: '',
          email: '',
          address: '',
          parentName: '',
          parentPhone: '',
          parentEmail: '',
          admissionDate: '',
          status: ''
        });
        toast.success('Student updated successfully!');
      } else {
        toast.error(response.error || 'Failed to update student');
      }
    } catch (error: any) {
      console.error('Error updating student:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update student';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);

      // Call API to delete student
      const response = await api.classroom.deleteStudent(studentId);

      if (response.success) {
        // Refresh students list
        await fetchStudents();

        // Update local state
        dispatch({ type: 'DELETE_STUDENT', payload: studentId });

        toast.success('Student deleted successfully!');
      } else {
        toast.error(response.error || 'Failed to delete student');
      }
    } catch (error: any) {
      console.error('Error deleting student:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete student';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFullProfile = async (student: any) => {
    try {
      setLoadingFullProfile(true);
      // Fetch full student details with parent info
      const response = await api.classroom.getStudentById(student._id);
      if (response.success) {
        setFullProfileStudent(response.data);
        setShowFullProfileModal(true);
      } else {
        toast.error('Failed to load student profile');
      }
    } catch (error: any) {
      console.error('Error fetching full profile:', error);
      toast.error(error.response?.data?.error || 'Failed to load student profile');
    } finally {
      setLoadingFullProfile(false);
    }
  };

  const handleUpdateFullProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullProfileStudent) return;

    try {
      setLoadingFullProfile(true);

      // If photo is being updated, use FormData, otherwise use JSON
      const hasNewPhoto = fullProfileStudent.photoFile;

      let updateData: any;

      if (hasNewPhoto) {
        // Use FormData for photo upload
        updateData = new FormData();
        updateData.append('avatar', fullProfileStudent.photoFile);
        updateData.append('name', fullProfileStudent.name);
        updateData.append('email', fullProfileStudent.email);
        updateData.append('rollNumber', fullProfileStudent.rollNumber || '');
        updateData.append('admissionNumber', fullProfileStudent.admissionNumber || '');
        updateData.append('status', fullProfileStudent.status || 'active');
      } else {
        // Use JSON for regular updates
        updateData = {
          name: fullProfileStudent.name,
          email: fullProfileStudent.email,
          rollNumber: fullProfileStudent.rollNumber,
          admissionNumber: fullProfileStudent.admissionNumber || '',
          status: fullProfileStudent.status || 'active',
        };
      }

      // Add optional fields only if they have valid values
      // Phone validation is strict - only send if it's a valid format
      // The backend uses isMobilePhone() which is strict, so we'll let the backend validate
      // If phone is empty or invalid, just don't send it (backend will keep existing value)
      // Helper to append or set field
      const setOrAppend = (key: string, value: any) => {
        if (hasNewPhoto && updateData instanceof FormData) {
          if (value !== null && value !== undefined && value !== '') {
            updateData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
          }
        } else {
          if (value !== null && value !== undefined && value !== '') {
            updateData[key] = value;
          }
        }
      };

      if (fullProfileStudent.phone && fullProfileStudent.phone.trim() !== '') {
        const phoneTrimmed = fullProfileStudent.phone.trim();
        // Basic validation - if it looks like a phone number, send it
        // Backend will do the final validation
        if (/^\+?[1-9][\d]{0,15}$/.test(phoneTrimmed.replace(/[\s()-]/g, ''))) {
          setOrAppend('phone', phoneTrimmed);
        }
      }

      if (fullProfileStudent.dateOfBirth) {
        // Ensure date is in ISO format
        let dateValue: string;
        if (fullProfileStudent.dateOfBirth instanceof Date) {
          dateValue = fullProfileStudent.dateOfBirth.toISOString();
        } else if (typeof fullProfileStudent.dateOfBirth === 'string') {
          // If it's a date string from input (YYYY-MM-DD), convert to ISO
          const date = new Date(fullProfileStudent.dateOfBirth);
          if (!isNaN(date.getTime())) {
            dateValue = date.toISOString();
          } else {
            dateValue = fullProfileStudent.dateOfBirth;
          }
        } else {
          dateValue = fullProfileStudent.dateOfBirth;
        }
        setOrAppend('dateOfBirth', dateValue);
      }

      if (fullProfileStudent.gender) {
        setOrAppend('gender', fullProfileStudent.gender);
      }

      // Handle classId - extract ID if it's an object
      if (fullProfileStudent.classId) {
        const classIdValue = typeof fullProfileStudent.classId === 'object' && fullProfileStudent.classId._id
          ? fullProfileStudent.classId._id
          : fullProfileStudent.classId;
        if (classIdValue) {
          setOrAppend('classId', classIdValue);
        }
      }

      // Handle admission date
      if (fullProfileStudent.admissionDate) {
        let admissionDateValue: string;
        if (fullProfileStudent.admissionDate instanceof Date) {
          admissionDateValue = fullProfileStudent.admissionDate.toISOString();
        } else if (typeof fullProfileStudent.admissionDate === 'string') {
          // If it's a date string from input (YYYY-MM-DD), convert to ISO
          const date = new Date(fullProfileStudent.admissionDate);
          if (!isNaN(date.getTime())) {
            admissionDateValue = date.toISOString();
          } else {
            admissionDateValue = fullProfileStudent.admissionDate;
          }
        } else {
          admissionDateValue = fullProfileStudent.admissionDate;
        }
        setOrAppend('admissionDate', admissionDateValue);
      }

      // Handle address
      if (fullProfileStudent.address) {
        const addressData = {
          street: fullProfileStudent.address.street || '',
          city: fullProfileStudent.address.city || '',
          state: fullProfileStudent.address.state || '',
          zipCode: fullProfileStudent.address.zipCode || '',
          country: fullProfileStudent.address.country || 'India'
        };
        setOrAppend('address', addressData);
      }

      // Handle house and dormitory
      if (fullProfileStudent.houseId) {
        const houseIdValue = typeof fullProfileStudent.houseId === 'object' && fullProfileStudent.houseId._id
          ? fullProfileStudent.houseId._id
          : fullProfileStudent.houseId;
        if (houseIdValue) {
          setOrAppend('houseId', houseIdValue);
        }
      }

      if (fullProfileStudent.isDormitory !== undefined) {
        setOrAppend('isDormitory', fullProfileStudent.isDormitory);
        if (fullProfileStudent.isDormitory && fullProfileStudent.roomNumber) {
          setOrAppend('roomNumber', fullProfileStudent.roomNumber);
        }
      }

      // Handle medical info
      if (fullProfileStudent.medicalInfo) {
        const medicalData: any = {};
        if (fullProfileStudent.medicalInfo.bloodGroup) {
          medicalData.bloodGroup = fullProfileStudent.medicalInfo.bloodGroup;
        }
        if (fullProfileStudent.medicalInfo.allergies) {
          medicalData.allergies = Array.isArray(fullProfileStudent.medicalInfo.allergies)
            ? fullProfileStudent.medicalInfo.allergies
            : [fullProfileStudent.medicalInfo.allergies];
        }
        if (fullProfileStudent.medicalInfo.conditions) {
          medicalData.conditions = Array.isArray(fullProfileStudent.medicalInfo.conditions)
            ? fullProfileStudent.medicalInfo.conditions
            : [fullProfileStudent.medicalInfo.conditions];
        }
        if (fullProfileStudent.medicalInfo.emergencyContact) {
          medicalData.emergencyContact = fullProfileStudent.medicalInfo.emergencyContact;
        }
        if (fullProfileStudent.medicalInfo.emergencyContactPhone) {
          medicalData.emergencyContactPhone = fullProfileStudent.medicalInfo.emergencyContactPhone;
        }
        if (Object.keys(medicalData).length > 0) {
          setOrAppend('medicalInfo', medicalData);
        }
      }

      // Handle parent info
      if (fullProfileStudent.parentInfo) {
        setOrAppend('parentInfo', fullProfileStudent.parentInfo);
      }

      // Use appropriate API method based on whether we're uploading a photo
      let response;
      if (hasNewPhoto) {
        // Use FormData for photo upload
        response = await api.students.update(fullProfileStudent._id, updateData);
      } else {
        // Use JSON for regular updates
        response = await api.classroom.updateStudent(fullProfileStudent._id, updateData);
      }
      if (response.success) {
        toast.success('Student profile updated successfully!');
        // Refresh the student profile data
        const updatedResponse = await api.classroom.getStudentById(fullProfileStudent._id);
        if (updatedResponse.success) {
          setFullProfileStudent(updatedResponse.data);
        }
        await fetchStudents(); // Refresh the list
        // Don't close modal - keep it open to show updated data
      } else {
        toast.error('Failed to update student profile');
      }
    } catch (error: any) {
      console.error('Error updating student profile:', error);
      const errorMessage = error.response?.data?.details
        ? error.response.data.details.map((d: any) => d.msg).join(', ')
        : error.response?.data?.error || 'Failed to update student profile';
      toast.error(errorMessage);
    } finally {
      setLoadingFullProfile(false);
    }
  };

  // --- Multi-Step Enrollment Wizard ---
  const ENROLLMENT_STEPS = [
    { label: 'Student Details' },
    { label: 'Parent Details' },
    { label: 'Medical Details' },
    { label: 'School Details' },
    { label: 'Document Uploads' },
  ];

  const initialEnrollmentState = {
    student: {
      name: '',
      dateOfBirth: '',
      gender: '',
      phone: '',
      email: '',
    },
    parent: {
      fatherName: '', fatherPhone: '', fatherEmail: '', fatherPassword: '',
      motherName: '', motherPhone: '', motherEmail: '', motherPassword: '',
      guardianName: '', guardianPhone: '', guardianEmail: '', guardianPassword: '',
    },
    medical: {
      bloodGroup: '', allergies: '', medicalNotes: '',
    },
    school: {
      class: '', section: '', rollNumber: '', admissionNumber: '', admissionDate: new Date().toISOString().split('T')[0],
    },
    documents: {
      photo: null, tc: null, aadhaar: null, additionalDoc: null, pdfs: [],
    },
  };

  function generateAdmissionNumber(existingStudents = []) {
    const numbers = existingStudents
      .map(s => parseInt(s.admissionNumber, 10))
      .filter(n => !isNaN(n));
    if (numbers.length > 0) {
      const max = Math.max(...numbers);
      return (max + 1).toString().padStart(6, '0');
    }
    const year = new Date().getFullYear();
    return `${year}${Math.floor(100 + Math.random() * 900)}`;
  }

  const [enrollmentStep, setEnrollmentStep] = useState(0);
  const [enrollmentData, setEnrollmentData] = useState(initialEnrollmentState);
  const [showEnrollmentWizard, setShowEnrollmentWizard] = useState(false);

  const handleEnrollmentChange = (stepKey, field, value) => {
    setEnrollmentData(prev => ({
      ...prev,
      [stepKey]: {
        ...prev[stepKey],
        [field]: value,
      },
    }));
  };

  const handleEnrollmentFileChange = (field, file) => {
    setEnrollmentData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file,
      },
    }));
  };

  const handleEnrollmentNext = () => {
    if (enrollmentStep < ENROLLMENT_STEPS.length - 1) setEnrollmentStep(s => s + 1);
  };
  const handleEnrollmentBack = () => {
    if (enrollmentStep > 0) setEnrollmentStep(s => s - 1);
  };
  const handleOpenEnrollmentWizard = () => {
    setShowEnrollmentWizard(true);
    setEnrollmentStep(0);
    setEnrollmentData(prev => ({
      ...initialEnrollmentState,
      school: {
        ...initialEnrollmentState.school,
        admissionNumber: generateAdmissionNumber(students),
      },
    }));
  };
  const handleCloseEnrollmentWizard = () => setShowEnrollmentWizard(false);

  function renderEnrollmentStep() {
    const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";
    switch (enrollmentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input type="text" value={enrollmentData.student.name} onChange={e => handleEnrollmentChange('student', 'name', e.target.value)} className={inputClass} required autoFocus />
            </div>
            <div>
              <label className={labelClass}>Date of Birth <span className="text-red-500">*</span></label>
              <input type="date" value={enrollmentData.student.dateOfBirth} onChange={e => handleEnrollmentChange('student', 'dateOfBirth', e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Gender <span className="text-red-500">*</span></label>
              <select value={enrollmentData.student.gender} onChange={e => handleEnrollmentChange('student', 'gender', e.target.value)} className={inputClass} required>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
              <input type="tel" value={enrollmentData.student.phone} onChange={e => handleEnrollmentChange('student', 'phone', e.target.value)} className={inputClass} required />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Email <span className="text-red-500">*</span></label>
              <input type="email" value={enrollmentData.student.email} onChange={e => handleEnrollmentChange('student', 'email', e.target.value)} className={inputClass} required />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Father */}
            <div>
              <label className={labelClass}>Father Name</label>
              <input type="text" value={enrollmentData.parent.fatherName} onChange={e => handleEnrollmentChange('parent', 'fatherName', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Father Phone</label>
              <input type="tel" value={enrollmentData.parent.fatherPhone} onChange={e => handleEnrollmentChange('parent', 'fatherPhone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Father Email</label>
              <input type="email" value={enrollmentData.parent.fatherEmail} onChange={e => handleEnrollmentChange('parent', 'fatherEmail', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Father Password</label>
              <input type="password" value={enrollmentData.parent.fatherPassword} onChange={e => handleEnrollmentChange('parent', 'fatherPassword', e.target.value)} className={inputClass} />
            </div>
            {/* Mother */}
            <div>
              <label className={labelClass}>Mother Name</label>
              <input type="text" value={enrollmentData.parent.motherName} onChange={e => handleEnrollmentChange('parent', 'motherName', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mother Phone</label>
              <input type="tel" value={enrollmentData.parent.motherPhone} onChange={e => handleEnrollmentChange('parent', 'motherPhone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mother Email</label>
              <input type="email" value={enrollmentData.parent.motherEmail} onChange={e => handleEnrollmentChange('parent', 'motherEmail', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mother Password</label>
              <input type="password" value={enrollmentData.parent.motherPassword} onChange={e => handleEnrollmentChange('parent', 'motherPassword', e.target.value)} className={inputClass} />
            </div>
            {/* Guardian */}
            <div>
              <label className={labelClass}>Guardian Name</label>
              <input type="text" value={enrollmentData.parent.guardianName} onChange={e => handleEnrollmentChange('parent', 'guardianName', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Guardian Phone</label>
              <input type="tel" value={enrollmentData.parent.guardianPhone} onChange={e => handleEnrollmentChange('parent', 'guardianPhone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Guardian Email</label>
              <input type="email" value={enrollmentData.parent.guardianEmail} onChange={e => handleEnrollmentChange('parent', 'guardianEmail', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Guardian Password</label>
              <input type="password" value={enrollmentData.parent.guardianPassword} onChange={e => handleEnrollmentChange('parent', 'guardianPassword', e.target.value)} className={inputClass} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Blood Group</label>
              <input type="text" value={enrollmentData.medical.bloodGroup} onChange={e => handleEnrollmentChange('medical', 'bloodGroup', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Allergies</label>
              <input type="text" value={enrollmentData.medical.allergies} onChange={e => handleEnrollmentChange('medical', 'allergies', e.target.value)} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Medical Notes</label>
              <textarea value={enrollmentData.medical.medicalNotes} onChange={e => handleEnrollmentChange('medical', 'medicalNotes', e.target.value)} className={inputClass} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Class <span className="text-red-500">*</span></label>
              <select value={enrollmentData.school.class} onChange={e => handleEnrollmentChange('school', 'class', e.target.value)} className={inputClass} required>
                <option value="">Select Class</option>
                {Array.isArray(classes) ? classes.map(cls => (
                  <option key={cls._id} value={cls._id}>{cls.name} - {cls.section}</option>
                )) : null}
              </select>
            </div>
            <div>
              <label className={labelClass}>Section</label>
              <input type="text" value={enrollmentData.school.section} onChange={e => handleEnrollmentChange('school', 'section', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Roll Number <span className="text-red-500">*</span></label>
              <input type="text" value={enrollmentData.school.rollNumber} onChange={e => handleEnrollmentChange('school', 'rollNumber', e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Admission Number <span className="text-red-500">*</span></label>
              <input type="text" value={enrollmentData.school.admissionNumber} readOnly className={inputClass + ' bg-gray-200'} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Admission Date</label>
              <input type="date" value={enrollmentData.school.admissionDate} onChange={e => handleEnrollmentChange('school', 'admissionDate', e.target.value)} className={inputClass} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Student Photo</label>
              <input type="file" accept="image/*" onChange={e => handleEnrollmentFileChange('photo', e.target.files[0])} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>TC</label>
              <input type="file" onChange={e => handleEnrollmentFileChange('tc', e.target.files[0])} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Aadhaar Card</label>
              <input type="file" onChange={e => handleEnrollmentFileChange('aadhaar', e.target.files[0])} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Additional Document</label>
              <input type="file" onChange={e => handleEnrollmentFileChange('additionalDoc', e.target.files[0])} className={inputClass} />
            </div>
          </div>
        );
      default:
        return null;
    } 
  }

  // Filtered students with multi-factor search, class, section, and status filters
  const filteredStudents = Array.isArray(students) ? students.filter(student => {
    // 1. Text Search across Name, Email, Roll Number, and Admission Number
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = q === '' ||
      student.name?.toLowerCase().includes(q) ||
      student.email?.toLowerCase().includes(q) ||
      student.rollNumber?.toLowerCase().includes(q) ||
      student.admissionNumber?.toLowerCase().includes(q);

    // 2. Class filter (by class ID or class name)
    const studentClassId = student.classId?._id || (typeof student.classId === 'string' ? student.classId : '');
    const studentClassName = student.classId?.name || (typeof student.class === 'string' ? student.class : '');
    const matchesClass = classFilter === 'all' ||
      studentClassId === classFilter ||
      studentClassName.toLowerCase() === classFilter.toLowerCase() ||
      (student.classId && `${student.classId.name} - ${student.classId.section}` === classFilter);

    // 3. Section filter
    const studentSection = student.classId?.section || '';
    const matchesSection = sectionFilter === 'all' ||
      studentSection.toLowerCase() === sectionFilter.toLowerCase();

    // 4. Status filter
    const studentStatus = student.status || 'active';
    const matchesStatus = statusFilter === 'all' ||
      studentStatus.toLowerCase() === statusFilter.toLowerCase();

    // 5. Optional admission number exact/partial filter if specified
    const matchesAdmissionNumber = admissionNumberFilter === '' ||
      student.admissionNumber?.toLowerCase().includes(admissionNumberFilter.toLowerCase());

    return matchesSearch && matchesClass && matchesSection && matchesStatus && matchesAdmissionNumber;
  }) : [];

  // Filtered students for profiles section
  const filteredProfileStudents = Array.isArray(students) ? students.filter(student => {
    if (profileSearchTerm === '') return true;

    return student.name?.toLowerCase().includes(profileSearchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(profileSearchTerm.toLowerCase()) ||
      student.admissionNumber?.toLowerCase().includes(profileSearchTerm.toLowerCase());
  }) : [];

  // Export student data function
  const exportStudentData = (format: 'csv' | 'json') => {
    try {
      let content = '';
      let filename = '';

      if (format === 'csv') {
        // CSV format
        const headers = ['Name', 'Email', 'Admission Number', 'Class', 'Roll Number', 'Status', 'Phone', 'Admission Date'];
        const rows = filteredStudents.map(student => [
          student.name,
          student.email || 'N/A',
          student.admissionNumber || 'N/A',
          student.classId ? `${student.classId.name} - ${student.classId.section}` : 'Not assigned',
          student.rollNumber || 'N/A',
          student.status || 'active',
          student.phone || 'N/A',
          student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'N/A'
        ]);

        content = [headers, ...rows].map(row =>
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        filename = `students_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        // JSON format
        const exportData = filteredStudents.map(student => ({
          name: student.name,
          email: student.email,
          admissionNumber: student.admissionNumber,
          class: student.classId ? `${student.classId.name} - ${student.classId.section}` : 'Not assigned',
          rollNumber: student.rollNumber,
          status: student.status,
          phone: student.phone,
          admissionDate: student.admissionDate
        }));
        content = JSON.stringify(exportData, null, 2);
        filename = `students_${new Date().toISOString().split('T')[0]}.json`;
      }

      // Create blob and trigger download
      const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Students exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const renderStudentOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{Array.isArray(students) ? students.length : 0}</p>
              <p className="text-sm text-blue-600">Enrolled students</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Students</p>
              <p className="text-3xl font-bold text-gray-900">{Array.isArray(students) ? students.filter(s => s.status === 'active').length : 0}</p>
              <p className="text-sm text-green-600">Currently enrolled</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <UserPlus className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">New This Month</p>
              <p className="text-3xl font-bold text-gray-900">
                {Array.isArray(students) ? students.filter(s => {
                  const admissionDate = new Date(s.admissionDate);
                  const now = new Date();
                  return admissionDate.getMonth() === now.getMonth() &&
                    admissionDate.getFullYear() === now.getFullYear();
                }).length : 0}
              </p>
              <p className="text-sm text-purple-600">Recent enrollments</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Class Size</p>
              <p className="text-3xl font-bold text-gray-900">
                {Array.isArray(classes) && Array.isArray(students) && classes.length > 0 ? Math.round(students.length / classes.length) : 0}
              </p>
              <p className="text-sm text-yellow-600">Students per class</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <BookOpen className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Class Distribution */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Distribution by Class</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.isArray(classes) ? classes.map((cls) => {
            const classStudents = Array.isArray(students) ? students.filter(student => {
              console.log('🔍 Checking student:', student.name, 'classId:', student.classId, 'target class:', cls._id);
              return student.classId && student.classId._id === cls._id;
            }) : [];
            console.log(`📊 Class ${cls.name} has ${classStudents.length} students`);
            return (
              <div key={cls._id} className="text-center p-4 border rounded-lg hover:bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-2">{cls.name}</h4>
                <p className="text-2xl font-bold text-blue-600">{classStudents.length}</p>
                <p className="text-sm text-gray-500">students</p>
              </div>
            );
          }) : (
            <div className="col-span-full text-center py-4 text-gray-500">No classes available</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderManageStudents = () => (
    <div className="space-y-2.5">
      {/* Attendance Summary Card showing Total Students, Present, Absent, and Attendance % */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-xs p-2.5 sm:p-3 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="p-1.5 bg-white/20 backdrop-blur-sm rounded-md">
                <Calendar className="h-4 w-4 text-white" />
              </span>
              <h3 className="text-sm font-bold text-white">Daily Attendance Overview</h3>
            </div>
            <p className="text-[11px] text-blue-100 mt-0.5">
              {attendanceSummary.hasMarkedToday 
                ? "Live tracking based on today's recorded attendance" 
                : "Active student registration attendance overview"}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
            {/* Total Students */}
            <div className="bg-white/10 backdrop-blur-sm rounded-md px-2.5 py-1 border border-white/20 text-center min-w-[70px]">
              <p className="text-[10px] text-blue-100 uppercase tracking-wider font-medium">Total</p>
              <p className="text-base font-extrabold text-white leading-tight">{attendanceSummary.total}</p>
            </div>
            {/* Present */}
            <div className="bg-green-500/20 backdrop-blur-sm rounded-md px-2.5 py-1 border border-green-400/40 text-center min-w-[70px]">
              <p className="text-[10px] text-green-200 uppercase tracking-wider font-medium">Present</p>
              <p className="text-base font-extrabold text-green-300 leading-tight">{attendanceSummary.present}</p>
            </div>
            {/* Absent */}
            <div className="bg-red-500/20 backdrop-blur-sm rounded-md px-2.5 py-1 border border-red-400/40 text-center min-w-[70px]">
              <p className="text-[10px] text-red-200 uppercase tracking-wider font-medium">Absent</p>
              <p className="text-base font-extrabold text-red-300 leading-tight">{attendanceSummary.absent}</p>
            </div>
            {/* Attendance % */}
            <div className="bg-amber-500/20 backdrop-blur-sm rounded-md px-2.5 py-1 border border-amber-400/40 text-center min-w-[70px]">
              <p className="text-[10px] text-amber-200 uppercase tracking-wider font-medium">Attendance</p>
              <p className="text-base font-extrabold text-amber-300 leading-tight">{attendanceSummary.percentage}%</p>
            </div>
          </div>
        </div>

        {/* Visual attendance progress bar */}
        <div className="w-full bg-white/20 rounded-full h-1.5 mt-2 overflow-hidden">
          <div 
            className="bg-green-400 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, Math.max(0, attendanceSummary.percentage))}%` }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-xl shadow-xs p-2.5 sm:p-3 border-l-4 border-blue-500 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-500">Total Students</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{Array.isArray(students) ? students.length : 0}</p>
              <p className="text-[10px] text-blue-600">Enrolled</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-2.5 sm:p-3 border-l-4 border-green-500 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-500">Active Students</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{Array.isArray(students) ? students.filter(s => s.status === 'active').length : 0}</p>
              <p className="text-[10px] text-green-600">Enrolled</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <UserPlus className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-2.5 sm:p-3 border-l-4 border-purple-500 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-500">New This Month</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">
                {Array.isArray(students) ? students.filter(s => {
                  const admissionDate = new Date(s.admissionDate);
                  const now = new Date();
                  return admissionDate.getMonth() === now.getMonth() &&
                    admissionDate.getFullYear() === now.getFullYear();
                }).length : 0}
              </p>
              <p className="text-[10px] text-purple-600">Recent</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs p-2.5 sm:p-3 border-l-4 border-yellow-500 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-500">Avg Class Size</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">
                {Array.isArray(classes) && Array.isArray(students) && classes.length > 0 ? Math.round(students.length / classes.length) : 0}
              </p>
              <p className="text-[10px] text-yellow-600">Per class</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <BookOpen className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Class Distribution */}
      <div className="bg-white rounded-xl shadow-xs p-2.5 sm:p-3 border border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Student Distribution by Class</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.isArray(classes) ? classes.map((cls) => {
            const classStudents = Array.isArray(students) ? students.filter(student => {
              return student.classId && student.classId._id === cls._id;
            }) : [];
            return (
              <div key={cls._id} className="text-center p-2 border border-slate-100 rounded-md hover:bg-gray-50">
                <h4 className="font-medium text-xs text-gray-800 truncate">{cls.name}</h4>
                <p className="text-base font-bold text-blue-600 leading-tight">{classStudents.length}</p>
                <p className="text-[10px] text-gray-400">students</p>
              </div>
            );
          }) : (
            <div className="col-span-full text-center py-2 text-xs text-gray-500">No classes available</div>
          )}
        </div>
      </div>

      {/* Filters and Export */}
      <div className="rounded-xl border border-[#e4eaf3] bg-white p-2.5 sm:p-3 shadow-xs">
        <div className="mb-2 flex flex-col items-start justify-between gap-1.5 border-b border-[#e8ecf4] pb-2 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#ef7833]">Directory</p>
            <h3 className="font-['Manrope'] text-base font-extrabold tracking-[-.04em] text-[#20386b]">Student list</h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => exportStudentData('csv')}
              className="flex items-center space-x-1 rounded-lg border border-[#dbe4f1] bg-white px-2.5 py-1 text-xs font-semibold text-[#284575] hover:bg-[#f3f6fb]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => exportStudentData('json')}
              className="flex items-center space-x-1 rounded-lg border border-[#dbe4f1] bg-white px-2.5 py-1 text-xs font-semibold text-[#284575] hover:bg-[#f3f6fb]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Filter Controls: Search, Class, Section, Status, and Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-2 items-end">
          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Search Students</label>
            <input
              type="text"
              placeholder="Name, email, roll no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 px-2.5 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Class</label>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setSectionFilter('all');
              }}
              className="w-full h-8 px-2.5 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="all">All Classes</option>
              {Array.from(new Set(classes.map((cls: any) => cls.name).filter(Boolean))).map((className: any) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Section</label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full h-8 px-2.5 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="all">All Sections</option>
              {Array.from(new Set(
                classes
                  .filter((cls: any) => classFilter === 'all' || cls.name === classFilter || cls._id === classFilter)
                  .map((cls: any) => cls.section)
                  .filter(Boolean)
              )).sort().map((section: any) => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-8 px-2.5 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div>
            <button
              onClick={() => {
                setSearchTerm('');
                setClassFilter('all');
                setSectionFilter('all');
                setStatusFilter('all');
                setAdmissionNumberFilter('');
              }}
              className="w-full h-8 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-xs font-semibold border border-gray-300"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-1.5 text-xs font-medium text-[#6f7b91]" aria-live="polite">
          Showing {filteredStudents.length} of {students.length} students
        </div>

        {/* Student Table with Sticky Header and compact rows */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-210px)] rounded-xl border border-[#e9edf5]">
          <table className="min-w-full">
            <thead className="sticky top-0 z-10 bg-[#f5f7fc] shadow-xs">
              <tr className="border-b bg-[#f5f7fc]">
                <th className="text-left py-1.5 px-3 text-xs font-semibold text-gray-600">Student Details</th>
                <th className="text-left py-1.5 px-3 text-xs font-semibold text-gray-600">Class</th>
                <th className="text-left py-1.5 px-3 text-xs font-semibold text-gray-600">Roll Number</th>
                <th className="text-left py-1.5 px-3 text-xs font-semibold text-gray-600">House</th>
                <th className="text-left py-1.5 px-3 text-xs font-semibold text-gray-600">Status</th>
                <th className="text-left py-1.5 px-3 text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents
                  .slice((studentListPage - 1) * studentListPageSize, studentListPage * studentListPageSize)
                  .map((student) => (
                <tr key={student._id} className="border-b border-[#ecf0f6] transition-colors hover:bg-[#fafbff]">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fff0e7]">
                        <Users className="h-3.5 w-3.5 text-[#e6702f]" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-gray-900 leading-tight">{student.name}</p>
                        <p className="text-[11px] text-gray-500">{student.email}</p>
                        {student.admissionNumber && (
                          <p className="text-[10px] text-gray-400">Adm: {student.admissionNumber}</p>
                        )}
                        {student.pdfs && student.pdfs.length > 0 && (
                          <p className="text-[10px] text-blue-600 flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>{student.pdfs.length} doc{student.pdfs.length > 1 ? 's' : ''}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-1.5 px-3 text-xs text-gray-600">
                    {student.classId ? `${student.classId.name} - ${student.classId.section}` : 'Not assigned'}
                  </td>
                  <td className="py-1.5 px-3 text-xs text-gray-600">{student.rollNumber}</td>
                  <td className="py-1.5 px-3 text-xs text-gray-600">
                    {student.houseId ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{
                        backgroundColor: typeof student.houseId === 'object' && student.houseId.color
                          ? `${student.houseId.color}20`
                          : '#3B82F620',
                        color: typeof student.houseId === 'object' && student.houseId.color
                          ? student.houseId.color
                          : '#3B82F6'
                      }}>
                        <Home className="h-3 w-3" />
                        {typeof student.houseId === 'object'
                          ? student.houseId.name
                          : houses.find(h => h._id === student.houseId)?.name || 'Unknown House'}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[10px]">No house</span>
                    )}
                  </td>
                  <td className="py-1.5 px-3">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(student._id || student.id, student.status || 'active')}
                        disabled={togglingStatusId === (student._id || student.id)}
                        title={`Click to toggle status (currently ${student.status || 'active'}). ${student.statusUpdatedAt ? `Last updated: ${new Date(student.statusUpdatedAt).toLocaleString()}` : ''}`}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          (student.status || 'active') === 'active' ? 'bg-green-600' : 'bg-gray-300'
                        } ${togglingStatusId === (student._id || student.id) ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            (student.status || 'active') === 'active' ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <div className="flex flex-col">
                        <span className={`px-1.5 py-0.2 text-[10px] font-semibold rounded-full w-fit ${getStatusColor(student.status || 'active')}`}>
                          {student.status || 'active'}
                        </span>
                        {student.statusUpdatedAt && (
                          <span className="text-[9px] text-gray-400" title={`Updated on ${new Date(student.statusUpdatedAt).toLocaleString()}`}>
                            {new Date(student.statusUpdatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-1.5 px-3">
                    <div className="flex space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          const classId = student.classId?._id || student.classId || student.class || '';
                          const address = typeof student.address === 'string'
                            ? student.address
                            : student.address?.street || '';

                          setEditStudent({
                            name: student.name,
                            class: classId,
                            rollNumber: student.rollNumber,
                            email: student.email,
                            address: address,
                            parentName: student.parentName || '',
                            parentPhone: student.parentPhone || '',
                            parentEmail: student.parentEmail || '',
                            admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : '',
                            status: student.status || 'active'
                          });
                          setShowEditStudentModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs p-1"
                        title="Edit Student"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student._id || student.id)}
                        className="text-red-600 hover:text-red-800 text-xs p-1"
                        title="Delete Student"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-gray-500">
                    No students found matching the filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredStudents.length > 0 && (
          <Pagination
            currentPage={studentListPage}
            pageSize={studentListPageSize}
            totalItems={filteredStudents.length}
            onPageChange={setStudentListPage}
            onPageSizeChange={setStudentListPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        )}
      </div>
    </div>
  );
  const renderNewEnrollment = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">New Student Enrollment</h3>
      <form onSubmit={handleAddStudent} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Name *
            </label>
            <input
              type="text"
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter student name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class *
            </label>
            <select
              value={newStudent.class}
              onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Class</option>
              {Array.isArray(classes) ? classes.map(cls => (
                <option key={cls._id} value={cls._id}>{cls.name} - {cls.section}</option>
              )) : null}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roll Number *
            </label>
            <input
              type="text"
              value={newStudent.rollNumber}
              onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter roll number"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admission Number *
            </label>
            <input
              type="text"
              value={newStudent.admissionNumber}
              onChange={(e) => setNewStudent({ ...newStudent, admissionNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter admission number"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Email *
            </label>
            <input
              type="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter student email address"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Password *
            </label>
            <input
              type="password"
              value={newStudent.password}
              onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter student password (min 6 characters)"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Phone Number *
            </label>
            <input
              type="tel"
              value={newStudent.phone}
              onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter student phone number"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth *
            </label>
            <input
              type="date"
              value={newStudent.dateOfBirth}
              onChange={(e) => setNewStudent({ ...newStudent, dateOfBirth: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender *
            </label>
            <select
              value={newStudent.gender}
              onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admission Date
            </label>
            <input
              type="date"
              value={newStudent.admissionDate}
              onChange={(e) => setNewStudent({ ...newStudent, admissionDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <textarea
            value={newStudent.address}
            onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter address"
          />
        </div>
        {/* Parent/Guardian Information */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Parent/Guardian Information</h4>
          <p className="text-sm text-gray-600 mb-4">
            <span className="text-red-500">*</span> At least one parent or guardian must be provided with complete information (name, email, and password).
          </p>
          {/* Father Information */}
          <div className="mb-6">
            <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Father Information
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Father Name</label>
                <input
                  type="text"
                  value={newStudent.fatherName}
                  onChange={(e) => setNewStudent({ ...newStudent, fatherName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter father's name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Father Phone Number</label>
                <input
                  type="tel"
                  value={newStudent.fatherPhone}
                  onChange={(e) => setNewStudent({ ...newStudent, fatherPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter father's phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Father Email</label>
                <input
                  type="email"
                  value={newStudent.fatherEmail}
                  onChange={(e) => setNewStudent({ ...newStudent, fatherEmail: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter father's email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Father Password</label>
                <input
                  type="password"
                  value={newStudent.fatherPassword}
                  onChange={(e) => setNewStudent({ ...newStudent, fatherPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter father's password (min 6 characters)"
                  minLength={6}
                />
              </div>
            </div>
          </div>
          {/* Mother Information */}
          <div className="mb-6">
            <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
              <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
              Mother Information
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mother Name</label>
                <input
                  type="text"
                  value={newStudent.motherName}
                  onChange={(e) => setNewStudent({ ...newStudent, motherName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter mother's name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mother Phone Number</label>
                <input
                  type="tel"
                  value={newStudent.motherPhone}
                  onChange={(e) => setNewStudent({ ...newStudent, motherPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter mother's phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mother Email</label>
                <input
                  type="email"
                  value={newStudent.motherEmail}
                  onChange={(e) => setNewStudent({ ...newStudent, motherEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter mother's email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mother Password</label>
                <input
                  type="password"
                  value={newStudent.motherPassword}
                  onChange={(e) => setNewStudent({ ...newStudent, motherPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter mother's password (min 6 characters)"
                  minLength={6}
                />
              </div>
            </div>
          </div>
          {/* Guardian Information */}
          <div className="mb-6">
            <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Guardian Information
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Name</label>
                <input
                  type="text"
                  value={newStudent.guardianName}
                  onChange={(e) => setNewStudent({ ...newStudent, guardianName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter guardian's name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Phone Number</label>
                <input
                  type="tel"
                  value={newStudent.guardianPhone}
                  onChange={(e) => setNewStudent({ ...newStudent, guardianPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter guardian's phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Email</label>
                <input
                  type="email"
                  value={newStudent.guardianEmail}
                  onChange={(e) => setNewStudent({ ...newStudent, guardianEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter guardian's email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Password</label>
                <input
                  type="password"
                  value={newStudent.guardianPassword}
                  onChange={(e) => setNewStudent({ ...newStudent, guardianPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter guardian's password (min 6 characters)"
                  minLength={6}
                />
              </div>
            </div>
          </div>
        </div>

        {/* PDF Upload Section */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Documents (PDFs)</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload PDF Documents</label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setPdfFiles(prev => [...prev, ...files]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {pdfFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected PDFs:</p>
                <ul className="list-disc list-inside space-y-1">
                  {pdfFiles.map((file, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center justify-between">
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setPdfFiles(prev => prev.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Enroll Student</span>
          </button>
        </div>
      </form>
    </div>
  );

  const renderStudentProfiles = () => (
    <div className="space-y-2.5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h3 className="text-sm font-bold text-gray-900">Student Profiles</h3>

        {/* Search Filter */}
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="Search name, email, admission..."
            value={profileSearchTerm}
            onChange={(e) => setProfileSearchTerm(e.target.value)}
            className="w-full h-8 px-2.5 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
        </div>
      </div>

      {/* Results Count */}
      {profileSearchTerm && (
        <div className="text-xs text-gray-500">
          Showing {filteredProfileStudents.length} of {students.length} students
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredProfileStudents.length > 0 ? (
          filteredProfileStudents
            .slice((profilePage - 1) * profilePageSize, profilePage * profilePageSize)
            .map((student) => (
          <div key={student._id} className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="p-3">
              <div className="text-center mb-2.5">
                <div className="relative w-12 h-12 mx-auto mb-1.5">
                  {student.avatar ? (
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 absolute inset-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 leading-tight">{student.name}</h4>
                <p className="text-xs text-gray-500">
                  {student.classId ? `${student.classId.name} - ${student.classId.section}` : 'Not assigned'} • Roll: {student.rollNumber || 'N/A'}
                </p>
                {student.admissionNumber && (
                  <p className="text-[11px] text-gray-400">
                    Adm: {student.admissionNumber}
                  </p>
                )}
                <div className="mt-1 flex items-center justify-center space-x-1.5">
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${getStatusColor(student.status)}`}>
                    {student.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(student._id || student.id, student.status || 'active')}
                    disabled={togglingStatusId === (student._id || student.id)}
                    title={`Click to toggle status (currently ${student.status || 'active'}). ${student.statusUpdatedAt ? `Last updated: ${new Date(student.statusUpdatedAt).toLocaleString()}` : ''}`}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      (student.status || 'active') === 'active' ? 'bg-green-600' : 'bg-gray-300'
                    } ${togglingStatusId === (student._id || student.id) ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        (student.status || 'active') === 'active' ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center space-x-2">
                  <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-700 truncate">{student.email || 'No email'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-700 truncate">{student.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-700 truncate">
                    {(() => {
                      if (!student.address) return 'No address';
                      if (typeof student.address === 'string') {
                        return student.address;
                      }
                      const parts = [];
                      if (student.address.street) parts.push(student.address.street);
                      if (student.address.city) parts.push(student.address.city);
                      if (student.address.state) parts.push(student.address.state);
                      if (student.address.zipCode) parts.push(student.address.zipCode);
                      return parts.length > 0 ? parts.join(', ') : 'No address';
                    })()}
                  </span>
                </div>
                {student.admissionNumber && (
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-700">Adm: {student.admissionNumber}</span>
                  </div>
                )}
                {student.pdfs && student.pdfs.length > 0 && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span>{student.pdfs.length} document{student.pdfs.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              <div className="mt-2.5 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 text-[11px]">Adm: {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'N/A'}</span>
                  <button
                    onClick={() => handleViewFullProfile(student)}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    View Full Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-semibold">No students found</p>
            <p className="text-xs">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
      {filteredProfileStudents.length > 0 && (
        <Pagination
          currentPage={profilePage}
          pageSize={profilePageSize}
          totalItems={filteredProfileStudents.length}
          onPageChange={setProfilePage}
          onPageSizeChange={setProfilePageSize}
          pageSizeOptions={[12, 24, 48]}
        />
      )}
    </div>
  );
  const renderTabContent = () => {
    switch (activeTab) {
      case 'manage':
        return renderManageStudents();
      case 'profiles':
        return renderStudentProfiles();
      default:
        return renderManageStudents();
    }
  };

  return (
    <main className="mx-auto max-w-[1500px] space-y-2.5 pb-4">
      {/* Top Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Enrolled:</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            {students.length} students
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddStudentModal(true)}
          className="h-9 px-4 bg-[#245a82] hover:bg-[#1a4463] text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-1.5 shadow-sm transition-colors w-full sm:w-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Quick Enroll Student</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="overflow-hidden rounded-xl border border-[#e0e7f2] bg-white shadow-xs">
        <div className="border-b border-[#e7ecf5] bg-[#fbfcff]">
          <nav className="flex gap-4 overflow-x-auto px-4" aria-label="Student record views">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`whitespace-nowrap border-b-2 px-2 py-2 text-xs font-semibold transition-colors ${activeTab === tab.id
                  ? 'border-[#f4782e] text-[#20386b]'
                  : 'border-transparent text-[#7b879d] hover:border-[#efb793] hover:text-[#20386b]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-3 md:p-4">
          {renderTabContent()}
        </div>
      </div>

      {/* Enhanced Quick Enroll Student Modal with Multi-Field Validation & Loading State */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="relative mx-auto p-4 sm:p-6 border w-[calc(100%-1rem)] sm:w-full max-w-2xl shadow-2xl rounded-xl bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Enroll New Student</h3>
                <p className="text-xs text-gray-500">Fill in the student and guardian credentials to enroll</p>
              </div>
              <button
                onClick={() => {
                  setModalErrors({});
                  setShowAddStudentModal(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              {/* Student Information Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">1. Student Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={newStudent.name}
                      onChange={(e) => {
                        setNewStudent({ ...newStudent, name: e.target.value });
                        if (modalErrors.name) setModalErrors(prev => ({ ...prev, name: '' }));
                      }}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                        modalErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="e.g. Rahul Sharma"
                    />
                    {modalErrors.name && <p className="text-xs text-red-500 mt-1">{modalErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Class *</label>
                    <select
                      value={newStudent.class}
                      onChange={(e) => {
                        setNewStudent({ ...newStudent, class: e.target.value });
                        if (modalErrors.class) setModalErrors(prev => ({ ...prev, class: '' }));
                      }}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                        modalErrors.class ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls._id || cls.id} value={cls.name || cls.className}>
                          {cls.name || cls.className}
                        </option>
                      ))}
                    </select>
                    {modalErrors.class && <p className="text-xs text-red-500 mt-1">{modalErrors.class}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Admission Number *</label>
                    <input
                      type="text"
                      value={newStudent.admissionNumber}
                      onChange={(e) => {
                        setNewStudent({ ...newStudent, admissionNumber: e.target.value });
                        if (modalErrors.admissionNumber) setModalErrors(prev => ({ ...prev, admissionNumber: '' }));
                      }}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                        modalErrors.admissionNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="e.g. ADM-2024-001"
                    />
                    {modalErrors.admissionNumber && <p className="text-xs text-red-500 mt-1">{modalErrors.admissionNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Roll Number</label>
                    <input
                      type="text"
                      value={newStudent.rollNumber}
                      onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender *</label>
                    <select
                      value={newStudent.gender}
                      onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={newStudent.dateOfBirth}
                      onChange={(e) => setNewStudent({ ...newStudent, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Parent / Guardian Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">2. Parent / Guardian Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Father / Guardian Name *</label>
                    <input
                      type="text"
                      value={newStudent.fatherName}
                      onChange={(e) => {
                        setNewStudent({ ...newStudent, fatherName: e.target.value });
                        if (modalErrors.parent) setModalErrors(prev => ({ ...prev, parent: '' }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Parent's name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Parent Phone *</label>
                    <input
                      type="tel"
                      value={newStudent.fatherPhone}
                      onChange={(e) => setNewStudent({ ...newStudent, fatherPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+919876543210"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Parent Email *</label>
                    <input
                      type="email"
                      value={newStudent.fatherEmail}
                      onChange={(e) => setNewStudent({ ...newStudent, fatherEmail: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="parent@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Parent Password *</label>
                    <input
                      type="password"
                      value={newStudent.fatherPassword}
                      onChange={(e) => setNewStudent({ ...newStudent, fatherPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>
                {modalErrors.parent && <p className="text-xs text-red-500 mt-2 font-medium">{modalErrors.parent}</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  disabled={isSubmittingModal}
                  onClick={() => {
                    setModalErrors({});
                    setShowAddStudentModal(false);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {isSubmittingModal && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isSubmittingModal ? 'Enrolling...' : 'Enroll Student'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditStudentModal && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Student</h3>
              <form onSubmit={handleEditStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Name *</label>
                  <input
                    type="text"
                    value={editStudent.name}
                    onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                  <select
                    value={editStudent.class}
                    onChange={(e) => setEditStudent({ ...editStudent, class: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {Array.isArray(classes) ? classes.map(cls => (
                      <option key={cls._id} value={cls._id}>{cls.name} - {cls.section}</option>
                    )) : null}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number *</label>
                  <input
                    type="text"
                    value={editStudent.rollNumber}
                    onChange={(e) => setEditStudent({ ...editStudent, rollNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditStudentModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Full Profile Modal */}
      {showFullProfileModal && fullProfileStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Student Full Profile</h3>
              <button
                onClick={() => setShowFullProfileModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {loadingFullProfile ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-600">Loading...</div>
              </div>
            ) : (
              <form onSubmit={handleUpdateFullProfile} className="space-y-6">
                {/* Student Photo */}
                <div className="flex flex-col items-center mb-4">
                  <div className="relative mb-3">
                    {(fullProfileStudent.photoPreview || fullProfileStudent.avatar) ? (
                      <img
                        src={fullProfileStudent.photoPreview || fullProfileStudent.avatar}
                        alt={fullProfileStudent.name}
                        className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center border-4 border-gray-300">
                        <Users className="h-16 w-16 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Image must be less than 5MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFullProfileStudent({
                              ...fullProfileStudent,
                              photoFile: file,
                              photoPreview: reader.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {fullProfileStudent.photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {fullProfileStudent.photoPreview && (
                    <p className="text-xs text-gray-500 mt-1">New photo selected</p>
                  )}
                </div>

                {/* Personal Information */}
                <div className="border-b pb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={fullProfileStudent.name || ''}
                        onChange={(e) => setFullProfileStudent({ ...fullProfileStudent, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={fullProfileStudent.email || ''}
                        onChange={(e) => setFullProfileStudent({ ...fullProfileStudent, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={fullProfileStudent.phone || ''}
                        onChange={(e) => setFullProfileStudent({ ...fullProfileStudent, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={fullProfileStudent.dateOfBirth ? new Date(fullProfileStudent.dateOfBirth).toISOString().split('T')[0] : ''}
                        onChange={(e) => setFullProfileStudent({ ...fullProfileStudent, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                      <select
                        value={fullProfileStudent.gender || ''}
                        onChange={(e) => setFullProfileStudent({ ...fullProfileStudent, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number *</label>
                      <input
                        type="text"
                        value={fullProfileStudent.rollNumber || ''}
                        onChange={(e) => setFullProfileStudent({ ...fullProfileStudent, rollNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Admission Number</label>
                      <input
                        type="text"
                        value={fullProfileStudent.admissionNumber || ''}
                        onChange={(e) => setFullProfileStudent({ ...fullProfileStudent, admissionNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={fullProfileStudent.status || 'active'}
                        onChange={(e) => setFullProfileStudent({ ...fullProfileStudent, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="graduated">Graduated</option>
                        <option value="transferred">Transferred</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={(() => {
                          // Handle both string (legacy) and object formats
                          if (typeof fullProfileStudent.address === 'string') {
                            return fullProfileStudent.address;
                          }
                          return fullProfileStudent.address?.street || '';
                        })()}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          // Convert string address to object if needed
                          if (typeof fullProfileStudent.address === 'string') {
                            setFullProfileStudent({
                              ...fullProfileStudent,
                              address: { street: newValue, city: '', state: '', zipCode: '', country: 'India' }
                            });
                          } else {
                            setFullProfileStudent({
                              ...fullProfileStudent,
                              address: { ...(fullProfileStudent.address || {}), street: newValue }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Street address"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={fullProfileStudent.address?.city || ''}
                          onChange={(e) => setFullProfileStudent({
                            ...fullProfileStudent,
                            address: { ...(fullProfileStudent.address || {}), city: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="City"
                        />
                        <input
                          type="text"
                          value={fullProfileStudent.address?.state || ''}
                          onChange={(e) => setFullProfileStudent({
                            ...fullProfileStudent,
                            address: { ...(fullProfileStudent.address || {}), state: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="State"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={fullProfileStudent.address?.zipCode || ''}
                          onChange={(e) => setFullProfileStudent({
                            ...fullProfileStudent,
                            address: { ...(fullProfileStudent.address || {}), zipCode: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Zip/Postal Code"
                        />
                        <input
                          type="text"
                          value={fullProfileStudent.address?.country || 'India'}
                          onChange={(e) => setFullProfileStudent({
                            ...fullProfileStudent,
                            address: { ...(fullProfileStudent.address || {}), country: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Country"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="border-b pb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                      <select
                        value={fullProfileStudent.classId?._id || fullProfileStudent.classId || ''}
                        onChange={(e) => setFullProfileStudent({
                          ...fullProfileStudent,
                          classId: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Class</option>
                        {Array.isArray(classes) ? classes.map(cls => (
                          <option key={cls._id} value={cls._id}>{cls.name} - {cls.section}</option>
                        )) : null}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Admission Date</label>
                      <input
                        type="date"
                        value={fullProfileStudent.admissionDate ? new Date(fullProfileStudent.admissionDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => setFullProfileStudent({ ...fullProfileStudent, admissionDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">House</label>
                      <select
                        value={fullProfileStudent.houseId?._id || fullProfileStudent.houseId || ''}
                        onChange={(e) => setFullProfileStudent({
                          ...fullProfileStudent,
                          houseId: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No House Assigned</option>
                        {Array.isArray(houses) && houses.filter(h => h.isActive).map(house => (
                          <option key={house._id} value={house._id}>{house.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={fullProfileStudent.isDormitory || false}
                          onChange={(e) => setFullProfileStudent({
                            ...fullProfileStudent,
                            isDormitory: e.target.checked,
                            roomNumber: e.target.checked ? fullProfileStudent.roomNumber : ''
                          })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Is Dormitory Student?</span>
                      </label>
                      {fullProfileStudent.isDormitory && (
                        <input
                          type="text"
                          value={fullProfileStudent.roomNumber || ''}
                          onChange={(e) => setFullProfileStudent({
                            ...fullProfileStudent,
                            roomNumber: e.target.value
                          })}
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Room Number"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="border-b pb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                      <select
                        value={fullProfileStudent.bloodGroup || fullProfileStudent.medicalInfo?.bloodGroup || ''}
                        onChange={(e) => setFullProfileStudent({
                          ...fullProfileStudent,
                          bloodGroup: e.target.value,
                          medicalInfo: {
                            ...fullProfileStudent.medicalInfo,
                            bloodGroup: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                      <input
                        type="text"
                        value={Array.isArray(fullProfileStudent.medicalInfo?.allergies) ? fullProfileStudent.medicalInfo.allergies.join(', ') : fullProfileStudent.medicalInfo?.allergies || ''}
                        onChange={(e) => setFullProfileStudent({
                          ...fullProfileStudent,
                          medicalInfo: {
                            ...fullProfileStudent.medicalInfo,
                            allergies: e.target.value.split(',').map((a: string) => a.trim())
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Separate with commas"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Medical Conditions</label>
                      <input
                        type="text"
                        value={Array.isArray(fullProfileStudent.medicalInfo?.conditions) ? fullProfileStudent.medicalInfo.conditions.join(', ') : fullProfileStudent.medicalInfo?.conditions || ''}
                        onChange={(e) => setFullProfileStudent({
                          ...fullProfileStudent,
                          medicalInfo: {
                            ...fullProfileStudent.medicalInfo,
                            conditions: e.target.value.split(',').map((c: string) => c.trim())
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Separate with commas"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
                      <input
                        type="text"
                        value={fullProfileStudent.medicalInfo?.emergencyContact || ''}
                        onChange={(e) => setFullProfileStudent({
                          ...fullProfileStudent,
                          medicalInfo: {
                            ...fullProfileStudent.medicalInfo,
                            emergencyContact: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        value={fullProfileStudent.medicalInfo?.emergencyContactPhone || ''}
                        onChange={(e) => setFullProfileStudent({
                          ...fullProfileStudent,
                          medicalInfo: {
                            ...fullProfileStudent.medicalInfo,
                            emergencyContactPhone: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Parent/Guardian Information */}
                <div className="border-b pb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h4>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h5 className="text-md font-medium text-blue-800 mb-3">Father Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <input
                            type="text"
                            value={fullProfileStudent.parentInfo?.fatherName || ''}
                            onChange={(e) => setFullProfileStudent({
                              ...fullProfileStudent,
                              parentInfo: {
                                ...(fullProfileStudent.parentInfo || {}),
                                fatherName: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                          <input
                            type="tel"
                            value={fullProfileStudent.parentInfo?.fatherPhone || ''}
                            onChange={(e) => setFullProfileStudent({
                              ...fullProfileStudent,
                              parentInfo: {
                                ...(fullProfileStudent.parentInfo || {}),
                                fatherPhone: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={fullProfileStudent.parentInfo?.fatherEmail || ''}
                            onChange={(e) => setFullProfileStudent({
                              ...fullProfileStudent,
                              parentInfo: {
                                ...(fullProfileStudent.parentInfo || {}),
                                fatherEmail: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-pink-50 p-4 rounded-lg">
                      <h5 className="text-md font-medium text-pink-800 mb-3">Mother Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <input
                            type="text"
                            value={fullProfileStudent.parentInfo?.motherName || ''}
                            onChange={(e) => setFullProfileStudent({
                              ...fullProfileStudent,
                              parentInfo: {
                                ...(fullProfileStudent.parentInfo || {}),
                                motherName: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                          <input
                            type="tel"
                            value={fullProfileStudent.parentInfo?.motherPhone || ''}
                            onChange={(e) => setFullProfileStudent({
                              ...fullProfileStudent,
                              parentInfo: {
                                ...(fullProfileStudent.parentInfo || {}),
                                motherPhone: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={fullProfileStudent.parentInfo?.motherEmail || ''}
                            onChange={(e) => setFullProfileStudent({
                              ...fullProfileStudent,
                              parentInfo: {
                                ...(fullProfileStudent.parentInfo || {}),
                                motherEmail: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="text-md font-medium text-green-800 mb-3">Guardian Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <input
                            type="text"
                            value={fullProfileStudent.parentInfo?.guardianName || ''}
                            onChange={(e) => setFullProfileStudent({
                              ...fullProfileStudent,
                              parentInfo: {
                                ...(fullProfileStudent.parentInfo || {}),
                                guardianName: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                          <input
                            type="tel"
                            value={fullProfileStudent.parentInfo?.guardianPhone || ''}
                            onChange={(e) => setFullProfileStudent({
                              ...fullProfileStudent,
                              parentInfo: {
                                ...(fullProfileStudent.parentInfo || {}),
                                guardianPhone: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={fullProfileStudent.parentInfo?.guardianEmail || ''}
                            onChange={(e) => setFullProfileStudent({
                              ...fullProfileStudent,
                              parentInfo: {
                                ...(fullProfileStudent.parentInfo || {}),
                                guardianEmail: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents/PDFs Section */}
                {fullProfileStudent.pdfs && fullProfileStudent.pdfs.length > 0 && (
                  <div className="border-b pb-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Documents</h4>
                    <div className="space-y-2">
                      {fullProfileStudent.pdfs.map((pdf: string, index: number) => {
                        // Extract filename for display
                        const displayName = pdf.includes('/') ? pdf.split('/').pop() || pdf : pdf;

                        // Construct full URL for viewing
                        let pdfUrl = pdf;
                        if (!pdf.startsWith('http')) {
                          if (pdf.startsWith('/uploads')) {
                            const filename = pdf.split('/').pop() || pdf;
                            pdfUrl = getApiFullUrl(`/students/documents/${encodeURIComponent(filename)}`);
                          } else if (!pdf.startsWith('/')) {
                            pdfUrl = getApiFullUrl(`/students/documents/${encodeURIComponent(pdf)}`);
                          } else {
                            pdfUrl = getApiFullUrl(pdf);
                          }
                        }

                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-blue-600" />
                              <span className="text-sm font-medium text-gray-700">{displayName}</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const response = await fetch(pdfUrl, { headers: { Authorization: `Bearer ${localStorage.getItem('school_token') || ''}` } });
                                  if (!response.ok) throw new Error('Document access failed');
                                  const objectUrl = URL.createObjectURL(await response.blob());
                                  window.open(objectUrl, '_blank', 'noopener,noreferrer');
                                  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
                                } catch { alert('Could not open this document.'); }
                              }}
                              className="flex items-center space-x-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Download className="h-4 w-4" />
                              <span>View</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFullProfileModal(false)}
                    className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loadingFullProfile}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingFullProfile ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Enrollment Modal */}
      {showEnrollmentWizard && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative animate-fade-in">
            {/* Progress Bar */}
            <div className="flex items-center mb-6">
              {ENROLLMENT_STEPS.map((step, idx) => (
                <div key={step.label} className="flex-1 flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === enrollmentStep ? 'bg-blue-600' : idx < enrollmentStep ? 'bg-green-500' : 'bg-gray-300'}`}>{idx + 1}</div>
                  {idx < ENROLLMENT_STEPS.length - 1 && <div className={`flex-1 h-1 ${idx < enrollmentStep ? 'bg-green-500' : 'bg-gray-200'}`}></div>}
                </div>
              ))}
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center tracking-tight">{ENROLLMENT_STEPS[enrollmentStep].label}</h2>
            <form onSubmit={e => { e.preventDefault(); /* handle submit here */ }}>
              <div className="mb-6">{renderEnrollmentStep()}</div>
              <div className="flex justify-between items-center mt-8">
                <button type="button" className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition" onClick={handleEnrollmentBack} disabled={enrollmentStep === 0}>Back</button>
                {enrollmentStep < ENROLLMENT_STEPS.length - 1 ? (
                  <button type="button" className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition" onClick={handleEnrollmentNext}>Next</button>
                ) : (
                  <button type="submit" className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition">Submit</button>
                )}
                <button type="button" className="px-6 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition" onClick={handleCloseEnrollmentWizard}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Students;
