import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Download, Filter } from 'lucide-react';
import { feesAPI, classroomAPI, transportAPI, dormitoryAPI, studentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

interface FeeReport {
  _id: string;
  className: string;
  totalStudents: number;
  totalDue: number;
  totalCollected: number;
  transportCollected: number;
  transportDue: number;
  dormitoryCollected: number;
  dormitoryDue: number;
  totalWithTransportCollected: number;
  totalWithTransportDue: number;
  totalWithDormitoryCollected: number;
  totalWithDormitoryDue: number;
  collectionPercentage: number;
  pendingCount: number;
}

interface MonthlyData {
  month: string;
  collected: number;
  due: number;
}

// Only count dues for present month and past months (exclude future installments)
const getEndOfCurrentMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
};
const isPastOrCurrentMonth = (dueDate: string | Date | undefined) => {
  if (!dueDate) return true;
  return new Date(dueDate).getTime() <= getEndOfCurrentMonth().getTime();
};

const FeeReports: React.FC = () => {
  const [reports, setReports] = useState<FeeReport[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [classes, setClasses] = useState<any[]>([]);
  const [filterChargeType, setFilterChargeType] = useState<string>('all'); // all | one_time | recurring
  const [filterMandatoryOnly, setFilterMandatoryOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [totals, setTotals] = useState({
    totalCollected: 0,
    totalDue: 0,
    totalStudents: 0,
    collectPercentage: 0,
    transportCollected: 0,
    transportDue: 0,
    dormitoryCollected: 0,
    dormitoryDue: 0,
    totalWithTransportCollected: 0,
    totalWithTransportDue: 0,
    totalWithDormitoryCollected: 0,
    totalWithDormitoryDue: 0,
  });

  useEffect(() => {
    loadData();
  }, [selectedClass]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const schoolId = localStorage.getItem('schoolId') || '';
      let collectionsData: any[] = [];
      let classesData: any[] = [];
      let studentsData: any[] = [];
      let duesData: any[] = [];
      let transportsData: any[] = [];
      let dormitoriesData: any[] = [];
      
      // Get current academic year (assuming 2024-2025 format)
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      
      // Get classes
      try {
        const classesRes = await classroomAPI.getClasses?.();
        if (classesRes?.success) {
          classesData = classesRes.data || [];
          setClasses(classesData);
        }
      } catch (err) {
        console.warn('Failed to load classes:', err);
      }
      
      // Get students to count them by class
      try {
        const studentsRes = await studentsAPI.getAll?.();
        if (studentsRes?.success) {
          studentsData = studentsRes.data || [];
        }
      } catch (err) {
        console.warn('Failed to load students:', err);
      }
      
      // Get transport data
      try {
        if (schoolId) {
          const transportsRes = await transportAPI.getStudentsForFeeManagement(schoolId);
          if (transportsRes?.success) {
            transportsData = transportsRes.data || [];
          }
        }
      } catch (err) {
        console.warn('Failed to load transport data:', err);
      }
      
      // Get dormitory data
      try {
        if (schoolId) {
          const dormitoriesRes = await dormitoryAPI.getStudentsForFeeManagement(schoolId);
          if (dormitoriesRes?.success) {
            dormitoriesData = dormitoriesRes.data || [];
          }
        }
      } catch (err) {
        console.warn('Failed to load dormitory data:', err);
      }
      
      // Get collections - get ALL collections, not filtered by academic year
      // This ensures we see all fee collections regardless of academic year
      try {
        const collectionsRes = await feesAPI.getCollections?.();
        if (collectionsRes?.success) {
          collectionsData = collectionsRes.data || [];
          
          // If academic year filter is needed, apply it here
          // But we'll include all collections to get accurate totals
          if (collectionsData.length > 0) {
            // Ensure all collections have proper data structure
            collectionsData = collectionsData.map((col: any) => ({
              ...col,
              paidAmount: col.paidAmount || 0,
              totalAmount: col.totalAmount || col.feeAmount || 0,
              dueAmount: col.dueAmount || ((col.totalAmount || col.feeAmount || 0) - (col.paidAmount || 0)),
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to load collections:', err);
        toast.error('Failed to load fee collections');
      }
      
      // Get due collections (requires academicYear parameter)
      try {
        const dueRes = await feesAPI.getDueCollections?.({ academicYear });
        if (dueRes?.success) {
          duesData = dueRes.data || [];
        }
      } catch (err) {
        console.warn('Failed to load due collections:', err);
      }

      // Ensure transportsData and dormitoriesData are always arrays
      if (!transportsData) {
        transportsData = [];
      }
      if (!dormitoriesData) {
        dormitoriesData = [];
      }

      if (collectionsData.length > 0 || duesData.length > 0 || transportsData.length > 0 || dormitoriesData.length > 0) {
        const collections = collectionsData || [];
        const dues = duesData || [];

        // Calculate class-wise reports
        const reportMap = new Map<string, FeeReport>();

        // Count students by class
        const studentsByClass = new Map<string, number>();
        (studentsData || []).forEach((student: any) => {
          const studentClassId = typeof student.classId === 'object' 
            ? student.classId?._id?.toString() 
            : student.classId?.toString();
          
          if (studentClassId) {
            studentsByClass.set(studentClassId, (studentsByClass.get(studentClassId) || 0) + 1);
          }
        });

        // Initialize with all classes
        (classesData || []).forEach((cls: any) => {
          const classId = cls._id?.toString();
          const studentCount = studentsByClass.get(classId) || 0;
          
          reportMap.set(classId, {
            _id: classId,
            className: cls.name,
            totalStudents: studentCount,
            totalDue: 0,
            totalCollected: 0,
            transportCollected: 0,
            transportDue: 0,
            dormitoryCollected: 0,
            dormitoryDue: 0,
            totalWithTransportCollected: 0,
            totalWithTransportDue: 0,
            totalWithDormitoryCollected: 0,
            totalWithDormitoryDue: 0,
            collectionPercentage: 0,
            pendingCount: 0,
          });
        });

        // Add collection data - use paidAmount from fee collections
        collections.forEach((col: any) => {
          // Get class from student in collection (most common case)
          let studentClassId = null;
          if (typeof col.student === 'object' && col.student) {
            if (typeof col.student.classId === 'object') {
              studentClassId = col.student.classId?._id || col.student.classId?._id;
            } else if (typeof col.student.classId === 'string') {
              studentClassId = col.student.classId;
            }
          }
          
          // Also check if collection has classId directly
          let classId = null;
          if (col.classId) {
            if (typeof col.classId === 'object') {
              classId = col.classId._id || col.classId._id;
            } else {
              classId = col.classId;
            }
          }
          
          // Use student's classId if collection doesn't have one
          classId = classId || studentClassId;
          
          if (classId) {
            const report = reportMap.get(classId);
            if (report) {
              // Use paidAmount from fee collection (sum of all payments)
              const collected = col.paidAmount || 0;
              report.totalCollected += collected;
              
              // Only count due for present month and past months (exclude future installments)
              const dueAmount = col.dueAmount || 0;
              const calculatedDue = dueAmount > 0 ? dueAmount : ((col.totalAmount || col.feeAmount || 0) - collected);
              if (calculatedDue > 0 && isPastOrCurrentMonth(col.dueDate)) {
                report.totalDue += calculatedDue;
              }
              
              if ((col.status === 'pending' || col.status === 'partial') && isPastOrCurrentMonth(col.dueDate)) {
                report.pendingCount += 1;
              }
            }
          }
        });

        // Note: Due amounts are now calculated from collections directly above
        // The dues array from getDueCollections is aggregated by student and doesn't have classId
        // So we skip processing it here to avoid double-counting or incorrect mapping

        // Add transport fee data
        transportsData.forEach((transport: any) => {
          // Get class from student
          let studentClassId = null;
          if (typeof transport.studentId === 'object' && transport.studentId) {
            if (typeof transport.studentId.classId === 'object') {
              studentClassId = transport.studentId.classId?._id;
            } else if (typeof transport.studentId.classId === 'string') {
              studentClassId = transport.studentId.classId;
            }
          }
          
          if (studentClassId && transport.status === 'active') {
            const report = reportMap.get(studentClassId);
            if (report) {
              const transportPaid = transport.paidAmount || 0;
              const transportDue = transport.dueAmount || (transport.monthlyFee - transportPaid);
              
              report.transportCollected += transportPaid;
              report.transportDue += transportDue;
              
              if (transport.feeStatus === 'pending' || transport.feeStatus === 'partial') {
                report.pendingCount += 1;
              }
            }
          }
        });

        // Add dormitory fee data
        dormitoriesData.forEach((dormitory: any) => {
          // Get class from student
          let studentClassId = null;
          if (typeof dormitory.studentId === 'object' && dormitory.studentId) {
            if (typeof dormitory.studentId.classId === 'object') {
              studentClassId = dormitory.studentId.classId?._id;
            } else if (typeof dormitory.studentId.classId === 'string') {
              studentClassId = dormitory.studentId.classId;
            }
          }
          
          if (studentClassId && dormitory.status === 'active') {
            const report = reportMap.get(studentClassId);
          if (report) {
              const dormitoryPaid = dormitory.paidAmount || 0;
              const dormitoryDue = dormitory.dueAmount || (dormitory.monthlyFee - dormitoryPaid);
              
              report.dormitoryCollected += dormitoryPaid;
              report.dormitoryDue += dormitoryDue;
              
              if (dormitory.feeStatus === 'pending' || dormitory.feeStatus === 'partial') {
              report.pendingCount += 1;
              }
            }
          }
        });

        // Calculate totals with transport, dormitory and percentages
        reportMap.forEach((report) => {
          report.totalWithTransportCollected = report.totalCollected + report.transportCollected;
          report.totalWithTransportDue = report.totalDue + report.transportDue;
          report.totalWithDormitoryCollected = report.totalCollected + report.dormitoryCollected;
          report.totalWithDormitoryDue = report.totalDue + report.dormitoryDue;
          const total = report.totalWithTransportCollected + report.totalWithTransportDue + report.totalWithDormitoryCollected + report.totalWithDormitoryDue;
          if (total > 0) {
            report.collectionPercentage = Math.round(((report.totalWithTransportCollected + report.totalWithDormitoryCollected) / total) * 100);
          }
        });

        let reportsArray = Array.from(reportMap.values());

        // Filter by selected class
        if (selectedClass !== 'all') {
          reportsArray = reportsArray.filter(r => r._id === selectedClass);
        }

        setReports(reportsArray);

        // Calculate totals
        const totalCollected = reportsArray.reduce((sum, r) => sum + r.totalCollected, 0);
        const totalDue = reportsArray.reduce((sum, r) => sum + r.totalDue, 0);
        const transportCollected = reportsArray.reduce((sum, r) => sum + r.transportCollected, 0);
        const transportDue = reportsArray.reduce((sum, r) => sum + r.transportDue, 0);
        const dormitoryCollected = reportsArray.reduce((sum, r) => sum + r.dormitoryCollected, 0);
        const dormitoryDue = reportsArray.reduce((sum, r) => sum + r.dormitoryDue, 0);
        const totalWithTransportCollected = totalCollected + transportCollected;
        const totalWithTransportDue = totalDue + transportDue;
        const totalWithDormitoryCollected = totalCollected + dormitoryCollected;
        const totalWithDormitoryDue = totalDue + dormitoryDue;
        
        // Count unique students who have paid fees (either school fees, transport fees, or dormitory fees)
        const studentsWithFees = new Set<string>();
        collections.forEach((col: any) => {
          const studentId = typeof col.student === 'object' ? col.student?._id : col.student;
          if (studentId && col.paidAmount > 0) {
            studentsWithFees.add(studentId.toString());
          }
        });
        transportsData.forEach((transport: any) => {
          const studentId = typeof transport.studentId === 'object' ? transport.studentId?._id : transport.studentId;
          if (studentId && transport.paidAmount > 0) {
            studentsWithFees.add(studentId.toString());
          }
        });
        dormitoriesData.forEach((dormitory: any) => {
          const studentId = typeof dormitory.studentId === 'object' ? dormitory.studentId?._id : dormitory.studentId;
          if (studentId && dormitory.paidAmount > 0) {
            studentsWithFees.add(studentId.toString());
          }
        });
        
        const totalStudents = studentsWithFees.size || reportsArray.reduce((sum, r) => sum + r.totalStudents, 0);
        const grandTotalCollected = totalCollected + transportCollected + dormitoryCollected;
        const grandTotalDue = totalDue + transportDue + dormitoryDue;
        const collectPercentage = grandTotalCollected + grandTotalDue > 0 
          ? Math.round((grandTotalCollected / (grandTotalCollected + grandTotalDue)) * 100) 
          : 0;

        setTotals({
          totalCollected,
          totalDue,
          totalStudents,
          collectPercentage,
          transportCollected,
          transportDue,
          dormitoryCollected,
          dormitoryDue,
          totalWithTransportCollected,
          totalWithTransportDue,
          totalWithDormitoryCollected,
          totalWithDormitoryDue,
        });

        // Generate monthly data (mock data for now)
        generateMonthlyData(collections, dues, transportsData, dormitoriesData);
      } else {
        setReports([]);
        setTotals({
          totalCollected: 0,
          totalDue: 0,
          totalStudents: 0,
          collectPercentage: 0,
          transportCollected: 0,
          transportDue: 0,
          dormitoryCollected: 0,
          dormitoryDue: 0,
          totalWithTransportCollected: 0,
          totalWithTransportDue: 0,
          totalWithDormitoryCollected: 0,
          totalWithDormitoryDue: 0,
        });
        setMonthlyData([]);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Unable to load fee reports');
      setReports([]);
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (collections: any[], dues: any[], transportsData: any[] = [], dormitoriesData: any[] = []) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = new Map<string, { collected: number; due: number }>();

    months.forEach(month => {
      monthlyMap.set(month, { collected: 0, due: 0 });
    });

    // Add collections by month - use paidAmount from fee collections
    collections.forEach((col: any) => {
      // Use payment dates if available, otherwise use collection date
      if (col.payments && Array.isArray(col.payments) && col.payments.length > 0) {
        // Sum payments by month
        col.payments.forEach((payment: any) => {
          const date = new Date(payment.paymentDate);
          const month = months[date.getMonth()];
          const data = monthlyMap.get(month);
          if (data) {
            data.collected += payment.amount || 0;
          }
        });
      } else {
        // Fallback to collection date and paidAmount
        const date = new Date(col.collectionDate || col.createdAt || col.paymentDate);
        const month = months[date.getMonth()];
        const data = monthlyMap.get(month);
        if (data) {
          data.collected += col.paidAmount || col.amount || 0;
        }
      }
    });

    // Add transport payments by month
    transportsData.forEach((transport: any) => {
      if (transport.paymentHistory && Array.isArray(transport.paymentHistory) && transport.paymentHistory.length > 0) {
        transport.paymentHistory.forEach((payment: any) => {
          const date = new Date(payment.paymentDate);
          const month = months[date.getMonth()];
          const data = monthlyMap.get(month);
          if (data) {
            data.collected += payment.amount || 0;
          }
        });
      }
    });

    // Add dues by month
    dues.forEach((due: any) => {
      const date = new Date(due.dueDate || due.createdAt);
      const month = months[date.getMonth()];
      const data = monthlyMap.get(month);
      if (data) {
        data.due += due.amount || 0;
      }
    });

    // Add dormitory payments by month
    dormitoriesData.forEach((dormitory: any) => {
      if (dormitory.paymentHistory && Array.isArray(dormitory.paymentHistory) && dormitory.paymentHistory.length > 0) {
        dormitory.paymentHistory.forEach((payment: any) => {
          const date = new Date(payment.paymentDate);
          const month = months[date.getMonth()];
          const data = monthlyMap.get(month);
          if (data) {
            data.collected += payment.amount || 0;
          }
        });
      }
    });

    // Add transport dues by month (use monthly fee as due if not paid)
    transportsData.forEach((transport: any) => {
      if (transport.status === 'active' && transport.dueAmount > 0) {
        const date = new Date();
        const month = months[date.getMonth()];
        const data = monthlyMap.get(month);
        if (data) {
          data.due += transport.dueAmount || 0;
        }
      }
    });

    // Add dormitory dues by month (use monthly fee as due if not paid)
    dormitoriesData.forEach((dormitory: any) => {
      if (dormitory.status === 'active' && dormitory.dueAmount > 0) {
        const date = new Date();
        const month = months[date.getMonth()];
        const data = monthlyMap.get(month);
        if (data) {
          data.due += dormitory.dueAmount || 0;
        }
      }
    });

    const monthlyArray: MonthlyData[] = months.map(month => ({
      month,
      ...monthlyMap.get(month)!,
    }));

    setMonthlyData(monthlyArray);
  };

  const handleExportReport = () => {
    const csvContent = [
      ['Fee Collection Report'],
      ['Generated on', new Date().toLocaleDateString()],
      [],
      ['Summary'],
      ['Total Students (with fees paid)', totals.totalStudents],
      ['School Fees Collected', `₹${totals.totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['School Fees Due', `₹${totals.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Transport Fees Collected', `₹${totals.transportCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Transport Fees Due', `₹${totals.transportDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Dormitory Fees Collected', `₹${totals.dormitoryCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Dormitory Fees Due', `₹${totals.dormitoryDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Total Collected (Fees + Transport + Dormitory)', `₹${(totals.totalCollected + totals.transportCollected + totals.dormitoryCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Total Due (Fees + Transport + Dormitory)', `₹${(totals.totalDue + totals.transportDue + totals.dormitoryDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ['Collection %', `${totals.collectPercentage}%`],
      [],
      ['Class-wise Details'],
      ['Class Name', 'Total Students', 'Fees Collected', 'Fees Due', 'Transport Collected', 'Transport Due', 'Dormitory Collected', 'Dormitory Due', 'Total Collected', 'Total Due', 'Collection %', 'Pending'],
      ...reports.map(r => [
        r.className,
        r.totalStudents,
        `₹${r.totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `₹${r.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `₹${r.transportCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `₹${r.transportDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `₹${r.dormitoryCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `₹${r.dormitoryDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `₹${(r.totalCollected + r.transportCollected + r.dormitoryCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `₹${(r.totalDue + r.transportDue + r.dormitoryDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `${r.collectionPercentage}%`,
        r.pendingCount,
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `fee-report-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success('Report exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fee Reports</h2>
          <p className="text-gray-600 text-sm mt-1">Monitor fee collection and outstanding dues</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            disabled={loading}
          >
            <Filter className="h-4 w-4" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={handleExportReport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totals.totalStudents}</p>
              <p className="text-xs text-gray-500 mt-1">With fees paid</p>
            </div>
            <Users className="h-8 w-8 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Collected</p>
              <p className="text-2xl font-bold text-green-600 mt-1">₹{(totals.totalCollected + totals.transportCollected + totals.dormitoryCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-500 mt-1">
                Fees: ₹{totals.totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | 
                Transport: ₹{totals.transportCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | 
                Dormitory: ₹{totals.dormitoryCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Due</p>
              <p className="text-2xl font-bold text-red-600 mt-1">₹{(totals.totalDue + totals.transportDue + totals.dormitoryDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-gray-500 mt-1">
                Fees: ₹{totals.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | 
                Transport: ₹{totals.transportDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | 
                Dormitory: ₹{totals.dormitoryDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Collection Rate</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{totals.collectPercentage}%</p>
              <p className="text-xs text-gray-500 mt-1">Including transport & dormitory</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Filter className="h-4 w-4 text-gray-600" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
          <select
            value={filterChargeType}
            onChange={(e) => setFilterChargeType(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
            title="Filter by charge type when report data includes it"
          >
            <option value="all">All charge types</option>
            <option value="one_time">One-time only</option>
            <option value="recurring">Recurring only</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filterMandatoryOnly}
              onChange={(e) => setFilterMandatoryOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            Mandatory only
          </label>
        </div>
      </div>

      {/* Class-wise Report Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">Class-wise Collection Status</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Class</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700">Total Students</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Fees Collected</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Fees Due</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Transport Collected</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Transport Due</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Dormitory Collected</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Dormitory Due</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Total Collected</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Total Due</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700">Collection %</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700">Pending</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              reports
                .slice((page - 1) * pageSize, page * pageSize)
                .map((report) => (
                <tr key={report._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{report.className}</td>
                  <td className="px-6 py-4 text-center text-gray-600">{report.totalStudents}</td>
                  <td className="px-6 py-4 text-right font-medium text-green-600">₹{report.totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right font-medium text-red-600">₹{report.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right font-medium text-green-600">₹{report.transportCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right font-medium text-red-600">₹{report.transportDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right font-medium text-green-600">₹{report.dormitoryCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right font-medium text-red-600">₹{report.dormitoryDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-700">₹{(report.totalCollected + report.transportCollected + report.dormitoryCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-700">₹{(report.totalDue + report.transportDue + report.dormitoryDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-12 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${report.collectionPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 min-w-fit">{report.collectionPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">{report.pendingCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {reports.length > 0 && (
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={reports.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* Transport Fees Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Transport Fees Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-medium">Total Transport Fees</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              ₹{(totals.transportCollected + totals.transportDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-medium">Transport Fees Collected</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              ₹{totals.transportCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-medium">Transport Fees Due</p>
            <p className="text-xl font-bold text-red-600 mt-1">
              ₹{totals.transportDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <p>
            <strong>Note:</strong> Transport fees are shown separately and also included in the total collected/due amounts above.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Dormitory Fees Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-medium">Total Dormitory Fees</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              ₹{(totals.dormitoryCollected + totals.dormitoryDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-medium">Dormitory Fees Collected</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              ₹{totals.dormitoryCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-medium">Dormitory Fees Due</p>
            <p className="text-xl font-bold text-red-600 mt-1">
              ₹{totals.dormitoryDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <p>
            <strong>Note:</strong> Dormitory fees are shown separately and also included in the total collected/due amounts above.
          </p>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="font-bold text-gray-900 mb-4">Monthly Trend (Fees + Transport)</h3>
        <div className="grid grid-cols-12 gap-2">
          {monthlyData.map((data, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className="flex gap-1 h-32 items-end">
                <div
                  className="w-2 bg-green-500 rounded-t"
                  style={{ height: `${(data.collected / 100000) * 100}%`, minHeight: '4px' }}
                  title={`Collected: ₹${data.collected}`}
                />
                <div
                  className="w-2 bg-red-500 rounded-t"
                  style={{ height: `${(data.due / 100000) * 100}%`, minHeight: '4px' }}
                  title={`Due: ₹${data.due}`}
                />
              </div>
              <p className="text-xs text-gray-600 font-medium">{data.month}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-sm text-gray-600">Collected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-sm text-gray-600">Due</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeReports;
