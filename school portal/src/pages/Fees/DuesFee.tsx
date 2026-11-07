import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, TrendingUp, Download, Filter, RefreshCw, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { feesAPI, studentsAPI, classroomAPI } from '../../services/api';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

interface Installment {
  _id: string;
  month?: string;
  dueAmount: number;
  dueDate: string;
  feeStructure?: string;
  feeStructureId?: string;
  installmentNumber?: number;
  paymentFrequency?: string;
  quarterMonths?: string[];
  periodMonths?: string[];
  totalAmount: number;
  paidAmount: number;
  status: string;
  type?: 'fee' | 'transport' | 'dormitory';
  chargeType?: 'one_time' | 'recurring';
}

interface StudentDues {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  email?: string;
  phone?: string;
  oneMonthDue: number;
  twoMonthDue: number;
  threeMonthDue: number;
  otherChargesDue: number;
  totalDue: number;
  lastPaymentDate?: string;
  paymentHistory: Array<{
    month: string;
    amount: number;
    date: string;
  }>;
  collections?: Installment[];
}

// Only show dues for present month and past months (exclude future installments)
const getEndOfCurrentMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
};
const isPastOrCurrentMonth = (dueDate: string | Date | undefined) => {
  if (!dueDate) return true;
  const d = new Date(dueDate);
  return d.getTime() <= getEndOfCurrentMonth().getTime();
};

const DuesFee: React.FC = () => {
  const [duesList, setDuesList] = useState<StudentDues[]>([]);
  const [filteredDues, setFilteredDues] = useState<StudentDues[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set()); // Format: "studentId-type"

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDuePeriod, setFilterDuePeriod] = useState<string>('all'); // 'all', '1', '2', '3+', 'other'
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterChargeType, setFilterChargeType] = useState<string>('all'); // 'all', 'one_time', 'recurring'
  const [sortBy, setSortBy] = useState<string>('totalDue'); // 'totalDue', 'name', 'class'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [stats, setStats] = useState({
    totalStudentsWithDues: 0,
    totalDuesAmount: 0,
    avgDuePerStudent: 0,
    criticalDues: 0, // 3+ months due
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortDues();
  }, [duesList, searchQuery, filterDuePeriod, filterClass, filterChargeType, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get academic year for the query - try multiple formats
      const currentYear = new Date().getFullYear();
      const academicYear1 = `${currentYear}-${currentYear + 1}`;
      const academicYear2 = currentYear.toString();

      try {
        // Use the getDueCollections API which already includes installment details
        // Try with the full year format first
        let dueCollectionsRes = await feesAPI.getDueCollections?.({ academicYear: academicYear1 });
        console.log('Due collections response (format 1):', dueCollectionsRes);

        // If no data, try with just the year
        if (!dueCollectionsRes?.success || !dueCollectionsRes.data || dueCollectionsRes.data.length === 0) {
          dueCollectionsRes = await feesAPI.getDueCollections?.({ academicYear: academicYear2 });
          console.log('Due collections response (format 2):', dueCollectionsRes);
        }

        if (dueCollectionsRes?.success && dueCollectionsRes.data && Array.isArray(dueCollectionsRes.data)) {
          // Debug: Log raw API response
          console.log('Raw API response:', dueCollectionsRes.data);
          dueCollectionsRes.data.forEach((studentDue: any) => {
            console.log(`Student ${studentDue.studentName}:`, {
              totalDue: studentDue.totalDue,
              collectionsCount: studentDue.collections?.length || 0,
              collections: studentDue.collections?.map((c: any) => ({
                type: c.type,
                feeStructure: c.feeStructure,
                dueAmount: c.dueAmount
              })) || []
            });
          });

          // Filter to present month and past months only (exclude future dues)
          const endOfCurrent = getEndOfCurrentMonth();
          const studentDuesList = dueCollectionsRes.data
            .map((studentDue: any) => {
              const collections = (studentDue.collections || []).filter((col: any) =>
                isPastOrCurrentMonth(col.dueDate)
              );
              const oneMonthDue = collections.reduce((s: number, c: any) => {
                const dueDate = new Date(c.dueDate);
                const monthsOverdue = Math.max(0, (endOfCurrent.getFullYear() - dueDate.getFullYear()) * 12 + (endOfCurrent.getMonth() - dueDate.getMonth()));
                const isOther = (c.chargeType || (c.month ? 'recurring' : 'one_time')) === 'one_time';
                if (isOther) return s;
                if (monthsOverdue >= 3) return s;
                if (monthsOverdue === 2) return s;
                return s + (c.dueAmount ?? 0);
              }, 0);
              const twoMonthDue = collections.reduce((s: number, c: any) => {
                const dueDate = new Date(c.dueDate);
                const monthsOverdue = Math.max(0, (endOfCurrent.getFullYear() - dueDate.getFullYear()) * 12 + (endOfCurrent.getMonth() - dueDate.getMonth()));
                const isOther = (c.chargeType || (c.month ? 'recurring' : 'one_time')) === 'one_time';
                if (isOther) return s;
                if (monthsOverdue !== 2) return s;
                return s + (c.dueAmount ?? 0);
              }, 0);
              const threeMonthDue = collections.reduce((s: number, c: any) => {
                const dueDate = new Date(c.dueDate);
                const monthsOverdue = Math.max(0, (endOfCurrent.getFullYear() - dueDate.getFullYear()) * 12 + (endOfCurrent.getMonth() - dueDate.getMonth()));
                const isOther = (c.chargeType || (c.month ? 'recurring' : 'one_time')) === 'one_time';
                if (isOther) return s;
                if (monthsOverdue < 3) return s;
                return s + (c.dueAmount ?? 0);
              }, 0);
              const otherChargesDue = collections.reduce((s: number, c: any) => {
                const isOther = (c.chargeType || (c.month ? 'recurring' : 'one_time')) === 'one_time';
                return isOther ? s + (c.dueAmount ?? 0) : s;
              }, 0);
              const totalDue = collections.reduce((s: number, c: any) => s + (c.dueAmount ?? 0), 0);
              return {
                studentId: studentDue.studentId,
                studentName: studentDue.studentName,
                admissionNumber: studentDue.admissionNumber,
                className: studentDue.className,
                email: studentDue.email,
                phone: studentDue.phone,
                oneMonthDue,
                twoMonthDue,
                threeMonthDue,
                otherChargesDue,
                totalDue,
                lastPaymentDate: studentDue.lastPaymentDate,
                paymentHistory: studentDue.paymentHistory || [],
                collections: collections.map((col: any) => ({
                  ...col,
                  type: col.type || 'fee',
                  chargeType: col.chargeType || (col.month ? 'recurring' : 'one_time')
                }))
              };
            })
            .filter((studentDue: any) => studentDue.totalDue > 0);

          console.log('Processed student dues list:', studentDuesList);
          setDuesList(studentDuesList);

          // Calculate stats
          const total = studentDuesList.reduce((sum: number, item: StudentDues) => sum + item.totalDue, 0);
          const critical = studentDuesList.filter((item: StudentDues) => item.threeMonthDue > 0).length;

          setStats({
            totalStudentsWithDues: studentDuesList.length,
            totalDuesAmount: total,
            avgDuePerStudent: studentDuesList.length > 0 ? Math.round(total / studentDuesList.length) : 0,
            criticalDues: critical,
          });

          setLoading(false);
          return;
        } else {
          console.log('No data in response or response format incorrect');
        }
      } catch (err) {
        console.error('Error loading due collections:', err);
        toast.error('Failed to load due collections. Using fallback method.');
      }

      // Fallback to old method if API doesn't work
      let allStudents: any[] = [];
      let allCollections: any[] = [];
      let allFeeStructures: any[] = [];

      try {
        // Get all students
        const studentsRes = await studentsAPI.getAll();
        if (studentsRes?.success) {
          allStudents = studentsRes.data || [];
        }

        // Get all collections
        const collectionsRes = await feesAPI.getCollections();
        if (collectionsRes?.success) {
          allCollections = collectionsRes.data || [];
        }

        // Get all fee structures
        const structuresRes = await feesAPI.getStructures();
        if (structuresRes?.success) {
          allFeeStructures = structuresRes.data || [];
        }
      } catch (err) {
        console.error('Error loading data:', err);
        toast.error('Failed to load data');
        setDuesList([]);
        return;
      }

      // Create a map to track student dues
      const studentDuesMap = new Map<string, StudentDues>();

      // Process all students - include those with NO collections
      allStudents.forEach((student: any) => {
        const studentId = student._id.toString();
        const className = student.classId
          ? (typeof student.classId === 'object'
            ? `${student.classId.name}${student.classId.section ? ' - ' + student.classId.section : ''}`
            : 'N/A')
          : 'N/A';

        // Initialize student due record
        if (!studentDuesMap.has(studentId)) {
          studentDuesMap.set(studentId, {
            studentId,
            studentName: student.name || 'Unknown',
            admissionNumber: student.admissionNumber || 'N/A',
            className,
            email: student.email,
            phone: student.phone,
            oneMonthDue: 0,
            twoMonthDue: 0,
            threeMonthDue: 0,
            otherChargesDue: 0,
            totalDue: 0,
            lastPaymentDate: undefined,
            paymentHistory: [],
          });
        }
      });

      const endOfCurrentMonth = getEndOfCurrentMonth();

      // Process collections to calculate dues (only present month and past months)
      allCollections.forEach((collection: any) => {
        const collectionStudentId = typeof collection.student === 'object'
          ? collection.student?._id?.toString()
          : collection.student?.toString();

        if (!collectionStudentId) return;

        const studentDue = studentDuesMap.get(collectionStudentId);
        if (!studentDue) return; // Skip if student not found

        const dueAmount = collection.dueAmount || 0;
        const paidAmount = collection.paidAmount || 0;
        const totalAmount = collection.totalAmount || collection.feeAmount || 0;

        // Skip if fully paid (no due amount)
        if (dueAmount <= 0) {
          return;
        }

        // Skip future dues: only show present month and past months
        const dueDate = new Date(collection.dueDate || collection.createdAt);
        if (dueDate.getTime() > endOfCurrentMonth.getTime()) return;

        // Track payment history
        if (collection.payments && Array.isArray(collection.payments) && collection.payments.length > 0) {
          collection.payments.forEach((payment: any) => {
            studentDue.paymentHistory.push({
              month: collection.month || 'N/A',
              amount: payment.amount || 0,
              date: payment.paymentDate || collection.createdAt,
            });

            // Update last payment date
            if (!studentDue.lastPaymentDate || new Date(payment.paymentDate) > new Date(studentDue.lastPaymentDate)) {
              studentDue.lastPaymentDate = payment.paymentDate || collection.createdAt;
            }
          });
        }

        // Categorize dues by months overdue (dueDate already set above)
        const now = new Date();
        const monthsOverdue = Math.max(0,
          (now.getFullYear() - dueDate.getFullYear()) * 12 +
          (now.getMonth() - dueDate.getMonth())
        );

        // Check if it's an other charge (one-time or no month)
        const isOtherCharge = collection.feeStructure
          ? (typeof collection.feeStructure === 'object'
            ? (collection.feeStructure.frequency === 'one-time' || !collection.month)
            : false)
          : !collection.month;

        if (isOtherCharge) {
          studentDue.otherChargesDue += dueAmount;
        } else {
          // Categorize by months overdue
          if (monthsOverdue >= 3) {
            studentDue.threeMonthDue += dueAmount;
          } else if (monthsOverdue === 2) {
            studentDue.twoMonthDue += dueAmount;
          } else {
            // 0-1 months or less
            studentDue.oneMonthDue += dueAmount;
          }
        }

        studentDue.totalDue += dueAmount;

        // Add to collections array for installment display
        if (!studentDue.collections) {
          studentDue.collections = [];
        }
        studentDue.collections.push({
          _id: collection._id,
          month: collection.month,
          dueAmount: dueAmount,
          dueDate: collection.dueDate,
          feeStructure: typeof collection.feeStructure === 'object'
            ? collection.feeStructure?.name
            : collection.feeStructure,
          feeStructureId: typeof collection.feeStructure === 'object'
            ? collection.feeStructure?._id
            : collection.feeStructure,
          installmentNumber: collection.installmentNumber || null,
          paymentFrequency: collection.paymentFrequency || null,
          quarterMonths: collection.quarterMonths || null,
          periodMonths: collection.periodMonths || null,
          totalAmount: totalAmount,
          paidAmount: paidAmount,
          status: collection.status || 'pending',
          type: 'fee',
          chargeType: isOtherCharge ? 'one_time' : 'recurring'
        });
      });

      // Check for students with fee structures but NO collections (completely unpaid)
      allFeeStructures.forEach((feeStructure: any) => {
        const structureClassId = typeof feeStructure.class === 'object'
          ? feeStructure.class?._id?.toString()
          : feeStructure.class?.toString();

        if (!structureClassId) return;

        // Find students in this class
        const studentsInClass = allStudents.filter((student: any) => {
          const studentClassId = typeof student.classId === 'object'
            ? student.classId?._id?.toString()
            : student.classId?.toString();
          return studentClassId === structureClassId;
        });

        studentsInClass.forEach((student: any) => {
          const studentId = student._id.toString();

          // Check if student has any collection for this fee structure
          const hasCollection = allCollections.some((col: any) => {
            const colStudentId = typeof col.student === 'object'
              ? col.student?._id?.toString()
              : col.student?.toString();
            const colStructureId = typeof col.feeStructure === 'object'
              ? col.feeStructure?._id?.toString()
              : col.feeStructure?.toString();
            const structureId = feeStructure._id.toString();

            return colStudentId === studentId && colStructureId === structureId;
          });

          // If no collection exists, the student hasn't paid for this fee structure
          if (!hasCollection) {
            const studentDue = studentDuesMap.get(studentId);
            if (studentDue) {
              const feeAmount = feeStructure.totalAmount || feeStructure.amount || 0;

              // Check if it's a one-time charge
              const isOtherCharge = feeStructure.frequency === 'one-time' || feeStructure.type === 'other';

              if (isOtherCharge) {
                studentDue.otherChargesDue += feeAmount;
              } else {
                // Regular monthly/annual fee - add to one month due
                studentDue.oneMonthDue += feeAmount;
              }

              studentDue.totalDue += feeAmount;
            }
          }
        });
      });

      // Convert map to array and filter out students with no dues
      const allDues = Array.from(studentDuesMap.values()).filter(student => student.totalDue > 0);

      setDuesList(allDues);

      // Calculate stats
      const total = allDues.reduce((sum: number, item: StudentDues) => sum + item.totalDue, 0);
      const critical = allDues.filter((item: StudentDues) => item.threeMonthDue > 0).length;

      setStats({
        totalStudentsWithDues: allDues.length,
        totalDuesAmount: total,
        avgDuePerStudent: allDues.length > 0 ? Math.round(total / allDues.length) : 0,
        criticalDues: critical,
      });
    } catch (error) {
      console.error('Error loading dues data:', error);
      toast.error('Unable to load dues information');
      setDuesList([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortDues = () => {
    let filtered = [...duesList];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.studentName.toLowerCase().includes(q) ||
          item.admissionNumber.toLowerCase().includes(q)
      );
    }

    // Due period filter
    if (filterDuePeriod !== 'all') {
      filtered = filtered.filter((item) => {
        if (filterDuePeriod === '1') return item.oneMonthDue > 0 && item.twoMonthDue === 0 && item.threeMonthDue === 0;
        if (filterDuePeriod === '2') return item.twoMonthDue > 0 && item.threeMonthDue === 0;
        if (filterDuePeriod === '3+') return item.threeMonthDue > 0;
        if (filterDuePeriod === 'other') return item.otherChargesDue > 0;
        return true;
      });
    }

    // Class filter
    if (filterClass !== 'all') {
      filtered = filtered.filter((item) => item.className === filterClass);
    }

    // Charge type filter (one-time vs recurring)
    if (filterChargeType !== 'all' && filterChargeType !== '') {
      filtered = filtered.filter((item) => {
        const collections = item.collections || [];
        if (filterChargeType === 'one_time') return collections.some((c: any) => (c.chargeType || (c.month ? 'recurring' : 'one_time')) === 'one_time');
        if (filterChargeType === 'recurring') return collections.some((c: any) => (c.chargeType || (c.month ? 'recurring' : 'one_time')) === 'recurring');
        return true;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'totalDue') return b.totalDue - a.totalDue;
      if (sortBy === 'name') return a.studentName.localeCompare(b.studentName);
      if (sortBy === 'class') return a.className.localeCompare(b.className);
      return 0;
    });

    setFilteredDues(filtered);
  };

  const getDueStatus = (item: StudentDues) => {
    if (item.threeMonthDue > 0) return { label: '3+ Months Due', color: 'text-red-700 bg-red-100' };
    if (item.twoMonthDue > 0) return { label: '2 Months Due', color: 'text-orange-700 bg-orange-100' };
    if (item.oneMonthDue > 0) return { label: '1 Month Due', color: 'text-yellow-700 bg-yellow-100' };
    return { label: 'Current', color: 'text-green-700 bg-green-100' };
  };

  const exportDuesReport = () => {
    try {
      const csvContent = [
        ['Student Name', 'Admission No', 'Class', '1 Month Due', '2 Months Due', '3+ Months Due', 'Other Charges', 'Total Due'],
        ...filteredDues.map((item) => [
          item.studentName,
          item.admissionNumber,
          item.className,
          item.oneMonthDue,
          item.twoMonthDue,
          item.threeMonthDue,
          item.otherChargesDue,
          item.totalDue,
        ]),
      ]
        .map((row) => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dues-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  // Installment Card Component
  const InstallmentCard = ({ installment }: { installment: Installment }) => {
    const installmentLabel = installment.month
      ? new Date(installment.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : installment.installmentNumber
        ? `Installment ${installment.installmentNumber}`
        : 'Installment';

    const frequencyLabel = installment.paymentFrequency
      ? installment.paymentFrequency === 'monthly' ? 'Monthly'
        : installment.paymentFrequency === 'quarterly' ? 'Quarterly'
          : 'Custom'
      : '';

    const coversMonths = installment.quarterMonths || installment.periodMonths || [];

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="font-medium text-gray-900">{installmentLabel}</div>
              <span className={`px-2 py-0.5 text-xs rounded-full ${(installment as any).chargeType === 'one_time' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                {(installment as any).chargeType === 'one_time' ? 'One-time' : 'Recurring'}
              </span>
              {frequencyLabel && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                  {frequencyLabel}
                </span>
              )}
              {installment.installmentNumber && (
                <span className="text-xs text-gray-500">
                  (#{installment.installmentNumber})
                </span>
              )}
            </div>

            {installment.feeStructure && (
              <div className="text-sm text-gray-600 mb-1">
                {installment.feeStructure}
              </div>
            )}

            {coversMonths.length > 0 && (
              <div className="text-xs text-gray-500 mb-1">
                Covers: {coversMonths.map((m: string) =>
                  new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })
                ).join(', ')}
              </div>
            )}

            <div className="text-xs text-gray-500">
              Due: {installment.dueDate ? new Date(installment.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            </div>
          </div>

          <div className="text-right ml-4">
            <div className="text-xs text-gray-600">Amount: ₹{(installment.totalAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-green-600">Paid: ₹{(installment.paidAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="text-lg font-bold text-red-600 mt-1">
              Due: ₹{(installment.dueAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${installment.status === 'paid' ? 'bg-green-100 text-green-800' :
              installment.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                installment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
              }`}>
              {installment.status || 'pending'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const sendReminder = async (studentId: string, dueType: string) => {
    try {
      // Get all collections for this student first
      const collectionsRes = await feesAPI.getCollections?.({ studentId });
      if (collectionsRes?.success && collectionsRes.data && collectionsRes.data.length > 0) {
        // Send reminder for the first pending/partial collection
        const pendingCollection = collectionsRes.data.find((c: any) =>
          c.status === 'pending' || c.status === 'partial' || c.status === 'overdue'
        );

        if (pendingCollection && pendingCollection._id) {
          const response = await feesAPI.sendReminder(pendingCollection._id, dueType);
          if (response?.success) {
            toast.success('Reminder sent successfully');
          } else {
            toast.error('Failed to send reminder');
          }
        } else {
          toast.error('No pending dues found for this student');
        }
      } else {
        toast.error('No collection found for this student');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Due Fees</h2>
          <p className="text-gray-600 text-sm mt-1">View installments with outstanding dues (present month and past months only)</p>
          <p className="text-xs text-gray-500 mt-1">Future installments are not shown. Each row shows the remaining due amount.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={exportDuesReport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students with Dues</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalStudentsWithDues}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Dues Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">₹{stats.totalDuesAmount.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Due per Student</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">₹{stats.avgDuePerStudent.toLocaleString()}</p>
            </div>
            <Filter className="h-8 w-8 text-orange-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical (3+ Months)</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{stats.criticalDues}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Name or admission no..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 pl-10 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Period</label>
            <select
              value={filterDuePeriod}
              onChange={(e) => setFilterDuePeriod(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Periods</option>
              <option value="1">1 Month Due</option>
              <option value="2">2 Months Due</option>
              <option value="3+">3+ Months Due</option>
              <option value="other">Other Charges</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Charge type</label>
            <select
              value={filterChargeType}
              onChange={(e) => setFilterChargeType(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="one_time">One-time only</option>
              <option value="recurring">Recurring only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="totalDue">Total Due (Highest)</option>
              <option value="name">Student Name</option>
              <option value="class">Class</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm font-medium text-blue-800 w-full">
              {filteredDues.length} student(s)
            </div>
          </div>
        </div>
      </div>

      {/* Students List with Expandable Installments */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="divide-y">
          {filteredDues.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No students with dues found
            </div>
          ) : (
            filteredDues
              .slice((page - 1) * pageSize, page * pageSize)
              .map((item) => {
              const installments = item.collections || [];
              const isExpanded = expandedStudents.has(item.studentId);

              // Debug: Log all installments to see what we have
              console.log(`Student ${item.studentName} - All installments:`, installments.map((inst: any) => ({
                id: inst._id,
                type: inst.type,
                feeStructure: inst.feeStructure,
                dueAmount: inst.dueAmount
              })));

              // Group installments by type - default to regular fee unless explicitly transport/dormitory
              const feeInstallments = installments.filter((inst: any) => {
                // Explicitly exclude transport and dormitory
                if (inst.type === 'transport' || inst.type === 'dormitory') return false;
                if (inst.feeStructure === 'Transport Fee' || inst.feeStructure === 'Dormitory Fee') return false;
                if (inst.studentTransport || inst.studentDormitory) return false;
                // Everything else is a regular fee (including type === 'fee' or type === undefined)
                return true;
              });

              const transportInstallments = installments.filter((inst: any) => {
                return inst.type === 'transport' || inst.feeStructure === 'Transport Fee' || inst.studentTransport;
              });

              const dormitoryInstallments = installments.filter((inst: any) => {
                return inst.type === 'dormitory' || inst.feeStructure === 'Dormitory Fee' || inst.studentDormitory;
              });

              // Debug: Log filtered results
              console.log(`Student ${item.studentName} - Filtered:`, {
                fee: feeInstallments.length,
                transport: transportInstallments.length,
                dormitory: dormitoryInstallments.length
              });

              // Calculate totals by type
              const feeTotal = feeInstallments.reduce((sum: number, inst: Installment) => sum + (inst.dueAmount || 0), 0);
              const transportTotal = transportInstallments.reduce((sum: number, inst: Installment) => sum + (inst.dueAmount || 0), 0);
              const dormitoryTotal = dormitoryInstallments.reduce((sum: number, inst: Installment) => sum + (inst.dueAmount || 0), 0);

              return (
                <div key={item.studentId}>
                  {/* Student Row - Clickable to expand */}
                  <div
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => {
                      const newExpanded = new Set(expandedStudents);
                      if (isExpanded) {
                        newExpanded.delete(item.studentId);
                      } else {
                        newExpanded.add(item.studentId);
                      }
                      setExpandedStudents(newExpanded);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">{item.studentName}</div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {item.admissionNumber} • {item.className}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const text = `Hello ${item.studentName}, a gentle reminder that you have total pending dues of ₹${item.totalDue}. Please clear them soon.`;
                            window.open(getWhatsAppUrl(item.phone, text), '_blank');
                          }}
                          className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-full transition hidden sm:block"
                          title="Send WhatsApp Reminder"
                        >
                          <MessageCircle className="h-5 w-5" />
                        </button>
                        <div>
                          <div className="text-sm text-gray-600">Total Due</div>
                          <div className="text-xl font-bold text-red-600">
                            ₹{item.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Installments by Type */}
                  {isExpanded && installments.length > 0 && (
                    <div className="bg-gray-50 px-6 py-4 border-t">
                      <div className="space-y-4">
                        {/* Regular Fees Section */}
                        {feeInstallments.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div
                              className="px-4 py-3 bg-blue-50 border-b border-gray-200 cursor-pointer hover:bg-blue-100 transition flex justify-between items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                const typeKey = `${item.studentId}-fee`;
                                const newExpanded = new Set(expandedTypes);
                                if (expandedTypes.has(typeKey)) {
                                  newExpanded.delete(typeKey);
                                } else {
                                  newExpanded.add(typeKey);
                                }
                                setExpandedTypes(newExpanded);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {expandedTypes.has(`${item.studentId}-fee`) ? (
                                  <ChevronUp className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-blue-600" />
                                )}
                                <span className="font-semibold text-blue-900">Regular Fees</span>
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                  {feeInstallments.length} installment{feeInstallments.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-red-600">
                                  ₹{feeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-gray-500">Due</div>
                              </div>
                            </div>
                            {expandedTypes.has(`${item.studentId}-fee`) && (
                              <div className="p-4 space-y-3">
                                {feeInstallments.map((installment: Installment) => (
                                  <InstallmentCard key={installment._id} installment={installment} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Transport Fees Section */}
                        {transportInstallments.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div
                              className="px-4 py-3 bg-green-50 border-b border-gray-200 cursor-pointer hover:bg-green-100 transition flex justify-between items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                const typeKey = `${item.studentId}-transport`;
                                const newExpanded = new Set(expandedTypes);
                                if (expandedTypes.has(typeKey)) {
                                  newExpanded.delete(typeKey);
                                } else {
                                  newExpanded.add(typeKey);
                                }
                                setExpandedTypes(newExpanded);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {expandedTypes.has(`${item.studentId}-transport`) ? (
                                  <ChevronUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-green-600" />
                                )}
                                <span className="font-semibold text-green-900">Transport Fees</span>
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                  {transportInstallments.length} installment{transportInstallments.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-red-600">
                                  ₹{transportTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-gray-500">Due</div>
                              </div>
                            </div>
                            {expandedTypes.has(`${item.studentId}-transport`) && (
                              <div className="p-4 space-y-3">
                                {transportInstallments.map((installment: Installment) => (
                                  <InstallmentCard key={installment._id} installment={installment} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Dormitory Fees Section */}
                        {dormitoryInstallments.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div
                              className="px-4 py-3 bg-purple-50 border-b border-gray-200 cursor-pointer hover:bg-purple-100 transition flex justify-between items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                const typeKey = `${item.studentId}-dormitory`;
                                const newExpanded = new Set(expandedTypes);
                                if (expandedTypes.has(typeKey)) {
                                  newExpanded.delete(typeKey);
                                } else {
                                  newExpanded.add(typeKey);
                                }
                                setExpandedTypes(newExpanded);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {expandedTypes.has(`${item.studentId}-dormitory`) ? (
                                  <ChevronUp className="h-4 w-4 text-purple-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-purple-600" />
                                )}
                                <span className="font-semibold text-purple-900">Dormitory Fees</span>
                                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                                  {dormitoryInstallments.length} installment{dormitoryInstallments.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-red-600">
                                  ₹{dormitoryTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-gray-500">Due</div>
                              </div>
                            </div>
                            {expandedTypes.has(`${item.studentId}-dormitory`) && (
                              <div className="p-4 space-y-3">
                                {dormitoryInstallments.map((installment: Installment) => (
                                  <InstallmentCard key={installment._id} installment={installment} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        {filteredDues.length > 0 && (
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={filteredDues.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* Legend/Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
        <h4 className="font-semibold text-gray-900 mb-2">Understanding Dues Categories:</h4>
        <ul className="space-y-1 text-xs">
          <li><strong>1 Month Due:</strong> Fee is 1 month overdue</li>
          <li><strong>2 Months Due:</strong> Fee is 2 months overdue</li>
          <li><strong>3+ Months Due:</strong> Fee is 3 or more months overdue (Critical)</li>
          <li><strong>Other Charges:</strong> Additional charges beyond monthly fees (transport, activities, etc.)</li>
        </ul>
      </div>
    </div>
  );
};

export default DuesFee;
