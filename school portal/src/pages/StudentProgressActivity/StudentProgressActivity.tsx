import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Calendar,
  User,
  Heart,
  Edit,
  Send,
  Download,
  FileText,
  Plus,
  ChevronRight,
  MoreHorizontal,
  Clock,
  X,
  Save,
  Upload
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { studentsAPI, classesAPI, classroomAPI, getAssetUrl } from '../../services/api';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

const StudentProgressActivity: React.FC = () => {
  const { state: appState } = useAppContext();
  const { state: authState } = useAuth();
  const navigate = useNavigate();

  // Selection states
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Report data states
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [praiseText, setPraiseText] = useState('');
  const [studentComments, setStudentComments] = useState<any[]>([]);
  const [studentPraises, setStudentPraises] = useState<any[]>([]);

  // Refined editing and document upload states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all students for search on mount
  useEffect(() => {
    fetchAllStudents();
  }, []);

  const fetchAllStudents = async () => {
    try {
      // Use classroomAPI.getStudents with high limit to ensure search works for all students
      const response = await classroomAPI.getStudents({ limit: 1000 });
      console.log('Fetched students for search:', response);
      const studentsData = response?.data || response || [];
      setAllStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (error) {
      console.error('Error fetching students:', error);
      // Fallback to app state students if API fails
      setAllStudents(appState.students || []);
    }
  };

  // Fetch student details when selected
  useEffect(() => {
    if (selectedStudent) {
      fetchStudentReport(selectedStudent._id || selectedStudent.id);
    }
  }, [selectedStudent]);

  // Robust date formatter
  const formatDate = (date: any, fallback = 'N/A') => {
    if (!date) return fallback;
    try {
      const d = typeof date === 'string' ? parseISO(date) : new Date(date);
      if (!isValid(d)) return fallback;
      return format(d, 'dd/MM/yyyy');
    } catch (error) {
      return fallback;
    }
  };

  const fetchStudentReport = async (studentId: string) => {
    if (!studentId) return;
    setLoading(true);
    try {
      // Get schoolId from auth state or local storage
      const schoolId = authState.user?.schoolId || authState.user?.school?._id || localStorage.getItem('schoolId');

      // Parallel fetch for better performance
      const [attendance, docs, performance] = await Promise.all([
        // Try classroomAPI.getStudentAttendanceStats as it might be more reliable
        classroomAPI.getStudentAttendanceStats(studentId, { schoolId }).catch(() =>
          studentsAPI.getAttendance(studentId).catch(() => null)
        ),
        studentsAPI.getDocuments(studentId).catch(() => []),
        studentsAPI.getPerformanceReport({ studentId, schoolId }).catch(() => null)
      ]);

      console.log('Real-time Report Data Raw:', { attendance, docs, performance });

      // Map Attendance correctly
      if (attendance?.success && attendance?.data) {
        setAttendanceData({
          stats: { averageAttendance: attendance.data.statistics?.attendancePercentage || 0 },
          history: attendance.data.breakdown || []
        });
      } else {
        setAttendanceData(null);
      }

      // Map Documents correctly
      // Some students have documents in studentDetail.pdfs as well
      const studentDetail = await studentsAPI.getById(studentId).catch(() => null);
      const apiDocs = Array.isArray(docs) ? docs : (docs?.data || []);
      const pdfDocs = (studentDetail?.data?.pdfs || []).map((p: string) => ({
        name: p.split('-').pop() || 'Document',
        url: p,
        size: 'N/A'
      }));
      setDocuments([...pdfDocs, ...apiDocs]);

      // Map Performance correctly
      if (performance?.success && performance?.data?.students) {
        // Find specific student results in the array
        const myResults = performance.data.students.find((s: any) => (s.studentId === studentId || s.id === studentId));
        setPerformanceData(myResults?.exams || []);
      } else {
        setPerformanceData([]);
      }

      // Sync edit form with selected student
      setEditForm({
        name: selectedStudent.name || '',
        email: selectedStudent.email || '',
        fatherName: selectedStudent.fatherName || '',
        fatherPhone: selectedStudent.fatherPhone || '',
        motherName: selectedStudent.motherName || '',
        motherPhone: selectedStudent.motherPhone || '',
        dateOfBirth: selectedStudent.dateOfBirth || '',
        gender: selectedStudent.gender || 'Male',
        address: selectedStudent.address ? (typeof selectedStudent.address === 'string' ? selectedStudent.address : JSON.stringify(selectedStudent.address)) : '',
        hobbies: selectedStudent.hobbies || ''
      });
    } catch (error) {
      console.error('Error fetching student report:', error);
      toast.error('Failed to load student report data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // If canceling, reset form
      setEditForm({
        name: selectedStudent.name || '',
        email: selectedStudent.email || '',
        fatherName: selectedStudent.fatherName || '',
        fatherPhone: selectedStudent.fatherPhone || '',
        motherName: selectedStudent.motherName || '',
        motherPhone: selectedStudent.motherPhone || '',
        dateOfBirth: selectedStudent.dateOfBirth || '',
        gender: selectedStudent.gender || 'Male',
        address: selectedStudent.address ? (typeof selectedStudent.address === 'string' ? selectedStudent.address : JSON.stringify(selectedStudent.address)) : '',
        hobbies: selectedStudent.hobbies || ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent) return;
    setIsUpdating(true);
    try {
      // Parse address if it was rendered as a string but API expects object
      let parsedAddress = editForm.address;
      try {
        if (editForm.address.startsWith('{')) {
          parsedAddress = JSON.parse(editForm.address);
        }
      } catch (e) {
        // Keep as string if parsing fails
      }

      const updateData = { ...editForm, address: parsedAddress };
      const response = await studentsAPI.update(selectedStudent._id || selectedStudent.id, updateData);

      // Update local state
      const updatedStudent = { ...selectedStudent, ...updateData };
      setSelectedStudent(updatedStudent);

      // Refresh list to keep search accurate
      fetchAllStudents();

      setIsEditing(false);
      toast.success('Student details updated successfully');
    } catch (error: any) {
      console.error('Update failed:', error);
      toast.error(error.message || 'Failed to update student details');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    const formData = new FormData();
    formData.append('document', file);
    formData.append('name', file.name);

    try {
      setLoading(true);
      await studentsAPI.uploadDocument(selectedStudent._id || selectedStudent.id, formData);
      toast.success('Document uploaded successfully');
      // Refresh documents list
      const docs = await studentsAPI.getDocuments(selectedStudent._id || selectedStudent.id);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return allStudents.filter((s: any) => {
      const name = s.name?.toLowerCase() || '';
      const admission = s.admissionNumber?.toLowerCase() || '';
      const roll = s.rollNumber?.toString().toLowerCase() || '';
      const id = s.id?.toString() || '';
      const _id = s._id?.toString() || '';
      const term = searchTerm.toLowerCase();

      return name.includes(term) ||
        admission.includes(term) ||
        roll.includes(term) ||
        id.includes(term) ||
        _id.includes(term);
    }).slice(0, 5);
  }, [searchTerm, allStudents]);

  const handleSaveComment = () => {
    if (!commentText.trim() || !selectedStudent) return;
    const newComment = {
      id: Date.now(),
      text: commentText,
      author: authState.user?.name || 'Admin',
      date: format(new Date(), 'dd/MM/yyyy')
    };
    setStudentComments(prev => [newComment, ...prev]);
    setCommentText('');
    toast.success('Comment saved');
  };

  const handleSavePraise = () => {
    if (!praiseText.trim()) return;
    const newPraise = {
      id: Date.now(),
      text: praiseText,
      author: authState.user?.name || 'Admin',
      date: format(new Date(), 'dd/MM/yyyy')
    };
    setStudentPraises([newPraise, ...studentPraises]);
    setPraiseText('');
    toast.success('Praise saved');
  };

  // Chart Data preparation
  const lineChartData = useMemo(() => {
    if (!attendanceData || !attendanceData.stats) {
      return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          fill: true,
          label: 'Attendance',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.4,
          pointBackgroundColor: '#f97316',
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
        }],
      };
    }

    // Map real attendance history if available, else use placeholder logic based on stats
    const history = attendanceData.history || [];
    const labels = history.length > 0 ? history.map((h: any) => {
      try {
        const d = parseISO(h.date);
        return isValid(d) ? format(d, 'EEE') : 'Day';
      } catch { return 'Day'; }
    }) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = history.length > 0 ? history.map((h: any) => h.status === 'present' ? 100 : 0) : [30, 45, 60, 84, 40, 50, 85];

    return {
      labels,
      datasets: [
        {
          fill: true,
          label: 'Attendance',
          data,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.4,
          pointBackgroundColor: '#f97316',
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
        },
      ],
    };
  }, [attendanceData]);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#000',
        padding: 10,
        titleColor: '#fff',
        bodyColor: '#fff',
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { display: true, color: '#f3f4f6' },
        ticks: { stepSize: 20, font: { size: 10 }, color: '#9ca3af' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: '#9ca3af' }
      }
    }
  };

  // Calculate Grade Distribution for Doughnut chart
  const doughnutData = useMemo(() => {
    if (!performanceData || performanceData.length === 0) {
      // Return dummy only if no real data and no student selected
      if (!selectedStudent) {
        return {
          labels: ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E'],
          percentages: [30, 25, 20, 15, 10],
          datasets: [{
            data: [30, 25, 20, 15, 10],
            backgroundColor: ['#fbbf24', '#f59e0b', '#ea580c', '#7c2d12', '#451a03'],
            borderWidth: 0,
          }]
        };
      }
      return {
        labels: ['No Data'],
        percentages: [0],
        datasets: [{
          data: [100],
          backgroundColor: ['#f3f4f6'],
          borderWidth: 0,
        }]
      };
    }

    const counts: any = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    performanceData.forEach((exam: any) => {
      const g = (exam.grade || 'A').charAt(0).toUpperCase();
      if (counts[g] !== undefined) counts[g]++;
      else if (g === 'E' || g === 'F') counts['F']++;
      else counts['D']++;
    });

    const total = performanceData.length;
    const percentages = Object.values(counts).map((c: any) => Math.round((c / total) * 100));

    return {
      labels: Object.keys(counts).map(g => `Grade ${g}`),
      percentages,
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#22c55e', '#3b82f6', '#f97316', '#fbbf24', '#ef4444'],
        borderWidth: 0,
      }]
    };
  }, [performanceData, selectedStudent]);

  const doughnutOptions = {
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    maintainAspectRatio: false,
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredStudents.length > 0) {
      // If there's an exact match for admission number, pick it, otherwise pick the first suggestion
      const exactMatch = filteredStudents.find(s => s.admissionNumber?.toLowerCase() === searchTerm.toLowerCase());
      setSelectedStudent(exactMatch || filteredStudents[0]);
      setShowSuggestions(false);
      setSearchTerm('');
    }
  };

  if (!selectedStudent) {
    return (
      <div className="p-8 max-w-7xl mx-auto min-h-[80vh] flex flex-col items-center justify-center bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-200">
        <div className="bg-orange-100 p-6 rounded-full mb-6">
          <GraduationCap className="h-16 w-16 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Academic Progress</h2>
        <p className="text-gray-500 mb-8">Select a student to view their detailed performance report</p>

        <div className="w-full max-w-md relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
            <input
              type="text"
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              placeholder="Search by Admission Number, Name or Roll No..."
              value={searchTerm}
              onKeyDown={handleSearchKeyDown}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
          </div>

          {showSuggestions && filteredStudents.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {filteredStudents.map(student => (
                <div
                  key={student._id || student.id}
                  className="px-6 py-4 hover:bg-orange-50 cursor-pointer transition-colors border-b last:border-b-0"
                  onClick={() => {
                    setSelectedStudent(student);
                    setShowSuggestions(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">
                      {(student.name || 'ST').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{student.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">
                        ID: {student.admissionNumber || student.id || 'N/A'} |
                        Class: {student.classId?.name || student.classId?.section ? `${student.classId.name} ${student.classId.section}` : (student.class?.name || (typeof student.class === 'string' ? student.class : 'N/A'))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10 animate-in fade-in duration-500 lg:flex-row">

      {/* Main Content (Left Column) */}
      <div className="flex-1 flex flex-col gap-8">

        {/* Header Row */}
        <div className="flex flex-col justify-between gap-5 rounded-[24px] border border-[#e0e7f2] bg-white p-5 shadow-[0_16px_45px_#2038630c] md:flex-row md:items-center md:p-7">
          <div className="flex flex-col md:flex-row md:items-center gap-6 w-full md:w-auto">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#ee7731]">Student journey / progress</p><h1 className="mb-1 font-['Manrope'] text-3xl font-extrabold tracking-[-.05em] text-[#20386b]">Student progress</h1>
              <div className="flex items-center gap-2 text-sm text-[#6c7a91]">
                <span>Student</span>
                <ChevronRight className="h-4 w-4" />
                <span className="text-orange-600 font-medium">Student Detail</span>
              </div>
            </div>

            {/* Quick-switch Search Bar in Header */}
            <div className="relative w-full md:w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all placeholder:text-gray-400"
                  placeholder="Switch student (ID, Name)..."
                  value={searchTerm}
                  onKeyDown={handleSearchKeyDown}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />
              </div>

              {showSuggestions && filteredStudents.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {filteredStudents.map(student => (
                    <div
                      key={student._id || student.id}
                      className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors border-b last:border-b-0"
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowSuggestions(false);
                        setSearchTerm('');
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center text-[10px] text-orange-700 font-bold">
                          {(student?.name || 'ST').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{student?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-gray-400">ID: {student?.admissionNumber || student?.id || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleEditToggle}
                  className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStudent}
                  disabled={isUpdating}
                  className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isUpdating ? <Clock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={handleEditToggle}
                className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
              >
                <Edit className="h-4 w-4" />
                Edit Student
              </button>
            )}
          </div>
        </div>

        {/* Row 1: Profile & Attendance */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* Student Profile Card */}
          <div className="xl:col-span-7 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="flex flex-col sm:flex-row gap-8 relative z-10">
              {/* Profile Image & IDs */}
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-orange-50 p-1">
                    {selectedStudent?.avatar ? (
                      <img
                        src={selectedStudent.avatar.startsWith('http') ? selectedStudent.avatar : getAssetUrl(selectedStudent.avatar)}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-orange-100 flex items-center justify-center text-4xl font-black text-orange-600">
                        {(selectedStudent?.name || 'S').substring(0, 1)}
                      </div>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="text-2xl font-bold text-gray-900 border-b-2 border-orange-500 outline-none w-full text-center"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                    <input
                      type="email"
                      className="text-sm text-gray-400 border-b border-gray-200 outline-none w-full text-center"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedStudent?.name}</h3>
                    <p className="text-sm text-gray-400 mb-4">{selectedStudent?.email || `${(selectedStudent?.name || '').toLowerCase().replace(' ', '')}@gmail.com`}</p>
                  </>
                )}

                <div className="flex gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900 leading-tight">{selectedStudent?.admissionNumber || selectedStudent?.id || '2009'}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stu ID</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100 mt-1"></div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900 leading-tight">
                      {(() => {
                        const cls = selectedStudent?.classId || selectedStudent?.class;
                        if (!cls) return '9th';
                        if (typeof cls === 'string') return cls;
                        return `${cls.name || ''} ${cls.section || ''}`.trim() || '9th';
                      })()}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Class</p>
                  </div>
                </div>
              </div>

              {/* Details List */}
              <div className="flex-1 space-y-6">
                <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Date of Birth</p>
                    {isEditing ? (
                      <input
                        type="date"
                        className="font-bold text-gray-900 border-b border-gray-200 outline-none w-full"
                        value={editForm.dateOfBirth?.split('T')[0]}
                        onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                      />
                    ) : (
                      <p className="font-bold text-gray-900">{formatDate(selectedStudent?.dateOfBirth, '26/07/2019')}</p>
                    )}
                    <div className="h-0.5 w-12 bg-orange-500/10 mt-1"></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Gender</p>
                    {isEditing ? (
                      <select
                        className="font-bold text-gray-900 border-b border-gray-200 outline-none w-full bg-transparent"
                        value={editForm.gender}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="font-bold text-gray-900">{selectedStudent?.gender || 'Male'}</p>
                    )}
                    <div className="h-0.5 w-12 bg-orange-500/10 mt-1"></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Parents Name</p>
                    {isEditing ? (
                      <input
                        type="text"
                        className="font-bold text-gray-900 border-b border-gray-200 outline-none w-full"
                        value={editForm.fatherName || editForm.motherName}
                        onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                      />
                    ) : (
                      <p className="font-bold text-gray-900">{selectedStudent?.fatherName || selectedStudent?.motherName || 'Smith Doe'}</p>
                    )}
                    <div className="h-0.5 w-12 bg-orange-500/10 mt-1"></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Parents Contact:</p>
                    {isEditing ? (
                      <input
                        type="text"
                        className="font-bold text-gray-900 border-b border-gray-200 outline-none w-full"
                        value={editForm.fatherPhone || editForm.motherPhone}
                        onChange={(e) => setEditForm({ ...editForm, fatherPhone: e.target.value })}
                      />
                    ) : (
                      <p className="font-bold text-gray-900">{selectedStudent?.fatherPhone || selectedStudent?.motherPhone || '987-654-3210'}</p>
                    )}
                    <div className="h-0.5 w-12 bg-orange-500/10 mt-1"></div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Address</p>
                  {isEditing ? (
                    <textarea
                      className="font-bold text-gray-900 border border-gray-100 rounded-lg p-2 outline-none w-full bg-orange-50/10 resize-none h-20"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  ) : (
                    <p className="font-bold text-gray-900 leading-relaxed">
                      {(() => {
                        const addr = selectedStudent?.address;
                        if (!addr) return '1341 Poplar Street, Chicago, IL 60606';
                        if (typeof addr === 'string') return addr;
                        return [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ') || '1341 Poplar Street, Chicago, IL 60606';
                      })()}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Hobbies</p>
                  {isEditing ? (
                    <input
                      type="text"
                      className="font-bold text-gray-900 border-b border-gray-200 outline-none w-full"
                      value={editForm.hobbies}
                      onChange={(e) => setEditForm({ ...editForm, hobbies: e.target.value })}
                    />
                  ) : (
                    <p className="font-bold text-gray-900">{selectedStudent?.hobbies || 'Dance, Music, Playing Cricket'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Card */}
          <div className="xl:col-span-5 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Attendance</h3>
                <p className="text-sm font-bold text-orange-500">Average: {attendanceData?.stats?.averageAttendance ?? '0'}%</p>
              </div>
              <select className="bg-transparent border border-gray-200 rounded-full px-4 py-1.5 text-xs font-bold text-gray-600 outline-none">
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>

            <div className="flex-1 min-h-[160px] relative">
              <Line data={lineChartData} options={lineChartOptions} />
              {/* Reference Marker */}
              <div className="absolute top-[20%] left-[55%] bg-black text-white text-[10px] px-2 py-0.5 rounded font-bold">
                {attendanceData?.stats?.averageAttendance ?? '0'}%
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-black"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Result Sheet & Grades */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* Result Sheet Table */}
          <div className="xl:col-span-8 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Result Sheet</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-50">
                    <th className="pb-4 text-xs font-bold text-orange-600 uppercase tracking-wider">Subject</th>
                    <th className="pb-4 text-xs font-bold text-orange-600 uppercase tracking-wider text-center">Marks</th>
                    <th className="pb-4 text-xs font-bold text-orange-600 uppercase tracking-wider">Grade</th>
                    <th className="pb-4 text-xs font-bold text-orange-600 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {((performanceData && (performanceData.length > 0 || !loading)) ? performanceData : [
                    { subject: { name: 'Hindi' }, marks: 76, totalMarks: 100, grade: 'B' },
                    { subject: { name: 'Gujarati' }, marks: 94, totalMarks: 100, grade: 'A' },
                    { subject: { name: 'English' }, marks: 83, totalMarks: 100, grade: 'A' },
                    { subject: { name: 'Mathematics' }, marks: 68, totalMarks: 100, grade: 'C' }
                  ]).map((row: any, i: number) => (
                    <tr key={i}>
                      <td className="py-4 font-bold text-gray-900 text-sm">
                        {typeof row.subject === 'string' ? row.subject : (row.subject?.name || row.sub || row.examName || 'Subject')}
                      </td>
                      <td className="py-4 font-medium text-gray-600 text-sm text-center">{row.marksObtained || row.marks}/{row.totalMarks}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${(row.grade || 'A').startsWith('A') ? 'bg-green-100 text-green-600' :
                          (row.grade || 'A').startsWith('B') ? 'bg-blue-100 text-blue-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                          {row.grade || 'A'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button className="text-gray-400 hover:text-orange-500 transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!loading && performanceData?.length === 0 && selectedStudent) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 italic text-sm">
                        No exam records found for this student.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-orange-50">
                    <td className="py-6 font-black text-gray-900 text-base">Total</td>
                    <td className="py-6 font-black text-gray-900 text-base text-center">
                      {performanceData?.reduce((acc: any, curr: any) => acc + (curr.marksObtained || curr.marks || 0), 0)} /
                      {performanceData?.reduce((acc: any, curr: any) => acc + (curr.totalMarks || 0), 0)}
                    </td>
                    <td className="py-6 text-right" colSpan={2}>
                      <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 font-bold flex items-center justify-center ml-auto">
                        {(() => {
                          const totalObtained = performanceData?.reduce((acc: any, curr: any) => acc + (curr.marksObtained || curr.marks || 0), 0);
                          const totalPossible = performanceData?.reduce((acc: any, curr: any) => acc + (curr.totalMarks || 0), 0);
                          if (!totalPossible || isNaN(totalObtained)) return 'N/A';
                          const perc = (totalObtained / totalPossible) * 100;
                          if (perc >= 90) return 'A+';
                          if (perc >= 80) return 'A';
                          if (perc >= 70) return 'B';
                          if (perc >= 60) return 'C';
                          return 'D';
                        })()}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Grades Distribution */}
          <div className="xl:col-span-4 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Grades</h3>
              <select className="bg-transparent border border-gray-200 rounded-full px-4 py-1.5 text-xs font-bold text-gray-600 outline-none">
                <option>Overall</option>
              </select>
            </div>

            <div className="flex-1 relative flex items-center justify-center min-h-[220px]">
              <div className="w-44 h-44">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
              <div className="absolute text-center">
                <p className="text-3xl font-black text-gray-900">
                  {performanceData?.reduce((acc: any, curr: any) => acc + (curr.marksObtained || curr.marks || 0), 0)}
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase leading-tight">Total Marks<br />Obtained</p>
              </div>

              {/* Labels positioned as per reference */}
              {(doughnutData as any).percentages.map((p: number, idx: number) => {
                const colors = ['text-green-500', 'text-blue-500', 'text-orange-500', 'text-yellow-500', 'text-red-500'];
                const positions = [
                  'top-0 right-0',
                  'bottom-6 right-0',
                  'bottom-0 left-1/4',
                  'top-1/2 left-0 -translate-y-1/2',
                  'top-6 left-0'
                ];
                if (idx >= positions.length) return null;
                return (
                  <div key={idx} className={`absolute ${positions[idx]} text-[10px] text-center`}>
                    <p className={`font-bold ${colors[idx]}`}>{p}%</p>
                    <p className="text-gray-400 font-bold uppercase">Grade {doughnutData.labels[idx].split(' ').pop()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Change Student Trigger */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setSelectedStudent(null)}
            className="text-gray-400 hover:text-orange-500 font-bold text-sm flex items-center gap-2 transition-colors"
          >
            <User className="h-4 w-4" />
            Select another student
          </button>
        </div>

      </div>

      {/* Sidebar (Right Column) */}
      <div className="w-full lg:w-80 flex flex-col gap-8">

        {/* User Sidebar Header */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-50">
                <img
                  src={(authState.user as any)?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent?.name || 'Student')}&background=f97316&color=fff`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900 leading-tight">{selectedStudent?.name || 'Student'}</p>
                <ChevronRight className="h-4 w-4 text-gray-400 transform rotate-90" />
              </div>
              <p className="text-[10px] text-gray-400 font-medium">{selectedStudent?.email || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Files/Documents Section */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Files/Documents</h3>
          <div className="space-y-4 mb-6">
            {(documents?.length > 0 ? documents : [
              { name: 'Medical Report.pdf', size: '100 kb' },
              { name: 'Aadhar Card.pdf', size: '26 kb' },
              { name: 'Identity Card.pdf', size: '20 kb' },
              { name: 'Weekly Performance.pdf', size: '2 Mb' },
            ]).map((file: any, i: number) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-600 bg-opacity-50">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 line-clamp-1">{file.name || file.fileName}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{file.size || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadDocument}
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.png"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 border-2 border-orange-500/20 rounded-xl text-orange-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-50 transition-all border-dashed"
          >
            <Plus className="h-4 w-4" />
            Add Document
          </button>
        </div>

      </div>

    </div>
  );
};

export default StudentProgressActivity;
