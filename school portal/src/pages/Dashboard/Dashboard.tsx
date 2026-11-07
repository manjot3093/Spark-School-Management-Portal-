import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api, apiRequest, feesAPI, salaryAPI, getAssetUrl } from '../../services/api';
import importantDatesAPI from '../../services/importantDatesAPI';
import { Users, GraduationCap, BookOpen, ArrowUpRight, ChevronLeft, ChevronRight, Wallet, ClipboardCheck, Megaphone } from 'lucide-react';

import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);
import { format, parseISO } from 'date-fns';

function Dashboard() {
  const { state } = useAppContext();
  const { state: authState } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [students, setStudents] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [overviewStatus, setOverviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attendanceStatus, setAttendanceStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [employees, setEmployees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<string>("");
  const [selectedPerformanceClass, setSelectedPerformanceClass] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  // Financial summary filters
  const [finMonth, setFinMonth] = useState<number>(new Date().getMonth() + 1);
  const [finYear, setFinYear] = useState<number>(new Date().getFullYear());
  const [incomeData, setIncomeData] = useState<number[]>([]); // daily income for selected month
  const [expenseData, setExpenseData] = useState<number[]>([]); // daily expenses for selected month
  const [financeStatus, setFinanceStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [feeStats, setFeeStats] = useState<any>(null);
  const [salaryStats, setSalaryStats] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    fetchDashboardData();
    fetchEvents();
    fetchNotices();
    return () => clearInterval(timer);
  }, [authState?.user?.role, authState?.user?.schoolId]);

  // Fetch attendance when classes or selectedAttendanceClass changes
  useEffect(() => {
    if (classes.length > 0) {
      fetchAttendance();
    }
  }, [classes, selectedAttendanceClass]);

  // Fetch performance when classes or selectedPerformanceClass changes
  useEffect(() => {
    if (classes.length > 0) {
      fetchPerformance(selectedPerformanceClass);
    }
  }, [classes, selectedPerformanceClass]);

  // Fetch financials when month/year changes
  useEffect(() => {
    fetchFinancials(finMonth, finYear);
  }, [finMonth, finYear, authState?.user?.schoolId]);

  const fetchDashboardData = async () => {
    setOverviewStatus('loading');
    try {
      const userRole = authState?.user?.role;
      if (userRole === 'librarian') {
        const studentsData = await api.classroom.getStudents({ limit: 1000 });
        const students = studentsData?.data || studentsData || [];
        setStudents(Array.isArray(students) ? students : []);
        setStudentCount(Number.isFinite(studentsData?.total) ? studentsData.total : (Array.isArray(students) ? students.length : 0));
        setEmployees([]);
        setClasses([]);
        setSubjects([]);
      } else if (userRole === 'accountant') {
        setStudents([]);
        setStudentCount(0);
        setEmployees([]);
        setClasses([]);
        setSubjects([]);
      } else {
        const [studentsData, teachersData, classesData, subjectsData] = await Promise.all([
          api.classroom.getStudents({ limit: 1000 }),
          api.classroom.getTeachers(),
          api.classroom.getClasses(),
          api.classroom.getSubjects()
        ]);
        const students = studentsData?.data || studentsData || [];
        const teachers = teachersData?.data || teachersData || [];
        const classes = classesData?.data || classesData || [];
        const subjects = subjectsData?.data || subjectsData || [];
        setStudents(Array.isArray(students) ? students : []);
        setStudentCount(Number.isFinite(studentsData?.total) ? studentsData.total : (Array.isArray(students) ? students.length : 0));
        setEmployees(Array.isArray(teachers) ? teachers : []);
        setClasses(Array.isArray(classes) ? classes : []);
        setSubjects(Array.isArray(subjects) ? subjects : []);
      }
      setOverviewStatus('ready');
    } catch (error) {
      setOverviewStatus('error');
      setStudents([]);
      setStudentCount(0);
      setEmployees([]);
      setClasses([]);
      setSubjects([]);
    }
  };

  const fetchAttendance = async (classId?: string) => {
    setAttendanceStatus('loading');
    try {
      const useClassId = classId || selectedAttendanceClass || (classes[0] && (classes[0].id || classes[0]._id));
      if (useClassId) {
        // Fetch attendance for the last 10 days, similar to how Attendance Management works
        const days = 10;
        const attendancePromises = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          attendancePromises.push(api.classroom.getClassDateAttendance({
            classId: useClassId,
            date: dateStr
          }));
        }

        const results = await Promise.all(attendancePromises);

        // Aggregate attendance by date
        const attendanceByDate: { [key: string]: { date: string; present: number; absent: number } } = {};

        results.forEach((result, index) => {
          const date = new Date(today);
          date.setDate(date.getDate() - index);
          const dateStr = date.toISOString().split('T')[0];

          const records = result?.data || result || [];
          let present = 0;
          let absent = 0;

          // Count unique students per day (group by student to avoid counting same student multiple times per day)
          const studentStatusMap: { [key: string]: string } = {};

          records.forEach((record: any) => {
            const studentId = record.studentId?._id || record.studentId;
            if (studentId && !studentStatusMap[studentId]) {
              studentStatusMap[studentId] = record.status;
              if (record.status === 'present') {
                present++;
              } else if (record.status === 'absent') {
                absent++;
              }
            }
          });

          attendanceByDate[dateStr] = {
            date: dateStr,
            present,
            absent
          };
        });

        // Convert to array and sort by date
        const attendanceArray = Object.values(attendanceByDate).sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        console.log('Attendance API response:', attendanceArray);
        setAttendanceData(attendanceArray);
        setAttendanceStatus('ready');
      } else {
        console.log('No class selected for attendance fetch.');
        setAttendanceData([]);
        setAttendanceStatus('ready');
      }
    } catch (err) {
      console.error('Attendance fetch error:', err);
      setAttendanceData([]);
      setAttendanceStatus('error');
    }
  };

  const fetchPerformance = async (classId?: string) => {
    try {
      const useClassId = classId || selectedPerformanceClass || (classes[0] && (classes[0].id || classes[0]._id));
      if (useClassId) {
        // Use the same endpoint as Student Progress Activity page
        const schoolId = localStorage.getItem('schoolId') || (state.currentUser as any)?.schoolId;
        const params: any = { schoolId };
        if (useClassId) {
          params.classId = useClassId;
        }

        const queryString = new URLSearchParams(params).toString();
        const response = await apiRequest(`/students/performance-report?${queryString}`);

        if (response.success && response.data) {
          // Extract students array from the response
          // The response structure is: { success: true, data: { students: [...], summary: {...} } }
          let students = response.data.students || (Array.isArray(response.data) ? response.data : []);

          // Fetch student details to get avatars
          if (Array.isArray(students) && students.length > 0) {
            try {
              const studentDetailsPromises = students.map(async (student: any) => {
                try {
                  const studentDetail = await api.students.getById(student.studentId || student.id);
                  const studentData = studentDetail?.data || studentDetail;
                  return {
                    ...student,
                    avatar: studentData?.avatar || null,
                    gender: studentData?.gender || null
                  };
                } catch (err) {
                  console.error(`Error fetching details for student ${student.studentId}:`, err);
                  return student; // Return original student data if fetch fails
                }
              });

              students = await Promise.all(studentDetailsPromises);
            } catch (err) {
              console.error('Error fetching student avatars:', err);
              // Continue with students without avatars
            }
          }

          console.log('Performance API response:', response.data);
          console.log('Total students found:', Array.isArray(students) ? students.length : 0);
          console.log('Students data with avatars:', students);
          setPerformance(Array.isArray(students) ? students : []);
        } else {
          console.log('No performance data in response');
          setPerformance([]);
        }
      } else {
        setPerformance([]);
      }
    } catch (err) {
      console.error('Performance fetch error:', err);
      setPerformance([]);
    }
  };

  const fetchEvents = async () => {
    setEventLoading(true);
    try {
      const res = await importantDatesAPI.getUpcomingImportantDates();
      let eventsArr: any[] = [];
      if (Array.isArray(res)) {
        eventsArr = res;
      } else if (res && Array.isArray(res.data)) {
        eventsArr = res.data;
      }
      setEvents(eventsArr);
    } catch {
      setEvents([]);
    }
    setEventLoading(false);
  };

  const fetchNotices = async () => {
    try {
      const res = await apiRequest('/announcements');
      let noticesList: any[] = [];
      if (Array.isArray(res)) {
        noticesList = res;
      } else if (res && Array.isArray(res.data)) {
        noticesList = res.data;
      }
      setNotices(noticesList.slice(0, 3));
    } catch (err) {
      console.error('Failed to fetch notices:', err);
      setNotices([]);
    }
  };

  const fetchFinancials = async (month?: number, year?: number) => {
    setFinanceStatus('loading');
    try {
      const useMonth = month || finMonth;
      const useYear = year || finYear;
      const days = new Date(useYear, useMonth, 0).getDate();
      const dailyIncome = Array.from({ length: days }, () => 0);
      const dailyExpense = Array.from({ length: days }, () => 0);

      const schoolId = localStorage.getItem('schoolId') || (authState?.user?.schoolId);
      
      if (!schoolId) {
        setFinanceStatus('error');
        return;
      }

      // Fetch income from fee collections (payments)
      try {
        const params = { schoolId, limit: 10000, status: 'paid' };
        const res = await feesAPI.getCollections(params);
        console.log('Financial income API response:', res);
        
        const collections = res?.data || (Array.isArray(res) ? res : []);
        
        if (Array.isArray(collections)) {
          collections.forEach((collection: any) => {
            // Get payment date from payments array or collection date
            let paymentDate = null;
            
            // Check if there are payments in the collection
            if (collection.payments && Array.isArray(collection.payments) && collection.payments.length > 0) {
              // Use the latest payment date
              const latestPayment = collection.payments[collection.payments.length - 1];
              paymentDate = latestPayment.paymentDate || latestPayment.date || latestPayment.createdAt;
            } else {
              // Fallback to collection date fields
              paymentDate = collection.paymentDate || collection.date || collection.createdAt;
            }
            
            if (!paymentDate) return;
            
            const d = new Date(paymentDate);
            if (isNaN(d.getTime())) {
              console.warn('Invalid date for collection:', collection._id, paymentDate);
              return;
            }
            
            const paymentYear = d.getFullYear();
            const paymentMonth = d.getMonth() + 1;
            
            if (paymentYear === useYear && paymentMonth === useMonth) {
              const day = d.getDate();
              if (day >= 1 && day <= days) {
                // Use paidAmount from collection
                const amount = Number(collection.paidAmount || collection.amount || 0);
                dailyIncome[day - 1] += amount;
              }
            }
          });
          console.log('Processed income data:', dailyIncome);
        }
      } catch (e) {
        console.error('Could not fetch income data:', e);
        throw e;
      }

      // Fetch expenses (salary/payroll)
      try {
        const params = { schoolId, month: useMonth, year: useYear, limit: 10000 };
        const res = await salaryAPI.getAll(params);
        console.log('Financial expense API response:', res);
        
        const salaries = res?.data || (Array.isArray(res) ? res : []);
        
        if (Array.isArray(salaries)) {
          salaries.forEach((s: any) => {
            // Only count paid salaries
            if (s.status !== 'paid') return;
            
            // Try multiple date fields
            const dateStr = s.paymentDate || s.date || s.createdAt;
            if (!dateStr) return;
            
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) {
              console.warn('Invalid date for salary:', s._id, dateStr);
              return;
            }
            
            const salaryYear = d.getFullYear();
            const salaryMonth = d.getMonth() + 1;
            
            if (salaryYear === useYear && salaryMonth === useMonth) {
              const day = d.getDate();
              if (day >= 1 && day <= days) {
                // Use netSalary if available, otherwise calculate
                const netSalary = s.netSalary || ((s.basicSalary || 0) + (s.totalAllowances || 0) - (s.totalDeductions || 0));
                dailyExpense[day - 1] += Number(netSalary || 0);
              }
            }
          });
          console.log('Processed expense data:', dailyExpense);
        }
      } catch (e) {
        console.error('Could not fetch expense data:', e);
        throw e;
      }

      setIncomeData(dailyIncome);
      setExpenseData(dailyExpense);
      setFinanceStatus('ready');
    } catch (e) {
      console.error('Error fetching financials:', e);
      setIncomeData([]);
      setExpenseData([]);
      setFinanceStatus('error');
    }
  };

  // Calculate statistics
  const totalStudents = studentCount;
  const totalTeachers = Array.isArray(employees) ? employees.length : 0;
  const totalCourses = Array.isArray(classes) ? classes.length : 0;
  const [totalIncome, setTotalIncome] = useState(0);
  
  // Fetch financial summary data (fee stats and salary stats)
  useEffect(() => {
    const fetchFinancialSummary = async () => {
      try {
        const schoolId = localStorage.getItem('schoolId') || (authState?.user?.schoolId);
        if (!schoolId) {
          console.warn('No schoolId found for fetching financial summary');
          setTotalIncome(0);
          setFeeStats(null);
          setSalaryStats(null);
          return;
        }
        
        // Fetch fee collection stats and salary stats
        const [feeStatsResponse, salaryStatsResponse] = await Promise.all([
          feesAPI.getCollectionStats({ schoolId }),
          salaryAPI.getStats({ schoolId, month: finMonth, year: finYear })
        ]);
        
        const feeData = feeStatsResponse?.data || {};
        const salaryData = salaryStatsResponse?.data || {};
        
        setFeeStats(feeData);
        setSalaryStats(salaryData);
        
        // Calculate total income from fee collections (totalPaid)
        const totalPaid = feeData?.summary?.totalPaid || 0;
        setTotalIncome(totalPaid);
        
        console.log('Financial Summary - Fee Stats:', feeData);
        console.log('Financial Summary - Salary Stats:', salaryData);
        console.log('Total Income (Collected Fees):', totalPaid);
      } catch (error) {
        console.error('Error fetching financial summary:', error);
        setTotalIncome(0);
        setFeeStats(null);
        setSalaryStats(null);
      }
    };
    
    fetchFinancialSummary();
  }, [authState?.user?.schoolId, finMonth, finYear]);
  const girls = Array.isArray(students) ? students.filter(s => s.gender === 'female').length : 0;
  const boys = Array.isArray(students) ? students.filter(s => s.gender === 'male').length : 0;
  const genderUnrecorded = Math.max(0, students.length - girls - boys);

  const attendanceChartData = attendanceData;

  // Student performance (filtered by grade if selected)
  const filteredPerformance = selectedGrade
    ? performance.filter((s: any) => s.grade === selectedGrade)
    : performance;
  const topStudents = filteredPerformance; // Show all students, not just top 2

  // Upcoming events from important dates (use all types returned by API, sorted by date)
  const upcomingEvents = Array.isArray(events)
    ? events
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3)
    : [];

  // Calendar grid
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
  const today = new Date();

  const formatCompactINR = (value: number) => {
    if (!value) return '₹0';
    // Use en-IN to get INR currency symbol; notation compact may produce 'K' -> normalize to lowercase 'k'
    try {
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(value);
      return formatted.replace(/K/g, 'k');
    } catch (e) {
      // Fallback
      const short = value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toString();
      return `₹${short}`;
    }
  };
  const formattedIncome = formatCompactINR(totalIncome || 0);

  const getGreeting = (d: Date) => {
    const hour = d.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  const adminEmail = authState?.user?.email || (state.currentUser && (state.currentUser as any).email) || '';

  const monthDays = new Date(finYear, finMonth, 0).getDate();
  const chartLabels = Array.from({ length: monthDays }, (_, index) => String(index + 1));
  const dailyIncome = Array.from({ length: monthDays }, (_, index) => incomeData[index] || 0);
  const dailyExpenses = Array.from({ length: monthDays }, (_, index) => expenseData[index] || 0);
  const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  const role = authState?.user?.role;
  const quickLinks = role === 'librarian' ? [{ label: 'Library', to: '/library', icon: BookOpen }] : role === 'accountant'
    ? [{ label: 'Collect fees', to: '/fees', icon: Wallet }, { label: 'Accounts', to: '/accounts', icon: BookOpen }]
    : [{ label: 'Enroll student', to: '/new-enrollment', icon: GraduationCap }, { label: 'Take attendance', to: '/attendance', icon: ClipboardCheck }, { label: 'Collect fees', to: '/fees', icon: Wallet }, { label: 'Announcements', to: '/announcements', icon: Megaphone }];
  const summary = [
    { label: 'Students', value: totalStudents.toLocaleString('en-IN'), to: role === 'librarian' ? '/library' : role === 'accountant' ? '/fees' : '/students', icon: GraduationCap, tone: 'blue' },
    { label: 'Teachers', value: totalTeachers.toLocaleString('en-IN'), to: role === 'librarian' ? '/library' : role === 'accountant' ? '/fees' : '/employees', icon: Users, tone: 'peach' },
    { label: 'Classes', value: totalCourses.toLocaleString('en-IN'), to: role === 'librarian' ? '/library' : role === 'accountant' ? '/fees' : '/classes', icon: BookOpen, tone: 'mist' },
    { label: 'Fees collected', value: feeStats ? formattedIncome : '—', to: role === 'librarian' ? '/library' : '/fees', icon: Wallet, tone: 'cream' }
  ];
  return (
    <div className="spark-dashboard">
      <header className="dash-intro">
        <div className="dash-intro-lead">
          <div className="dash-intro-greeting">
            <h1>{getGreeting(currentTime)}, <em>{authState?.user?.name || 'Admin'}</em></h1>
            <span className="dash-intro-date">· {format(currentTime, 'EEEE, d MMMM yyyy')}</span>
          </div>
        </div>
        <nav className="dash-quick" aria-label="Quick actions">
          <span className="dash-quick-label">GO TO</span>
          {quickLinks.map(({ label, to, icon: Icon }) => (
            <Link to={to} key={to} className="dash-quick-link">
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
              <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </header>

      {overviewStatus === 'error' && (
        <div className="dash-error" role="alert">
          School totals could not be loaded. <button type="button" onClick={fetchDashboardData}>Try again</button>
        </div>
      )}

      <section className="dash-kpis" aria-label="School totals">
        {summary.map(({ label, value, to, icon: Icon, tone }) => (
          <Link to={to} key={label} className={`dash-kpi dash-kpi-${tone}`}>
            <span className="dash-kpi-top">
              <span className="dash-kpi-lead">
                <Icon size={17} aria-hidden="true" />
                <span className="dash-kpi-label">{label}</span>
              </span>
              <ArrowUpRight size={13} className="dash-kpi-arrow" aria-hidden="true" />
            </span>
            <span className="dash-kpi-bottom">
              <strong>
                {overviewStatus === 'loading' && label !== 'Fees collected'
                  ? '…'
                  : overviewStatus === 'error' && label !== 'Fees collected'
                  ? '—'
                  : value}
              </strong>
            </span>
          </Link>
        ))}
      </section>

      <div className="dash-content-grid">
        <div className="dash-main-column">
          <section className="dash-panel" aria-labelledby="attendance-title">
            <div className="dash-panel-head">
              <div>
                <p className="dash-section-kicker">DAILY LIFE</p>
                <h2 id="attendance-title">Attendance rhythm</h2>
                <p>Present and absent records across the last ten days</p>
              </div>
              <div className="dash-panel-controls">
                <div className="dash-chart-legend">
                  <span><i className="dash-key-present" />Present</span>
                  <span><i className="dash-key-absent" />Absent</span>
                </div>
                <label className="dash-select-label">
                  Class
                  <select value={selectedAttendanceClass} onChange={event => setSelectedAttendanceClass(event.target.value)}>
                    <option value="">First class</option>
                    {classes.map(cls => (
                      <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            {attendanceStatus === 'loading' ? <div className="dash-empty" role="status">Loading attendance…</div> : attendanceStatus === 'error' ? <div className="dash-empty" role="alert">Attendance could not be loaded. <button type="button" onClick={() => fetchAttendance()}>Try again</button></div> : attendanceChartData.some(day => day.present || day.absent) ? (
              <div className="dash-attendance-chart" role="img" aria-label="Attendance over the last ten days">
                {attendanceChartData.map(day => {
                  const total = Math.max(day.present + day.absent, 1);
                  return (
                    <div className="dash-attendance-day" key={day.date} title={`${format(parseISO(day.date), 'd MMM')}: ${day.present} present, ${day.absent} absent`}>
                      <div className="dash-attendance-bars">
                        <span className="dash-present-bar" style={{ height: `${day.present ? Math.max(4, (day.present / total) * 100) : 0}%` }} />
                        <span className="dash-absent-bar" style={{ height: `${day.absent ? Math.max(4, (day.absent / total) * 100) : 0}%` }} />
                      </div>
                      <span>{format(parseISO(day.date), 'dd MMM')}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dash-empty">No attendance has been recorded for this class in the last ten days.</div>
            )}
          </section>

          <section className="dash-panel" aria-labelledby="finance-title">
            <div className="dash-panel-head">
              <div>
                <p className="dash-section-kicker">FINANCE</p>
                <h2 id="finance-title">Money in motion</h2>
                <p>Daily fee collections and paid salaries</p>
              </div>
              <div className="dash-fin-filters">
                <label>
                  Month
                  <select value={finMonth} onChange={event => setFinMonth(Number(event.target.value))}>
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>{format(new Date(2024, index, 1), 'MMMM')}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Year
                  <select value={finYear} onChange={event => setFinYear(Number(event.target.value))}>
                    {[finYear - 1, finYear, finYear + 1].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="dash-fin-totals">
              <div>
                <span>Collections to date</span>
                <strong>{feeStats ? money(Number(feeStats?.summary?.totalPaid || 0)) : 'Unavailable'}</strong>
              </div>
              <div>
                <span>Selected-month salaries</span>
                <strong>{salaryStats ? money(Number(salaryStats?.current?.totalNetSalary || 0)) : 'Unavailable'}</strong>
              </div>
            </div>
            {financeStatus === 'loading' ? <div className="dash-empty" role="status">Loading financial activity…</div> : financeStatus === 'error' ? <div className="dash-empty" role="alert">Financial activity could not be loaded. <button type="button" onClick={() => fetchFinancials(finMonth, finYear)}>Try again</button></div> : dailyIncome.some(Boolean) || dailyExpenses.some(Boolean) ? (
              <div className="dash-line-chart">
                <Line
                  data={{
                    labels: chartLabels,
                    datasets: [
                      {
                        label: 'Collections',
                        data: dailyIncome,
                        borderColor: '#e7773b',
                        backgroundColor: 'rgba(231,119,59,.09)',
                        fill: true,
                        tension: 0.34,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2
                      },
                      {
                        label: 'Salaries',
                        data: dailyExpenses,
                        borderColor: '#233f78',
                        backgroundColor: 'rgba(36,90,130,.06)',
                        fill: true,
                        tension: 0.34,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { boxWidth: 8, font: { size: 10 }, padding: 6, usePointStyle: true }
                      }
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 9 } } },
                      y: { beginAtZero: true, ticks: { maxTicksLimit: 4, font: { size: 9 }, callback: value => formatCompactINR(Number(value)) } }
                    }
                  }}
                />
              </div>
            ) : (
              <div className="dash-empty">No recorded collections or paid salaries for this month.</div>
            )}
          </section>

          <div className="dash-lower-grid">
            <section className="dash-panel" aria-labelledby="performance-title">
              <div className="dash-panel-head">
                <div>
                  <p className="dash-section-kicker">LEARNING</p>
                  <h2 id="performance-title">Student performance</h2>
                </div>
                <label className="dash-select-label">
                  Class
                  <select value={selectedPerformanceClass} onChange={event => setSelectedPerformanceClass(event.target.value)}>
                    <option value="">First class</option>
                    {classes.map(cls => (
                      <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              {topStudents.length ? (
                <div className="dash-student-list">
                  {topStudents.slice(0, 3).map((student, index) => (
                    <div className="dash-student" key={student.studentId || student.id || index}>
                      <span className="dash-student-avatar">
                        {student.avatar ? (
                          <img src={student.avatar.startsWith('http') ? student.avatar : getAssetUrl(student.avatar)} alt="" />
                        ) : (
                          String(student.name || 'ST').slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span className="dash-student-name">
                        <strong>{student.name || 'Student'}</strong>
                        <small>{student.class ? `Class ${student.class}` : 'Class not listed'}</small>
                      </span>
                      <span className="dash-grade">{student.avgGrade || '—'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty">No performance records for this class yet.</div>
              )}
            </section>

            <section className="dash-panel" aria-labelledby="distribution-title">
              <div className="dash-panel-head">
                <div>
                  <p className="dash-section-kicker">COMMUNITY</p>
                  <h2 id="distribution-title">Student mix</h2>
                  <p>Gender records from the {students.length.toLocaleString('en-IN')} students loaded on this page</p>
                </div>
              </div>
              <div className="dash-distribution">
                <div className="dash-doughnut">
                  <Doughnut
                    data={{
                      labels: ['Girls', 'Boys', 'Unrecorded'],
                      datasets: [
                        {
                          data: [girls, boys, genderUnrecorded],
                          backgroundColor: ['#e7773b', '#233f78', '#cbd5db'],
                          borderWidth: 0
                        }
                      ]
                    }}
                    options={{
                      cutout: '72%',
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } }
                    }}
                  />
                  <div className="dash-doughnut-center">
                    <strong>{students.length}</strong>
                    <span>loaded students</span>
                  </div>
                </div>
                <div className="dash-distribution-legend">
                  <span><i className="dash-key-girls" />Girls <strong>{girls}</strong></span>
                  <span><i className="dash-key-boys" />Boys <strong>{boys}</strong></span>
                  <span><i className="dash-key-unrecorded" />Unrecorded <strong>{genderUnrecorded}</strong></span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <aside className="dash-side-column" aria-label="Dates and updates">
          <section className="dash-panel dash-calendar" aria-labelledby="calendar-title">
            <div className="dash-panel-head">
              <div>
                <p className="dash-section-kicker">UP AHEAD</p>
                <h2 id="calendar-title">{format(selectedDate, 'MMMM yyyy')}</h2>
              </div>
              <div className="dash-calendar-controls">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <div className="dash-calendar-grid">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label, index) => (
                <span className="dash-calendar-weekday" key={index}>{label}</span>
              ))}
              {Array.from({ length: firstDay }, (_, index) => (
                <span key={`gap-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const chosen = selectedDate.getDate() === day;
                const todayMatch =
                  today.getDate() === day &&
                  today.getMonth() === selectedDate.getMonth() &&
                  today.getFullYear() === selectedDate.getFullYear();
                return (
                  <button
                    type="button"
                    key={day}
                    className={`${chosen ? 'is-selected' : ''} ${todayMatch ? 'is-today' : ''}`}
                    aria-pressed={chosen}
                    aria-label={format(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day), 'd MMMM yyyy')}
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="dash-panel" aria-labelledby="events-title">
            <div className="dash-panel-head">
              <div>
                <p className="dash-section-kicker">IMPORTANT DATES</p>
                <h2 id="events-title">Coming up</h2>
              </div>
              <Link to="/important-dates" className="dash-panel-link">
                View all <ArrowUpRight size={13} />
              </Link>
            </div>
            {eventLoading ? (
              <div className="dash-empty">Loading dates…</div>
            ) : upcomingEvents.length ? (
              <div className="dash-event-list">
                {upcomingEvents.slice(0, 2).map((event, index) => {
                  const raw = event.start || event.date;
                  const parsed = raw ? new Date(raw) : null;
                  return (
                    <div className="dash-event" key={event._id || event.id || index}>
                      <span className="dash-event-date">
                        {parsed && !isNaN(parsed.getTime()) ? format(parsed, 'dd MMM') : 'Date TBA'}
                      </span>
                      <strong>{event.title || 'Untitled event'}</strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dash-empty">No important dates coming up.</div>
            )}
          </section>

          <section className="dash-panel" aria-labelledby="notices-title">
            <div className="dash-panel-head">
              <div>
                <p className="dash-section-kicker">NOTICE BOARD</p>
                <h2 id="notices-title">For your attention</h2>
              </div>
              <Link to="/announcements" className="dash-panel-link">
                View all <ArrowUpRight size={13} />
              </Link>
            </div>
            {notices.length ? (
              <div className="dash-notice-list">
                {notices.slice(0, 2).map((notice, index) => (
                  <div className="dash-notice" key={notice._id || notice.id || index}>
                    <small>{notice.category || 'Notice'}</small>
                    <strong>{notice.title || 'Untitled notice'}</strong>
                    <p>{notice.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dash-empty">No notices have been posted.</div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Dashboard;
