import React, { useState, useEffect, useMemo } from 'react';
import { Home, Edit, Save, X, Search, DollarSign } from 'lucide-react';
import { dormitoryAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

interface StudentDormitory {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    rollNumber: string;
    admissionNumber?: string;
    classId?: {
      _id: string;
      name: string;
      section?: string;
    };
  };
  dormitoryId: {
    _id: string;
    name: string;
    capacity?: number;
  };
  roomNumber: string;
  bedNumber?: string;
  monthlyFee: number;
  paidAmount?: number;
  dueAmount?: number;
  feeStatus: 'paid' | 'pending' | 'partial' | 'overdue';
  status: 'active' | 'inactive' | 'suspended';
  paymentHistory?: Array<{
    amount: number;
    paymentDate: Date | string;
    paymentMethod: string;
    transactionId?: string;
    remarks?: string;
  }>;
}

const DormitoryFees: React.FC = () => {
  const [dormitories, setDormitories] = useState<StudentDormitory[]>([]);
  const [dormitoryCollections, setDormitoryCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDormitory, setFilterDormitory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState<number>(0);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkFeeUpdates, setBulkFeeUpdates] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Installment generation state
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedDormitory, setSelectedDormitory] = useState<StudentDormitory | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodTotalAmount, setPeriodTotalAmount] = useState<number>(0);
  const [paymentFrequency, setPaymentFrequency] = useState<string>('monthly');
  const [customPeriodMonths, setCustomPeriodMonths] = useState<number>(1);
  const [dueDay, setDueDay] = useState<number>(1);
  const [generatedInstallments, setGeneratedInstallments] = useState<any[]>([]);
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

  useEffect(() => {
    loadDormitories();
  }, []);

  const loadDormitories = async () => {
    try {
      setLoading(true);
      const schoolId = localStorage.getItem('schoolId') || '';
      if (!schoolId) {
        toast.error('School ID not found. Please login again.');
        setLoading(false);
        return;
      }
      
      const currentYear = new Date().getFullYear();
      const academicYearStr = `${currentYear}-${currentYear + 1}`;
      
      const [dormitoriesRes, collectionsRes] = await Promise.all([
        dormitoryAPI.getStudentsForFeeManagement(schoolId),
        dormitoryAPI.getDormitoryFeeCollections({ schoolId, academicYear: academicYearStr })
      ]);
      
      if (dormitoriesRes?.success) {
        const dormitoryData = dormitoriesRes.data || [];
        setDormitories(dormitoryData);
        
        if (dormitoryData.length === 0) {
          toast('No students with dormitory found. Please assign dormitory to students first.', { icon: 'ℹ️' });
        }
      } else {
        toast.error(dormitoriesRes?.error || dormitoriesRes?.message || 'Failed to load dormitory data');
      }

      if (collectionsRes?.success) {
        setDormitoryCollections(collectionsRes.data || []);
      }
    } catch (error: any) {
      console.error('Error loading dormitories:', error);
      toast.error(error.message || 'Failed to load dormitory data');
    } finally {
      setLoading(false);
    }
  };

  // Check if a student has existing collections
  const hasExistingCollections = (studentDormitoryId: string) => {
    return dormitoryCollections.some((collection: any) => {
      const collectionDormitoryId = typeof collection.studentDormitory === 'object' 
        ? collection.studentDormitory?._id 
        : collection.studentDormitory;
      return collectionDormitoryId === studentDormitoryId;
    });
  };

  const uniqueDormitories = useMemo(() => {
    const unique = new Map();
    dormitories.forEach(dorm => {
      const dormId = dorm.dormitoryId._id;
      if (!unique.has(dormId)) {
        unique.set(dormId, {
          _id: dormId,
          name: dorm.dormitoryId.name
        });
      }
    });
    return Array.from(unique.values());
  }, [dormitories]);

  const filteredDormitories = useMemo(() => {
    let filtered = dormitories;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.studentId.name.toLowerCase().includes(searchLower) ||
        d.studentId.rollNumber?.toLowerCase().includes(searchLower) ||
        d.studentId.admissionNumber?.toLowerCase().includes(searchLower) ||
        d.roomNumber.toLowerCase().includes(searchLower) ||
        d.dormitoryId.name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by dormitory
    if (filterDormitory !== 'all') {
      filtered = filtered.filter(d => d.dormitoryId._id === filterDormitory);
    }

    return filtered;
  }, [dormitories, searchTerm, filterDormitory]);

  // Group by room number and dormitory
  const groupedByRoom = useMemo(() => {
    const groups: Record<string, StudentDormitory[]> = {};
    filteredDormitories.forEach(dorm => {
      const key = `${dorm.dormitoryId._id}-${dorm.roomNumber}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(dorm);
    });
    return groups;
  }, [filteredDormitories]);

  const handleEditFee = (dorm: StudentDormitory) => {
    setEditingId(dorm._id);
    setEditFee(dorm.monthlyFee);
  };

  const handleSaveFee = async (id: string) => {
    try {
      const response = await dormitoryAPI.updateDormitoryFee(id, { monthlyFee: editFee });
      
      if (response?.success) {
        toast.success('Dormitory fee updated successfully');
        setEditingId(null);
        loadDormitories();
      } else {
        toast.error('Failed to update dormitory fee');
      }
    } catch (error: any) {
      console.error('Error updating fee:', error);
      toast.error(error.message || 'Failed to update dormitory fee');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFee(0);
  };

  const handleBulkFeeUpdate = async (roomNumber: string, dormitoryId: string, fee: number) => {
    if (!fee || fee < 0) {
      toast.error('Please enter a valid fee amount');
      return;
    }

    try {
      const schoolId = localStorage.getItem('schoolId') || '';
      if (!schoolId) {
        toast.error('School ID not found. Please login again.');
        return;
      }
      const response = await dormitoryAPI.bulkUpdateDormitoryFees({
        schoolId,
        feeUpdates: [{
          roomNumber,
          dormitoryId,
          monthlyFee: fee
        }]
      });

      if (response?.success) {
        toast.success(`Updated fees for ${response.data.results[0]?.updated || 0} students`);
        setBulkEditMode(false);
        setBulkFeeUpdates({});
        loadDormitories();
      } else {
        toast.error('Failed to update dormitory fees');
      }
    } catch (error: any) {
      console.error('Error bulk updating fees:', error);
      toast.error(error.message || 'Failed to update dormitory fees');
    }
  };

  // Calculate summary stats
  const totalCollected = useMemo(() => {
    return dormitories.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
  }, [dormitories]);

  const totalDue = useMemo(() => {
    return dormitories.reduce((sum, d) => sum + (d.dueAmount || 0), 0);
  }, [dormitories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
        <div className="text-gray-500">Loading dormitory data...</div>
      </div>
    );
  }

  if (dormitories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Dormitory Records Found</h3>
          <p className="text-gray-600 mb-4">
            There are no students with active dormitory assignments. Please assign dormitory to students first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Home className="h-6 w-6 text-blue-600" />
              Dormitory Fee Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage dormitory fees for students based on their dormitory and room assignments
            </p>
          </div>
          <button
            onClick={loadDormitories}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by student name, roll number, admission number, room number, or dormitory..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filterDormitory}
            onChange={(e) => setFilterDormitory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Dormitories</option>
            {uniqueDormitories.map(dorm => (
              <option key={dorm._id} value={dorm._id}>
                {dorm.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Students</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{dormitories.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Active Dormitories</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{uniqueDormitories.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Collected</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            ₹{totalCollected.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Due</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            ₹{totalDue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Dormitory Fees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dormitory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Monthly Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fee Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDormitories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm || filterDormitory !== 'all' 
                      ? 'No dormitory records match your filters. Try adjusting your search criteria.'
                      : 'No dormitory records found. Please assign dormitory to students first.'}
                  </td>
                </tr>
              ) : (
                filteredDormitories
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map((dorm) => {
                  if (!dorm || !dorm.studentId || !dorm.dormitoryId) {
                    console.warn('Invalid dormitory record:', dorm);
                    return null;
                  }
                  
                  return (
                  <tr key={dorm._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {dorm.studentId.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {dorm.studentId.rollNumber}
                          {dorm.studentId.admissionNumber && ` • ${dorm.studentId.admissionNumber}`}
                        </div>
                        {dorm.studentId.classId && (
                          <div className="text-xs text-gray-400">
                            {dorm.studentId.classId.name}
                            {dorm.studentId.classId.section && ` - ${dorm.studentId.classId.section}`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-blue-500" />
                        <div className="text-sm font-medium text-gray-900">
                          {dorm.dormitoryId.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{dorm.roomNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === dorm._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editFee}
                            onChange={(e) => setEditFee(Number(e.target.value))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="0.01"
                          />
                          <button
                            onClick={() => handleSaveFee(dorm._id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            ₹{dorm.monthlyFee?.toLocaleString() || '0'}
                          </div>
                          {dorm.paidAmount > 0 && (
                            <div className="text-xs text-green-600 mt-1">
                              Paid: ₹{dorm.paidAmount.toLocaleString()}
                            </div>
                          )}
                          {dorm.dueAmount > 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              Outstanding: ₹{dorm.dueAmount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          dorm.feeStatus === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : dorm.feeStatus === 'partial'
                            ? 'bg-blue-100 text-blue-800'
                            : dorm.feeStatus === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {dorm.feeStatus === 'partial' ? 'Partial' : (dorm.feeStatus || 'pending')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2 justify-end">
                        {editingId !== dorm._id && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedDormitory(dorm);
                                setPeriodTotalAmount(dorm.monthlyFee * 12); // Default to 12 months
                                setGeneratedInstallments([]);
                                setIsInstallmentModalOpen(true);
                              }}
                              className={`flex items-center gap-1 ${
                                hasExistingCollections(dorm._id)
                                  ? 'text-orange-600 hover:text-orange-900'
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              <DollarSign className="h-4 w-4" />
                              {hasExistingCollections(dorm._id) ? 'Change Installment Plan' : 'Generate Installments'}
                            </button>
                            <button
                              onClick={() => handleEditFee(dorm)}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Edit Fee
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                }).filter(Boolean)
              )}
            </tbody>
          </table>
        </div>
        {filteredDormitories.length > 0 && (
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={filteredDormitories.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* Bulk Update by Room Number */}
      {Object.keys(groupedByRoom).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bulk Update by Room Number</h3>
            <button
              onClick={() => {
                setBulkEditMode(!bulkEditMode);
                setBulkFeeUpdates({});
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {bulkEditMode ? 'Cancel Bulk Edit' : 'Enable Bulk Edit'}
            </button>
          </div>

          {bulkEditMode && (
            <div className="space-y-4">
              {Object.entries(groupedByRoom).map(([key, dormList]) => {
                const [dormitoryId, roomNumber] = key.split('-');
                const dormitory = uniqueDormitories.find(d => d._id === dormitoryId);
                const currentFee = dormList[0]?.monthlyFee || 0;
                const feeKey = `${dormitoryId}-${roomNumber}`;

                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          Room {roomNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          Dormitory: {dormitory?.name} • {dormList.length} student(s)
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder={`Current: ₹${currentFee.toLocaleString()}`}
                          value={bulkFeeUpdates[feeKey] || ''}
                          onChange={(e) =>
                            setBulkFeeUpdates({
                              ...bulkFeeUpdates,
                              [feeKey]: Number(e.target.value)
                            })
                          }
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                        />
                        <button
                          onClick={() =>
                            handleBulkFeeUpdate(
                              roomNumber,
                              dormitoryId,
                              bulkFeeUpdates[feeKey] || 0
                            )
                          }
                          disabled={!bulkFeeUpdates[feeKey] || bulkFeeUpdates[feeKey] <= 0}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Update All
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Installment Generation Modal */}
      {isInstallmentModalOpen && selectedDormitory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {hasExistingCollections(selectedDormitory._id) ? 'Change Dormitory Fee Installment Plan' : 'Generate Dormitory Fee Installments'}
                </h3>
                <button
                  onClick={() => {
                    setIsInstallmentModalOpen(false);
                    setSelectedDormitory(null);
                    setGeneratedInstallments([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Student: {selectedDormitory.studentId.name} ({selectedDormitory.studentId.admissionNumber || selectedDormitory.studentId.rollNumber})
              </p>
              {hasExistingCollections(selectedDormitory._id) && (
                <p className="text-sm text-orange-600 mt-1 font-medium">
                  ⚠️ Warning: Creating new installments will delete existing unpaid installments for this student.
                </p>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Total Amount (₹)</label>
                  <input
                    type="number"
                    value={periodTotalAmount}
                    onChange={(e) => setPeriodTotalAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Day of Month</label>
                  <input
                    type="number"
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="31"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2024-2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Frequency</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="monthly"
                      checked={paymentFrequency === 'monthly'}
                      onChange={(e) => setPaymentFrequency(e.target.value)}
                      className="mr-2"
                    />
                    Monthly
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="quarterly"
                      checked={paymentFrequency === 'quarterly'}
                      onChange={(e) => setPaymentFrequency(e.target.value)}
                      className="mr-2"
                    />
                    Quarterly
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="custom"
                      checked={paymentFrequency === 'custom'}
                      onChange={(e) => setPaymentFrequency(e.target.value)}
                      className="mr-2"
                    />
                    Custom
                  </label>
                </div>
                {paymentFrequency === 'custom' && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Period (Months)</label>
                    <input
                      type="number"
                      value={customPeriodMonths}
                      onChange={(e) => setCustomPeriodMonths(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={async () => {
                  if (!startDate || !endDate || !periodTotalAmount) {
                    toast.error('Please fill all required fields');
                    return;
                  }
                  if (new Date(startDate) > new Date(endDate)) {
                    toast.error('Start date must be on or before end date');
                    return;
                  }
                  try {
                    const response = await dormitoryAPI.generateDormitoryInstallments({
                      studentDormitoryId: selectedDormitory._id,
                      studentId: typeof selectedDormitory.studentId === 'object' ? selectedDormitory.studentId._id : selectedDormitory.studentId,
                      academicYear,
                      startDate,
                      endDate,
                      periodTotalAmount,
                      paymentFrequency,
                      customPeriodMonths: paymentFrequency === 'custom' ? customPeriodMonths : undefined,
                      dueDay
                    });
                    if (response?.success) {
                      setGeneratedInstallments(response.data || []);
                      const count = response.data?.length || 0;
                      if (count > 0) {
                        toast.success(`Generated ${count} installments. Go to Fee Collection tab to view and collect fees.`);
                      } else {
                        toast(response?.message || 'No installments in the given date range. Ensure start date is on or before end date.', { icon: 'ℹ️' });
                      }
                    } else {
                      toast.error(response?.message || 'Failed to generate installments');
                    }
                  } catch (error: any) {
                    const msg = error?.message || '';
                    if (msg.includes('Not Found') || msg.includes('404')) {
                      toast.error('Backend endpoint not found. Please restart your backend server and try again.');
                    } else {
                      toast.error(msg || 'Failed to generate installments');
                    }
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate Installments
              </button>

              {generatedInstallments.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">Generated Installments ({generatedInstallments.length})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {generatedInstallments.map((inst, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">
                              {inst.month ? new Date(inst.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `Installment ${inst.installmentNumber}`}
                            </div>
                            {inst.quarterMonths && inst.quarterMonths.length > 0 && (
                              <div className="text-xs text-gray-500">
                                Covers: {inst.quarterMonths.map((m: string) => new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })).join(', ')}
                              </div>
                            )}
                            {inst.periodMonths && inst.periodMonths.length > 0 && (
                              <div className="text-xs text-gray-500">
                                Covers: {inst.periodMonths.map((m: string) => new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })).join(', ')}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              Due: {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">₹{((inst.totalAmount ?? inst.amount) ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            <div className="text-xs text-gray-500">#{inst.installmentNumber}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const schoolId = localStorage.getItem('schoolId') || '';
                        const studentId = typeof selectedDormitory.studentId === 'object' ? selectedDormitory.studentId._id : selectedDormitory.studentId;
                        
                        // If changing installment plan, delete existing collections first
                        if (hasExistingCollections(selectedDormitory._id)) {
                          try {
                            const deleteResponse = await dormitoryAPI.deleteDormitoryFeeCollectionsByDormitory(
                              selectedDormitory._id,
                              academicYear
                            );
                            if (deleteResponse?.success) {
                              toast.success(`Deleted ${deleteResponse.data?.deletedCount || 0} existing installment(s)`);
                            }
                          } catch (deleteError: any) {
                            // If deletion fails due to payments, show error and stop
                            if (deleteError.message?.includes('payments')) {
                              toast.error(deleteError.message || 'Cannot change plan: Some installments have payments');
                              return;
                            }
                            throw deleteError;
                          }
                        }
                        
                        // Create new installments
                        for (const inst of generatedInstallments) {
                          await dormitoryAPI.createDormitoryFeeCollection({
                            studentDormitoryId: selectedDormitory._id,
                            studentId,
                            academicYear,
                            month: inst.month,
                            dueDate: inst.dueDate,
                            totalAmount: inst.totalAmount ?? inst.amount,
                            paymentFrequency,
                            customPeriodMonths: paymentFrequency === 'custom' ? customPeriodMonths : undefined,
                            installmentNumber: inst.installmentNumber,
                            quarterMonths: inst.quarterMonths,
                            periodMonths: inst.periodMonths,
                            school: schoolId
                          });
                        }
                        toast.success('All installments created successfully');
                        setIsInstallmentModalOpen(false);
                        setSelectedDormitory(null);
                        setGeneratedInstallments([]);
                        // Reload data to refresh the UI
                        await loadDormitories();
                      } catch (error: any) {
                        toast.error(error.message || 'Failed to create installments');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {hasExistingCollections(selectedDormitory._id) ? 'Update Installment Plan' : 'Create All Installments'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DormitoryFees;

