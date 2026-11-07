import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  BookOpen,
  GraduationCap,
  Clock,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const Classes: React.FC = () => {
  const { state: authState } = useAuth();
  const [activeTab, setActiveTab] = useState('manage');
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showManageSubjectsModal, setShowManageSubjectsModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [admissionNumberFilter, setAdmissionNumberFilter] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [availableData, setAvailableData] = useState<any>({});

  // Pagination states
  const [classPage, setClassPage] = useState(1);
  const [classPageSize, setClassPageSize] = useState(10);
  const [subjectPage, setSubjectPage] = useState(1);
  const [subjectPageSize, setSubjectPageSize] = useState(10);
  // Schedule state (was missing) — used when fetching schedule data
  const [schedules, setSchedules] = useState<any[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<any>({});

  // Helper functions to get teacher-specific data
  const getTeacherClasses = (teacherId: string) => {
    if (!teacherId) return [];

    // Get classes where teacher is the class teacher
    const classTeacherClasses = Array.isArray(classes) ? classes.filter(cls => {
      const classTeacherId = cls.teacherId?._id || cls.teacherId;
      return classTeacherId === teacherId;
    }) : [];

    // Get classes where teacher teaches subjects
    const subjectTeacherClasses = Array.isArray(subjects) ? subjects
      .filter(subject => {
        const subjectTeacherId = subject.teacherId?._id || subject.teacherId;
        return subjectTeacherId === teacherId;
      })
      .map(subject => {
        const classId = subject.classId?._id || subject.classId;
        return classes.find(cls => (cls._id === classId));
      })
      .filter(Boolean) // Remove undefined values
      .filter((cls, index, arr) => arr.findIndex(c => c._id === cls._id) === index) // Remove duplicates
      : [];

    // Combine both lists and remove duplicates
    const allTeacherClasses = [...classTeacherClasses, ...subjectTeacherClasses];
    const uniqueClasses = allTeacherClasses.filter((cls, index, arr) =>
      arr.findIndex(c => c._id === cls._id) === index
    );

    // Debug logging
    console.log(`🔍 Teacher ${teacherId} classes:`, {
      totalClasses: classes.length,
      classTeacherClasses: classTeacherClasses.length,
      subjectTeacherClasses: subjectTeacherClasses.length,
      uniqueClasses: uniqueClasses.length,
      classNames: uniqueClasses.map(c => `${c.name} - Section ${c.section}`),
      allClasses: classes.map(c => ({
        name: c.name,
        section: c.section,
        teacherId: c.teacherId,
        teacherIdType: typeof c.teacherId,
        teacherIdValue: c.teacherId?._id || c.teacherId
      }))
    });

    return uniqueClasses;
  };

  const getTeacherSubjects = (teacherId: string, classId?: string) => {
    if (!teacherId) return [];

    const filteredSubjects = Array.isArray(subjects) ? subjects.filter(subject => {
      // Handle both populated (object) and unpopulated (string) teacherId
      const subjectTeacherId = subject.teacherId?._id || subject.teacherId;
      const subjectClassId = subject.classId?._id || subject.classId;

      // If classId is provided, filter by both teacher and class
      if (classId) {
        return subjectTeacherId === teacherId && subjectClassId === classId;
      }

      // Otherwise, just filter by teacher
      return subjectTeacherId === teacherId;
    }) : [];

    // Debug logging
    console.log(`🔍 Teacher ${teacherId} subjects${classId ? ` for class ${classId}` : ''}:`, {
      totalSubjects: subjects.length,
      filteredSubjects: filteredSubjects.length,
      subjectNames: filteredSubjects.map(s => s.name)
    });

    return filteredSubjects;
  };

  const tabs = [
    { id: 'manage', label: 'Classes' },
    { id: 'students', label: 'Promote Students' },
    { id: 'teachers', label: 'Teacher & Subject Allocation' }
  ];

  const [newClass, setNewClass] = useState({
    name: '',
    section: '',
    teacher: '',
    capacity: '',
    room: '',
    academicYear: '2024-2025'
  });

  const [editClass, setEditClass] = useState({
    name: '',
    section: '',
    teacher: '',
    capacity: '',
    room: '',
    academicYear: ''
  });

  const [newSubject, setNewSubject] = useState({
    name: '',
    classIds: [] as string[], // Array for multiple classes
    teacherId: '',
    type: 'core' // core, elective, practical
  });

  // Teacher search state for autocomplete
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);





  // Check authentication status using auth context
  const checkAuthStatus = () => {
    console.log('🔐 Auth Status Check:');
    console.log('  Is authenticated:', authState.isAuthenticated);
    console.log('  User role:', authState.user?.role);
    console.log('  School ID:', authState.user?.schoolId);

    if (!authState.isAuthenticated) {
      console.log('⚠️ User not authenticated - redirecting to login');
      toast.error('Please log in to access this page.');
      window.location.href = '/login';
      return;
    }

    if (authState.user?.role !== 'school_admin' && authState.user?.role !== 'admin') {
      console.log('⚠️ User does not have school_admin role');
      toast.error('Access denied. School admin role required.');
      return;
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    checkAuthStatus();
    fetchData();
  }, [authState.isAuthenticated, authState.user]);

  // Close teacher dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showTeacherDropdown && !target.closest('[data-teacher-dropdown]')) {
        setShowTeacherDropdown(false);
      }
    };

    if (showTeacherDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showTeacherDropdown]);

  const fetchData = async () => {
    try {
      // First, try to fetch basic data that should work
      const [classesData, teachersData, subjectsData, studentsData] = await Promise.all([
        api.classroom.getClasses(),
        api.classroom.getTeachers(),
        api.subjects.getAll(), // Use the correct subjects API
        api.classroom.getStudents({ limit: 1000 }) // Fetch all students
      ]);

      // Handle basic data
      const classes = classesData?.data || classesData || [];
      const teachers = teachersData?.data || teachersData || [];
      const subjects = subjectsData?.data || subjectsData || [];
      const students = studentsData?.data || studentsData || [];

      // Set basic data first
      setClasses(Array.isArray(classes) ? classes : []);
      setTeachers(Array.isArray(teachers) ? teachers : []);
      setSubjects(Array.isArray(subjects) ? subjects : []);
      setStudents(Array.isArray(students) ? students : []);

      // Now try to fetch schedule data separately with better error handling
      let schedulesData, weeklyData, availableDataResponse;
      try {
        [schedulesData, weeklyData, availableDataResponse] = await Promise.all([
          api.schedule.getAll(),
          api.schedule.getWeekly(),
          api.schedule.getAvailable()
        ]);

        // Handle schedule data
        const schedules = schedulesData?.data || schedulesData || [];
        const weekly = weeklyData?.data || weeklyData || {};
        const available = availableDataResponse?.data || availableDataResponse || {};

        setSchedules(Array.isArray(schedules) ? schedules : []);
        setWeeklySchedule(weekly);
        setAvailableData(available);

        console.log('✅ Schedule data loaded successfully:', {
          schedulesCount: schedules.length,
          weeklyKeys: Object.keys(weekly).length,
          availableData: Object.keys(available).length
        });

      } catch (scheduleError) {
        console.error('⚠️ Schedule data fetch failed:', scheduleError);

        // Set empty schedule data but don't fail the entire component
        setSchedules([]);
        setWeeklySchedule({});
        setAvailableData({});

        // Show user-friendly error message
        const errorMessage = (scheduleError as Error).message;
        if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
          if (errorMessage.includes('Required role: school_admin')) {
            toast.error('Authentication issue detected. Please log out and log in again to refresh your session.');
          } else {
            toast.error('Schedule access denied. Please check your school permissions or contact administrator.');
          }
        } else {
          toast.error('Failed to load schedule data. Basic functionality still available.');
        }
      }

      console.log('📋 Basic Data Loaded:', {
        classes: classes.length,
        teachers: teachers.length,
        subjects: subjects.length,
        students: students.length
      });

      // Debug: Check student-class relationships
      console.log('🔗 Student-Class Relationships:');
      students.forEach((student: any) => {
        console.log(`Student: ${student.name}, classId: ${student.classId} (type: ${typeof student.classId})`);
      });

      classes.forEach((cls: any) => {
        const classStudents = students.filter((student: any) =>
          student.classId &&
          (typeof student.classId === 'string' ? student.classId === cls._id : student.classId._id === cls._id)
        );
        console.log(`Class ${cls.name} (${cls._id}) has ${classStudents.length} students (backend: ${cls.studentCount})`);
      });

    } catch (error) {
      console.error('Error fetching basic data:', error);
      toast.error('Failed to fetch basic data');
      // Set empty arrays on error to prevent filter errors
      setClasses([]);
      setTeachers([]);
      setSubjects([]);
      setStudents([]);
      setAvailableData({});
    }
  };

  const grades = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D', 'E'];

  // CRUD Operations
  const handleAddClass = async () => {
    try {
      if (!newClass.name || !newClass.section || !newClass.capacity || !newClass.teacher) {
        toast.error('Please fill in all required fields');
        return;
      }

      const classData = {
        name: newClass.name,
        section: newClass.section,
        teacherId: newClass.teacher,
        capacity: parseInt(newClass.capacity),
        room: newClass.room,
        academicYear: newClass.academicYear
      };

      console.log('Creating class with data:', classData);
      const response = await api.classroom.createClass(classData);
      console.log('API response:', response);

      // Extract the class data from the response
      const createdClass = response.data || response;

      // Update the classes list
      setClasses(prevClasses => [...prevClasses, createdClass]);

      // Close modal and reset form
      setShowAddClassModal(false);
      setNewClass({ name: '', section: '', teacher: '', capacity: '', room: '', academicYear: '2024-2025' });

      // Show success message
      toast.success('Class created successfully');
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error('Failed to create class');
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!editClass.name || !editClass.section || !editClass.capacity || !editClass.teacher) {
        toast.error('Please fill in all required fields');
        return;
      }

      const classData = {
        name: editClass.name,
        section: editClass.section,
        teacherId: editClass.teacher,
        capacity: parseInt(editClass.capacity),
        room: editClass.room,
        academicYear: editClass.academicYear
      };

      const updatedClass = await api.classroom.updateClass(selectedClass._id, classData);
      setClasses(classes.map(cls => cls._id === selectedClass._id ? updatedClass : cls));
      setShowEditClassModal(false);
      setSelectedClass(null);
      toast.success('Class updated successfully');
    } catch (error) {
      console.error('Error updating class:', error);
      toast.error('Failed to update class');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!window.confirm('Are you sure you want to delete this class?')) {
      return;
    }

    try {
      await api.classroom.deleteClass(classId);
      setClasses(classes.filter(cls => cls._id !== classId));
      toast.success('Class deleted successfully');
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class');
    }
  };



  const handleManageStudents = (cls: any) => {
    setSelectedClass(cls);
    setAdmissionNumberFilter('');
    setShowManageStudentsModal(true);
  };

  const handleAssignStudentToClass = async (studentId: string, classId: string) => {
    try {
      await api.classroom.assignToClass(studentId, classId);
      // Refresh students data
      const studentsData = await api.classroom.getStudents({ limit: 1000 });
      const students = studentsData?.data || studentsData || [];
      setStudents(Array.isArray(students) ? students : []);
      toast.success('Student assigned to class successfully');
    } catch (error) {
      console.error('Error assigning student to class:', error);
      toast.error('Failed to assign student to class');
    }
  };

  const handleRemoveStudentFromClass = async (studentId: string) => {
    try {
      await api.classroom.removeFromClass(studentId);
      // Refresh students data
      const studentsData = await api.classroom.getStudents({ limit: 1000 });
      const students = studentsData?.data || studentsData || [];
      setStudents(Array.isArray(students) ? students : []);
      toast.success('Student removed from class successfully');
    } catch (error) {
      console.error('Error removing student from class:', error);
      toast.error('Failed to remove student from class');
    }
  };


  const handleRemoveSubject = async (subjectId: string) => {
    try {
      await api.classroom.deleteSubject(subjectId);
      // Refresh subjects data
      const subjectsDataResponse = await api.classroom.getSubjects();
      const refreshedSubjects = subjectsDataResponse?.data || subjectsDataResponse || [];
      setSubjects(Array.isArray(refreshedSubjects) ? refreshedSubjects : []);
      toast.success('Subject removed successfully');
    } catch (error) {
      console.error('Error removing subject:', error);
      toast.error('Failed to remove subject');
    }
  };

  const handleEditSubject = (subject: any) => {
    const teacherId = subject.teacherId?._id || subject.teacherId || '';
    const subjectName = subject.name;

    // Find all subjects with the same name and teacher (multiple classes)
    const relatedSubjects = Array.isArray(subjects) ? subjects.filter(s => {
      const sTeacherId = s.teacherId?._id || s.teacherId || '';
      return s.name === subjectName && sTeacherId === teacherId;
    }) : [];

    // Get all class IDs from related subjects
    const allClassIds = relatedSubjects
      .map(s => s.classId?._id || s.classId || '')
      .filter(Boolean);

    // Populate form with all related subject data
    setNewSubject({
      name: subject.name,
      classIds: allClassIds.length > 0 ? allClassIds : [subject.classId?._id || subject.classId || ''],
      teacherId: teacherId,
      type: subject.type || 'core'
    });
    setTeacherSearchTerm(subject.teacherId?.name || '');
    setEditingSubjectId(subject._id);
    setShowManageSubjectsModal(false);
    setShowAddSubjectModal(true);
  };




  const handleAddSubject = async () => {
    try {
      if (!newSubject.name || !newSubject.classIds.length || !newSubject.teacherId) {
        toast.error('Please fill in all required fields');
        return;
      }

      const subjectPayload = {
        name: newSubject.name,
        teacherId: newSubject.teacherId,
        type: newSubject.type
      };

      if (editingSubjectId) {
        // Find the original subject being edited to get name and teacher
        const originalSubject = subjects.find((s: any) =>
          (s._id === editingSubjectId || s.id === editingSubjectId)
        );

        if (!originalSubject) {
          toast.error('Subject not found');
          return;
        }

        const originalTeacherId = originalSubject.teacherId?._id || originalSubject.teacherId || '';
        const originalName = originalSubject.name;

        // Find all existing subjects with same name + teacher (all classes this teacher teaches this subject)
        const existingSubjects = Array.isArray(subjects) ? subjects.filter((s: any) => {
          const sTeacherId = s.teacherId?._id || s.teacherId || '';
          return s.name === originalName && sTeacherId === originalTeacherId;
        }) : [];

        const existingClassIds = existingSubjects.map((s: any) =>
          s.classId?._id || s.classId || ''
        ).filter(Boolean);

        // Determine which classes to add and which to remove
        const classesToAdd = newSubject.classIds.filter(id => !existingClassIds.includes(id));
        const classesToRemove = existingClassIds.filter(id => !newSubject.classIds.includes(id));

        // Delete subjects for removed classes
        const deletePromises = existingSubjects
          .filter((s: any) => {
            const sClassId = s.classId?._id || s.classId || '';
            return classesToRemove.includes(sClassId);
          })
          .map((s: any) => api.classroom.deleteSubject(s._id || s.id));

        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }

        // Create new subjects for added classes
        const createPromises = classesToAdd.map(classId =>
          api.classroom.createSubject({
            ...subjectPayload,
            classId
          })
        );

        if (createPromises.length > 0) {
          await Promise.all(createPromises);
        }

        // Update the first existing subject's type (if type changed)
        if (existingSubjects.length > 0 && newSubject.type !== originalSubject.type) {
          const firstSubjectId = existingSubjects[0]._id || existingSubjects[0].id;
          await api.classroom.updateSubject(firstSubjectId, {
            name: newSubject.name,
            teacherId: newSubject.teacherId,
            type: newSubject.type
          });
        }

        const changes = [];
        if (classesToAdd.length > 0) changes.push(`added to ${classesToAdd.length} class(es)`);
        if (classesToRemove.length > 0) changes.push(`removed from ${classesToRemove.length} class(es)`);

        toast.success(`Subject updated successfully${changes.length > 0 ? `: ${changes.join(', ')}` : ''}`);
      } else {
        // Create new subject for each selected class
        const createPromises = newSubject.classIds.map(classId =>
          api.classroom.createSubject({
            ...subjectPayload,
            classId
          })
        );
        await Promise.all(createPromises);
        toast.success(`Subject created successfully for ${newSubject.classIds.length} class(es)`);
      }

      // Refresh subjects data
      const subjectsDataResponse = await api.classroom.getSubjects();
      const refreshedSubjects = subjectsDataResponse?.data || subjectsDataResponse || [];
      setSubjects(Array.isArray(refreshedSubjects) ? refreshedSubjects : []);

      // Reset form
      setNewSubject({
        name: '',
        classIds: [],
        teacherId: '',
        type: 'core'
      });
      setTeacherSearchTerm('');
      setShowTeacherDropdown(false);
      setEditingSubjectId(null);
      setShowAddSubjectModal(false);
    } catch (error: any) {
      console.error('Error creating/updating subject:', error);
      const errorMessage = error?.message || 'Failed to create/update subject';
      toast.error(errorMessage);
    }
  };

  const handleAssignSubjectToTeacher = async (subjectId: string, teacherId: string) => {
    try {
      await api.classroom.assignSubjectTeacher(subjectId, teacherId);
      // Refresh subjects data
      const subjectsDataResponse = await api.classroom.getSubjects();
      const refreshedSubjects = subjectsDataResponse?.data || subjectsDataResponse || [];
      setSubjects(Array.isArray(refreshedSubjects) ? refreshedSubjects : []);
      toast.success('Subject assigned to teacher successfully');
    } catch (error) {
      console.error('Error assigning subject to teacher:', error);
      toast.error('Failed to assign subject to teacher');
    }
  };



  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await handleAddClass();
  };



  const filteredClasses = Array.isArray(classes) ? classes.filter(cls => {
    const matchesSearch = (cls.name && cls.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cls.teacherId && cls.teacherId.name && cls.teacherId.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGrade = filterGrade === 'all' || cls.name === filterGrade;
    return matchesSearch && matchesGrade;
  }) : [];

  const exportTeacherAssignmentData = (format: 'csv' | 'json') => {
    try {
      let content = '';
      let filename = '';

      // Build teacher assignment data
      const teacherData = teachers.map(teacher => {
        const classTeacherClasses = Array.isArray(classes) ? classes.filter(cls => {
          const classTeacherId = cls.teacherId?._id || cls.teacherId;
          return classTeacherId === teacher._id;
        }) : [];

        const assignedSubjects = Array.isArray(subjects) ? subjects.filter(subject => {
          const subjectTeacherId = subject.teacherId?._id || subject.teacherId;
          return subjectTeacherId === teacher._id;
        }) : [];

        return {
          teacher: teacher.name,
          email: teacher.email,
          assignedClasses: classTeacherClasses.map(cls => `${cls.name} - ${cls.section}`).join('; '),
          assignedSubjects: assignedSubjects.map(s => s.name).join('; '),
          subjectCount: assignedSubjects.length,
          classCount: classTeacherClasses.length
        };
      });

      if (format === 'csv') {
        // CSV format
        const headers = ['Teacher Name', 'Email', 'Assigned Classes', 'Assigned Subjects', 'Class Count', 'Subject Count'];
        const rows = teacherData.map(t => [
          t.teacher,
          t.email,
          t.assignedClasses || 'None',
          t.assignedSubjects || 'None',
          t.classCount,
          t.subjectCount
        ]);

        content = [headers, ...rows].map(row =>
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        filename = `teacher_assignments_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        // JSON format
        content = JSON.stringify(teacherData, null, 2);
        filename = `teacher_assignments_${new Date().toISOString().split('T')[0]}.json`;
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

      toast.success(`Teacher assignments exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const exportClassData = (format: 'csv' | 'json') => {
    try {
      let content = '';
      let filename = '';

      if (format === 'csv') {
        // CSV format
        const headers = ['Class', 'Section', 'Teacher', 'Students Count', 'Capacity', 'Room', 'Academic Year'];
        const rows = classes.map(cls => [
          cls.name,
          cls.section,
          cls.teacherId?.name || 'N/A',
          (students.filter(s => s.classId?._id === cls._id || s.classId === cls._id)).length,
          cls.capacity || 'N/A',
          cls.room || 'N/A',
          cls.academicYear || 'N/A'
        ]);

        content = [headers, ...rows].map(row =>
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        filename = `classes_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        // JSON format
        const exportData = classes.map(cls => ({
          name: cls.name,
          section: cls.section,
          teacher: cls.teacherId?.name || 'N/A',
          studentsCount: students.filter(s => s.classId?._id === cls._id || s.classId === cls._id).length,
          capacity: cls.capacity,
          room: cls.room,
          academicYear: cls.academicYear
        }));
        content = JSON.stringify(exportData, null, 2);
        filename = `classes_${new Date().toISOString().split('T')[0]}.json`;
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

      toast.success(`Classes exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const renderMergedClassView = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Classes</p>
              <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
              <p className="text-sm text-blue-600">Active classes</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{students.length}</p>
              <p className="text-sm text-green-600">Enrolled students</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Teachers</p>
              <p className="text-3xl font-bold text-gray-900">{teachers.length}</p>
              <p className="text-sm text-purple-600">Teaching staff</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <GraduationCap className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Manage Classes Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Manage Classes</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportClassData('csv')}
              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center justify-center space-x-1 text-sm whitespace-nowrap shadow-xs"
            >
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => exportClassData('json')}
              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center justify-center space-x-1 text-sm whitespace-nowrap shadow-xs"
            >
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => setShowAddClassModal(true)}
              className="bg-blue-600 text-white px-3.5 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-1.5 text-sm font-medium whitespace-nowrap shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Class</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3.5 sm:p-5 md:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Class</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Section</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Teacher</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Students</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Capacity</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Room</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes
                  .slice((classPage - 1) * classPageSize, classPage * classPageSize)
                  .map((cls) => {
                  const classStudents = students.filter(s => s.classId?._id === cls._id || s.classId === cls._id);
                  return (
                    <tr key={cls._id} className="border-b hover:bg-gray-50">
                      <td className="py-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{typeof cls.name === 'string' ? cls.name : String(cls.name || '')}</span>
                        </div>
                      </td>
                      <td className="py-2 text-sm text-gray-600">{typeof cls.section === 'string' ? cls.section : String(cls.section || '')}</td>
                      <td className="py-2 text-sm text-gray-600">{cls.teacherId?.name || 'N/A'}</td>
                      <td className="py-2 text-sm text-gray-600">{classStudents.length}</td>
                      <td className="py-2 text-sm text-gray-600">{typeof cls.capacity === 'number' || typeof cls.capacity === 'string' ? cls.capacity : String(cls.capacity || '')}</td>
                      <td className="py-2 text-sm text-gray-600">{cls.room || 'N/A'}</td>
                      <td className="py-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditClass({
                                name: cls.name,
                                section: cls.section,
                                teacher: cls.teacherId?._id || cls.teacherId || '',
                                capacity: String(cls.capacity),
                                room: cls.room || '',
                                academicYear: cls.academicYear
                              });
                              setSelectedClass(cls);
                              setShowEditClassModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls._id)}
                            className="text-red-600 hover:text-red-800 flex items-center space-x-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {classes.length > 0 && (
            <Pagination
              currentPage={classPage}
              pageSize={classPageSize}
              totalItems={classes.length}
              onPageChange={setClassPage}
              onPageSizeChange={setClassPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </div>
      </div>
    </div>
  );

  const renderClassOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Classes</p>
              <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
              <p className="text-sm text-blue-600">Active classes</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{students.length}</p>
              <p className="text-sm text-green-600">Enrolled students</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Teachers</p>
              <p className="text-3xl font-bold text-gray-900">{teachers.length}</p>
              <p className="text-sm text-purple-600">Teaching staff</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <GraduationCap className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );

  const renderManageClasses = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Manage Classes</h3>
        <button
          onClick={() => setShowAddClassModal(true)}
          className="bg-blue-600 text-white px-3.5 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-1.5 text-sm font-medium whitespace-nowrap shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Class</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-3.5 sm:p-5 md:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium text-gray-600">Class</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Section</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Teacher</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Students</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Capacity</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Room</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((cls) => (
                <tr key={cls._id} className="border-b">
                  <td className="py-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900">{cls.name}</span>
                    </div>
                  </td>
                  <td className="py-2 text-sm text-gray-600">{cls.section}</td>
                  <td className="py-2 text-sm text-gray-600">{cls.teacherId ? cls.teacherId.name : 'Not assigned'}</td>
                  <td className="py-2">
                    {(() => {
                      // Use studentCount from backend, fallback to frontend calculation
                      const classStudentCount = cls.studentCount !== undefined
                        ? cls.studentCount
                        : (Array.isArray(students)
                          ? students.filter(student =>
                            student.classId &&
                            (typeof student.classId === 'string' ? student.classId === cls._id : student.classId._id === cls._id)
                          ).length
                          : 0);

                      const isAtCapacity = classStudentCount >= cls.capacity;
                      const isNearCapacity = classStudentCount >= cls.capacity * 0.8;

                      return (
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${isAtCapacity ? 'bg-red-100 text-red-800' :
                            isNearCapacity ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}
                        >
                          {classStudentCount}/{cls.capacity}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-2 text-sm text-gray-600">{cls.capacity}</td>
                  <td className="py-2 text-sm text-gray-600">{cls.room || '-'}</td>
                  <td className="py-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedClass(cls);
                          setEditClass({
                            name: cls.name,
                            section: cls.section,
                            teacher: cls.teacherId ? cls.teacherId._id : '',
                            capacity: cls.capacity.toString(),
                            room: cls.room || '',
                            academicYear: '2024-2025'
                          });
                          setShowEditClassModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title="Edit Class"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls._id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        title="Delete Class"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderStudentAssignments = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Promote</h3>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-4">
          {Array.isArray(classes) ? classes.map((cls) => {
            const classStudents = Array.isArray(students) ? students.filter(student =>
              student.classId && student.classId._id === cls._id
            ) : [];
            return (
              <div key={cls._id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{(typeof cls.name === 'string' ? cls.name : String(cls.name || ''))} - Section {(typeof cls.section === 'string' ? cls.section : String(cls.section || ''))}</h4>
                    <p className="text-sm text-gray-600">{cls.teacherId?.name || 'N/A'} • {classStudents.length}/{typeof cls.capacity === 'number' || typeof cls.capacity === 'string' ? cls.capacity : String(cls.capacity || '')} students</p>
                  </div>
                  <button
                    onClick={() => handleManageStudents(cls)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Manage Students
                  </button>
                </div>

                {classStudents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {classStudents.slice(0, 6).map((student) => (
                      <div key={student.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{typeof student.name === 'string' ? student.name : String(student.name || '')}</p>
                          <p className="text-xs text-gray-500">Roll: {typeof student.rollNumber === 'number' || typeof student.rollNumber === 'string' ? student.rollNumber : String(student.rollNumber || '')}</p>
                        </div>
                      </div>
                    ))}
                    {classStudents.length > 6 && (
                      <div className="flex items-center justify-center p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-500">+{classStudents.length - 6} more</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No students assigned to this class</p>
                )}
              </div>
            );
          }) : (
            <div className="text-center py-4 text-gray-500">No classes available</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMergedTeacherView = () => (
    <div className="space-y-6">
      {/* Teacher Assignments Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Teacher Assignments</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportTeacherAssignmentData('csv')}
              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center justify-center space-x-1 text-sm whitespace-nowrap shadow-xs"
            >
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => exportTeacherAssignmentData('json')}
              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 flex items-center justify-center space-x-1 text-sm whitespace-nowrap shadow-xs"
            >
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-3.5 sm:p-5 md:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Classes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Subjects</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(teachers) ? teachers.map((teacher) => {
                  // Get classes where teacher is the class teacher
                  const classTeacherClasses = Array.isArray(classes) ? classes.filter(cls => {
                    const classTeacherId = cls.teacherId?._id || cls.teacherId;
                    return classTeacherId === teacher._id;
                  }) : [];

                  // Get subjects assigned to this teacher
                  const assignedSubjects = Array.isArray(subjects) ? subjects.filter(subject => {
                    const subjectTeacherId = subject.teacherId?._id || subject.teacherId;
                    return subjectTeacherId === teacher._id;
                  }) : [];

                  // Get classes from subjects assigned to teacher (where subject has classId)
                  const classesFromSubjects = assignedSubjects
                    .filter(subject => {
                      const subjectClassId = subject.classId?._id || subject.classId;
                      return subjectClassId;
                    })
                    .map(subject => {
                      const subjectClassId = subject.classId?._id || subject.classId;
                      // If classId is populated (object), use it directly
                      if (subject.classId && typeof subject.classId === 'object') {
                        return subject.classId;
                      }
                      // Otherwise, find the class from the classes array
                      return Array.isArray(classes) ? classes.find(cls => {
                        const clsId = cls._id || cls.id;
                        return clsId === subjectClassId;
                      }) : null;
                    })
                    .filter(Boolean); // Remove null/undefined values

                  // Combine both sources and remove duplicates
                  const allAssignedClasses = [...classTeacherClasses, ...classesFromSubjects];
                  const assignedClasses = allAssignedClasses.filter((cls, index, arr) => {
                    const clsId = cls._id || cls.id;
                    return arr.findIndex(c => (c._id || c.id) === clsId) === index;
                  });

                  return (
                    <tr key={teacher._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{typeof teacher.name === 'string' ? teacher.name : String(teacher.name || '')}</div>
                            <div className="text-sm text-gray-500">{typeof teacher.email === 'string' ? teacher.email : String(teacher.email || '')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {assignedClasses.length > 0 ? (
                            assignedClasses.map((cls) => (
                              <div key={cls._id} className="flex items-center space-x-2 p-1 bg-blue-50 rounded text-xs">
                                <BookOpen className="h-3 w-3 text-blue-600" />
                                <span className="text-gray-700">{(typeof cls.name === 'string' ? cls.name : String(cls.name || ''))} - {(typeof cls.section === 'string' ? cls.section : String(cls.section || ''))}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">No classes assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {assignedSubjects.length > 0 ? (
                            assignedSubjects.map((subject) => (
                              <div key={subject._id} className="flex items-center space-x-2 p-1 bg-green-50 rounded text-xs">
                                <BookOpen className="h-3 w-3 text-green-600" />
                                <span className="text-gray-700">{typeof subject.name === 'string' ? subject.name : String(subject.name || '')}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">No subjects assigned</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">No teachers available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Subject Allocation Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Subject Allocation</h3>
          <button
            onClick={() => setShowAddSubjectModal(true)}
            className="bg-blue-600 text-white px-3.5 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-1.5 text-sm font-medium whitespace-nowrap shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Subject</span>
          </button>
        </div>

        {/* Simple Subject Allocation Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Subject Assignments</h4>
          </div>

          {Array.isArray(subjects) && subjects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teacher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjects
                    .slice((subjectPage - 1) * subjectPageSize, subjectPage * subjectPageSize)
                    .map((subject) => {
                    // Check if this teacher teaches this same subject to multiple classes
                    const teacherId = subject.teacherId?._id || subject.teacherId || '';
                    const subjectName = subject.name;
                    const relatedSubjectsCount = Array.isArray(subjects) ? subjects.filter((s: any) => {
                      const sTeacherId = s.teacherId?._id || s.teacherId || '';
                      return s.name === subjectName && sTeacherId === teacherId;
                    }).length : 0;
                    const isMultiClass = relatedSubjectsCount > 1;

                    return (
                      <tr key={subject._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <GraduationCap className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {subject.teacherId && typeof subject.teacherId === 'object' ? subject.teacherId.name : typeof subject.teacherId === 'string' ? subject.teacherId : 'Not assigned'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <BookOpen className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {subject.name}
                                {isMultiClass && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800" title={`This teacher teaches ${subject.name} to ${relatedSubjectsCount} classes`}>
                                    {relatedSubjectsCount} classes
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{typeof subject.code === 'string' ? subject.code : String(subject.code || '')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                              <Users className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {subject.classId && typeof subject.classId === 'object' ? `${subject.classId.name} - ${subject.classId.section}` : typeof subject.classId === 'string' ? subject.classId : 'Not assigned'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${subject.type === 'core' ? 'bg-blue-100 text-blue-800' :
                            subject.type === 'elective' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                            {subject.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleRemoveSubject(subject._id)}
                            className="text-red-600 hover:text-red-900 mr-3"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => handleEditSubject(subject)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">No subjects allocated yet</p>
            </div>
          )}
          {Array.isArray(subjects) && subjects.length > 0 && (
            <Pagination
              currentPage={subjectPage}
              pageSize={subjectPageSize}
              totalItems={subjects.length}
              onPageChange={setSubjectPage}
              onPageSizeChange={setSubjectPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </div>
      </div>
    </div>
  );


  const renderTabContent = () => {
    switch (activeTab) {
      case 'manage':
        return renderMergedClassView();
      case 'students':
        return renderStudentAssignments();
      case 'teachers':
        return renderMergedTeacherView();
      default:
        return renderMergedClassView();
    }
  };

  // Show loading spinner while checking authentication
  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classroom management...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access the classroom management system.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 sm:space-x-8 px-3.5 sm:px-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-3.5 sm:p-5 md:p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="relative mx-auto my-auto p-4 sm:p-6 border w-[calc(100%-1rem)] max-w-md shadow-2xl rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Class</h3>
              <form onSubmit={handleAddClassSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Name *</label>
                  <select
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Class</option>
                    {grades.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
                  <select
                    value={newClass.section}
                    onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Section</option>
                    {sections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Teacher *</label>
                  <select
                    value={newClass.teacher}
                    onChange={(e) => setNewClass({ ...newClass, teacher: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Teacher</option>
                    {Array.isArray(teachers) ? teachers.map(teacher => {
                      const teacherClasses = getTeacherClasses(teacher._id);
                      const assignedClassesText = teacherClasses.length > 0 
                        ? ` (Assigned to: ${teacherClasses.map(c => `${c.name}-${c.section}`).join(', ')})`
                        : ' (No classes assigned)';
                      return (
                        <option key={teacher._id} value={teacher._id}>
                          {teacher.name}{assignedClassesText}
                        </option>
                      );
                    }) : (
                      <option disabled>No teachers available</option>
                    )}
                  </select>
                  {newClass.teacher && (() => {
                    const selectedTeacher = teachers.find(t => t._id === newClass.teacher);
                    const teacherClasses = selectedTeacher ? getTeacherClasses(selectedTeacher._id) : [];
                    if (teacherClasses.length > 0) {
                      return (
                        <p className="mt-1 text-xs text-amber-600">
                          ⚠️ This teacher is already assigned to: {teacherClasses.map(c => `${c.name}-${c.section}`).join(', ')}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                  <input
                    type="number"
                    value={newClass.capacity}
                    onChange={(e) => setNewClass({ ...newClass, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
                  <input
                    type="text"
                    value={newClass.room}
                    onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Room 101"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddClassModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditClassModal && selectedClass && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="relative mx-auto my-auto p-4 sm:p-6 border w-[calc(100%-1rem)] max-w-md shadow-2xl rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Class</h3>
              <form onSubmit={handleEditClass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Name *</label>
                  <select
                    value={editClass.name}
                    onChange={(e) => setEditClass({ ...editClass, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {grades.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
                  <select
                    value={editClass.section}
                    onChange={(e) => setEditClass({ ...editClass, section: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {sections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Teacher *</label>
                  <select
                    value={editClass.teacher}
                    onChange={(e) => setEditClass({ ...editClass, teacher: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {Array.isArray(teachers) ? teachers.map(teacher => (
                      <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                    )) : null}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                  <input
                    type="number"
                    value={editClass.capacity}
                    onChange={(e) => setEditClass({ ...editClass, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
                  <input
                    type="text"
                    value={editClass.room}
                    onChange={(e) => setEditClass({ ...editClass, room: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditClassModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Students Modal */}
      {showManageStudentsModal && selectedClass && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Manage Students - {selectedClass.name} - Section {selectedClass.section}
                </h3>
                <button
                  onClick={() => setShowManageStudentsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Current Students */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">Current Students</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {(() => {
                      const classStudents = Array.isArray(students) ? students.filter(student =>
                        student.classId && student.classId._id === selectedClass._id
                      ) : [];

                      if (classStudents.length === 0) {
                        return (
                          <p className="text-gray-500 text-center py-4">No students assigned to this class</p>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {classStudents.map((student) => (
                            <div key={student._id} className="flex items-center justify-between p-3 bg-white rounded border">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Users className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                  <p className="text-xs text-gray-500">Roll: {student.rollNumber}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveStudentFromClass(student._id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Available Students */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">Available Students</h4>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search by admission number..."
                      value={admissionNumberFilter}
                      onChange={(e) => setAdmissionNumberFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {(() => {
                      const availableStudents = Array.isArray(students) ? students.filter(student => {
                        const notInClass = !student.classId || student.classId._id !== selectedClass._id;
                        const matchesAdmissionNumber = admissionNumberFilter === '' ||
                          String(student.admissionNumber || '').toLowerCase().includes(admissionNumberFilter.toLowerCase());
                        return notInClass && matchesAdmissionNumber;
                      }) : [];

                      if (availableStudents.length === 0) {
                        return (
                          <p className="text-gray-500 text-center py-4">No available students to assign</p>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {availableStudents.map((student) => (
                            <div key={student._id} className="flex items-center justify-between p-3 bg-white rounded border">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <Users className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                  <p className="text-xs text-gray-500">Adm: {student.admissionNumber || 'N/A'}</p>
                                  <p className="text-xs text-gray-500">Roll: {student.rollNumber}</p>
                                  {student.classId && (
                                    <p className="text-xs text-orange-500">
                                      Currently in: {student.classId.name} - {student.classId.section}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleAssignStudentToClass(student._id, selectedClass._id)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Assign
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowManageStudentsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="relative mx-auto my-auto p-4 sm:p-6 border w-[calc(100%-1rem)] max-w-md shadow-2xl rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingSubjectId ? 'Edit Subject' : 'Add New Subject'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubjectModal(false);
                    setEditingSubjectId(null);
                    setNewSubject({
                      name: '',
                      classIds: [],
                      teacherId: '',
                      type: 'core'
                    });
                    setTeacherSearchTerm('');
                    setShowTeacherDropdown(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAddSubject(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
                  <input
                    type="text"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Mathematics, English, Science"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Classes *</label>
                  <p className="text-xs text-gray-500 mb-2">
                    {editingSubjectId
                      ? 'All classes where this teacher teaches this subject are shown. Select/deselect to update class assignments.'
                      : 'Select one or more classes for this subject'}
                  </p>
                  <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                    {Array.isArray(classes) && classes.length > 0 ? (
                      classes.map(cls => (
                        <label key={cls._id} className="flex items-center space-x-2 py-2 hover:bg-gray-50 px-2 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newSubject.classIds.includes(cls._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewSubject({
                                  ...newSubject,
                                  classIds: [...newSubject.classIds, cls._id]
                                });
                              } else {
                                setNewSubject({
                                  ...newSubject,
                                  classIds: newSubject.classIds.filter(id => id !== cls._id)
                                });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{cls.name} - Section {cls.section}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No classes available</p>
                    )}
                  </div>
                  {newSubject.classIds.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      {newSubject.classIds.length} class(es) selected
                    </p>
                  )}
                </div>

                <div className="relative" data-teacher-dropdown>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teacher *</label>
                  <p className="text-xs text-gray-500 mb-2">Search and select the teacher assigned to teach this subject</p>
                  <input
                    type="text"
                    value={teacherSearchTerm}
                    onChange={(e) => {
                      setTeacherSearchTerm(e.target.value);
                      setShowTeacherDropdown(true);
                      if (!e.target.value) {
                        setNewSubject({ ...newSubject, teacherId: '' });
                      }
                    }}
                    onFocus={() => {
                      if (teacherSearchTerm.length > 0 || teachers.length > 0) {
                        setShowTeacherDropdown(true);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search teacher by name..."
                    required
                  />
                  {showTeacherDropdown && Array.isArray(teachers) && teacherSearchTerm.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto" data-teacher-dropdown>
                      {teachers
                        .filter(teacher =>
                          teacher.name.toLowerCase().includes(teacherSearchTerm.toLowerCase())
                        )
                        .slice(0, 10)
                        .map(teacher => (
                          <div
                            key={teacher._id}
                            onClick={() => {
                              setNewSubject({ ...newSubject, teacherId: teacher._id });
                              setTeacherSearchTerm(teacher.name);
                              setShowTeacherDropdown(false);
                            }}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                            {teacher.email && (
                              <div className="text-xs text-gray-500">{teacher.email}</div>
                            )}
                          </div>
                        ))}
                      {teachers.filter(teacher =>
                        teacher.name.toLowerCase().includes(teacherSearchTerm.toLowerCase())
                      ).length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-500">No teachers found</div>
                        )}
                    </div>
                  )}
                  {newSubject.teacherId && !showTeacherDropdown && (
                    <p className="text-xs text-blue-600 mt-1">Teacher selected</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Type *</label>
                  <select
                    value={newSubject.type}
                    onChange={(e) => setNewSubject({ ...newSubject, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="core">Core Subject</option>
                    <option value="elective">Elective Subject</option>
                    <option value="practical">Practical Subject</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSubjectModal(false);
                      setEditingSubjectId(null);
                      setNewSubject({
                        name: '',
                        classIds: [],
                        teacherId: '',
                        type: 'core'
                      });
                      setTeacherSearchTerm('');
                      setShowTeacherDropdown(false);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingSubjectId ? 'Update Subject' : 'Create Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Subjects Modal */}
      {showManageSubjectsModal && selectedClass && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Manage Subjects - {selectedClass.name} - Section {selectedClass.section}
                </h3>
                <button
                  onClick={() => setShowManageSubjectsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Current Subjects */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">Current Subjects</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {(() => {
                      const classSubjects = Array.isArray(subjects) ? subjects.filter(subject =>
                        subject.classId && subject.classId._id === selectedClass._id
                      ) : [];

                      if (classSubjects.length === 0) {
                        return (
                          <p className="text-gray-500 text-center py-4">No subjects assigned to this class</p>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {classSubjects.map((subject) => (
                            <div key={subject._id} className="flex items-center justify-between p-3 bg-white rounded border">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <BookOpen className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{subject.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {subject.teacherId ? subject.teacherId.name : 'No teacher assigned'}
                                    {subject.credits && ` • ${subject.credits} credits`}
                                  </p>
                                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${subject.type === 'core' ? 'bg-blue-100 text-blue-800' :
                                    subject.type === 'elective' ? 'bg-green-100 text-green-800' :
                                      'bg-purple-100 text-purple-800'
                                    }`}>
                                    {subject.type}
                                  </span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditSubject(subject)}
                                  className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border border-blue-600 rounded hover:bg-blue-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleRemoveSubject(subject._id)}
                                  className="text-red-600 hover:text-red-800 text-sm px-2 py-1 border border-red-600 rounded hover:bg-red-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Add New Subject Button */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      setNewSubject(prev => ({ ...prev, classIds: [selectedClass._id] }));
                      setShowManageSubjectsModal(false);
                      setShowAddSubjectModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Subject</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowManageSubjectsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Classes; 
