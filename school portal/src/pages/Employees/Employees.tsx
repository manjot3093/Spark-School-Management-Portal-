import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Search,
  Filter,
  Users,
  UserPlus,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  BookOpen,
  Calculator,
  Edit2,
  X,
  Download,
  FileText,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const Employees: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showTeacherProfileModal, setShowTeacherProfileModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTeacherData, setEditTeacherData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');

  // Pagination states
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherPageSize, setTeacherPageSize] = useState(10);
  const [teacherStatsPage, setTeacherStatsPage] = useState(1);
  const [teacherStatsPageSize, setTeacherStatsPageSize] = useState(10);
  const [teacherProfilePage, setTeacherProfilePage] = useState(1);
  const [teacherProfilePageSize, setTeacherProfilePageSize] = useState(12);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Attendance management state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [teacherAttendance, setTeacherAttendance] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);

  // Teacher Management state
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    designation: '',
    qualification: '',
    experience: '',
    salary: '',
    primarySubject: '',
    subjects: [] as string[],
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  // Add Teachers state
  const [showAddTeachersModal, setShowAddTeachersModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdTeacher, setCreatedTeacher] = useState<any>(null);
  const [newTeacherCredentials, setNewTeacherCredentials] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  // Add Librarian state
  const [showAddLibrarianModal, setShowAddLibrarianModal] = useState(false);
  const [showLibrarianSuccessModal, setShowLibrarianSuccessModal] = useState(false);
  const [createdLibrarian, setCreatedLibrarian] = useState<any>(null);
  const [newLibrarianCredentials, setNewLibrarianCredentials] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  // Add Accountant state
  const [showAddAccountantModal, setShowAddAccountantModal] = useState(false);
  const [showAccountantSuccessModal, setShowAccountantSuccessModal] = useState(false);
  const [createdAccountant, setCreatedAccountant] = useState<any>(null);
  const [newAccountantCredentials, setNewAccountantCredentials] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);


  const tabs = [
    { id: 'overview', label: 'Teacher Overview' },
    { id: 'teacher-mgmt', label: 'Teacher Management' },
    { id: 'profiles', label: 'Teacher Profiles' },
    { id: 'attendance', label: 'Attendance Records' }
  ];

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    department: '',
    salary: '',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive'
  });

  const [editEmployee, setEditEmployee] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    department: '',
    salary: '',
    joinDate: '',
    status: ''
  });

  const departments = ['Administration', 'IT', 'Finance', 'HR', 'Maintenance', 'Transport', 'Library'];
  const positions = ['Principal', 'Vice Principal', 'Administrative Staff', 'IT Support', 'Accountant', 'HR Manager', 'Maintenance Staff'];

  // Normal school subjects
  const schoolSubjects = [
    'Hindi', 'English', 'Mathematics', 'Science', 'Social Studies (SST)', 'History', 'Geography',
    'Civics', 'Economics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Physical Education',
    'Art', 'Music', 'Dance', 'Home Science', 'Commerce', 'Accountancy', 'Business Studies'
  ];

  // Fetch teachers on component mount
  useEffect(() => {
    fetchTeachers();
    fetchTeacherAttendance();
    fetchAttendanceStats();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      console.log('Current user state:', state);

      // Fetch all teachers for now - can be enhanced later with school-specific filtering
      console.log('Fetching all teachers');
      const teachersData = await api.classroom.getTeachers();
      console.log('All teachers data received:', teachersData);
      setTeachers(teachersData.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  // Attendance management functions
  const fetchTeacherAttendance = async (date?: string) => {
    try {
      setLoading(true);
      const selectedDate = date || attendanceDate;
      const attendanceData = await api.classroom.getTeacherAttendance({ date: selectedDate });
      setTeacherAttendance(attendanceData.data || []);
    } catch (error) {
      console.error('Error fetching teacher attendance:', error);
      toast.error('Failed to fetch teacher attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const statsData = await api.classroom.getTeacherAttendanceStats();
      setAttendanceStats(statsData.data || null);
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      toast.error('Failed to fetch attendance statistics');
    }
  };


  const handleDateChange = (newDate: string) => {
    setAttendanceDate(newDate);
    fetchTeacherAttendance(newDate);
  };


  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Form submitted, newEmployee:', newEmployee);

    if (!newEmployee.name || !newEmployee.position || !newEmployee.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Create non-teacher employee
      const employeeData = {
        id: Date.now().toString(),
        ...newEmployee,
        salary: parseFloat(newEmployee.salary)
      };

      dispatch({ type: 'ADD_EMPLOYEE', payload: employeeData });
      toast.success('Employee recruited successfully!');

      setNewEmployee({
        name: '',
        position: '',
        email: '',
        phone: '',
        department: '',
        salary: '',
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active' as 'active' | 'inactive'
      });

      setShowAddEmployeeModal(false);
    } catch (error) {
      console.error('Error recruiting employee:', error);
      toast.error('Failed to recruit employee');
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!newTeacher.name || !newTeacher.email || !newTeacher.password || !newTeacher.phone ||
      !newTeacher.dateOfBirth || !newTeacher.gender || !newTeacher.designation || !newTeacher.primarySubject) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newTeacher.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const teacherData = {
        name: newTeacher.name,
        email: newTeacher.email,
        password: newTeacher.password,
        phone: newTeacher.phone,
        dateOfBirth: newTeacher.dateOfBirth,
        gender: newTeacher.gender,
        department: 'Teaching',
        designation: newTeacher.designation,
        qualification: newTeacher.qualification,
        experience: parseInt(newTeacher.experience) || 0,
        salary: parseInt(newTeacher.salary) || 0,
        primarySubject: newTeacher.primarySubject,
        subjects: [newTeacher.primarySubject, ...newTeacher.subjects], // Include primary subject in subjects array
        address: newTeacher.address
      };

      const createdTeacher = await api.classroom.createTeacher(teacherData);
      setTeachers([...teachers, createdTeacher]);
      toast.success('Teacher added successfully!');

      setNewTeacher({
        name: '',
        email: '',
        password: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        designation: '',
        qualification: '',
        experience: '',
        salary: '',
        primarySubject: '',
        subjects: [],
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: ''
        }
      });

      setShowAddTeacherModal(false);
    } catch (error) {
      console.error('Error adding teacher:', error);
      toast.error('Failed to add teacher');
    }
  };

  const handleAddTeacherWithCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!newTeacherCredentials.name || !newTeacherCredentials.email ||
      !newTeacherCredentials.password || !newTeacherCredentials.confirmPassword || !newTeacherCredentials.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newTeacherCredentials.password !== newTeacherCredentials.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newTeacherCredentials.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const teacherData = {
        name: newTeacherCredentials.name,
        email: newTeacherCredentials.email,
        password: newTeacherCredentials.password,
        phone: newTeacherCredentials.phone
      };

      console.log('Creating teacher with data:', teacherData);
      const response = await api.classroom.createTeacher(teacherData);
      console.log('Teacher creation response:', response);
      const newTeacher = response.data.teacher;

      // Refresh teachers list to get the latest data
      console.log('Refreshing teachers list...');
      await fetchTeachers();

      // Set created teacher data for success modal
      setCreatedTeacher(newTeacher);

      // Reset form
      setNewTeacherCredentials({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: ''
      });

      // Close add teacher modal and show success modal
      setShowAddTeachersModal(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error adding teacher:', error);
      if (error.message?.includes('email already exists')) {
        toast.error('A user with this email already exists. Please use a different email address.');
      } else {
        toast.error('Failed to add teacher. Please try again.');
      }
    }
  };

  const handleAddLibrarian = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!newLibrarianCredentials.name || !newLibrarianCredentials.email ||
      !newLibrarianCredentials.password || !newLibrarianCredentials.confirmPassword || !newLibrarianCredentials.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newLibrarianCredentials.password !== newLibrarianCredentials.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newLibrarianCredentials.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const librarianData = {
        name: newLibrarianCredentials.name,
        email: newLibrarianCredentials.email,
        password: newLibrarianCredentials.password,
        phone: newLibrarianCredentials.phone
      };

      const response = await api.classroom.createLibrarian(librarianData);
      const newLibrarian = response.data.librarian;

      // Set created librarian data for success modal
      setCreatedLibrarian(newLibrarian);

      // Reset form
      setNewLibrarianCredentials({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: ''
      });

      // Close add librarian modal and show success modal
      setShowAddLibrarianModal(false);
      setShowLibrarianSuccessModal(true);
      toast.success('Librarian created successfully!');
    } catch (error: any) {
      console.error('Error adding librarian:', error);
      if (error.message?.includes('email already exists')) {
        toast.error('A user with this email already exists. Please use a different email address.');
      } else {
        toast.error('Failed to add librarian. Please try again.');
      }
    }
  };

  const handleAddAccountant = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!newAccountantCredentials.name || !newAccountantCredentials.email ||
      !newAccountantCredentials.password || !newAccountantCredentials.confirmPassword || !newAccountantCredentials.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newAccountantCredentials.password !== newAccountantCredentials.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newAccountantCredentials.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const accountantData = {
        name: newAccountantCredentials.name,
        email: newAccountantCredentials.email,
        password: newAccountantCredentials.password,
        phone: newAccountantCredentials.phone
      };

      const response = await api.classroom.createAccountant(accountantData);
      const newAccountant = response.data.accountant;

      // Set created accountant data for success modal
      setCreatedAccountant(newAccountant);

      // Reset form
      setNewAccountantCredentials({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: ''
      });

      // Close add accountant modal and show success modal
      setShowAddAccountantModal(false);
      setShowAccountantSuccessModal(true);
      toast.success('Accountant created successfully!');
    } catch (error: any) {
      console.error('Error adding accountant:', error);
      if (error.message?.includes('email already exists')) {
        toast.error('A user with this email already exists. Please use a different email address.');
      } else {
        toast.error('Failed to add accountant. Please try again.');
      }
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editEmployee.name || !editEmployee.position || !editEmployee.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const updatedEmployee = {
        ...selectedEmployee,
        ...editEmployee,
        salary: parseFloat(editEmployee.salary)
      };

      dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });

      setShowEditEmployeeModal(false);
      setSelectedEmployee(null);
      toast.success('Employee updated successfully!');
    } catch (error) {
      toast.error('Failed to update employee');
    }
  };

  const handleUpdateTeacherProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editTeacherData?.name || !editTeacherData?.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const teacherId = selectedTeacher._id || selectedTeacher.id;

      // Update teacher basic info via API
      const updatedTeacher = {
        name: editTeacherData.name,
        email: editTeacherData.email,
        phone: editTeacherData.phone || ''
      };

      await api.classroom.updateTeacher(teacherId, updatedTeacher);

      // Update subjects if changed
      if (editTeacherData.subjects && editTeacherData.subjects.length > 0) {
        // Extract subject IDs or names - backend may need subject IDs
        // For now, we'll try to update subjects if the API supports it
        const subjectNames = editTeacherData.subjects.map((sub: any) =>
          typeof sub === 'string' ? sub : sub.name
        );

        // If subjects have IDs, extract them, otherwise we'll need to handle differently
        // This depends on your backend implementation
        try {
          // Try to update subjects if API supports it
          // You may need to adjust this based on your backend API
          const subjectIds = editTeacherData.subjects
            .map((sub: any) => sub._id || sub.id)
            .filter((id: any) => id);

          if (subjectIds.length > 0) {
            await api.classroom.assignTeacherSubjects(teacherId, subjectIds);
          }
        } catch (subjectError) {
          console.warn('Could not update subjects:', subjectError);
          // Continue even if subjects update fails
        }
      }

      // Update active status if changed
      if (selectedTeacher.isActive !== undefined) {
        // If backend supports isActive update, add it here
        // For now, we'll just update the local state
      }

      // Refresh teachers list
      await fetchTeachers();

      setIsEditingProfile(false);
      setEditTeacherData(null);
      toast.success('Teacher profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      toast.error(error.message || 'Failed to update teacher profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeacher = (teacher: any) => {
    setSelectedTeacher(teacher);
    setEditTeacherData({
      name: teacher.name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      subjects: teacher.subjects || []
    });
    setIsEditingProfile(true);
    setShowTeacherProfileModal(true);
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await api.classroom.deleteTeacher(teacherId);
      // Refresh teachers list
      await fetchTeachers();
      toast.success('Teacher deleted successfully');
    } catch (error: any) {
      console.error('Error deleting teacher:', error);
      toast.error(error.message || 'Failed to delete teacher');
    } finally {
      setLoading(false);
    }
  };

  // Export functions
  const exportToCSV = () => {
    try {
      // Prepare CSV headers
      const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Created Date'];

      // Prepare CSV rows
      const rows = teachers.map(teacher => [
        teacher.name || '',
        teacher.email || '',
        teacher.phone || '',
        teacher.role || 'Teacher',
        teacher.isActive !== false ? 'Active' : 'Inactive',
        teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : ''
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `teachers_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Teachers exported to CSV successfully!');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Failed to export to CSV');
    }
  };

  const exportToExcel = () => {
    try {
      // Create HTML table
      const tableHTML = `
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            ${teachers.map(teacher => `
              <tr>
                <td>${teacher.name || ''}</td>
                <td>${teacher.email || ''}</td>
                <td>${teacher.phone || ''}</td>
                <td>${teacher.role || 'Teacher'}</td>
                <td>${teacher.isActive !== false ? 'Active' : 'Inactive'}</td>
                <td>${teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      // Create blob and download
      const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `teachers_${new Date().toISOString().split('T')[0]}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Teachers exported to Excel successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export to Excel');
    }
  };


  const renderTeacherOverview = () => {
    const totalTeachers = teachers.length;
    const totalSalary = teachers.reduce((sum, teacher) => sum + (teacher.salary || 0), 0);
    const activeTeachers = teachers.filter(teacher => teacher.isActive !== false).length;
    const newThisMonth = teachers.filter(teacher => {
      const createdAt = new Date(teacher.createdAt);
      const now = new Date();
      return createdAt.getMonth() === now.getMonth() &&
        createdAt.getFullYear() === now.getFullYear();
    }).length;

    return (
      <div className="space-y-6">
        {/* Header with Add Teacher button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Teacher Overview</h3>
          <button
            onClick={() => setShowAddTeachersModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Teacher</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Teachers</p>
                <p className="text-3xl font-bold text-gray-900">{totalTeachers}</p>
                <p className="text-sm text-blue-600">Teaching staff</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Teachers</p>
                <p className="text-3xl font-bold text-gray-900">{activeTeachers}</p>
                <p className="text-sm text-green-600">Currently teaching</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <GraduationCap className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Salary</p>
                <p className="text-3xl font-bold text-gray-900">${totalSalary.toLocaleString()}</p>
                <p className="text-sm text-purple-600">Monthly payroll</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <GraduationCap className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-3xl font-bold text-gray-900">{newThisMonth}</p>
                <p className="text-sm text-yellow-600">Recent hires</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Teacher Additions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Teacher Additions</h3>
          <div className="space-y-3">
            {teachers
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5)
              .map((teacher) => (
                <div key={teacher._id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{teacher.name}</h4>
                      <p className="text-sm text-gray-500">{teacher.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px - 2 py - 1 text - xs rounded - full ${teacher.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} `}>
                      {teacher.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };



  const renderAddTeachers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Add Teachers</h3>
        <button
          onClick={() => setShowAddTeachersModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Teacher</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Add New Teacher with Login Credentials</h4>
        <p className="text-gray-600 mb-6">
          Use this form to add teachers to your school with their login credentials. Teachers will be able to access the system using the username and password you provide.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Quick Add</h5>
            <p className="text-sm text-blue-700">Fill basic info and credentials</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h5 className="font-medium text-green-900 mb-2">Subject Assignment</h5>
            <p className="text-sm text-green-700">Assign primary and additional subjects</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h5 className="font-medium text-purple-900 mb-2">Login Access</h5>
            <p className="text-sm text-purple-700">Username and password provided</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmployeeProfiles = () => {
    // Filter teachers based on search term
    const filteredTeachers = teachers.filter(teacher =>
      teacher.name?.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(teacherSearchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Teacher Profiles</h3>

          {/* Search Bar */}
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search teachers by name or email..."
              value={teacherSearchTerm}
              onChange={(e) => {
                setTeacherSearchTerm(e.target.value);
                setTeacherProfilePage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No teachers found matching "{teacherSearchTerm}"</p>
            <p className="text-gray-400 text-sm mt-2">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeachers
              .slice((teacherProfilePage - 1) * teacherProfilePageSize, teacherProfilePage * teacherProfilePageSize)
              .map((teacher) => (
              <div key={teacher._id} className="bg-white rounded-lg shadow-md border overflow-hidden">
                <div className="p-6">
                  <div className="text-center mb-4">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <GraduationCap className="h-10 w-10 text-green-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">{teacher.name}</h4>
                    <p className="text-sm text-gray-600">Teacher</p>
                    <span className={`inline - block mt - 2 px - 2 py - 1 text - xs rounded - full ${teacher.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} `}>
                      {teacher.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">{teacher.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">{teacher.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">Joined: {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    {teacher.subjects && teacher.subjects.length > 0 && (
                      <div className="flex items-start space-x-2 text-sm">
                        <GraduationCap className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-gray-700">Subjects: </span>
                          <span className="text-gray-700">{teacher.subjects.map((sub: any) => sub.name).join(', ')}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className={`px - 2 py - 1 text - xs rounded - full ${teacher.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} `}>
                        {teacher.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setEditTeacherData({
                            name: teacher.name || '',
                            email: teacher.email || '',
                            phone: teacher.phone || '',
                            subjects: teacher.subjects || []
                          });
                          setShowTeacherProfileModal(true);
                          setIsEditingProfile(false);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Full Profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {filteredTeachers.length > 0 && (
          <Pagination
            currentPage={teacherProfilePage}
            pageSize={teacherProfilePageSize}
            totalItems={filteredTeachers.length}
            onPageChange={setTeacherProfilePage}
            onPageSizeChange={setTeacherProfilePageSize}
            pageSizeOptions={[12, 24, 48]}
          />
        )}
      </div>
    );
  };

  const renderTeacherManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Teacher Management</h3>
        <div className="flex space-x-2">
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      exportToCSV();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Export as CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToExcel();
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Export as Excel</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={fetchTeachers}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center space-x-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddTeachersModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Teacher</span>
          </button>
        </div>
      </div>

      {/* Teachers List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">All Teachers ({teachers.length})</h4>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading teachers...</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Teachers Found</h3>
            <p className="text-gray-600 mb-4">Start by adding your first teacher to the school.</p>
            <button
              onClick={() => setShowAddTeachersModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add First Teacher
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teachers
                  .slice((teacherPage - 1) * teacherPageSize, teacherPage * teacherPageSize)
                  .map((teacher) => (
                  <tr key={teacher.id || teacher._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{teacher.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{teacher.phone || 'Not provided'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Teacher
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px - 2 py - 1 text - xs rounded - full ${teacher.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} `}>
                        {teacher.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTeacher(teacher)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher._id || teacher.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {teachers.length > 0 && (
          <Pagination
            currentPage={teacherPage}
            pageSize={teacherPageSize}
            totalItems={teachers.length}
            onPageChange={setTeacherPage}
            onPageSizeChange={setTeacherPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>
    </div>
  );


  const renderAttendanceRecords = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Teacher Attendance Management</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Date:</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => fetchTeacherAttendance()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Attendance Statistics */}
      {attendanceStats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Overall Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Teachers</p>
                  <p className="text-2xl font-bold text-green-600">{attendanceStats.summary?.totalTeachers || 0}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Present Today</p>
                  <p className="text-2xl font-bold text-blue-600">{attendanceStats.summary?.totalPresent || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Absent Today</p>
                  <p className="text-2xl font-bold text-red-600">{attendanceStats.summary?.totalAbsent || 0}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Attendance %</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {attendanceStats.summary?.overallAttendancePercentage?.toFixed(1) || 0}%
                  </p>
                </div>
                <GraduationCap className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance View Interface */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">
          Teacher Attendance for {new Date(attendanceDate).toLocaleDateString()}
        </h4>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {teachers.map((teacher) => {
              const existingAttendance = teacherAttendance.find(att =>
                att.teacherId?._id === teacher._id || att.teacherId === teacher._id
              );

              return (
                <div key={teacher._id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{teacher.name}</h5>
                      <p className="text-sm text-gray-600">
                        {teacher.subjects?.map((sub: any) => sub.name).join(', ') || 'No subjects assigned'}
                      </p>
                      {existingAttendance ? (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline - flex items - center px - 2 py - 1 rounded - full text - xs font - medium ${existingAttendance.status === 'present' ? 'bg-green-100 text-green-800' :
                            existingAttendance.status === 'absent' ? 'bg-red-100 text-red-800' :
                              existingAttendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                existingAttendance.status === 'half-day' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                            } `}>
                            {existingAttendance.status === 'present' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {existingAttendance.status === 'absent' && <XCircle className="h-3 w-3 mr-1" />}
                            {existingAttendance.status === 'late' && <Clock className="h-3 w-3 mr-1" />}
                            {existingAttendance.status === 'half-day' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {existingAttendance.status?.charAt(0).toUpperCase() + existingAttendance.status?.slice(1)}
                          </span>
                          {existingAttendance.remarks && (
                            <span className="text-xs text-gray-500">({existingAttendance.remarks})</span>
                          )}
                          {existingAttendance.checkInTime && (
                            <span className="text-xs text-gray-500">
                              Check-in: {new Date(existingAttendance.checkInTime).toLocaleTimeString()}
                            </span>
                          )}
                          {existingAttendance.checkOutTime && (
                            <span className="text-xs text-gray-500">
                              Check-out: {new Date(existingAttendance.checkOutTime).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Marked
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Marked by: {existingAttendance?.markedBy?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {existingAttendance?.markedAt ?
                          new Date(existingAttendance.markedAt).toLocaleString() :
                          'Not marked'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Individual Teacher Statistics */}
      {attendanceStats?.teacherStats && attendanceStats.teacherStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Individual Teacher Statistics</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Half Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceStats.teacherStats
                  .slice((teacherStatsPage - 1) * teacherStatsPageSize, teacherStatsPage * teacherStatsPageSize)
                  .map((stat: any) => (
                  <tr key={stat.teacherId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{stat.teacherName}</div>
                      <div className="text-sm text-gray-500">{stat.teacherEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat.totalDays}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{stat.present}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{stat.absent}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">{stat.late}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">{stat.halfDay}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text - sm font - medium ${stat.attendancePercentage >= 90 ? 'text-green-600' :
                        stat.attendancePercentage >= 75 ? 'text-yellow-600' :
                          'text-red-600'
                        } `}>
                        {stat.attendancePercentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {attendanceStats.teacherStats.length > 0 && (
            <Pagination
              currentPage={teacherStatsPage}
              pageSize={teacherStatsPageSize}
              totalItems={attendanceStats.teacherStats.length}
              onPageChange={setTeacherStatsPage}
              onPageSizeChange={setTeacherStatsPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </div>
      )}
    </div>
  );


  const renderLibrarianAccountant = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Librarian & Accountant Management</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Librarian Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">Librarian</h4>
              <p className="text-sm text-gray-600">Create librarian accounts</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Librarians can access and manage the library section. They can add books, manage borrowings, and track library inventory.
          </p>
          <button
            onClick={() => setShowAddLibrarianModal(true)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Librarian</span>
          </button>
        </div>

        {/* Accountant Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Calculator className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">Accountant</h4>
              <p className="text-sm text-gray-600">Create accountant accounts</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Accountants can access and manage the accounts section. They can handle financial transactions, fees, and accounting records.
          </p>
          <button
            onClick={() => setShowAddAccountantModal(true)}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Accountant</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Access Control</h4>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Librarian Access</p>
              <p className="text-sm text-gray-600">Librarians can only access the Library section of the school portal.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Accountant Access</p>
              <p className="text-sm text-gray-600">Accountants can only access the Accounts section of the school portal.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderTeacherOverview();
      case 'teacher-mgmt':
        return renderTeacherManagement();
      case 'profiles':
        return renderEmployeeProfiles();
      case 'attendance':
        return renderAttendanceRecords();
      default:
        return renderTeacherOverview();
    }
  };

  return (
    <div className="p-6 space-y-6">
      

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recruit New Employee</h3>
              <form onSubmit={handleAddEmployee} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position *</label>
                  <select
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Position</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                  <select
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddEmployeeModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Recruit
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Teacher</h3>
              <form onSubmit={handleAddTeacher} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={newTeacher.name}
                      onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email (Username) *</label>
                    <input
                      type="email"
                      value={newTeacher.email}
                      onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input
                      type="password"
                      value={newTeacher.password}
                      onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      value={newTeacher.phone}
                      onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                    <input
                      type="date"
                      value={newTeacher.dateOfBirth}
                      onChange={(e) => setNewTeacher({ ...newTeacher, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                    <select
                      value={newTeacher.gender}
                      onChange={(e) => setNewTeacher({ ...newTeacher, gender: e.target.value })}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Designation *</label>
                    <input
                      type="text"
                      value={newTeacher.designation}
                      onChange={(e) => setNewTeacher({ ...newTeacher, designation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Senior Teacher, Head of Department"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                    <input
                      type="text"
                      value={newTeacher.qualification}
                      onChange={(e) => setNewTeacher({ ...newTeacher, qualification: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., M.A. English, B.Ed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience (Years)</label>
                    <input
                      type="number"
                      value={newTeacher.experience}
                      onChange={(e) => setNewTeacher({ ...newTeacher, experience: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Years of teaching experience"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
                    <input
                      type="number"
                      value={newTeacher.salary}
                      onChange={(e) => setNewTeacher({ ...newTeacher, salary: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Monthly salary"
                      min="0"
                    />
                  </div>
                </div>

                {/* Primary Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Subject *</label>
                  <select
                    value={newTeacher.primarySubject}
                    onChange={(e) => setNewTeacher({ ...newTeacher, primarySubject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Primary Subject</option>
                    {schoolSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                {/* Additional Subjects */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Subjects (Optional)</label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !newTeacher.subjects.includes(e.target.value)) {
                        setNewTeacher({ ...newTeacher, subjects: [...newTeacher.subjects, e.target.value] });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Additional Subject</option>
                    {schoolSubjects.filter(subject => subject !== newTeacher.primarySubject).map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  {newTeacher.subjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {newTeacher.subjects.map(subject => (
                        <span key={subject} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
                          {subject}
                          <button
                            type="button"
                            onClick={() => setNewTeacher({ ...newTeacher, subjects: newTeacher.subjects.filter(s => s !== subject) })}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Street"
                      value={newTeacher.address.street}
                      onChange={(e) => setNewTeacher({ ...newTeacher, address: { ...newTeacher.address, street: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={newTeacher.address.city}
                      onChange={(e) => setNewTeacher({ ...newTeacher, address: { ...newTeacher.address, city: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={newTeacher.address.state}
                      onChange={(e) => setNewTeacher({ ...newTeacher, address: { ...newTeacher.address, state: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Zip Code"
                      value={newTeacher.address.zipCode}
                      onChange={(e) => setNewTeacher({ ...newTeacher, address: { ...newTeacher.address, zipCode: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddTeacherModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Teacher
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Teachers Modal */}
      {showAddTeachersModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Teacher with Login Credentials</h3>
              <form onSubmit={handleAddTeacherWithCredentials} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={newTeacherCredentials.name}
                    onChange={(e) => setNewTeacherCredentials({ ...newTeacherCredentials, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter teacher's full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newTeacherCredentials.email}
                    onChange={(e) => setNewTeacherCredentials({ ...newTeacherCredentials, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter teacher's email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={newTeacherCredentials.password}
                    onChange={(e) => setNewTeacherCredentials({ ...newTeacherCredentials, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                  <input
                    type="password"
                    value={newTeacherCredentials.confirmPassword}
                    onChange={(e) => setNewTeacherCredentials({ ...newTeacherCredentials, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={newTeacherCredentials.phone}
                    onChange={(e) => setNewTeacherCredentials({ ...newTeacherCredentials, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddTeachersModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Teacher
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && createdTeacher && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Teacher Added Successfully!</h3>
              <div className="text-sm text-gray-600 mb-4">
                <p className="mb-2"><strong>Name:</strong> {createdTeacher.name}</p>
                <p className="mb-2"><strong>Email:</strong> {createdTeacher.email}</p>
                <p className="mb-2"><strong>Phone:</strong> {createdTeacher.phone}</p>
                <p className="mb-2"><strong>Role:</strong> Teacher</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-md mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Login Credentials:</strong><br />
                  The teacher can now login using their email and the password you provided.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Librarian Modal */}
      {showAddLibrarianModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Librarian with Login Credentials</h3>
              <form onSubmit={handleAddLibrarian} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={newLibrarianCredentials.name}
                    onChange={(e) => setNewLibrarianCredentials({ ...newLibrarianCredentials, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter librarian's full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newLibrarianCredentials.email}
                    onChange={(e) => setNewLibrarianCredentials({ ...newLibrarianCredentials, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter librarian's email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={newLibrarianCredentials.password}
                    onChange={(e) => setNewLibrarianCredentials({ ...newLibrarianCredentials, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                  <input
                    type="password"
                    value={newLibrarianCredentials.confirmPassword}
                    onChange={(e) => setNewLibrarianCredentials({ ...newLibrarianCredentials, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={newLibrarianCredentials.phone}
                    onChange={(e) => setNewLibrarianCredentials({ ...newLibrarianCredentials, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddLibrarianModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Librarian
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Librarian Success Modal */}
      {showLibrarianSuccessModal && createdLibrarian && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Librarian Added Successfully!</h3>
              <div className="text-sm text-gray-600 mb-4">
                <p className="mb-2"><strong>Name:</strong> {createdLibrarian.name}</p>
                <p className="mb-2"><strong>Email:</strong> {createdLibrarian.email}</p>
                <p className="mb-2"><strong>Phone:</strong> {createdLibrarian.phone}</p>
                <p className="mb-2"><strong>Role:</strong> Librarian</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-md mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Login Credentials:</strong><br />
                  The librarian can now login using their email and the password you provided. They will have access to the Library section only.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowLibrarianSuccessModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Accountant Modal */}
      {showAddAccountantModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Accountant with Login Credentials</h3>
              <form onSubmit={handleAddAccountant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={newAccountantCredentials.name}
                    onChange={(e) => setNewAccountantCredentials({ ...newAccountantCredentials, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter accountant's full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newAccountantCredentials.email}
                    onChange={(e) => setNewAccountantCredentials({ ...newAccountantCredentials, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter accountant's email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={newAccountantCredentials.password}
                    onChange={(e) => setNewAccountantCredentials({ ...newAccountantCredentials, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                  <input
                    type="password"
                    value={newAccountantCredentials.confirmPassword}
                    onChange={(e) => setNewAccountantCredentials({ ...newAccountantCredentials, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={newAccountantCredentials.phone}
                    onChange={(e) => setNewAccountantCredentials({ ...newAccountantCredentials, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAccountantModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add Accountant
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Accountant Success Modal */}
      {showAccountantSuccessModal && createdAccountant && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Accountant Added Successfully!</h3>
              <div className="text-sm text-gray-600 mb-4">
                <p className="mb-2"><strong>Name:</strong> {createdAccountant.name}</p>
                <p className="mb-2"><strong>Email:</strong> {createdAccountant.email}</p>
                <p className="mb-2"><strong>Phone:</strong> {createdAccountant.phone}</p>
                <p className="mb-2"><strong>Role:</strong> Accountant</p>
              </div>
              <div className="bg-green-50 p-3 rounded-md mb-4">
                <p className="text-sm text-green-800">
                  <strong>Login Credentials:</strong><br />
                  The accountant can now login using their email and the password you provided. They will have access to the Accounts section only.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAccountantSuccessModal(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Employee</h3>
              <form onSubmit={handleEditEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={editEmployee.name}
                    onChange={(e) => setEditEmployee({ ...editEmployee, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position *</label>
                  <select
                    value={editEmployee.position}
                    onChange={(e) => setEditEmployee({ ...editEmployee, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                  <select
                    value={editEmployee.department}
                    onChange={(e) => setEditEmployee({ ...editEmployee, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditEmployeeModal(false)}
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

      {/* Teacher Profile Modal */}
      {showTeacherProfileModal && selectedTeacher && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditingProfile ? 'Edit Teacher Profile' : 'Teacher Profile'}
                </h3>
                <div className="flex space-x-2">
                  {!isEditingProfile && (
                    <button
                      onClick={() => {
                        setIsEditingProfile(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowTeacherProfileModal(false);
                      setSelectedTeacher(null);
                      setIsEditingProfile(false);
                      setEditTeacherData(null);
                    }}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleUpdateTeacherProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={editTeacherData?.name || ''}
                        onChange={(e) => setEditTeacherData({ ...editTeacherData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={editTeacherData?.email || ''}
                        onChange={(e) => setEditTeacherData({ ...editTeacherData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={editTeacherData?.phone || ''}
                        onChange={(e) => setEditTeacherData({ ...editTeacherData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={selectedTeacher.isActive !== false ? 'active' : 'inactive'}
                        onChange={(e) => {
                          setSelectedTeacher({ ...selectedTeacher, isActive: e.target.value === 'active' });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editTeacherData?.subjects?.map((sub: any, index: number) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                        >
                          <span>{typeof sub === 'string' ? sub : sub.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newSubjects = [...(editTeacherData.subjects || [])];
                              newSubjects.splice(index, 1);
                              setEditTeacherData({ ...editTeacherData, subjects: newSubjects });
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const newSubject = e.target.value;
                          const currentSubjects = editTeacherData?.subjects || [];
                          const subjectNames = currentSubjects.map((sub: any) => typeof sub === 'string' ? sub : sub.name);
                          if (!subjectNames.includes(newSubject)) {
                            setEditTeacherData({
                              ...editTeacherData,
                              subjects: [...currentSubjects, { name: newSubject }]
                            });
                          }
                          e.target.value = '';
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Add Subject</option>
                      {schoolSubjects.map(subject => {
                        const currentSubjects = editTeacherData?.subjects || [];
                        const subjectNames = currentSubjects.map((sub: any) => typeof sub === 'string' ? sub : sub.name);
                        if (!subjectNames.includes(subject)) {
                          return <option key={subject} value={subject}>{subject}</option>;
                        }
                        return null;
                      })}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setEditTeacherData({
                          name: selectedTeacher.name || '',
                          email: selectedTeacher.email || '',
                          phone: selectedTeacher.phone || '',
                          subjects: selectedTeacher.subjects || []
                        });
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Teacher Info Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                      <p className="text-base font-medium text-gray-900">{selectedTeacher.name || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <p className="text-base text-gray-900">{selectedTeacher.email || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
                      <p className="text-base text-gray-900">{selectedTeacher.phone || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                      <span className={`inline - block px - 2 py - 1 text - xs rounded - full ${selectedTeacher.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} `}>
                        {selectedTeacher.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Date Joined</label>
                      <p className="text-base text-gray-900">
                        {selectedTeacher.createdAt ? new Date(selectedTeacher.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                      <p className="text-base text-gray-900">Teacher</p>
                    </div>
                  </div>

                  {/* Subjects */}
                  {selectedTeacher.subjects && selectedTeacher.subjects.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-2">Subjects</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedTeacher.subjects.map((sub: any, index: number) => (
                          <span
                            key={index}
                            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                          >
                            {typeof sub === 'string' ? sub : sub.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  {selectedTeacher.designation && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Designation</label>
                      <p className="text-base text-gray-900">{selectedTeacher.designation}</p>
                    </div>
                  )}
                  {selectedTeacher.qualification && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Qualification</label>
                      <p className="text-base text-gray-900">{selectedTeacher.qualification}</p>
                    </div>
                  )}
                  {selectedTeacher.experience !== undefined && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Experience</label>
                      <p className="text-base text-gray-900">{selectedTeacher.experience} years</p>
                    </div>
                  )}
                  {selectedTeacher.salary && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Salary</label>
                      <p className="text-base text-gray-900">${selectedTeacher.salary.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees; 
