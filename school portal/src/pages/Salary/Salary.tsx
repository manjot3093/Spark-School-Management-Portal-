import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  Plus, 
  TrendingUp, 
  Calendar,
  Eye,
  Edit,
  Trash2,
  X,
  Check,
  BookOpen,
  Calculator,
  FlaskConical,
  Atom,
  Microscope,
  Globe,
  MapPin,
  History,
  GraduationCap,
  Code,
  Palette,
  Music,
  Activity,
  Building2,
  Briefcase,
  FileText,
  UserCog,
  Wrench,
  Car,
  Library,
  LucideIcon
} from 'lucide-react';
import { Chart } from '../../components/common/Charts';
import Pagination from '../../components/common/Pagination';
import { salaryAPI, classroomAPI } from '../../services/api';

interface Allowances {
  houseRent: number;
  medical: number;
  transport: number;
  other: number;
}

interface Deductions {
  tax: number;
  insurance: number;
  loan: number;
  other: number;
}

interface Salary {
  _id?: string;
  employee?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
  } | string;
  teacherId?: string;
  salaryId?: string;
  designation: string;
  basicSalary: number;
  allowances: Allowances;
  deductions: Deductions;
  month: number;
  year: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  grossSalary: number;
  netSalary: number;
  totalAllowances: number;
  totalDeductions: number;
}

interface SalaryStructure {
  designation: string;
  basicSalary: number;
  allowances: Allowances;
  deductions: Deductions;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  employeeCount: number;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  subjects?: Array<{
    _id: string;
    name: string;
    code?: string;
  }>;
}

// Function to get icon for department/designation (accessible to all components)
const getDepartmentIcon = (designation: string): LucideIcon => {
  const dept = designation.toLowerCase();
  
  // Subject-based icons
  if (dept.includes('math') || dept.includes('mathematics')) return Calculator;
  if (dept.includes('science') || dept.includes('physics') || dept.includes('chemistry') || dept.includes('biology')) return FlaskConical;
  if (dept.includes('physics')) return Atom;
  if (dept.includes('biology')) return Microscope;
  if (dept.includes('english') || dept.includes('language')) return BookOpen;
  if (dept.includes('hindi')) return BookOpen;
  if (dept.includes('social') || dept.includes('sst') || dept.includes('geography')) return Globe;
  if (dept.includes('history')) return History;
  if (dept.includes('geography')) return MapPin;
  if (dept.includes('computer') || dept.includes('it') || dept.includes('programming')) return Code;
  if (dept.includes('art') || dept.includes('drawing')) return Palette;
  if (dept.includes('music')) return Music;
  if (dept.includes('physical') || dept.includes('pe') || dept.includes('sports')) return Activity;
  if (dept.includes('commerce') || dept.includes('accounting') || dept.includes('accountancy')) return DollarSign;
  if (dept.includes('business')) return Briefcase;
  
  // Department-based icons
  if (dept.includes('principal') || dept.includes('vice principal')) return GraduationCap;
  if (dept.includes('administration') || dept.includes('admin')) return Building2;
  if (dept.includes('finance') || dept.includes('accountant')) return DollarSign;
  if (dept.includes('hr') || dept.includes('human resource')) return UserCog;
  if (dept.includes('maintenance')) return Wrench;
  if (dept.includes('transport')) return Car;
  if (dept.includes('library') || dept.includes('librarian')) return Library;
  if (dept.includes('teacher') || dept.includes('faculty')) return Users;
  if (dept.includes('staff')) return Briefcase;
  
  // Default icon
  return BookOpen;
};

const Salary: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [teacherStructures, setTeacherStructures] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pendingSalaries, setPendingSalaries] = useState<any[]>([]);
  const [deductionSettings, setDeductionSettings] = useState<any>({
    deductionType: 'daily',
    absentRate: 100,
    lateRate: 0,
    halfDayRate: 50,
    absentAmount: 0,
    lateAmount: 0,
    halfDayAmount: 0
  });
  
  // Modal states
  const [showAddStructureModal, setShowAddStructureModal] = useState(false);
  const [showEditStructureModal, setShowEditStructureModal] = useState(false);
  const [showGeneratePayrollModal, setShowGeneratePayrollModal] = useState(false);
  const [showAddSalaryModal, setShowAddSalaryModal] = useState(false);
  const [showEditSalaryModal, setShowEditSalaryModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);

  // Get current month and year
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Get school ID from localStorage
  const getSchoolId = () => {
    const userStr = localStorage.getItem('school_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.schoolId;
    }
    return null;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'structure', label: 'Salary Structure', icon: DollarSign },
    { id: 'payroll', label: 'Payroll', icon: Calendar },
    { id: 'deduction-settings', label: 'Deduction Settings', icon: Edit },
    { id: 'reports', label: 'Reports', icon: Eye },
  ];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const schoolId = getSchoolId();
      
      if (activeTab === 'overview' || activeTab === 'reports') {
        const statsData = await salaryAPI.getStats({ schoolId, month: selectedMonth, year: selectedYear });
        setStats(statsData.data);
        
        // Fetch all pending salaries to calculate pending months
        try {
          const allSalaries = await salaryAPI.getAll({ schoolId });
          const pending = (allSalaries.data || []).filter((s: Salary) => s.status === 'pending');
          setPendingSalaries(pending);
        } catch (error) {
          console.error('Error fetching pending salaries:', error);
        }
      }
      
      if (activeTab === 'structure') {
        // Fetch individual teacher salary structures
        const teacherStructuresData = await salaryAPI.getTeacherStructures({ 
          schoolId, 
          month: selectedMonth, 
          year: selectedYear 
        });
        setTeacherStructures(teacherStructuresData.data || []);
        // Also keep the old structures for backward compatibility
        const structuresData = await salaryAPI.getStructures({ schoolId });
        setStructures(structuresData.data);
      }
      
      if (activeTab === 'payroll') {
        const salariesData = await salaryAPI.getAll({ schoolId, month: selectedMonth, year: selectedYear });
        setSalaries(salariesData.data);
        // Also fetch structures for the selected month/year for payroll generation
        const structuresData = await salaryAPI.getStructures({ schoolId, month: selectedMonth, year: selectedYear });
        setStructures(structuresData.data);
      }
      
      if (activeTab === 'deduction-settings') {
        const settingsData = await salaryAPI.getDeductionSettings({ schoolId });
        if (settingsData.data) {
          setDeductionSettings({
            deductionType: settingsData.data.deductionType || 'daily',
            absentRate: settingsData.data.absentRate !== undefined ? settingsData.data.absentRate : 100,
            lateRate: settingsData.data.lateRate !== undefined ? settingsData.data.lateRate : 0,
            halfDayRate: settingsData.data.halfDayRate !== undefined ? settingsData.data.halfDayRate : 50,
            absentAmount: settingsData.data.absentAmount || 0,
            lateAmount: settingsData.data.lateAmount || 0,
            halfDayAmount: settingsData.data.halfDayAmount || 0
          });
        }
      }
      
      // Fetch employees for modals
      const teachersData = await classroomAPI.getTeachers(schoolId);
      setEmployees(teachersData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSalary = async (salaryData: any) => {
    try {
      // Check if salary already exists for this employee/month/year
      const existingSalaries = await salaryAPI.getAll({ 
        schoolId: getSchoolId(), 
        employee: salaryData.employee,
        month: salaryData.month,
        year: salaryData.year
      });
      
      if (existingSalaries.data && existingSalaries.data.length > 0) {
        // If exists, update it instead of creating new
        const existingSalary = existingSalaries.data[0];
        await salaryAPI.update(existingSalary._id, salaryData);
        alert('Salary structure updated successfully!');
      } else {
        // Create new salary
        await salaryAPI.create(salaryData);
        alert('Salary structure created successfully!');
      }
      fetchData();
      setShowAddSalaryModal(false);
    } catch (error: any) {
      console.error('Error adding salary:', error);
      // If error is about already existing, try to update instead
      if (error.message && error.message.includes('already exists')) {
        // Try to find and update existing salary
        try {
          const existingSalaries = await salaryAPI.getAll({ 
            schoolId: getSchoolId(), 
            employee: salaryData.employee,
            month: salaryData.month,
            year: salaryData.year
          });
          if (existingSalaries.data && existingSalaries.data.length > 0) {
            await salaryAPI.update(existingSalaries.data[0]._id, salaryData);
            alert('Salary structure updated successfully!');
            fetchData();
            setShowAddSalaryModal(false);
            return;
          }
        } catch (updateError) {
          console.error('Error updating salary:', updateError);
        }
      }
      alert(error.message || 'Failed to add salary');
    }
  };

  const handleEditSalary = async (salaryData: any) => {
    if (!selectedSalary) return;
    try {
      // Handle teacher structure objects (from structure tab) - they have teacherId and salaryId
      // Also handle regular Salary objects (from payroll tab) - they have employee._id and _id
      const employeeId = typeof selectedSalary.employee === 'object' 
        ? selectedSalary.employee?._id 
        : (selectedSalary.employee || selectedSalary.teacherId || '');
      const salaryId = selectedSalary._id || selectedSalary.salaryId;
      const monthToUse = selectedSalary.month || selectedMonth;
      const yearToUse = selectedSalary.year || selectedYear;
      
      if (!employeeId) {
        alert('Employee ID is missing. Cannot update salary.');
        return;
      }
      
      // If there's no salaryId, create a new salary record for the selected month/year
      if (!salaryId) {
        await salaryAPI.create({
          ...salaryData,
          employee: employeeId,
          month: monthToUse,
          year: yearToUse
        });
        alert('Salary structure created successfully!');
      } else {
        // Update existing salary
        await salaryAPI.update(salaryId, {
          ...salaryData,
          employee: employeeId,
          month: monthToUse,
          year: yearToUse
        });
        alert('Salary structure updated successfully!');
      }
      fetchData();
      setShowEditSalaryModal(false);
      setSelectedSalary(null);
    } catch (error: any) {
      console.error('Error updating salary:', error);
      // If error is about already existing, try to find and update
      if (error.message && error.message.includes('already exists')) {
        try {
          const employeeId = typeof selectedSalary.employee === 'object' 
            ? selectedSalary.employee?._id 
            : (selectedSalary.employee || selectedSalary.teacherId || '');
          const existingSalaries = await salaryAPI.getAll({ 
            schoolId: getSchoolId(), 
            employee: employeeId,
            month: selectedSalary.month || selectedMonth,
            year: selectedSalary.year || selectedYear
          });
          if (existingSalaries.data && existingSalaries.data.length > 0) {
            await salaryAPI.update(existingSalaries.data[0]._id, salaryData);
            alert('Salary structure updated successfully!');
            fetchData();
            setShowEditSalaryModal(false);
            setSelectedSalary(null);
            return;
          }
        } catch (updateError) {
          console.error('Error updating salary:', updateError);
        }
      }
      alert(error.message || 'Failed to update salary');
    }
  };

  const handleDeleteSalary = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary record?')) return;
    try {
      await salaryAPI.delete(id);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting salary:', error);
      alert(error.message || 'Failed to delete salary');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm('Mark this salary as paid?')) return;
    try {
      await salaryAPI.markAsPaid(id, 'bank_transfer');
      fetchData();
    } catch (error: any) {
      console.error('Error marking salary as paid:', error);
      alert(error.message || 'Failed to mark salary as paid');
    }
  };

  const handleGeneratePayroll = async (payrollData: any) => {
    try {
      const result = await salaryAPI.generatePayroll(payrollData);
      alert(`Payroll generated! Created: ${result.data.created}, Errors: ${result.data.errors}`);
      fetchData();
      setShowGeneratePayrollModal(false);
    } catch (error: any) {
      console.error('Error generating payroll:', error);
      alert(error.message || 'Failed to generate payroll');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(115deg,#fff,#f4f7ff_70%,#fff1e7)] px-6 md:px-9 py-8 md:py-10 shadow-sm">
        <p className="text-[11px] font-extrabold uppercase tracking-[.22em] text-orange-600 mb-3">Finance / people</p>
        <h1 className="font-[Manrope] text-3xl md:text-4xl font-extrabold tracking-tight text-[#1b3262]">Payroll with clarity.</h1>
        <p className="text-slate-600 mt-2">Manage salary structures, run payroll and review payment status.</p>
      </div>

      {/* Month/Year Selector */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 rounded-2xl bg-white border border-slate-200 p-4 md:p-5 shadow-sm">
        <div className="flex space-x-3">
          <select
            aria-label="Payroll month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>
          <select
            aria-label="Payroll year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'structure' && (
            <>
              <button 
                onClick={() => setShowAddSalaryModal(true)}
                className="bg-[#213d75] text-white px-4 py-2 rounded-lg hover:bg-[#172d59] transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Salary</span>
              </button>
              <div className="text-sm text-gray-600">
                Showing structures for: {monthNames[selectedMonth - 1]} {selectedYear}
                {Array.isArray(teacherStructures) && teacherStructures.length > 0 && teacherStructures[0]?.month !== selectedMonth && (
                  <span className="text-blue-600 ml-2">
                    (Using structure from {teacherStructures[0]?.month ? monthNames[teacherStructures[0].month - 1] : 'N/A'} {teacherStructures[0]?.year || ''})
                  </span>
                )}
              </div>
            </>
          )}
          {activeTab === 'payroll' && (
            <button 
              onClick={() => setShowGeneratePayrollModal(true)}
              className="bg-[#213d75] text-white px-4 py-2 rounded-lg hover:bg-[#172d59] transition-colors"
            >
              Generate Payroll
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{stats.current?.totalEmployees || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Salary</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.current?.totalNetSalary?.toFixed(2) || '0.00'}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-gray-900">{stats.current?.totalPaid || 0}</p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.current?.totalPending || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex gap-2 px-4 md:px-7 py-3 overflow-x-auto scrollbar-hide" aria-label="Salary sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl font-semibold text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#213d75] text-white shadow-md'
                      : 'text-slate-600 hover:text-[#213d75] hover:bg-orange-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 md:p-7">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab stats={stats} pendingSalaries={pendingSalaries} />
              )}

              {activeTab === 'structure' && (
                <StructureTab 
                  structures={structures}
                  teacherStructures={teacherStructures}
                  employees={employees}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  onEdit={(structure) => {
                    setSelectedSalary(structure);
                    setShowEditSalaryModal(true);
                  }}
                  onAddForEmployee={(employee) => {
                    setSelectedSalary({ employee: employee._id, teacherId: employee._id } as any);
                    setShowAddSalaryModal(true);
                  }}
                />
              )}

              {activeTab === 'payroll' && (
                <PayrollTab 
                  salaries={salaries} 
                  onEdit={(salary) => {
                    setSelectedSalary(salary);
                    setShowEditSalaryModal(true);
                  }}
                  onDelete={handleDeleteSalary}
                  onMarkAsPaid={handleMarkAsPaid}
                />
              )}

              {activeTab === 'deduction-settings' && (
                <DeductionSettingsTab 
                  settings={deductionSettings}
                  onUpdate={async (newSettings) => {
                    try {
                      await salaryAPI.updateDeductionSettings({
                        ...newSettings,
                        schoolId: getSchoolId()
                      });
                      setDeductionSettings(newSettings);
                      alert('Deduction settings updated successfully!');
                    } catch (error: any) {
                      alert(error.message || 'Failed to update deduction settings');
                    }
                  }}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsTab stats={stats} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddSalaryModal && (
        <SalaryModal
          employees={employees}
          salary={selectedSalary?.employee ? { employee: selectedSalary.employee, teacherId: selectedSalary.employee } : undefined}
          onClose={() => { setShowAddSalaryModal(false); setSelectedSalary(null); }}
          onSave={handleAddSalary}
          month={selectedMonth}
          year={selectedYear}
        />
      )}

      {showEditSalaryModal && selectedSalary && (
        <SalaryModal
          employees={employees}
          salary={selectedSalary}
          onClose={() => {
            setShowEditSalaryModal(false);
            setSelectedSalary(null);
          }}
          onSave={handleEditSalary}
          month={selectedMonth}
          year={selectedYear}
        />
      )}

      {showGeneratePayrollModal && (
        <GeneratePayrollModal
          employees={employees}
          structures={structures}
          teacherStructures={teacherStructures}
          month={selectedMonth}
          year={selectedYear}
          onClose={() => setShowGeneratePayrollModal(false)}
          onGenerate={handleGeneratePayroll}
        />
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ stats: any; pendingSalaries: Salary[] }> = ({ stats, pendingSalaries }) => {
  const [deptPage, setDeptPage] = useState(1);
  const [trendPage, setTrendPage] = useState(1);
  const pageSize = 5;

  if (!stats) return <div>Loading...</div>;

  // Calculate pending months for each staff
  const calculatePendingMonths = (employeeId: string) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Get all pending salaries for this employee
    const employeePendingSalaries = pendingSalaries.filter(
      (s: Salary) => {
        const empId = typeof s.employee === 'object' 
          ? s.employee?._id 
          : (s.employee || s.teacherId || '');
        return empId === employeeId && s.status === 'pending';
      }
    );
    
    if (employeePendingSalaries.length === 0) return 0;
    
    // Calculate months from the oldest pending salary to current month
    const sortedPending = employeePendingSalaries.sort((a: Salary, b: Salary) => {
      const dateA = new Date(a.year, a.month - 1);
      const dateB = new Date(b.year, b.month - 1);
      return dateA.getTime() - dateB.getTime();
    });
    
    const oldestPending = sortedPending[0];
    const oldestDate = new Date(oldestPending.year, oldestPending.month - 1);
    const currentDateObj = new Date(currentYear, currentMonth - 1);
    
    // Calculate difference in months
    const monthsDiff = (currentDateObj.getFullYear() - oldestDate.getFullYear()) * 12 + 
                       (currentDateObj.getMonth() - oldestDate.getMonth());
    
    return monthsDiff + 1; // +1 to include current month
  };

  // Group pending salaries by month
  const getPendingStaffForMonth = (month: number, year: number) => {
    return pendingSalaries.filter((s: Salary) => 
      s.month === month && s.year === year && s.status === 'pending'
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-x-auto">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Department-wise Salary</h3>
          <div className="space-y-3">
            {stats.departmentStats && stats.departmentStats.length > 0 ? (
              <>
                {stats.departmentStats
                  .slice((deptPage - 1) * pageSize, deptPage * pageSize)
                  .map((dept: any, index: number) => {
                    const IconComponent = getDepartmentIcon(dept.designation);
                    return (
                      <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{dept.designation}</p>
                            <p className="text-sm text-gray-600">{dept.count} employees</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{dept.totalGrossSalary?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    );
                  })}
                <Pagination
                  compact
                  currentPage={deptPage}
                  pageSize={pageSize}
                  totalItems={stats.departmentStats.length}
                  onPageChange={setDeptPage}
                />
              </>
            ) : (
              <div className="text-center py-6 text-gray-500">No department data</div>
            )}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Monthly Trend</h3>
          <div className="space-y-3">
            {stats.monthlyTrend && stats.monthlyTrend.length > 0 ? (
              <>
                {stats.monthlyTrend
                  .slice((trendPage - 1) * pageSize, trendPage * pageSize)
                  .map((month: any, index: number) => {
                    const pendingStaff = getPendingStaffForMonth(month.month, month.year);
                    const hasPending = pendingStaff.length > 0;
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-3 bg-white rounded-lg ${hasPending ? 'border-l-4 border-yellow-500' : ''} hover:shadow-md transition-shadow`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <p className="font-medium">{month.month}/{month.year}</p>
                            <p className="text-sm text-gray-600">{month.totalEmployees} employees</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{month.totalNetSalary?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                        
                        {hasPending && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-yellow-700 mb-2">
                              ⚠️ {pendingStaff.length} Staff with Pending Salary
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {pendingStaff.map((salary: Salary, idx: number) => {
                                const employeeName = typeof salary.employee === 'object' ? salary.employee?.name : 'Unknown';
                                const employeeId = typeof salary.employee === 'object' 
                                  ? salary.employee?._id 
                                  : (salary.employee || salary.teacherId || '');
                                const pendingMonths = calculatePendingMonths(employeeId);
                                return (
                                  <div key={idx} className="flex justify-between items-center text-xs bg-yellow-50 p-2 rounded">
                                    <span className="text-gray-700">{employeeName}</span>
                                    <span className="text-yellow-700 font-medium">
                                      {pendingMonths} {pendingMonths === 1 ? 'month' : 'months'} pending
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                <Pagination
                  compact
                  currentPage={trendPage}
                  pageSize={pageSize}
                  totalItems={stats.monthlyTrend.length}
                  onPageChange={setTrendPage}
                />
              </>
            ) : (
              <div className="text-center py-6 text-gray-500">No monthly trend data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Structure Tab Component
const StructureTab: React.FC<{ 
  structures: SalaryStructure[]; 
  teacherStructures: any[];
  employees: Employee[];
  selectedMonth: number;
  selectedYear: number;
  onEdit: (structure: any) => void;
  onAddForEmployee?: (employee: Employee) => void;
}> = ({ structures, teacherStructures, employees, selectedMonth, selectedYear, onEdit, onAddForEmployee }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Normalize API shape (backend returns name/email, we expect teacherName/teacherEmail)
  const normalizedStructures = (Array.isArray(teacherStructures) ? teacherStructures : []).map((t: any) => {
    const name = t.teacherName ?? t.name ?? '';
    const email = t.teacherEmail ?? t.email ?? '';
    const allow = t.allowances || {};
    const deduct = t.deductions || {};
    const totalAllow = t.totalAllowances ?? ((allow.houseRent || 0) + (allow.medical || 0) + (allow.transport || 0) + (allow.other || 0));
    const totalDeduct = t.totalDeductions ?? ((deduct.tax || 0) + (deduct.insurance || 0) + (deduct.loan || 0) + (deduct.other || 0) + (deduct.absence || 0));
    const basic = Number(t.basicSalary) || 0;
    const net = t.netSalary ?? (basic + totalAllow - totalDeduct);
    return {
      ...t,
      teacherId: t.teacherId ?? t.employee,
      teacherName: name,
      teacherEmail: email,
      totalAllowances: totalAllow,
      totalDeductions: totalDeduct,
      netSalary: net,
      basicSalary: basic,
      allowances: allow,
      deductions: deduct,
    };
  });

  // Build visible rows: merge teachers who have a structure with teachers who don't (show all teachers)
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const structureByEmployee = new Map(
    normalizedStructures.map((t: any) => [String(t.teacherId || t.employee), t])
  );
  const rows: any[] = [];
  safeEmployees.forEach((emp) => {
    const existing = structureByEmployee.get(String(emp._id));
    if (existing) {
      rows.push({ ...existing, _hasSalary: true });
    } else {
      rows.push({
        teacherId: emp._id,
        employee: emp._id,
        teacherName: emp.name || '',
        teacherEmail: emp.email || '',
        designation: emp.role || 'Teacher',
        basicSalary: 0,
        totalAllowances: 0,
        totalDeductions: 0,
        netSalary: 0,
        allowances: {},
        deductions: {},
        month: null,
        year: null,
        _hasSalary: false,
        _employee: emp,
      });
    }
  });
  // Append any structures whose employee is not in current employees list (e.g. old data)
  normalizedStructures.forEach((t: any) => {
    const id = String(t.teacherId || t.employee);
    if (!safeEmployees.some(e => String(e._id) === id)) {
      rows.push({ ...t, _hasSalary: true });
    }
  });
  const safeTeacherStructures = rows;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This shows all teachers and their salary structure for {monthNames[selectedMonth - 1]} {selectedYear}. 
          Teachers without a salary show &quot;No salary set&quot;—click <strong>Add</strong> to set one.
        </p>
      </div>
      
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allowances</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Month</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {safeTeacherStructures.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  No teachers found. Add teachers in the system first, then set their salary here.
                </td>
              </tr>
            ) : (
              safeTeacherStructures
                .slice((page - 1) * pageSize, page * pageSize)
                .map((teacher, index) => (
                <tr key={String(teacher.teacherId || teacher.employee || index)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {((teacher.teacherName || '').split(' ').map((n: string) => n[0]).join('') || '?').toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{teacher.teacherName}</div>
                        <div className="text-sm text-gray-500">{teacher.teacherEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{teacher.designation}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₹{(Number(teacher.basicSalary) || 0).toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₹{(Number(teacher.totalAllowances) || 0).toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      H: ₹{teacher.allowances?.houseRent || 0} | M: ₹{teacher.allowances?.medical || 0} | T: ₹{teacher.allowances?.transport || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₹{(Number(teacher.totalDeductions) || 0).toFixed(2)}</div>
                    {(Number(teacher.deductions?.absence) || 0) > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        Absence: ₹{Number(teacher.deductions?.absence).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">₹{(Number(teacher.netSalary) || 0).toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {teacher.month && teacher.year ? (
                      <div className="text-sm text-gray-900">
                        {monthNames[teacher.month - 1]} {teacher.year}
                        {teacher.month !== selectedMonth && (
                          <div className="text-xs text-blue-600 mt-1">(Fallback)</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">No salary set</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {teacher._hasSalary ? (
                      <button
                        onClick={() => onEdit(teacher)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    ) : (
                      onAddForEmployee && teacher._employee ? (
                        <button
                          onClick={() => onAddForEmployee(teacher._employee)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Add
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {safeTeacherStructures.length > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={safeTeacherStructures.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </div>
  );
};

// Payroll Tab Component
const PayrollTab: React.FC<{ 
  salaries: Salary[]; 
  onEdit: (salary: Salary) => void;
  onDelete: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
}> = ({ salaries, onEdit, onDelete, onMarkAsPaid }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (salaries.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No salary records found</h3>
        <p className="text-gray-600 mb-4">
          No salary records exist for the selected month and year.
        </p>
        <p className="text-sm text-gray-500">
          Click "Add Salary" or "Generate Payroll" to create salary records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Edit className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Salary Records & Attendance</h3>
            <p className="mt-1 text-sm text-blue-700">
              Click the <strong>"Edit"</strong> button on any salary record to modify details including basic salary, allowances, and deductions. 
              For teachers, attendance-based deductions (absent days, half-days) are automatically calculated. Holidays do not cause salary deductions.
              You can also mark salaries as paid or delete records.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allowances</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance*</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salaries.slice((page - 1) * pageSize, page * pageSize).map((salary) => (
              <tr key={salary._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {(() => {
                          const emp =
                            typeof salary.employee === 'object'
                              ? salary.employee
                              : undefined;

                          if (!emp?.name) return 'NA';

                          return emp.name
                            .split(' ')
                            .filter(Boolean)
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase();
                        })()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {typeof salary.employee === 'object'
                          ? salary.employee?.name
                          : 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {typeof salary.employee === 'object'
                          ? salary.employee?.email
                          : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{salary.designation}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">₹{salary.basicSalary.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">₹{salary.totalAllowances.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">₹{salary.totalDeductions.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-400">N/A</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">₹{salary.netSalary.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    salary.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : salary.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {salary.status.charAt(0).toUpperCase() + salary.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => onEdit(salary)}
                      className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                      title="Edit Salary"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    {salary.status === 'pending' && (
                      <button 
                        onClick={() => onMarkAsPaid(salary._id)}
                        className="inline-flex items-center px-3 py-1 border border-green-300 rounded-md text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                        title="Mark as Paid"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Pay
                      </button>
                    )}
                    <button 
                      onClick={() => onDelete(salary._id)}
                      className="inline-flex items-center px-2 py-1 border border-red-300 rounded-md text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                      title="Delete Salary"
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
      {salaries.length > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={salaries.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </div>
  );
};

// Deduction Settings Tab Component
const DeductionSettingsTab: React.FC<{ 
  settings: any;
  onUpdate: (settings: any) => void;
}> = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Configure deduction rates for teacher attendance. These rates will be automatically applied when calculating monthly salaries.
          <br />
          <strong>Daily Type:</strong> Deduction is calculated as a percentage of daily salary (daily salary = basic salary / total working days).
          <br />
          <strong>Fixed Type:</strong> Deduction is a fixed amount per occurrence.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deduction Type
          </label>
          <select
            value={formData.deductionType}
            onChange={(e) => setFormData({ ...formData, deductionType: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="daily">Daily Salary Based (Percentage)</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>

        {formData.deductionType === 'daily' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Deduction Rates (Percentage of Daily Salary)</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Absent Day Rate (%)
              </label>
              <input
                type="number"
                value={formData.absentRate}
                onChange={(e) => setFormData({ ...formData, absentRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                max="100"
                step="0.1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentage of daily salary to deduct for each absent day (0-100%)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Day Rate (%)
              </label>
              <input
                type="number"
                value={formData.lateRate}
                onChange={(e) => setFormData({ ...formData, lateRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                max="100"
                step="0.1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentage of daily salary to deduct for each late day (0-100%)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Half Day Rate (%)
              </label>
              <input
                type="number"
                value={formData.halfDayRate}
                onChange={(e) => setFormData({ ...formData, halfDayRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                max="100"
                step="0.1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentage of daily salary to deduct for each half-day (0-100%)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Fixed Deduction Amounts</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Absent Day Amount (₹)
              </label>
              <input
                type="number"
                value={formData.absentAmount}
                onChange={(e) => setFormData({ ...formData, absentAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                step="0.01"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Fixed amount to deduct for each absent day
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Day Amount (₹)
              </label>
              <input
                type="number"
                value={formData.lateAmount}
                onChange={(e) => setFormData({ ...formData, lateAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                step="0.01"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Fixed amount to deduct for each late day
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Half Day Amount (₹)
              </label>
              <input
                type="number"
                value={formData.halfDayAmount}
                onChange={(e) => setFormData({ ...formData, halfDayAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                step="0.01"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Fixed amount to deduct for each half-day
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Reports Tab Component
const ReportsTab: React.FC<{ stats: any }> = ({ stats }) => {
  const [deptPage, setDeptPage] = useState(1);
  const deptPageSize = 5;

  if (!stats) return <div>Loading...</div>;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Prepare monthly trend data for line chart
  const monthlyTrendData = {
    labels: stats.monthlyTrend?.map((item: any) => `${monthNames[item.month - 1]} ${item.year}`) || [],
    datasets: [
      {
        label: 'Total Net Salary',
        data: stats.monthlyTrend?.map((item: any) => item.totalNetSalary || 0) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Prepare department-wise data for bar chart
  const departmentData = {
    labels: stats.departmentStats?.map((dept: any) => dept.designation) || [],
    datasets: [
      {
        label: 'Total Gross Salary',
        data: stats.departmentStats?.map((dept: any) => dept.totalGrossSalary || 0) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-x-auto">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold mb-4">Monthly Salary Trend (Last 6 Months)</h4>
          <div className="h-64 bg-white rounded-lg p-4">
            {stats.monthlyTrend && stats.monthlyTrend.length > 0 ? (
              <Chart 
                type="line" 
                data={monthlyTrendData} 
                title="Monthly Salary Distribution"
                height={240}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No monthly trend data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold mb-4">Department-wise Salary</h4>
          <div className="h-64 bg-white rounded-lg p-4">
            {stats.departmentStats && stats.departmentStats.length > 0 ? (
              <Chart 
                type="bar" 
                data={departmentData} 
                title="Department Salary Comparison"
                height={240}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No department data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold mb-4">Salary Statistics</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-sm font-medium">Total Gross Salary</span>
              <span className="text-sm font-bold text-green-600">₹{stats.current?.totalGrossSalary?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-sm font-medium">Total Deductions</span>
              <span className="text-sm font-bold text-red-600">₹{stats.current?.totalDeductions?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-sm font-medium">Total Net Salary</span>
              <span className="text-sm font-bold text-blue-600">₹{stats.current?.totalNetSalary?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-sm font-medium">Average Salary</span>
              <span className="text-sm font-bold text-purple-600">
                ₹{stats.current?.totalEmployees > 0 
                  ? (stats.current.totalNetSalary / stats.current.totalEmployees).toFixed(2) 
                  : '0.00'}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold mb-4">Department Breakdown</h4>
          <div className="space-y-3">
            {stats.departmentStats && stats.departmentStats.length > 0 ? (
              <>
                {stats.departmentStats
                  .slice((deptPage - 1) * deptPageSize, deptPage * deptPageSize)
                  .map((dept: any, index: number) => {
                    const IconComponent = getDepartmentIcon(dept.designation);
                    return (
                      <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{dept.designation}</p>
                            <p className="text-sm text-gray-600">{dept.count} {dept.count === 1 ? 'employee' : 'employees'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">₹{dept.totalGrossSalary?.toFixed(2) || '0.00'}</p>
                          <p className="text-sm text-gray-600">
                            Avg: ₹{dept.count > 0 ? (dept.totalGrossSalary / dept.count).toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                <Pagination
                  compact
                  currentPage={deptPage}
                  pageSize={deptPageSize}
                  totalItems={stats.departmentStats.length}
                  onPageChange={setDeptPage}
                />
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No department data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Salary Modal Component
const SalaryModal: React.FC<{
  employees: Employee[];
  salary?: Salary | any; // Can be Salary object or teacher structure object
  month: number;
  year: number;
  onClose: () => void;
  onSave: (data: any) => void;
}> = ({ employees, salary, month, year, onClose, onSave }) => {
  // Handle both Salary objects and teacher structure objects
  // Teacher structures have: teacherId, salaryId, month, year
  // Salary objects have: employee._id or employee, _id, month, year
  const employeeId = salary?.employee?._id || salary?.employee || salary?.teacherId || '';
  const designation = salary?.designation || '';
  const basicSalary = salary?.basicSalary || 0;
  const allowances = salary?.allowances || { houseRent: 0, medical: 0, transport: 0, other: 0 };
  const deductions = salary?.deductions || { tax: 0, insurance: 0, loan: 0, other: 0 };
  const notes = salary?.notes || '';
  
  const [formData, setFormData] = useState({
    employee: employeeId,
    designation: designation,
    basicSalary: basicSalary,
    allowances: {
      houseRent: allowances.houseRent || 0,
      medical: allowances.medical || 0,
      transport: allowances.transport || 0,
      other: allowances.other || 0,
    },
    deductions: {
      tax: deductions.tax || 0,
      insurance: deductions.insurance || 0,
      loan: deductions.loan || 0,
      other: deductions.other || 0,
    },
    notes: notes,
  });
  
  // Update form data when salary prop changes
  useEffect(() => {
    if (salary) {
      const empId = salary?.employee?._id || salary?.employee || salary?.teacherId || '';
      setFormData({
        employee: empId,
        designation: salary?.designation || '',
        basicSalary: salary?.basicSalary || 0,
        allowances: {
          houseRent: salary?.allowances?.houseRent || 0,
          medical: salary?.allowances?.medical || 0,
          transport: salary?.allowances?.transport || 0,
          other: salary?.allowances?.other || 0,
        },
        deductions: {
          tax: salary?.deductions?.tax || 0,
          insurance: salary?.deductions?.insurance || 0,
          loan: salary?.deductions?.loan || 0,
          other: salary?.deductions?.other || 0,
        },
        notes: salary?.notes || '',
      });
    }
  }, [salary]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      month,
      year,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{salary ? 'Edit Salary' : 'Add Salary'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
              <select
                value={formData.employee || ''}
                onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
                disabled={!!salary}
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => {
                  const subjectsText = emp.role === 'teacher' && emp.subjects && emp.subjects.length > 0
                    ? ` (${emp.subjects.map((s: any) => s.name).join(', ')})`
                    : '';
                  return (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} - {emp.role}{subjectsText}
                    </option>
                  );
                })}
              </select>
              {salary && !formData.employee && (
                <p className="text-xs text-red-600 mt-1">Employee not found in list. Please select an employee.</p>
              )}
              {formData.employee && (() => {
                const selectedEmp = employees.find(emp => emp._id === formData.employee);
                if (selectedEmp?.role === 'teacher' && selectedEmp?.subjects && selectedEmp.subjects.length > 0) {
                  return (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs font-semibold text-blue-800 mb-1">Subjects:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedEmp.subjects.map((subject: any, idx: number) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {subject.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Basic Salary</label>
              <input
                type="number"
                value={formData.basicSalary}
                onChange={(e) => setFormData({ ...formData, basicSalary: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Allowances</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">House Rent</label>
                <input
                  type="number"
                  value={formData.allowances.houseRent}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    allowances: { ...formData.allowances, houseRent: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical</label>
                <input
                  type="number"
                  value={formData.allowances.medical}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    allowances: { ...formData.allowances, medical: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transport</label>
                <input
                  type="number"
                  value={formData.allowances.transport}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    allowances: { ...formData.allowances, transport: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Other</label>
                <input
                  type="number"
                  value={formData.allowances.other}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    allowances: { ...formData.allowances, other: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Deductions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax</label>
                <input
                  type="number"
                  value={formData.deductions.tax}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    deductions: { ...formData.deductions, tax: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Insurance</label>
                <input
                  type="number"
                  value={formData.deductions.insurance}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    deductions: { ...formData.deductions, insurance: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan</label>
                <input
                  type="number"
                  value={formData.deductions.loan}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    deductions: { ...formData.deductions, loan: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Other</label>
                <input
                  type="number"
                  value={formData.deductions.other}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    deductions: { ...formData.deductions, other: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {salary ? 'Update' : 'Add'} Salary
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Generate Payroll Modal Component
const GeneratePayrollModal: React.FC<{
  employees: Employee[];
  structures: SalaryStructure[];
  teacherStructures: any[];
  month: number;
  year: number;
  onClose: () => void;
  onGenerate: (data: any) => void;
}> = ({ employees, structures, teacherStructures, month, year, onClose, onGenerate }) => {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeData, setEmployeeData] = useState<any[]>([]);

  useEffect(() => {
    // Initialize employee data - prefer teacherStructures, fallback to structures by designation
    const safeTeacherStructures = Array.isArray(teacherStructures) ? teacherStructures : [];
    const safeStructures = Array.isArray(structures) ? structures : [];
    
    const data = employees.map(emp => {
      // First try to find in teacherStructures (individual teacher salary)
      const empIdStr = String(emp._id);
      const teacherStructure = safeTeacherStructures.find(ts => 
        String(ts.teacherId || ts.employee || '') === empIdStr
      );
      
      if (teacherStructure) {
        return {
          employee: emp._id,
          designation: teacherStructure.designation || emp.role,
          basicSalary: teacherStructure.basicSalary || 0,
          allowances: teacherStructure.allowances || { houseRent: 0, medical: 0, transport: 0, other: 0 },
          deductions: { 
            ...(teacherStructure.deductions || {}),
            absence: 0 // Will be calculated during payroll generation
          },
        };
      }
      
      // Fallback to structures by designation
      const structure = safeStructures.find(s => s.designation.toLowerCase() === emp.role.toLowerCase());
      return {
        employee: emp._id,
        designation: emp.role,
        basicSalary: structure?.basicSalary || 0,
        allowances: structure?.allowances || { houseRent: 0, medical: 0, transport: 0, other: 0 },
        deductions: structure?.deductions || { tax: 0, insurance: 0, loan: 0, other: 0 },
      };
    });
    setEmployeeData(data);
    setSelectedEmployees(employees.map(e => e._id));
  }, [employees, structures, teacherStructures]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const employeesToGenerate = employeeData.filter(ed => 
      selectedEmployees.includes(ed.employee)
    );
    onGenerate({
      month,
      year,
      employees: employeesToGenerate,
    });
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Generate Payroll for {month}/{year}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setSelectedEmployees(
                selectedEmployees.length === employees.length 
                  ? [] 
                  : employees.map(e => e._id)
              )}
              className="text-blue-600 hover:text-blue-800"
            >
              {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="overflow-x-auto -mx-6 px-6 mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === employees.length}
                      onChange={() => setSelectedEmployees(
                        selectedEmployees.length === employees.length 
                          ? [] 
                          : employees.map(e => e._id)
                      )}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allowances</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deductions*</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((emp, index) => {
                  const empData = employeeData[index];
                  const totalAllowances = empData ? 
                    (Object.values(empData.allowances) as number[]).reduce((a: number, b: number) => a + b, 0) : 0;
                  const baseDeductions = empData ? 
                    (Object.values(empData.deductions) as number[]).reduce((a: number, b: number) => a + b, 0) : 0;
                  // Note: Attendance deductions (absent/half-day) will be calculated automatically for teachers
                  const netSalary = empData ? 
                    empData.basicSalary + totalAllowances - baseDeductions
                    : 0;
                  
                  return (
                    <tr key={emp._id}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp._id)}
                          onChange={() => toggleEmployee(emp._id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                        <div className="text-sm text-gray-500">{emp.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{emp.role}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₹{empData?.basicSalary?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₹{totalAllowances.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₹{baseDeductions.toFixed(2)}
                        {emp.role === 'teacher' && (
                          <div className="text-xs text-gray-500 mt-1">
                            + Attendance deductions
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ₹{netSalary.toFixed(2)}
                        {emp.role === 'teacher' && (
                          <div className="text-xs text-gray-500 mt-1">
                            (before attendance)
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> For teachers, attendance-based deductions (absent days, half-days) will be automatically calculated based on their attendance records for {month}/{year}. 
              Holidays do not cause salary deductions. The final salary will include these deductions.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedEmployees.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              Generate Payroll ({selectedEmployees.length} employees)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Salary;
