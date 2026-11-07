import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { classroomAPI } from '../../services/api';
import socketService from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Attendance: React.FC = () => {
  const { state: authState } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);
  
  // Teacher attendance state
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingTeacherAttendance, setLoadingTeacherAttendance] = useState(false);
  
  // Class-wise attendance state
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [classAttendanceStats, setClassAttendanceStats] = useState<any>(null);
  const [loadingOverallStats, setLoadingOverallStats] = useState(false);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [loadingDailySummary, setLoadingDailySummary] = useState(false);
  
  // Holiday marking state
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayStartDate, setHolidayStartDate] = useState('');
  const [holidayEndDate, setHolidayEndDate] = useState('');
  const [isMarkingHoliday, setIsMarkingHoliday] = useState(false);

  const tabs = [
    { id: 'students', label: 'Student Attendance', icon: Users },
    { id: 'employees', label: 'Employee Attendance', icon: Clock },
  ];

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchTeachers(),
          fetchTeacherAttendance(),
          fetchAttendanceStats(),
          fetchClasses(),
          fetchStudents()
        ]);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, []);

  const [students, setStudents] = useState<any[]>([]);

  const fetchStudents = async () => {
    try {
      const studentsData = await classroomAPI.getStudents();
      console.log('Students data:', studentsData);
      setStudents(studentsData.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // WebSocket connection and real-time updates
  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      // Connect to WebSocket
      socketService.connect(authState.token);

      // Listen for attendance updates
      const handleAttendanceUpdate = (data: any) => {
        console.log('📊 Received real-time attendance update:', data);
        
        if (data.type === 'bulk_attendance_marked') {
          // Show notification
          toast.success(`Attendance updated for ${data.successfulCount} students`);
          
          // Refresh attendance data if we're viewing the relevant class and date
          const updateDate = new Date(data.date).toISOString().split('T')[0];
          const currentDate = attendanceDate;
          
          if (selectedClass === data.classId || updateDate === currentDate) {
            // Refresh the relevant data
            if (selectedClass) {
              fetchClassAttendance(selectedClass, currentDate);
              fetchDailySummary(selectedClass, currentDate);
            }
          }
        }
      };

      socketService.on('attendance_updated', handleAttendanceUpdate);

      // Cleanup on unmount
      return () => {
        socketService.off('attendance_updated', handleAttendanceUpdate);
      };
    }
  }, [authState.isAuthenticated, authState.token, selectedClass, attendanceDate]);


  // Teacher attendance functions
  const fetchTeachers = async () => {
    try {
      setLoadingTeachers(true);
      const teachersData = await classroomAPI.getTeachers();
      console.log('Teachers data:', teachersData);
      setTeachers(teachersData.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to fetch teachers');
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchTeacherAttendance = async (date?: string) => {
    try {
      setLoadingTeacherAttendance(true);
      const selectedDate = date || attendanceDate;
      const attendanceData = await classroomAPI.getTeacherAttendance({ date: selectedDate });
      console.log('Teacher attendance data:', attendanceData);
      setTeacherAttendance(attendanceData.data || []);
    } catch (error) {
      console.error('Error fetching teacher attendance:', error);
      toast.error('Failed to fetch teacher attendance');
      setTeacherAttendance([]);
    } finally {
      setLoadingTeacherAttendance(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const statsData = await classroomAPI.getTeacherAttendanceStats();
      console.log('Teacher attendance stats:', statsData);
      setAttendanceStats(statsData.data || null);
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      toast.error('Failed to fetch attendance statistics');
    }
  };

  const markTeacherAttendance = async (teacherId: string, status: string, remarks?: string) => {
    try {
      setIsMarkingAttendance(true);
      await classroomAPI.markTeacherAttendance({
        teacherId,
        date: attendanceDate,
        status,
        remarks
      });
      toast.success(`Attendance marked as ${status} successfully`);
      // Refresh attendance data for the current date
      await fetchTeacherAttendance(attendanceDate);
      await fetchAttendanceStats();
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to mark attendance';
      toast.error(errorMessage);
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    setAttendanceDate(newDate);
    fetchTeacherAttendance(newDate);
  };

  const markBulkHoliday = async () => {
    if (!holidayStartDate || !holidayEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    const startDate = new Date(holidayStartDate);
    const endDate = new Date(holidayEndDate);

    if (startDate > endDate) {
      toast.error('Start date must be before or equal to end date');
      return;
    }

    try {
      setIsMarkingHoliday(true);
      
      // Generate all dates between start and end date
      const dates: string[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Create attendance records for all teachers and all dates
      const attendanceRecords: any[] = [];
      
      for (const teacher of teachers) {
        for (const date of dates) {
          attendanceRecords.push({
            teacherId: teacher._id || teacher.id,
            date: date,
            status: 'holiday',
            remarks: `Holiday from ${holidayStartDate} to ${holidayEndDate}`
          });
        }
      }

      if (attendanceRecords.length === 0) {
        toast.error('No records to mark');
        return;
      }

      await classroomAPI.markBulkTeacherAttendance({
        attendanceRecords
      });

      toast.success(`Holiday marked for all teachers from ${holidayStartDate} to ${holidayEndDate}`);
      setShowHolidayModal(false);
      setHolidayStartDate('');
      setHolidayEndDate('');
      
      // Refresh attendance data
      await fetchTeacherAttendance(attendanceDate);
      await fetchAttendanceStats();
    } catch (error: any) {
      console.error('Error marking bulk holiday:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to mark holiday';
      toast.error(errorMessage);
    } finally {
      setIsMarkingHoliday(false);
    }
  };

  // Class-wise attendance functions
  const fetchClasses = async () => {
    try {
      const classesData = await classroomAPI.getClasses();
      // Ensure classes have teacherId populated
      const classesWithTeacher = (classesData.data || []).map((cls: any) => ({
        ...cls,
        teacherId: cls.teacherId || cls.teacher || null
      }));
      setClasses(classesWithTeacher);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to fetch classes');
    }
  };

  const fetchClassAttendance = async (classId?: string, date?: string) => {
    try {
      setLoading(true);
      const selectedClassId = classId || selectedClass;
      const selectedDate = date || attendanceDate;
      
      if (!selectedClassId) {
        return;
      }

      // Fetch attendance for the selected class and date
      const attendanceData = await classroomAPI.getClassDateAttendance({
        classId: selectedClassId,
        date: selectedDate
      });
      
      // Get class details with teacher info
      const classDetails = classes.find(c => c._id === selectedClassId);
      
      // Group attendance by student for easier display
      const studentGroups = (attendanceData.data || []).reduce((acc: any, record: any) => {
        const studentId = record.studentId._id;
        if (!acc[studentId]) {
          acc[studentId] = {
            student: record.studentId,
            class: {
              ...record.classId,
              // Include class teacher from class details or record
              teacherId: classDetails?.teacherId || record.classId?.teacherId || null
            },
            attendance: []
          };
        }
        acc[studentId].attendance.push({
          subject: record.subjectId,
          teacher: record.teacherId,
          status: record.status,
          remarks: record.remarks,
          markedAt: record.markedAt,
          markedBy: record.markedBy // Add who marked the attendance
        });
        return acc;
      }, {});
      
      setStudentAttendance(Object.values(studentGroups));
    } catch (error) {
      console.error('Error fetching class attendance:', error);
      toast.error('Failed to fetch class attendance');
    } finally {
      setLoading(false);
    }
  };

  // Fetch overall attendance statistics for the class
  const fetchClassOverallStats = async (classId?: string) => {
    try {
      setLoadingOverallStats(true);
      const selectedClassId = classId || selectedClass;
      
      if (!selectedClassId) {
        setClassAttendanceStats(null);
        return;
      }

      const statsData = await classroomAPI.getClassAttendanceStats(selectedClassId);
      setClassAttendanceStats(statsData.data || null);
    } catch (error) {
      console.error('Error fetching class attendance stats:', error);
      toast.error('Failed to fetch overall attendance statistics');
      setClassAttendanceStats(null);
    } finally {
      setLoadingOverallStats(false);
    }
  };

  // Fetch daily attendance summary metrics from GET /api/attendance/summary
  const fetchDailySummary = async (classId?: string, date?: string) => {
    try {
      setLoadingDailySummary(true);
      const targetClassId = classId || selectedClass;
      const targetDate = date || attendanceDate;
      if (!targetClassId) {
        setDailySummary(null);
        return;
      }
      const res = await classroomAPI.getAttendanceSummary({
        classId: targetClassId,
        date: targetDate
      });
      setDailySummary(res?.data || null);
    } catch (error) {
      console.error('Error fetching daily attendance metrics:', error);
      setDailySummary(null);
    } finally {
      setLoadingDailySummary(false);
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    fetchClassAttendance(classId);
    fetchClassOverallStats(classId);
    fetchDailySummary(classId, attendanceDate);
  };

  const handleStudentDateChange = (newDate: string) => {
    setAttendanceDate(newDate);
    if (selectedClass) {
      fetchClassAttendance(selectedClass, newDate);
      fetchDailySummary(selectedClass, newDate);
    }
  };

  return (
    <div className="p-3 md:p-4 space-y-2.5">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Students</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{students.length || 0}</p>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-slate-50/50">
          <nav className="flex space-x-4 px-4 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 py-2 px-1 border-b-2 font-semibold text-xs whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 md:p-4">
          {activeTab === 'students' && (
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-2.5">
                <h3 className="text-sm font-bold text-gray-900">Class-wise Student Attendance</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-xs font-medium text-gray-600">Class:</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="h-8 px-2.5 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.name} {cls.section && `- ${cls.section}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <label className="text-xs font-medium text-gray-600">Date:</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => handleStudentDateChange(e.target.value)}
                      className="h-8 px-2.5 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (selectedClass) {
                        fetchClassAttendance();
                        fetchClassOverallStats();
                        fetchDailySummary(selectedClass, attendanceDate);
                      }
                    }}
                    className="h-8 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {!selectedClass ? (
                <div className="bg-white rounded-xl shadow-xs p-8 text-center border border-gray-200">
                  <Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Select a Class</h4>
                  <p className="text-xs text-gray-500">Choose a class from the dropdown above to view student attendance</p>
                </div>
              ) : loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Daily Attendance Summary Metrics */}
                  {loadingDailySummary ? (
                    <div className="bg-white rounded-xl shadow-xs p-3 border border-gray-200">
                      <div className="flex justify-center items-center py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-xs text-gray-600">Loading daily attendance metrics...</span>
                      </div>
                    </div>
                  ) : dailySummary ? (
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl shadow-xs p-3 border border-indigo-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 pb-2 border-b border-indigo-100">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                            <span>Daily Attendance Summary</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                              /api/attendance/summary
                            </span>
                          </h4>
                          <p className="text-[11px] text-gray-600 mt-0.5">
                            Metrics for <span className="font-semibold">{dailySummary.className}</span> on{' '}
                            <span className="font-semibold">{new Date(dailySummary.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </p>
                        </div>
                        <div className="mt-1 sm:mt-0 flex items-center space-x-1.5">
                          <span className="text-xs text-gray-500">Rate:</span>
                          <span className="text-lg font-extrabold text-indigo-700">{dailySummary.attendancePercentage}%</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        <div className="bg-white p-2 rounded-lg shadow-xs border border-gray-100 text-center">
                          <p className="text-[10px] font-medium text-gray-500">Total</p>
                          <p className="text-base font-bold text-gray-900 mt-0.5">{dailySummary.totalStudents}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-xs border border-green-100 text-center">
                          <p className="text-[10px] font-medium text-green-700">Present</p>
                          <p className="text-base font-bold text-green-600 mt-0.5">{dailySummary.present}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-xs border border-red-100 text-center">
                          <p className="text-[10px] font-medium text-red-700">Absent</p>
                          <p className="text-base font-bold text-red-600 mt-0.5">{dailySummary.absent}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-xs border border-yellow-100 text-center">
                          <p className="text-[10px] font-medium text-yellow-700">Late</p>
                          <p className="text-base font-bold text-yellow-600 mt-0.5">{dailySummary.late}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-xs border border-blue-100 text-center">
                          <p className="text-[10px] font-medium text-blue-700">Excused</p>
                          <p className="text-base font-bold text-blue-600 mt-0.5">{dailySummary.excused}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-xs border border-gray-100 text-center">
                          <p className="text-[10px] font-medium text-gray-500">Unmarked</p>
                          <p className="text-base font-bold text-gray-700 mt-0.5">{dailySummary.unmarkedStudents}</p>
                        </div>
                      </div>

                      {/* Visual progress bar */}
                      <div className="mt-2 pt-1.5 border-t border-indigo-100/70">
                        <div className="flex justify-between text-[11px] text-gray-600 mb-0.5">
                          <span>Marked: {dailySummary.markedStudents} of {dailySummary.totalStudents}</span>
                          <span>{dailySummary.attendancePercentage}% attended</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, dailySummary.attendancePercentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {studentAttendance.length > 0 ? (
                    <div className="space-y-3">
                      {/* Overall Attendance Summary */}
                      {loadingOverallStats ? (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-xs p-3 border border-blue-200">
                          <div className="flex justify-center items-center py-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-xs text-gray-600">Loading overall attendance...</span>
                          </div>
                        </div>
                      ) : classAttendanceStats && classAttendanceStats.statistics && classAttendanceStats.statistics.length > 0 ? (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-xs p-3 border border-blue-200">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 mb-2">Overall Class Attendance</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="bg-white rounded-lg p-2.5 shadow-xs border border-slate-100">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-500">Total Students</p>
                                  <p className="text-lg font-bold text-gray-900 leading-tight">
                                    {classAttendanceStats.summary?.totalStudents || classAttendanceStats.statistics.length || 0}
                                  </p>
                                </div>
                                <Users className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-2.5 shadow-xs border border-slate-100">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-500">Avg. Attendance</p>
                                  <p className="text-lg font-bold text-green-600 leading-tight">
                                    {classAttendanceStats.summary?.averageAttendance?.toFixed(1) || 0}%
                                  </p>
                                </div>
                                <TrendingUp className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-2.5 shadow-xs border border-slate-100">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-500">Total Present</p>
                                  <p className="text-lg font-bold text-green-600 leading-tight">
                                    {classAttendanceStats.statistics.reduce((sum: number, stat: any) => sum + (stat.present || 0), 0)}
                                  </p>
                                </div>
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-2.5 shadow-xs border border-slate-100">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-500">Total Absent</p>
                                  <p className="text-lg font-bold text-red-600 leading-tight">
                                    {classAttendanceStats.statistics.reduce((sum: number, stat: any) => sum + (stat.absent || 0), 0)}
                                  </p>
                                </div>
                                <XCircle className="h-5 w-5 text-red-600" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Student List with Overall Attendance in Scroll Container */}
                      <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-210px)] pr-1">
                        {studentAttendance.map((studentData: any) => {
                          const studentIdStr = studentData.student._id?.toString() || studentData.student._id;
                          const overallStats = classAttendanceStats?.statistics?.find((stat: any) => {
                            const statIdStr = stat.studentId?.toString() || stat.studentId;
                            return statIdStr === studentIdStr;
                          });
                          
                          return (
                            <div key={studentData.student._id} className="bg-white rounded-xl shadow-xs p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2.5">
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-blue-700">
                                      {studentData.student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 leading-tight">{studentData.student.name}</h4>
                                    <p className="text-xs text-gray-500">
                                      Roll: {studentData.student.rollNumber || 'N/A'} | Class: {studentData.class.name}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {overallStats ? (
                                    <div className="flex items-center space-x-2">
                                      <div className="bg-green-50 rounded-md px-2 py-0.5 border border-green-100">
                                        <span className="text-[10px] text-gray-500 uppercase">Pres: </span>
                                        <span className="text-xs font-bold text-green-700">{overallStats.present || 0}d</span>
                                      </div>
                                      <div className="bg-red-50 rounded-md px-2 py-0.5 border border-red-100">
                                        <span className="text-[10px] text-gray-500 uppercase">Abs: </span>
                                        <span className="text-xs font-bold text-red-700">{overallStats.absent || 0}d</span>
                                      </div>
                                      <span className="text-xs font-extrabold text-indigo-700 ml-1">
                                        {overallStats.attendancePercentage?.toFixed(1) || 0}%
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-right text-xs text-gray-500">
                                      <span>Subjects: {studentData.attendance.length}</span>
                                      <span className="ml-2 font-medium text-green-600">
                                        Pres: {studentData.attendance.filter((att: any) => att.status === 'present').length}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                          
                              {/* Class Teacher Info */}
                              {(() => {
                                const currentClass = classes.find(c => c._id === selectedClass);
                                const classTeacher = currentClass?.teacherId || currentClass?.teacher;
                                const classTeacherName = classTeacher?.name || (typeof classTeacher === 'string' ? classTeacher : null) || 'Not assigned';
                                
                                const classTeacherRecords = studentData.attendance.filter((att: any) => {
                                  const markedById = att.markedBy?._id || att.markedBy;
                                  const teacherId = classTeacher?._id || classTeacher;
                                  return markedById && teacherId && markedById.toString() === teacherId.toString();
                                }).length;
                                
                                const totalRecords = studentData.attendance.length;
                                
                                return (
                                  <div className="mb-2 px-2.5 py-1.5 bg-blue-50/70 rounded-lg border border-blue-100 flex items-center justify-between text-xs">
                                    <p className="font-medium text-blue-900">
                                      Class Teacher: <span className="font-semibold">{classTeacherName}</span>
                                    </p>
                                    <p className="text-[11px]">
                                      {classTeacherRecords > 0 ? (
                                        <span className="text-green-600 font-medium">✓ {classTeacherRecords}/{totalRecords} by class teacher</span>
                                      ) : (
                                        <span className="text-amber-600">⚠ No records by class teacher</span>
                                      )}
                                    </p>
                                  </div>
                                );
                              })()}
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {studentData.attendance.map((attendance: any, index: number) => {
                                  const currentClass = classes.find(c => c._id === selectedClass);
                                  const classTeacherId = currentClass?.teacherId?._id || currentClass?.teacherId || currentClass?.teacher?._id || currentClass?.teacher;
                                  const markedById = attendance.markedBy?._id || attendance.markedBy;
                                  
                                  const isClassTeacher = classTeacherId && markedById && 
                                                         (classTeacherId.toString() === markedById.toString());
                                  const markedByName = attendance.markedBy?.name || 'Unknown';
                                  
                                  return (
                                    <div key={index} className="border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                                      <div className="flex justify-between items-start mb-1">
                                        <div>
                                          <h5 className="font-semibold text-xs text-gray-900">{attendance.subject.name}</h5>
                                          <p className="text-[11px] text-gray-500">{attendance.teacher.name}</p>
                                        </div>
                                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                                          attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                                          attendance.status === 'absent' ? 'bg-red-100 text-red-800' :
                                          attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-blue-100 text-blue-800'
                                        }`}>
                                          {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
                                        </span>
                                      </div>
                                      {attendance.remarks && (
                                        <p className="text-[10px] text-gray-500 mb-1">Remarks: {attendance.remarks}</p>
                                      )}
                                      <div className="text-[10px] text-gray-400">
                                        <span className={isClassTeacher ? 'text-green-600' : 'text-amber-600'}>
                                          {isClassTeacher ? '✓' : '⚠'} {markedByName}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-xs p-8 text-center border border-gray-200">
                      <XCircle className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">No Subject Attendance Details</h4>
                      <p className="text-xs text-gray-500">No individual subject attendance records have been marked for this date.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-2.5">
                <h3 className="text-sm font-bold text-gray-900">Teacher Attendance Management</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-xs font-medium text-gray-600">Date:</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="h-8 px-2.5 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => setShowHolidayModal(true)}
                    className="h-8 px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    Mark Holiday
                  </button>
                  <button
                    onClick={() => fetchTeacherAttendance()}
                    className="h-8 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {/* Attendance Statistics */}
              <div className="bg-white rounded-xl shadow-xs p-3 border border-gray-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Overall Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Total Teachers</p>
                        <p className="text-lg font-bold text-green-700 leading-tight">
                          {attendanceStats?.summary?.totalTeachers || teachers.length || 0}
                        </p>
                      </div>
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Present Today</p>
                        <p className="text-lg font-bold text-blue-700 leading-tight">
                          {teacherAttendance.filter((att: any) => att.status === 'present').length || 0}
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="p-2.5 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Absent Today</p>
                        <p className="text-lg font-bold text-red-700 leading-tight">
                          {teacherAttendance.filter((att: any) => att.status === 'absent').length || 0}
                        </p>
                      </div>
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <div className="p-2.5 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">Attendance %</p>
                        <p className="text-lg font-bold text-purple-700 leading-tight">
                          {teacherAttendance.length > 0 
                            ? ((teacherAttendance.filter((att: any) => att.status === 'present').length / teacherAttendance.length) * 100).toFixed(1)
                            : attendanceStats?.summary?.overallAttendancePercentage?.toFixed(1) || 0}%
                        </p>
                      </div>
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Marking Interface */}
              <div className="bg-white rounded-xl shadow-xs p-3 border border-gray-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Mark Attendance for {new Date(attendanceDate).toLocaleDateString()}
                </h4>
                
                {loadingTeachers ? (
                  <div className="flex justify-center items-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-xs text-gray-600">Loading teachers...</span>
                  </div>
                ) : teachers.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-xs p-6 text-center border border-gray-200">
                    <Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">No Teachers Found</h4>
                    <p className="text-xs text-gray-500">There are no teachers available to mark attendance for.</p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                    {loadingTeacherAttendance && (
                      <div className="flex justify-center items-center py-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-xs text-gray-600">Loading attendance data...</span>
                      </div>
                    )}
                    {teachers.map((teacher) => {
                      const existingAttendance = teacherAttendance.find(att => 
                        (att.teacherId?._id === teacher._id || att.teacherId === teacher._id) ||
                        (att.teacherId?._id?.toString() === teacher._id?.toString() || att.teacherId?.toString() === teacher._id?.toString())
                      );
                      
                      return (
                        <div key={teacher._id || teacher.id} className="border border-gray-200 rounded-lg p-2.5 hover:bg-gray-50/50 transition">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1">
                              <h5 className="font-semibold text-xs text-gray-900">{teacher.name}</h5>
                              <p className="text-[11px] text-gray-500">
                                {teacher.email && `${teacher.email} • `}
                                {teacher.subjects && teacher.subjects.length > 0 
                                  ? teacher.subjects.map((sub: any) => typeof sub === 'string' ? sub : (sub.name || sub)).join(', ')
                                  : 'No subjects assigned'}
                              </p>
                              {existingAttendance && (
                                <div className="flex items-center space-x-1.5 mt-0.5">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                    existingAttendance.status === 'present' ? 'bg-green-100 text-green-800' :
                                    existingAttendance.status === 'absent' ? 'bg-red-100 text-red-800' :
                                    existingAttendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                    existingAttendance.status === 'half-day' ? 'bg-orange-100 text-orange-800' :
                                    existingAttendance.status === 'holiday' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {existingAttendance.status === 'present' && <CheckCircle className="h-3 w-3 mr-1" />}
                                    {existingAttendance.status === 'absent' && <XCircle className="h-3 w-3 mr-1" />}
                                    {existingAttendance.status === 'late' && <Clock className="h-3 w-3 mr-1" />}
                                    {existingAttendance.status === 'half-day' && <AlertCircle className="h-3 w-3 mr-1" />}
                                    {existingAttendance.status === 'holiday' && <Clock className="h-3 w-3 mr-1" />}
                                    {existingAttendance.status?.charAt(0).toUpperCase() + existingAttendance.status?.slice(1).replace('-', ' ')}
                                  </span>
                                  {existingAttendance.remarks && (
                                    <span className="text-[10px] text-gray-400">({existingAttendance.remarks})</span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button
                                onClick={() => markTeacherAttendance(teacher._id || teacher.id, 'present')}
                                disabled={isMarkingAttendance}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                  existingAttendance?.status === 'present' 
                                    ? 'bg-green-100 text-green-800 border border-green-300' 
                                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                } ${isMarkingAttendance ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => markTeacherAttendance(teacher._id || teacher.id, 'absent')}
                                disabled={isMarkingAttendance}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                  existingAttendance?.status === 'absent' 
                                    ? 'bg-red-100 text-red-800 border border-red-300' 
                                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                } ${isMarkingAttendance ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                Absent
                              </button>
                              <button
                                onClick={() => markTeacherAttendance(teacher._id || teacher.id, 'late')}
                                disabled={isMarkingAttendance}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                  existingAttendance?.status === 'late' 
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                                } ${isMarkingAttendance ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                Late
                              </button>
                              <button
                                onClick={() => markTeacherAttendance(teacher._id || teacher.id, 'half-day')}
                                disabled={isMarkingAttendance}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                  existingAttendance?.status === 'half-day' 
                                    ? 'bg-orange-100 text-orange-800 border border-orange-300' 
                                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                                } ${isMarkingAttendance ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                Half Day
                              </button>
                              <button
                                onClick={() => markTeacherAttendance(teacher._id || teacher.id, 'holiday')}
                                disabled={isMarkingAttendance}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                                  existingAttendance?.status === 'holiday' 
                                    ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                                } ${isMarkingAttendance ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                Holiday
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Holiday Modal */}
              {showHolidayModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-5 max-w-md w-full mx-4 shadow-xl">
                    <h3 className="text-base font-bold text-gray-900 mb-3">Mark Holiday for All Teachers</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={holidayStartDate}
                          onChange={(e) => setHolidayStartDate(e.target.value)}
                          className="w-full h-8 px-2.5 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={holidayEndDate}
                          onChange={(e) => setHolidayEndDate(e.target.value)}
                          className="w-full h-8 px-2.5 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        This will mark all teachers as "Holiday" for the selected date range.
                      </p>
                      <div className="flex space-x-2 pt-2">
                        <button
                          onClick={markBulkHoliday}
                          disabled={isMarkingHoliday}
                          className="flex-1 h-8 px-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isMarkingHoliday ? 'Marking...' : 'Mark Holiday'}
                        </button>
                        <button
                          onClick={() => {
                            setShowHolidayModal(false);
                            setHolidayStartDate('');
                            setHolidayEndDate('');
                          }}
                          disabled={isMarkingHoliday}
                          className="flex-1 h-8 px-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Teacher Statistics */}
              {attendanceStats?.teacherStats && attendanceStats.teacherStats.length > 0 && (
                <div className="bg-white rounded-xl shadow-xs p-3 border border-gray-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Individual Teacher Statistics</h4>
                  <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="sticky top-0 z-10 bg-gray-50 shadow-xs">
                        <tr>
                          <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
                          <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                          <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Present</th>
                          <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Absent</th>
                          <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Late</th>
                          <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Half Day</th>
                          <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Holiday</th>
                          <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {attendanceStats.teacherStats.map((stat: any) => (
                          <tr key={stat.teacherId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <div className="text-xs font-semibold text-gray-900 leading-tight">{stat.teacherName}</div>
                              <div className="text-[11px] text-gray-500">{stat.teacherEmail}</div>
                            </td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-800">{stat.totalDays}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-xs text-green-600 font-semibold">{stat.present}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-xs text-red-600 font-semibold">{stat.absent}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-xs text-yellow-600 font-semibold">{stat.late}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-xs text-orange-600 font-semibold">{stat.halfDay || 0}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-xs text-purple-600 font-semibold">{stat.holiday || 0}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <span className={`text-xs font-bold ${
                                stat.attendancePercentage >= 90 ? 'text-green-600' :
                                stat.attendancePercentage >= 75 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {stat.attendancePercentage.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
