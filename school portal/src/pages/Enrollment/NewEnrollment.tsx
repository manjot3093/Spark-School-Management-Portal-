import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserPlus, BookOpen, CheckCircle2, AlertCircle, X, ArrowRight, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import StudentEnrollmentStepper from '../../components/StudentEnrollmentStepper';

const NewEnrollment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Track top-level error message and enrollment success screen state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);
  const [enrolledStudent, setEnrolledStudent] = useState<{
    name: string;
    rollNumber?: string;
    admissionNumber?: string;
  } | null>(null);
  
  // Extract admission data if redirected from Admissions page
  const admissionData = location.state?.admissionData;

  const handleEnrollmentSubmit = async (formData: any) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const payload = new FormData();

      // Helper to append non-empty values
      const appendIfNotEmpty = (key: string, value: any) => {
        if (value !== null && value !== undefined && value !== '') {
          payload.append(key, value);
        }
      };

      // Append student details (ensuring email is normalized to lowercase)
      appendIfNotEmpty('studentName', formData.studentName);
      appendIfNotEmpty('dateOfBirth', formData.dateOfBirth);
      appendIfNotEmpty('gender', formData.gender);
      appendIfNotEmpty('email', formData.email ? formData.email.toLowerCase().trim() : formData.email);
      appendIfNotEmpty('password', formData.password);
      appendIfNotEmpty('phone', formData.phone);
      appendIfNotEmpty('address', formData.address);
      appendIfNotEmpty('class', formData.class);

      // Only append roll number if provided
      if (formData.rollNumber && formData.rollNumber.trim()) {
        payload.append('rollNumber', formData.rollNumber);
      }

      // Only append admission number if provided
      if (formData.admissionNumber && formData.admissionNumber.trim()) {
        payload.append('admissionNumber', formData.admissionNumber);
      }

      appendIfNotEmpty('admissionDate', formData.admissionDate);

      // Append student photo if provided
      if (formData.photo) {
        console.log('📸 Appending photo to FormData:', {
          fileName: formData.photo.name,
          size: formData.photo.size,
          type: formData.photo.type,
          isFile: formData.photo instanceof File
        });
        payload.append('avatar', formData.photo);
      } else {
        console.log('⚠️ No photo found in formData');
      }

      // Append parent details (only if all required fields are provided)
      if (formData.parentName && formData.parentEmail && formData.parentPassword) {
        appendIfNotEmpty('parentName', formData.parentName);
        appendIfNotEmpty('parentRelation', formData.parentRelation || 'parent');
        appendIfNotEmpty('parentPhone', formData.parentPhone);
        appendIfNotEmpty('parentEmail', formData.parentEmail ? formData.parentEmail.toLowerCase().trim() : formData.parentEmail);
        appendIfNotEmpty('parentPassword', formData.parentPassword);
      }

      // Append medical details as individual fields
      appendIfNotEmpty('bloodGroup', formData.bloodGroup);
      appendIfNotEmpty('allergies', formData.allergies);
      appendIfNotEmpty('medicalConditions', formData.medicalConditions);
      appendIfNotEmpty('emergencyContact', formData.emergencyContact);
      appendIfNotEmpty('emergencyContactPhone', formData.emergencyContactPhone);

      // Append previous school details as individual fields
      appendIfNotEmpty('previousSchoolName', formData.previousSchoolName);
      appendIfNotEmpty('previousSchoolBoard', formData.previousSchoolBoard);
      appendIfNotEmpty('previousSchoolPercentage', formData.previousSchoolPercentage);
      appendIfNotEmpty('leavingReason', formData.leavingReason);

      // Append house and dormitory details
      if (formData.houseId) {
        appendIfNotEmpty('houseId', formData.houseId);
      }
      if (formData.isDormitory) {
        payload.append('isDormitory', 'true');
        if (formData.roomNumber) {
          appendIfNotEmpty('roomNumber', formData.roomNumber);
        }
      }

      // Append documents
      if (formData.documents && formData.documents.length > 0) {
        formData.documents.forEach((doc: any, index: number) => {
          if (doc.file) {
            payload.append(`documents`, doc.file);
          }
        });
      }

      // Log FormData contents for debugging
      console.log('📤 Sending enrollment request with data:', {
        studentName: formData.studentName,
        email: formData.email,
        class: formData.class,
        parentEmail: formData.parentEmail,
        hasParentData: !!(formData.parentName && formData.parentPassword),
        documentCount: formData.documents?.filter((d: any) => d.file).length || 0
      });

      // Log FormData entries (for debugging)
      console.log('📋 FormData entries:');
      for (const [key, value] of payload.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      const response = await api.students.create(payload);
      console.log('✅ Enrollment response:', response);

      // Check if response indicates success
      if (response?.success === false) {
        const errorMsg = response?.error || response?.message || 'Failed to enroll student';
        const details = response?.details || [];
        const fullErrorMsg = details.length > 0 
          ? `${errorMsg}: ${details.map((d: any) => d.msg || d).join(', ')}`
          : errorMsg;
        toast.error(fullErrorMsg);
        throw new Error(fullErrorMsg);
      }

      toast.success('Student enrolled successfully!');
      setEnrollmentSuccess(true);
      setEnrolledStudent({
        name: formData.studentName || 'New Student',
        rollNumber: formData.rollNumber,
        admissionNumber: formData.admissionNumber,
      });
      
    } catch (error: any) {
      console.error('❌ Enrollment error:', error);
      console.error('Error details:', {
        message: error?.message,
        error: error?.error,
        response: error?.response,
        stack: error?.stack
      });
      
      // Extract error message from various possible formats
      let message = 'Failed to enroll student';
      if (error?.message) {
        message = error.message;
      } else if (error?.error) {
        message = error.error;
      } else if (typeof error === 'string') {
        message = error;
      } else if (error?.response?.data?.error) {
        message = error.response.data.error;
        // Include validation details if available
        if (error.response.data.details && Array.isArray(error.response.data.details)) {
          message += ': ' + error.response.data.details.map((d: any) => d.msg || d).join(', ');
        }
      } else if (error?.response?.data?.message) {
        message = error.response.data.message;
      }
      
      toast.error(message);
      setErrorMessage(message);
      throw error; // Re-throw to let the stepper handle it
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#20386b] px-6 py-8 text-white shadow-[0_20px_50px_#243d711f] md:px-9 md:py-10">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[34px] border-[#f57a3224]" aria-hidden="true" />
        <div className="relative mb-5 text-xs font-bold uppercase tracking-[.18em] text-[#ffad72]">Student journey / registration</div>
        <div className="relative flex items-center gap-4">
          <div className="rounded-2xl bg-[#ffffff20] p-3 ring-1 ring-white/20">
            <UserPlus className="h-7 w-7 text-[#ffad72]" />
          </div>
          <div>
            <h1 className="font-['Manrope'] text-3xl font-extrabold tracking-[-.05em] md:text-[40px]">New student enrollment</h1>
            <p className="mt-1 text-sm text-[#d9e3f5]">Add the student, family and school details in six guided steps.</p>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg flex items-start justify-between shadow-sm">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">Enrollment Failed</h3>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setErrorMessage(null)} 
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Dismiss error"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Post-Enrollment Success Confirmation Screen */}
      {enrollmentSuccess ? (
        <div className="mx-auto my-8 max-w-2xl rounded-[24px] border border-[#dce8df] bg-white p-8 text-center shadow-[0_16px_50px_#20386312]">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Enrollment Completed Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Student <span className="font-semibold text-gray-800">{enrolledStudent?.name}</span> has been officially registered into the system.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 inline-flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            {enrolledStudent?.admissionNumber && (
              <div>
                <span className="font-medium text-gray-500">Admission No: </span>
                <span className="font-bold text-gray-900">{enrolledStudent.admissionNumber}</span>
              </div>
            )}
            {enrolledStudent?.rollNumber && (
              <div>
                <span className="font-medium text-gray-500">Roll No: </span>
                <span className="font-bold text-gray-900">{enrolledStudent.rollNumber}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                setEnrollmentSuccess(false);
                setEnrolledStudent(null);
                setErrorMessage(null);
              }}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Enroll Another Student
            </button>
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="inline-flex items-center justify-center rounded-xl bg-[#f4782e] px-5 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-[#db6222]"
            >
              View Student List
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Info Banner */}
          <div className="mb-6 rounded-2xl border border-[#dfe6f2] bg-white p-5 shadow-[0_10px_30px_#2038630a]">
            <div className="flex items-start space-x-3">
              <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#f07831]" />
              <div className="flex-1">
                <h3 className="mb-1 text-sm font-bold text-[#20386b]">How enrollment works</h3>
                <p className="text-xs leading-5 text-[#68758e]">
                  Please complete all 6 steps to enroll a new student. Required fields are marked with an asterisk (*). 
                  You can navigate between steps using the Previous and Next buttons.
                </p>
              </div>
            </div>
          </div>

          {/* Enrollment Stepper */}
          <StudentEnrollmentStepper 
            onSubmit={handleEnrollmentSubmit} 
            loading={loading} 
            prefillData={admissionData}
          />
        </>
      )}
    </main>
  );
};

export default NewEnrollment;

