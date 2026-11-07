import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  FileText, 
  Calendar,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  BookOpen,
  GraduationCap,
  Bus,
  Home,
  Package,
  ClipboardList,
  Award,
  Building,
  DollarSign,
  Wallet,
  CreditCard,
  Receipt
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import {
  studentsAPI,
  feesAPI,
  classroomAPI,
  examsAPI,
  parentsAPI,
  transportAPI,
  inventoryAPI,
  housesAPI,
  assignmentsAPI,
  salaryAPI,
  employeesAPI
} from '../../services/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview-school');
  const [activeSubSection, setActiveSubSection] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClass, setFilterClass] = useState('');
  
  // Data states
  const [studentStats, setStudentStats] = useState<any>(null);
  const [feeStats, setFeeStats] = useState<any>(null);
  const [examStats, setExamStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [feeCollections, setFeeCollections] = useState<any[]>([]);
  const [transportData, setTransportData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [houseData, setHouseData] = useState<any[]>([]);
  const [homeworkData, setHomeworkData] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [salaryData, setSalaryData] = useState<any>(null);

  // Report categories as per image
  const reportCategories = [
    {
      id: 'overview-school',
      label: 'Overview / School Report',
      icon: BarChart3,
      subSections: [
        { id: 'admission-growth', label: 'Admission Growth Graph', icon: TrendingUp },
        { id: 'quick-stats', label: 'Quick Stats', icon: BarChart3 },
        { id: 'transport-graph', label: 'Transport Graph', icon: Bus },
        { id: 'class-performance', label: 'Class-wise Performance Graph', icon: GraduationCap },
        { id: 'dormitory-graph', label: 'Dormitory Graph', icon: Home },
        { id: 'inventory-graph', label: 'Inventory Graph', icon: Package }
      ]
    },
    {
      id: 'student-report',
      label: 'Student Report',
      icon: Users,
      subSections: [
        { id: 'homework-graph', label: 'Homework Graph', icon: ClipboardList },
        { id: 'student-report-card', label: 'Student Report Card', icon: FileText },
        { id: 'class-performance-report', label: 'Class Performance', icon: TrendingUp },
        { id: 'self-study', label: 'Self-Study (student app report)', icon: BookOpen },
        { id: 'house-wise', label: 'House wise Report', icon: Building }
      ]
    },
    {
      id: 'exam-report',
      label: 'Exam Report',
      icon: FileText,
      subSections: [
        { id: 'exam-search-filter', label: 'Add Search and Filter', icon: Search },
        { id: 'exam-type-class', label: 'Type & Class', icon: Filter }
      ]
    },
    {
      id: 'teachers-report',
      label: 'Teachers Report',
      icon: GraduationCap,
      subSections: [
        { id: 'teacher-attendance', label: 'Attendance', icon: Calendar },
        { id: 'teacher-performance', label: "Teachers' Performance", icon: TrendingUp },
        { id: 'product-usages', label: 'Product Usages', icon: Package },
        { id: 'teacher-training', label: 'Teachers Training', icon: BookOpen },
        { id: 'leaderboard', label: 'Leaderboard', icon: Award }
      ]
    },
    {
      id: 'finance-report',
      label: 'Finance Report',
      icon: DollarSign,
      subSections: [
        { id: 'fee-collection', label: 'Fee Collection', icon: Wallet },
        { id: 'accounts', label: 'Accounts', icon: CreditCard },
        { id: 'salary', label: 'Salary', icon: DollarSign },
        { id: 'fine-waiver', label: 'Fine & Waiver Report', icon: Receipt }
      ]
    }
  ];

  useEffect(() => {
    const storedSchoolId = localStorage.getItem('schoolId');
    if (storedSchoolId) {
      setSchoolId(storedSchoolId);
    }
  }, []);

  useEffect(() => {
    if (schoolId) {
      fetchDataForTab(activeTab);
    }
  }, [activeTab, schoolId]);

  const fetchDataForTab = async (tab: string) => {
    setLoading(true);
    try {
      switch (tab) {
        case 'overview-school':
          await Promise.all([
            fetchStudents(),
            fetchStudentStats(),
            fetchFeeStats(),
            fetchExamStats(),
            fetchTransportData(),
            fetchInventoryData()
          ]);
          break;
        case 'student-report':
          await Promise.all([
            fetchStudents(),
            fetchPerformanceData(),
            fetchHomeworkData(),
            fetchHouseData()
          ]);
          break;
        case 'exam-report':
          await Promise.all([fetchExams(), fetchClasses()]);
          break;
        case 'teachers-report':
          await Promise.all([fetchTeachers(), fetchClasses()]);
          break;
        case 'finance-report':
          await Promise.all([fetchFeeStats(), fetchFeeCollections(), fetchSalaryData()]);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentStats = async () => {
    try {
      const response = await classroomAPI.getStudentStats();
      if (response.success) {
        setStudentStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching student stats:', error);
      setStudentStats(null);
    }
  };

  const fetchFeeStats = async () => {
    try {
      const response = await feesAPI.getCollectionStats({ schoolId });
      if (response.success) {
        setFeeStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching fee stats:', error);
      setFeeStats(null);
    }
  };

  const fetchFeeCollections = async () => {
    try {
      const response = await feesAPI.getCollections({ schoolId });
      if (response.success) {
        setFeeCollections(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching fee collections:', error);
      setFeeCollections([]);
    }
  };

  const fetchExamStats = async () => {
    try {
      const response = await examsAPI.getStats(schoolId);
      if (response.success) {
        setExamStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching exam stats:', error);
      setExamStats(null);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await classroomAPI.getStudents();
      if (response.success) {
        setStudents(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classroomAPI.getClasses();
      if (response.success) {
        setClasses(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const response = await studentsAPI.getPerformanceReport({ schoolId });
      if (response.success) {
        setPerformanceData(response.data);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      setPerformanceData(null);
    }
  };

  const fetchTransportData = async () => {
    try {
      const response = await transportAPI.getStudentTransports(schoolId);
      if (response.success) {
        setTransportData(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching transport data:', error);
      setTransportData([]);
    }
  };

  const fetchInventoryData = async () => {
    try {
      const response = await inventoryAPI.getAll({ schoolId });
      if (response.success) {
        setInventoryData(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setInventoryData([]);
    }
  };

  const fetchHouseData = async () => {
    try {
      const response = await housesAPI.getAll();
      if (response.success) {
        setHouseData(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching house data:', error);
      setHouseData([]);
    }
  };

  const fetchHomeworkData = async () => {
    try {
      const response = await assignmentsAPI.getAll({ schoolId });
      if (response.success) {
        setHomeworkData(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching homework data:', error);
      setHomeworkData([]);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await examsAPI.getAll({ schoolId });
      if (response.success) {
        setExams(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      setExams([]);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await classroomAPI.getTeachers(schoolId);
      const teachersData = response?.data || response || [];
      // Filter to only teachers if needed
      const filteredTeachers = Array.isArray(teachersData) 
        ? teachersData.filter((t: any) => !t.role || t.role === 'teacher')
        : [];
      setTeachers(filteredTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    }
  };

  const fetchSalaryData = async () => {
    try {
      const response = await salaryAPI.getStats({ schoolId });
      if (response.success) {
        setSalaryData(response.data);
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
      setSalaryData(null);
    }
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <AlertCircle className="h-12 w-12 mb-4" />
      <p className="text-lg">{message}</p>
    </div>
  );

  // Chart data creators
  const createAdmissionGrowthData = () => {
    if (!students || students.length === 0) return null;

    // Group students by admission date (monthly)
    const monthlyAdmissions: { [key: string]: number } = {};
    students.forEach((student: any) => {
      if (student.admissionDate) {
        const date = new Date(student.admissionDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyAdmissions[monthKey] = (monthlyAdmissions[monthKey] || 0) + 1;
      }
    });

    const sortedMonths = Object.keys(monthlyAdmissions).sort();
    
    return {
      labels: sortedMonths,
      datasets: [{
        label: 'Admissions',
        data: sortedMonths.map(month => monthlyAdmissions[month]),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  };

  const createTransportChartData = () => {
    if (!transportData || transportData.length === 0) return null;

    const routeCount: { [key: string]: number } = {};
    transportData.forEach((transport: any) => {
      const routeName = transport.routeId?.name || transport.routeName || 'Unassigned';
      routeCount[routeName] = (routeCount[routeName] || 0) + 1;
    });

    return {
      labels: Object.keys(routeCount),
      datasets: [{
        label: 'Students per Route',
        data: Object.values(routeCount),
        backgroundColor: 'rgba(59, 130, 246, 0.8)'
      }]
    };
  };

  const createClassPerformanceChartData = () => {
    if (!performanceData?.classPerformance) return null;

    const classPerf = performanceData.classPerformance;
    return {
      labels: Object.keys(classPerf),
      datasets: [{
        label: 'Average Percentage',
        data: Object.values(classPerf).map((p: any) => p.avgPercentage || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)'
      }]
    };
  };

  const createInventoryChartData = () => {
    if (!inventoryData || inventoryData.length === 0) return null;

    const categoryCount: { [key: string]: number } = {};
    inventoryData.forEach((item: any) => {
      const category = item.category || 'Uncategorized';
      categoryCount[category] = (categoryCount[category] || 0) + (item.quantity || 0);
    });

    return {
      labels: Object.keys(categoryCount),
      datasets: [{
        label: 'Inventory Items',
        data: Object.values(categoryCount),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ]
      }]
    };
  };

  const createHomeworkChartData = () => {
    if (!homeworkData || homeworkData.length === 0) return null;

    // Group by status
    const statusCount: { [key: string]: number } = {};
    homeworkData.forEach((hw: any) => {
      const status = hw.status || 'pending';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    return {
      labels: Object.keys(statusCount),
      datasets: [{
        label: 'Homework Status',
        data: Object.values(statusCount),
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }]
    };
  };

  const createHouseChartData = () => {
    if (!houseData || houseData.length === 0 || !students || students.length === 0) return null;

    const houseCount: { [key: string]: number } = {};
    students.forEach((student: any) => {
      const houseName = student.houseId?.name || student.house || 'Unassigned';
      houseCount[houseName] = (houseCount[houseName] || 0) + 1;
    });

    return {
      labels: Object.keys(houseCount),
      datasets: [{
        label: 'Students per House',
        data: Object.values(houseCount),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ]
      }]
    };
  };

  const createFeeChartData = () => {
    if (!feeStats?.summary) return null;

    return {
      labels: ['Total Amount', 'Paid Amount', 'Due Amount'],
      datasets: [{
        label: 'Fee Collection (₹)',
        data: [
          feeStats.summary.totalAmount || 0,
          feeStats.summary.totalPaid || 0,
          feeStats.summary.totalDue || 0
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }]
    };
  };

  const createPerformanceChartData = () => {
    if (!performanceData?.summary?.gradeDistribution) return null;

    const gradeDistribution = performanceData.summary.gradeDistribution;
    
    return {
      labels: Object.keys(gradeDistribution),
      datasets: [{
        label: 'Number of Students',
        data: Object.values(gradeDistribution),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }]
    };
  };

  // Render sub-sections based on active tab and sub-section
  const renderSubSection = () => {
    const category = reportCategories.find(cat => cat.id === activeTab);
    if (!category) return null;

    const subSection = activeSubSection || category.subSections[0]?.id;
    const currentCategory = reportCategories.find(cat => cat.id === activeTab);

    switch (activeTab) {
      case 'overview-school':
        switch (subSection) {
          case 'admission-growth':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Admission Growth Graph</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-96 bg-white rounded-lg p-4">
                    {createAdmissionGrowthData() ? (
                      <Line 
                        data={createAdmissionGrowthData()!} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { display: true } }
                        }} 
                      />
                    ) : (
                      <EmptyState message="No admission data available" />
                    )}
                  </div>
                </div>
              </div>
            );
          case 'quick-stats':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Quick Stats</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold">{students.length || studentStats?.totalStudents || 0}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600">Total Classes</p>
                    <p className="text-2xl font-bold">{classes.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600">Fee Collection</p>
                    <p className="text-2xl font-bold">₹{feeStats?.summary?.totalPaid?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600">Total Exams</p>
                    <p className="text-2xl font-bold">{examStats?.totalExams || 0}</p>
                  </div>
                </div>
              </div>
            );
          case 'transport-graph':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Transport Graph</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-96 bg-white rounded-lg p-4">
                    {createTransportChartData() ? (
                      <Bar 
                        data={createTransportChartData()!} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { display: true } }
                        }} 
                      />
                    ) : (
                      <EmptyState message="No transport data available" />
                    )}
                  </div>
                </div>
              </div>
            );
          case 'class-performance':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Class-wise Performance Graph</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-96 bg-white rounded-lg p-4">
                    {createClassPerformanceChartData() ? (
                      <Bar 
                        data={createClassPerformanceChartData()!} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { display: true } }
                        }} 
                      />
                    ) : (
                      <EmptyState message="No class performance data available" />
                    )}
                  </div>
                </div>
              </div>
            );
          case 'dormitory-graph':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Dormitory Graph</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <EmptyState message="Dormitory data will be available soon" />
                </div>
              </div>
            );
          case 'inventory-graph':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Inventory Graph</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-96 bg-white rounded-lg p-4">
                    {createInventoryChartData() ? (
                      <Doughnut 
                        data={createInventoryChartData()!} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom' } }
                        }} 
                      />
                    ) : (
                      <EmptyState message="No inventory data available" />
                    )}
                  </div>
                </div>
              </div>
            );
          default:
            return null;
        }

      case 'student-report':
        switch (subSection) {
          case 'homework-graph':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Homework Graph</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-96 bg-white rounded-lg p-4">
                    {createHomeworkChartData() ? (
                      <Bar 
                        data={createHomeworkChartData()!} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { display: true } }
                        }} 
                      />
                    ) : (
                      <EmptyState message="No homework data available" />
                    )}
                  </div>
                </div>
              </div>
            );
          case 'student-report-card':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Student Report Card</h3>
                {performanceData && performanceData.students && performanceData.students.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Exams</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Percentage</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {performanceData.students.slice(0, 20).map((student: any) => (
                          <tr key={student.studentId}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              <div className="text-sm text-gray-500">Roll: {student.rollNumber}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {student.class} {student.section}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.totalExams}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {student.avgPercentage?.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {student.avgGrade}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button className="text-blue-600 hover:text-blue-900">View</button>
                                <button className="text-purple-600 hover:text-purple-900">Print</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState message="No student report cards available" />
                )}
              </div>
            );
          case 'class-performance-report':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Class Performance</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-96 bg-white rounded-lg p-4">
                    {createPerformanceChartData() ? (
                      <Bar 
                        data={createPerformanceChartData()!} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { display: true } }
                        }} 
                      />
                    ) : (
                      <EmptyState message="No class performance data available" />
                    )}
                  </div>
                </div>
              </div>
            );
          case 'self-study':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Self-Study (Student App Report)</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <EmptyState message="Self-study report data will be available soon" />
                </div>
              </div>
            );
          case 'house-wise':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">House wise Report</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="h-96 bg-white rounded-lg p-4">
                    {createHouseChartData() ? (
                      <Doughnut 
                        data={createHouseChartData()!} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom' } }
                        }} 
                      />
                    ) : (
                      <EmptyState message="No house data available" />
                    )}
                  </div>
                </div>
              </div>
            );
          default:
            return null;
        }

      case 'exam-report':
        switch (subSection) {
          case 'exam-search-filter':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Exam Report - Search and Filter</h3>
                <div className="bg-white p-4 rounded-lg border mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search exams..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="">All Types</option>
                        <option value="mid-term">Mid Term</option>
                        <option value="final">Final</option>
                        <option value="quiz">Quiz</option>
                        <option value="assignment">Assignment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                      <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="">All Classes</option>
                        {classes.map((cls: any) => (
                          <option key={cls._id} value={cls._id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {exams
                        .filter((exam: any) => {
                          const matchesSearch = !searchTerm || exam.name?.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesType = !filterType || exam.type === filterType;
                          const matchesClass = !filterClass || exam.classId?._id === filterClass || exam.classId === filterClass;
                          return matchesSearch && matchesType && matchesClass;
                        })
                        .map((exam: any) => (
                          <tr key={exam._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exam.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exam.type}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {exam.classId?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {exam.date ? new Date(exam.date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                exam.status === 'completed' ? 'bg-green-100 text-green-800' :
                                exam.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {exam.status || 'Scheduled'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          case 'exam-type-class':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Exam Report by Type & Class</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Exams by Type</h4>
                    {/* Type breakdown can be added here */}
                    <EmptyState message="Exam type breakdown will be displayed here" />
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Exams by Class</h4>
                    {/* Class breakdown can be added here */}
                    <EmptyState message="Exam class breakdown will be displayed here" />
                  </div>
                </div>
              </div>
            );
          default:
            return null;
        }

      case 'teachers-report':
        switch (subSection) {
          case 'teacher-attendance':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Teachers Attendance Report</h3>
                <EmptyState message="Teacher attendance data will be available soon" />
              </div>
            );
          case 'teacher-performance':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Teachers' Performance Report</h3>
                <EmptyState message="Teacher performance data will be available soon" />
              </div>
            );
          case 'product-usages':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Product Usages Report</h3>
                <EmptyState message="Product usage data will be available soon" />
              </div>
            );
          case 'teacher-training':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Teachers Training Report</h3>
                <EmptyState message="Teacher training data will be available soon" />
              </div>
            );
          case 'leaderboard':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Teachers Leaderboard</h3>
                <EmptyState message="Teacher leaderboard data will be available soon" />
              </div>
            );
          default:
            return null;
        }

      case 'finance-report':
        switch (subSection) {
          case 'fee-collection':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Fee Collection Report</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Fee Collection Overview</h4>
                    <div className="h-64 bg-white rounded-lg p-4">
                      {createFeeChartData() ? (
                        <Bar 
                          data={createFeeChartData()!} 
                          options={{ 
                            responsive: true, 
                            maintainAspectRatio: false,
                            plugins: { legend: { display: true } }
                          }} 
                        />
                      ) : (
                        <EmptyState message="No fee collection data available" />
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Collection Summary</h4>
                    <div className="space-y-3">
                      <div className="p-4 bg-white rounded-lg">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-2xl font-bold">₹{feeStats?.summary?.totalAmount?.toLocaleString() || '0'}</p>
                      </div>
                      <div className="p-4 bg-white rounded-lg">
                        <p className="text-sm text-gray-600">Collected</p>
                        <p className="text-2xl font-bold text-green-600">₹{feeStats?.summary?.totalPaid?.toLocaleString() || '0'}</p>
                      </div>
                      <div className="p-4 bg-white rounded-lg">
                        <p className="text-sm text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-orange-600">₹{feeStats?.summary?.totalDue?.toLocaleString() || '0'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          case 'accounts':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Accounts Report</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Financial Overview</h4>
                    <div className="h-64 bg-white rounded-lg p-4">
                      {createFeeChartData() ? (
                        <Bar 
                          data={createFeeChartData()!} 
                          options={{ 
                            responsive: true, 
                            maintainAspectRatio: false,
                            plugins: { legend: { display: true } }
                          }} 
                        />
                      ) : (
                        <EmptyState message="No financial data available" />
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Transaction Summary</h4>
                    <div className="space-y-3">
                      <div className="p-4 bg-white rounded-lg">
                        <p className="text-sm text-gray-600">Total Transactions</p>
                        <p className="text-2xl font-bold">{feeCollections.length || 0}</p>
                      </div>
                      <div className="p-4 bg-white rounded-lg">
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">
                          ₹{feeStats?.summary?.totalPaid?.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          case 'salary':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Salary Report</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <EmptyState message={salaryData ? "Salary data available" : "No salary data available"} />
                </div>
              </div>
            );
          case 'fine-waiver':
            return (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Fine & Waiver Report</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <EmptyState message="Fine & waiver data will be available soon" />
                </div>
              </div>
            );
          default:
            return null;
        }

      default:
        return null;
    }
  };

  return (
    <div className="pb-10 space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600 mb-2">School intelligence / Reports</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Reports</h1>
        <p className="text-slate-600">Explore academic, operational, and financial activity across the school.</p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end">
        <div className="flex space-x-3">
          <button 
            onClick={() => fetchDataForTab(activeTab)}
            disabled={loading}
            className="bg-[#163f5d] text-white px-5 py-3 rounded-xl hover:bg-[#0e314b] transition-colors flex items-center space-x-2 disabled:opacity-50 font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Tabs - Report Categories */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-7 px-5 sm:px-7" aria-label="Report categories">
            {reportCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setActiveTab(category.id);
                    setActiveSubSection(category.subSections[0]?.id || '');
                  }}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === category.id
                      ? 'border-orange-500 text-[#163f5d]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sub-sections */}
        {(() => {
          const currentCategory = reportCategories.find(cat => cat.id === activeTab);
          if (!currentCategory || currentCategory.subSections.length === 0) return null;

          return (
            <div className="border-b border-slate-200 bg-[#f4f8fa]">
              <div className="flex space-x-2 px-6 py-3 overflow-x-auto">
                {currentCategory.subSections.map((subSection) => {
                  const SubIcon = subSection.icon;
                  const isActive = (activeSubSection || currentCategory.subSections[0]?.id) === subSection.id;
                  return (
                    <button
                      key={subSection.id}
                      onClick={() => setActiveSubSection(subSection.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-[#e8f0f4] text-[#163f5d]'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <SubIcon className="h-4 w-4" />
                      <span>{subSection.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Content */}
        <div className="p-4 sm:p-7 min-w-0">
          {loading && (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {!loading && renderSubSection()}
        </div>
      </div>
    </div>
  );
};

export default Reports;
