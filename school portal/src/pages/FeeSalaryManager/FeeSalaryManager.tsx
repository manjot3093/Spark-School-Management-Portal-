import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Edit, 
  DollarSign,
  Users,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler, type TooltipItem } from 'chart.js';
import { useTheme } from '../../context/themeState';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import { feesAPI, salaryAPI } from '../../services/api';

const FeeSalaryManager: React.FC = () => {
  const { theme } = useTheme();
  const chartText = theme === 'dark' ? '#c2d0e7' : '#536782';
  const chartGrid = theme === 'dark' ? '#35465e' : '#e7edf5';
  const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Financial Overview' },
    { id: 'fee-collection', label: 'Fee Collection' },
    { id: 'salary-management', label: 'Salary Management' },
    { id: 'reports', label: 'Financial Reports' }
  ];

  // Backend data states
  const [feeCollections, setFeeCollections] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [feeStats, setFeeStats] = useState<any>(null);
  const [collectionPage, setCollectionPage] = useState(1);
  const [collectionPageSize, setCollectionPageSize] = useState(10);
  const [salaryStats, setSalaryStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Get school ID from localStorage
  const getSchoolId = () => {
    const userStr = localStorage.getItem('school_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.schoolId;
    }
    return null;
  };

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fetch backend data
  useEffect(() => {
    fetchBackendData();
  }, [activeTab]);

  const fetchBackendData = async () => {
    setLoading(true);
    try {
      const schoolId = getSchoolId();
      
      if (activeTab === 'overview' || activeTab === 'reports') {
        // Fetch both fee and salary stats, and fee collections for overview
        const [feeStatsData, salaryStatsData, feeData] = await Promise.all([
          feesAPI.getCollectionStats({ schoolId }),
          salaryAPI.getStats({ schoolId, month: currentMonth, year: currentYear }),
          feesAPI.getCollections({ schoolId })
        ]);
        setFeeStats(feeStatsData.data);
        setSalaryStats(salaryStatsData.data);
        setFeeCollections(feeData.data || []);
      }
      
      if (activeTab === 'fee-collection') {
        const feeData = await feesAPI.getCollections({ schoolId });
        setFeeCollections(feeData.data || []);
      }
      
      if (activeTab === 'salary-management') {
        const salaryData = await salaryAPI.getAll({ schoolId, month: currentMonth, year: currentYear });
        setSalaries(salaryData.data || []);
      }
    } catch (error) {
      console.error('Error fetching backend data:', error);
      toast.error('Failed to load data from backend');
    } finally {
      setLoading(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate financial data from fee collections
  const calculatedTotalFees = feeCollections.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const calculatedPaidFees = feeCollections.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const calculatedPendingFees = calculatedTotalFees - calculatedPaidFees;

  // Financial data from backend
  const financialData = {
    totalFees: calculatedTotalFees,
    collectedFees: calculatedPaidFees,
    pendingFees: calculatedPendingFees,
    overdueFees: feeStats?.totalOverdue || 0,
    incomingFees: calculatedPendingFees,
    totalSalaries: salaryStats?.current?.totalNetSalary || 0,
    monthlyData: salaryStats?.monthlyTrend?.map((item: any) => item.totalNetSalary) || []
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyChartData = {
    labels: salaryStats?.monthlyTrend?.map((item: any) => `${monthNames[item.month - 1]}`) || monthNames,
    datasets: [
      {
        label: 'Salary Payouts',
        data: financialData.monthlyData.length > 0 ? financialData.monthlyData : Array(12).fill(0),
        borderColor: '#ef8038',
        backgroundColor: 'rgba(239,128,56,.12)',
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
      }
    ],
  };

  // Department salary data for doughnut chart
  const departmentLabels = salaryStats?.departmentStats?.map((dept: any) => dept.designation) || [];
  const departmentValues = salaryStats?.departmentStats?.map((dept: any) => dept.totalGrossSalary) || [];
  
  const feeTypeData = {
    labels: departmentLabels,
    datasets: [
      {
        data: departmentValues,
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context: TooltipItem<'line'>) => `Salary: ${currency(context.parsed.y ?? 0)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: chartText, maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: chartGrid }, ticks: { color: chartText, callback: (value: string | number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(Number(value)) } },
    },
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: chartText, usePointStyle: true, padding: 18, boxWidth: 8 } },
      tooltip: { callbacks: { label: (context: TooltipItem<'doughnut'>) => `${context.label}: ${currency(context.parsed)}` } },
    },
  };

  const renderFinancialOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Fees</p>
              <p className="text-3xl font-bold text-gray-900">₹{financialData.totalFees?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-green-600">Total fees for all students</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Collected Fees</p>
              <p className="text-3xl font-bold text-blue-600">₹{financialData.collectedFees?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-blue-600">
                {financialData.totalFees > 0 
                  ? `${((financialData.collectedFees / financialData.totalFees) * 100).toFixed(1)}% paid by students`
                  : 'No fee data'}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Fees</p>
              <p className="text-3xl font-bold text-yellow-600">₹{financialData.pendingFees?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-yellow-600">Total pending from students</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Wallet className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Salaries</p>
              <p className="text-3xl font-bold text-gray-900">₹{financialData.totalSalaries?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-red-600">Monthly payroll</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Users className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Monthly salary trend</h3>
          <p className="text-sm text-gray-500 mt-1 mb-5">Salary totals by reporting month · INR</p>
          <div className="relative h-80 min-w-0">{loading ? <div className="h-full flex items-center justify-center text-gray-500" role="status">Loading salary trend…</div> : financialData.monthlyData.length ? <Line data={monthlyChartData} options={chartOptions} role="img" aria-label="Monthly salary totals in Indian rupees" /> : <div className="h-full flex items-center justify-center text-gray-500 text-center">No monthly salary records available.</div>}</div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">Salary by department</h3>
          <p className="text-sm text-gray-500 mt-1 mb-5">Gross salary distribution · INR</p>
          <div className="relative h-80 min-w-0">{loading ? <div className="h-full flex items-center justify-center text-gray-500" role="status">Loading departments…</div> : departmentValues.some((value: number) => Number(value) > 0) ? <Doughnut data={feeTypeData} options={doughnutOptions} role="img" aria-label="Gross salary distribution by department" /> : <div className="h-full flex items-center justify-center text-gray-500 text-center">No department salary records available.</div>}</div>
        </section>
      </div>
    </div>
  );

  const renderFeeCollection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Fee Collection Management</h3>
        <p className="text-sm text-gray-600">
          Showing {feeCollections.length} fee collection{feeCollections.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          {feeCollections.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No fee collections found</h3>
              <p className="text-gray-600">No fee collection records available for this school.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Student</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Structure</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Total Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Paid Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Due Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feeCollections
                    .slice((collectionPage - 1) * collectionPageSize, collectionPage * collectionPageSize)
                    .map((collection) => (
                    <tr key={collection._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{collection.student?.name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{collection.student?.admissionNumber || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {collection.student?.classId?.name 
                          ? `${collection.student.classId.name}${collection.student.classId.section ? ` - ${collection.student.classId.section}` : ''}`
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{collection.feeStructure?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">₹{collection.totalAmount?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 px-4 text-sm font-medium text-green-600">₹{collection.paidAmount?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {collection.dueDate ? new Date(collection.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(collection.status)}`}>
                          {collection.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-800 text-sm"
                            title="Edit Collection"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {feeCollections.length > 0 && (
            <Pagination
              currentPage={collectionPage}
              pageSize={collectionPageSize}
              totalItems={feeCollections.length}
              onPageChange={setCollectionPage}
              onPageSizeChange={setCollectionPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
          )}
        </div>
      )}
    </div>
  );

  const renderSalaryManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Salary Management for {monthNames[currentMonth - 1]} {currentYear}</h3>
        <p className="text-sm text-gray-600">
          Showing {salaries.length} salary record{salaries.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          {salaries.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No salary records found</h3>
              <p className="text-gray-600">No salary records available for {monthNames[currentMonth - 1]} {currentYear}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {salaries.map((salary) => (
                <div key={salary._id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{salary.employee?.name || 'N/A'}</h4>
                      <p className="text-sm text-gray-600">
                        {salary.designation} • {salary.employee?.email || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">₹{salary.netSalary?.toFixed(2) || '0.00'}</p>
                      <p className="text-sm text-gray-500">Net Salary</p>
                      <span className={`mt-1 inline-block px-2 py-1 text-xs rounded-full ${
                        salary.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {salary.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded">
                      <p className="text-sm text-gray-600">Basic Salary</p>
                      <p className="text-lg font-bold text-green-600">₹{salary.basicSalary?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-sm text-gray-600">Allowances</p>
                      <p className="text-lg font-bold text-blue-600">₹{salary.totalAllowances?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded">
                      <p className="text-sm text-gray-600">Deductions</p>
                      <p className="text-lg font-bold text-red-600">₹{salary.totalDeductions?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <p className="text-sm text-gray-600">Gross Salary</p>
                      <p className="text-lg font-bold text-purple-600">₹{salary.grossSalary?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-end space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </button>
                    {salary.status === 'pending' && (
                      <button className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center space-x-1">
                        <DollarSign className="h-4 w-4" />
                        <span>Mark as Paid</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderFinancialReports = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Financial Reports</h3>
      
      {/* Student Fee Collection Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Student Fee Collection Details</h4>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : feeCollections.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No fee collections found</h3>
            <p className="text-gray-600">No fee collection records available for this school.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Student</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Class</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Fee Structure</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Total Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Paid Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Pending</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Due Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {feeCollections
                  .slice((collectionPage - 1) * collectionPageSize, collectionPage * collectionPageSize)
                  .map((collection) => {
                  const pendingAmount = (collection.totalAmount || 0) - (collection.paidAmount || 0);
                  return (
                    <tr key={collection._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{collection.student?.name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{collection.student?.admissionNumber || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {collection.student?.classId?.name 
                          ? `${collection.student.classId.name}${collection.student.classId.section ? ` - ${collection.student.classId.section}` : ''}`
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{collection.feeStructure?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">₹{collection.totalAmount?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 px-4 text-sm font-bold text-green-600">₹{collection.paidAmount?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 px-4 text-sm font-bold text-yellow-600">₹{pendingAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {collection.dueDate ? new Date(collection.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(collection.status)}`}>
                          {collection.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right font-bold text-gray-900">Total:</td>
                  <td className="py-3 px-4 text-sm font-bold text-gray-900">
                    ₹{feeCollections.reduce((sum, c) => sum + (c.totalAmount || 0), 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-green-600">
                    ₹{feeCollections.reduce((sum, c) => sum + (c.paidAmount || 0), 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-yellow-600">
                    ₹{feeCollections.reduce((sum, c) => sum + ((c.totalAmount || 0) - (c.paidAmount || 0)), 0).toFixed(2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {feeCollections.length > 0 && (
          <Pagination
            currentPage={collectionPage}
            pageSize={collectionPageSize}
            totalItems={feeCollections.length}
            onPageChange={setCollectionPage}
            onPageSizeChange={setCollectionPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Salary Expenditure ({monthNames[currentMonth - 1]} {currentYear})</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Net Salaries:</span>
              <span className="font-medium text-gray-900">₹{financialData.totalSalaries?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Employees:</span>
              <span className="font-medium text-blue-600">{salaryStats?.current?.totalEmployees || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Paid:</span>
              <span className="font-medium text-green-600">{salaryStats?.current?.totalPaid || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending:</span>
              <span className="font-medium text-yellow-600">{salaryStats?.current?.totalPending || 0}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Average Salary:</span>
                <span className="font-bold text-purple-600">
                  ₹{salaryStats?.current?.totalEmployees > 0  
                    ? (financialData.totalSalaries / salaryStats.current.totalEmployees).toFixed(2) 
                    : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderFinancialOverview();
      case 'fee-collection':
        return renderFeeCollection();
      case 'salary-management':
        return renderSalaryManagement();
      case 'reports':
        return renderFinancialReports();
      default:
        return renderFinancialOverview();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(115deg,#fff,#f4f7ff_70%,#fff1e7)] px-6 md:px-9 py-8 md:py-10 shadow-sm">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[.22em] text-orange-600 mb-3">Finance / control room</p>
          <h1 className="font-[Manrope] text-3xl md:text-4xl font-extrabold tracking-tight text-[#1b3262]">Fees & payroll.</h1>
          <p className="text-slate-600 mt-2">Collections and salary commitments, together in one view.</p>
        </div>
      </div>


      {/* Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex gap-2 px-4 md:px-7 py-3 overflow-x-auto" aria-label="Finance sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`py-2.5 px-4 rounded-xl font-semibold text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#213d75] text-white shadow-md'
                    : 'text-slate-600 hover:text-[#213d75] hover:bg-orange-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 md:p-7">
          {renderTabContent()}
        </div>
      </div>

    </div>
  );
};

export default FeeSalaryManager; 
