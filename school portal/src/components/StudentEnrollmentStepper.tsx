import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface StudentData {
  // Step 1: Student Details
  studentName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  class: string;
  rollNumber: string;
  admissionNumber: string;
  admissionDate: string;
  photo: File | null;
  photoPreview: string;

  // Step 2: Parent Details
  parentRelation: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  parentPassword: string;

  // Step 3: Medical Details
  bloodGroup: string;
  allergies: string;
  medicalConditions: string;
  emergencyContact: string;
  emergencyContactPhone: string;

  // Step 4: Previous School Details
  previousSchoolName: string;
  previousSchoolBoard: string;
  previousSchoolPercentage: string;
  leavingReason: string;

  // Step 5: House & Dormitory
  isDormitory: boolean;
  houseId: string;
  roomNumber: string;

  // Step 6: Documents
  documents: Array<{
    type: string;
    file: File | null;
    fileName: string;
  }>;
}

interface StudentEnrollmentStepperProps {
  onSubmit: (data: StudentData) => Promise<void>;
  loading: boolean;
  prefillData?: any;
}

const StudentEnrollmentStepper: React.FC<StudentEnrollmentStepperProps> = ({ onSubmit, loading, prefillData }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [classes, setClasses] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [studentData, setStudentData] = useState<StudentData>({
    // Step 1
    studentName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    class: '',
    rollNumber: '',
    admissionNumber: '',
    admissionDate: new Date().toISOString().split('T')[0],
    photo: null,
    photoPreview: '',

    // Step 2
    parentRelation: 'father',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentPassword: '',

    // Step 3
    bloodGroup: '',
    allergies: '',
    medicalConditions: '',
    emergencyContact: '',
    emergencyContactPhone: '',

    // Step 4
    previousSchoolName: '',
    previousSchoolBoard: '',
    previousSchoolPercentage: '',
    leavingReason: '',

    // Step 5: House & Dormitory
    isDormitory: false,
    houseId: '',
    roomNumber: '',

    // Step 6
    documents: [
      { type: 'transfer_certificate', file: null, fileName: '' },
      { type: 'birth_certificate', file: null, fileName: '' },
      { type: 'aadhar_card', file: null, fileName: '' },
      { type: 'other', file: null, fileName: '' }
    ]
  });

  // Fetch classes on component mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const response = await api.classes.getAll();
        if (response && Array.isArray(response)) {
          setClasses(response);
        } else if (response && response.data) {
          setClasses(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch classes:', error);
        toast.error('Failed to load classes');
      } finally {
        setLoadingClasses(false);
      }
    };

    const fetchHouses = async () => {
      try {
        const response = await api.houses.getAll();
        if (response && Array.isArray(response)) {
          setHouses(response);
        } else if (response && response.data) {
          setHouses(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch houses:', error);
      }
    };

    fetchClasses();
    fetchHouses();
  }, []);

  // Handle pre-fill data from admission application
  useEffect(() => {
    if (prefillData) {
      console.log('📝 Pre-filling enrollment form with admission data:', prefillData);
      
      setStudentData(prev => ({
        ...prev,
        studentName: prefillData.studentName || prev.studentName,
        dateOfBirth: prefillData.dateOfBirth ? new Date(prefillData.dateOfBirth).toISOString().split('T')[0] : prev.dateOfBirth,
        gender: prefillData.gender || prev.gender,
        email: prefillData.email || prefillData.parentDetails?.email || prev.email,
        phone: prefillData.contact || prefillData.parentDetails?.contact || prev.phone,
        address: typeof prefillData.address === 'string' ? prefillData.address : (prefillData.address?.street || prev.address),
        
        // Parent details
        parentName: prefillData.parentDetails?.name || prefillData.parentName || prev.parentName,
        parentRelation: prefillData.parentDetails?.relation || prefillData.parentRelation || 'father',
        parentPhone: prefillData.parentDetails?.contact || prefillData.parentPhone || prev.parentPhone,
        parentEmail: prefillData.parentDetails?.email || prefillData.parentEmail || prev.parentEmail,
        
        // Medical info (if available)
        bloodGroup: prefillData.medicalInfo?.bloodGroup || prev.bloodGroup,
        
        // Previous school
        previousSchoolName: prefillData.previousSchool?.name || prefillData.previousSchoolName || prev.previousSchoolName
      }));
    }
  }, [prefillData]);

  const steps = [
    { number: 1, title: 'Student Details', icon: '👤' },
    { number: 2, title: 'Parent Details', icon: '👨‍👩' },
    { number: 3, title: 'Medical Details', icon: '⚕️' },
    { number: 4, title: 'Previous School', icon: '🏫' },
    { number: 5, title: 'House & Dormitory', icon: '🏠' },
    { number: 6, title: 'Documents', icon: '📄' }
  ];

  // Comprehensive step validation with inline error feedback
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[0-9\s-]{7,15}$/;

    switch (step) {
      case 1:
        if (!studentData.studentName?.trim()) {
          newErrors.studentName = 'Student name is required';
        } else if (studentData.studentName.trim().length < 2) {
          newErrors.studentName = 'Student name must be at least 2 characters';
        }

        if (!studentData.dateOfBirth) {
          newErrors.dateOfBirth = 'Date of birth is required';
        } else if (new Date(studentData.dateOfBirth) > new Date()) {
          newErrors.dateOfBirth = 'Date of birth cannot be in the future';
        }

        if (!studentData.gender) {
          newErrors.gender = 'Gender is required';
        }

        if (!studentData.class) {
          newErrors.class = 'Class selection is required';
        }

        if (!studentData.email?.trim()) {
          newErrors.email = 'Email address is required';
        } else if (!emailRegex.test(studentData.email.trim())) {
          newErrors.email = 'Please provide a valid email format (e.g. user@school.com)';
        } else if (/[A-Z]/.test(studentData.email)) {
          newErrors.email = 'Email address must be in lowercase';
        }

        if (!studentData.phone?.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (!phoneRegex.test(studentData.phone.trim())) {
          newErrors.phone = 'Please enter a valid phone number (min 7 digits)';
        }

        if (!studentData.password) {
          newErrors.password = 'Password is required';
        } else if (studentData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        break;

      case 2:
        if (!studentData.parentName?.trim()) {
          newErrors.parentName = 'Parent name is required';
        }

        if (!studentData.parentPhone?.trim()) {
          newErrors.parentPhone = 'Parent phone is required';
        } else if (!phoneRegex.test(studentData.parentPhone.trim())) {
          newErrors.parentPhone = 'Please enter a valid contact number (min 7 digits)';
        }

        if (!studentData.parentEmail?.trim()) {
          newErrors.parentEmail = 'Parent email is required';
        } else if (!emailRegex.test(studentData.parentEmail.trim())) {
          newErrors.parentEmail = 'Please provide a valid email address';
        } else if (/[A-Z]/.test(studentData.parentEmail)) {
          newErrors.parentEmail = 'Parent email must be in lowercase';
        }

        if (!studentData.parentPassword) {
          newErrors.parentPassword = 'Parent password is required';
        } else if (studentData.parentPassword.length < 6) {
          newErrors.parentPassword = 'Password must be at least 6 characters';
        }
        break;

      case 3:
        if (!studentData.bloodGroup) {
          newErrors.bloodGroup = 'Blood group selection is required';
        }
        if (!studentData.emergencyContact?.trim()) {
          newErrors.emergencyContact = 'Emergency contact person is required';
        }
        if (!studentData.emergencyContactPhone?.trim()) {
          newErrors.emergencyContactPhone = 'Emergency contact phone is required';
        } else if (!phoneRegex.test(studentData.emergencyContactPhone.trim())) {
          newErrors.emergencyContactPhone = 'Please enter a valid emergency phone';
        }
        break;

      case 4:
        if (studentData.previousSchoolPercentage && (Number(studentData.previousSchoolPercentage) < 0 || Number(studentData.previousSchoolPercentage) > 100)) {
          newErrors.previousSchoolPercentage = 'Percentage must be between 0 and 100';
        }
        break;

      case 5:
        if (studentData.isDormitory && !studentData.roomNumber.trim()) {
          newErrors.roomNumber = 'Room number is required for dormitory students';
        }
        break;

      default:
        break;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the highlighted errors before continuing');
      return false;
    }

    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleInputChange = (field: keyof StudentData, value: any) => {
    let sanitizedValue = value;
    // Auto-convert email inputs to lowercase and strip whitespace
    if ((field === 'email' || field === 'parentEmail') && typeof value === 'string') {
      sanitizedValue = value.toLowerCase().replace(/\s+/g, '');
    }
    setStudentData({ ...studentData, [field]: sanitizedValue });
    // Clear inline error when user types/changes the value
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (index: number, file: File | null) => {
    const newDocuments = [...studentData.documents];
    newDocuments[index].file = file;
    newDocuments[index].fileName = file?.name || '';
    setStudentData({ ...studentData, documents: newDocuments });
  };

  const handleDocumentTypeChange = (index: number, type: string) => {
    const newDocuments = [...studentData.documents];
    newDocuments[index].type = type;
    setStudentData({ ...studentData, documents: newDocuments });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (let step = 1; step <= 5; step += 1) {
      if (!validateStep(step)) { setCurrentStep(step); return; }
    }
    await onSubmit(studentData);
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Login Credentials & Basic Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
          <input
            type="text"
            disabled={loading}
            value={studentData.studentName}
            onChange={(e) => handleInputChange('studentName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.studentName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Full name"
          />
          {errors.studentName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.studentName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
          <input
            type="date"
            disabled={loading}
            value={studentData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.dateOfBirth ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.dateOfBirth && <p className="text-xs text-red-500 mt-1 font-medium">{errors.dateOfBirth}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
          <select
            disabled={loading}
            value={studentData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.gender ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && <p className="text-xs text-red-500 mt-1 font-medium">{errors.gender}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
          <select
            disabled={loading}
            value={studentData.class}
            onChange={(e) => handleInputChange('class', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.class ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
          >
            <option value="">Select Class</option>
            {loadingClasses ? (
              <option disabled>Loading classes...</option>
            ) : (
              classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} - {cls.section}
                </option>
              ))
            )}
          </select>
          {errors.class && <p className="text-xs text-red-500 mt-1 font-medium">{errors.class}</p>}
          {classes.length === 0 && !loadingClasses && (
            <p className="text-xs text-red-500 mt-1">No classes available</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number <span className="text-xs text-gray-500">(Optional)</span></label>
          <input
            type="text"
            value={studentData.rollNumber}
            onChange={(e) => handleInputChange('rollNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Roll number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admission Number
            <span className="text-xs text-gray-500 block">Auto-generated if left empty</span>
          </label>
          <input
            type="text"
            value={studentData.admissionNumber}
            onChange={(e) => handleInputChange('admissionNumber', e.target.value)}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed focus:ring-2 focus:ring-blue-500"
            placeholder="Auto-generated"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admission Date</label>
          <input
            type="date"
            value={studentData.admissionDate}
            onChange={(e) => handleInputChange('admissionDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <input
            type="tel"
            disabled={loading}
            value={studentData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Phone number"
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1 font-medium">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            disabled={loading}
            value={studentData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Email address"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <input
            type="password"
            disabled={loading}
            value={studentData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Minimum 6 characters"
          />
          {errors.password && <p className="text-xs text-red-500 mt-1 font-medium">{errors.password}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Student Photo</label>
        <div className="flex flex-col gap-4">
          {studentData.photoPreview && (
            <div className="relative w-32 h-40 rounded-lg overflow-hidden border-2 border-blue-500">
              <img
                src={studentData.photoPreview}
                alt="Student preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setStudentData(prev => ({
                    ...prev,
                    photo: null,
                    photoPreview: ''
                  }));
                }}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 5 * 1024 * 1024) {
                  toast.error('Image must be less than 5MB');
                  return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                  setStudentData(prev => ({
                    ...prev,
                    photo: file,
                    photoPreview: reader.result as string
                  }));
                };
                reader.readAsDataURL(file);
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500">PNG, JPG or GIF (Max 5MB)</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <textarea
          value={studentData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Full address"
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Relation *</label>
          <select
            value={studentData.parentRelation}
            onChange={(e) => handleInputChange('parentRelation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="father">Father</option>
            <option value="mother">Mother</option>
            <option value="guardian">Guardian</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name *</label>
          <input
            type="text"
            disabled={loading}
            value={studentData.parentName}
            onChange={(e) => handleInputChange('parentName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.parentName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Parent/Guardian name"
          />
          {errors.parentName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.parentName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone *</label>
          <input
            type="tel"
            disabled={loading}
            value={studentData.parentPhone}
            onChange={(e) => handleInputChange('parentPhone', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.parentPhone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Contact number"
          />
          {errors.parentPhone && <p className="text-xs text-red-500 mt-1 font-medium">{errors.parentPhone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email *</label>
          <input
            type="email"
            disabled={loading}
            value={studentData.parentEmail}
            onChange={(e) => handleInputChange('parentEmail', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.parentEmail ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Email address"
          />
          {errors.parentEmail && <p className="text-xs text-red-500 mt-1 font-medium">{errors.parentEmail}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Parent Password *</label>
          <input
            type="password"
            disabled={loading}
            value={studentData.parentPassword}
            onChange={(e) => handleInputChange('parentPassword', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.parentPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Password for parent portal login (minimum 6 characters)"
          />
          {errors.parentPassword && <p className="text-xs text-red-500 mt-1 font-medium">{errors.parentPassword}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group *</label>
          <select
            disabled={loading}
            value={studentData.bloodGroup}
            onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.bloodGroup ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
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
          {errors.bloodGroup && <p className="text-xs text-red-500 mt-1 font-medium">{errors.bloodGroup}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact *</label>
          <input
            type="text"
            disabled={loading}
            value={studentData.emergencyContact}
            onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
              errors.emergencyContact ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Contact name"
          />
          {errors.emergencyContact && <p className="text-xs text-red-500 mt-1 font-medium">{errors.emergencyContact}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone *</label>
          <input
            type="tel"
            value={studentData.emergencyContactPhone}
            onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Phone number"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
          <textarea
            value={studentData.allergies}
            onChange={(e) => handleInputChange('allergies', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Any allergies or medical allergies"
            rows={2}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Medical Conditions</label>
          <textarea
            value={studentData.medicalConditions}
            onChange={(e) => handleInputChange('medicalConditions', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Any medical conditions or medications"
            rows={2}
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous School Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Previous School Name</label>
          <input
            type="text"
            value={studentData.previousSchoolName}
            onChange={(e) => handleInputChange('previousSchoolName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="School name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
          <input
            type="text"
            value={studentData.previousSchoolBoard}
            onChange={(e) => handleInputChange('previousSchoolBoard', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., CBSE, ICSE, State"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Percentage/Grade</label>
          <input
            type="text"
            value={studentData.previousSchoolPercentage}
            onChange={(e) => handleInputChange('previousSchoolPercentage', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 85% or Grade A"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
          <textarea
            value={studentData.leavingReason}
            onChange={(e) => handleInputChange('leavingReason', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Reason for leaving previous school"
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">House & Dormitory Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">House</label>
          <select
            value={studentData.houseId}
            onChange={(e) => handleInputChange('houseId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select House (Optional)</option>
            {houses.filter(h => h.isActive).map(house => (
              <option key={house._id} value={house._id}>
                {house.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isDormitory"
            checked={studentData.isDormitory}
            onChange={(e) => {
              handleInputChange('isDormitory', e.target.checked);
              if (!e.target.checked) {
                handleInputChange('roomNumber', '');
              }
            }}
            className="mr-2"
          />
          <label htmlFor="isDormitory" className="text-sm font-medium text-gray-700">
            Is Dormitory Student? (Hostel)
          </label>
        </div>

        {studentData.isDormitory && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number *</label>
            <input
              type="text"
              value={studentData.roomNumber}
              onChange={(e) => handleInputChange('roomNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter room number"
              required={studentData.isDormitory}
            />
            <p className="text-xs text-gray-500 mt-1">
              {studentData.houseId ? 'Student will be assigned to the selected house.' : 'Select a house for this dormitory student.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h3>
      <p className="text-sm text-gray-600 mb-4">Upload required documents. You can upload TC, Birth Certificate, Aadhar Card, and other relevant documents.</p>

      <div className="space-y-3">
        {studentData.documents.map((doc, idx) => (
          <div key={idx} className="border border-gray-300 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select
                  value={doc.type}
                  onChange={(e) => handleDocumentTypeChange(idx, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="transfer_certificate">Transfer Certificate (TC)</option>
                  <option value="birth_certificate">Birth Certificate</option>
                  <option value="aadhar_card">Aadhar Card</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => handleFileChange(idx, e.target.files?.[0] || null)}
                    className="hidden"
                    id={`file-${idx}`}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor={`file-${idx}`}
                    className="flex items-center justify-center w-full px-3 py-2 border border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Upload size={16} />
                      {doc.fileName ? doc.fileName : 'Click to upload'}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Stepper Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center flex-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold mb-2 transition-all ${
                  currentStep >= step.number
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {currentStep > step.number ? '✓' : step.number}
              </div>
              <span className="text-xs text-gray-600 text-center">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-96 mb-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        {currentStep === steps.length ? (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{loading ? 'Submitting Enrollment...' : 'Complete Enrollment'}</span>
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            Next
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default StudentEnrollmentStepper;
