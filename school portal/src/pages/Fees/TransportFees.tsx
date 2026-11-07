import React, { useState, useEffect, useMemo } from 'react';
import { Bus, Edit, Save, X, Search, DollarSign, MapPin, Navigation } from 'lucide-react';
import { transportAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

interface StudentTransport {
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
  routeId: {
    _id: string;
    name: string;
    routeNumber: string;
    startPoint: string;
    endPoint: string;
    stops?: Array<{ name: string; arrivalTime: string }>;
  };
  pickupPoint: string;
  pickupTime: string;
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

const TransportFees: React.FC = () => {
  const [transports, setTransports] = useState<StudentTransport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoute, setFilterRoute] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFee, setEditFee] = useState<number>(0);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkFeeUpdates, setBulkFeeUpdates] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Installment generation state
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<StudentTransport | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [periodTotalAmount, setPeriodTotalAmount] = useState<number>(0);
  const [paymentFrequency, setPaymentFrequency] = useState<string>('monthly');
  const [customPeriodMonths, setCustomPeriodMonths] = useState<number>(1);
  const [dueDay, setDueDay] = useState<number>(1);
  const [generatedInstallments, setGeneratedInstallments] = useState<any[]>([]);
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);

  useEffect(() => {
    loadTransports();
  }, []);

  const loadTransports = async () => {
    try {
      setLoading(true);
      const schoolId = localStorage.getItem('schoolId') || '';
      if (!schoolId) {
        toast.error('School ID not found. Please login again.');
        setLoading(false);
        return;
      }
      
      console.log('Loading transports for schoolId:', schoolId);
      const response = await transportAPI.getStudentsForFeeManagement(schoolId);
      
      console.log('Transport API response:', response);
      
      if (response?.success) {
        const transportData = response.data || [];
        console.log('Loaded transports:', transportData.length);
        setTransports(transportData);
        
        if (transportData.length === 0) {
          toast('No students with transport found. Please assign transport to students first.', { icon: 'ℹ️' });
        }
      } else {
        console.error('API response error:', response);
        toast.error(response?.error || response?.message || 'Failed to load transport data');
      }
    } catch (error: any) {
      console.error('Error loading transports:', error);
      toast.error(error.message || 'Failed to load transport data');
    } finally {
      setLoading(false);
    }
  };

  const routes = useMemo(() => {
    const uniqueRoutes = new Map();
    transports.forEach(transport => {
      const routeId = transport.routeId._id;
      if (!uniqueRoutes.has(routeId)) {
        uniqueRoutes.set(routeId, {
          _id: routeId,
          name: transport.routeId.name,
          routeNumber: transport.routeId.routeNumber
        });
      }
    });
    return Array.from(uniqueRoutes.values());
  }, [transports]);

  const filteredTransports = useMemo(() => {
    let filtered = transports;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.studentId.name.toLowerCase().includes(searchLower) ||
        t.studentId.rollNumber?.toLowerCase().includes(searchLower) ||
        t.studentId.admissionNumber?.toLowerCase().includes(searchLower) ||
        t.pickupPoint.toLowerCase().includes(searchLower) ||
        t.routeId.name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by route
    if (filterRoute !== 'all') {
      filtered = filtered.filter(t => t.routeId._id === filterRoute);
    }

    return filtered;
  }, [transports, searchTerm, filterRoute]);

  // Group by pickup point and route
  const groupedByPickup = useMemo(() => {
    const groups: Record<string, StudentTransport[]> = {};
    filteredTransports.forEach(transport => {
      const key = `${transport.routeId._id}-${transport.pickupPoint}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(transport);
    });
    return groups;
  }, [filteredTransports]);

  const handleEditFee = (transport: StudentTransport) => {
    setEditingId(transport._id);
    setEditFee(transport.monthlyFee);
  };

  const handleSaveFee = async (id: string) => {
    try {
      const response = await transportAPI.updateTransportFee(id, { monthlyFee: editFee });
      
      if (response?.success) {
        toast.success('Transport fee updated successfully');
        setEditingId(null);
        loadTransports();
      } else {
        toast.error('Failed to update transport fee');
      }
    } catch (error: any) {
      console.error('Error updating fee:', error);
      toast.error(error.message || 'Failed to update transport fee');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFee(0);
  };

  const handleBulkFeeUpdate = async (pickupPoint: string, routeId: string, fee: number) => {
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
      const response = await transportAPI.bulkUpdateTransportFees({
        schoolId,
        feeUpdates: [{
          pickupPoint,
          routeId,
          monthlyFee: fee
        }]
      });

      if (response?.success) {
        toast.success(`Updated fees for ${response.data.results[0]?.updated || 0} students`);
        setBulkEditMode(false);
        setBulkFeeUpdates({});
        loadTransports();
      } else {
        toast.error('Failed to update transport fees');
      }
    } catch (error: any) {
      console.error('Error bulk updating fees:', error);
      toast.error(error.message || 'Failed to update transport fees');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
        <div className="text-gray-500">Loading transport data...</div>
      </div>
    );
  }

  if (transports.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Bus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transport Records Found</h3>
          <p className="text-gray-600 mb-4">
            There are no students with active transport assignments. Please assign transport to students first.
          </p>
          <p className="text-sm text-gray-500">
            Go to the Transport section to assign routes and vehicles to students.
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
              <Bus className="h-6 w-6 text-blue-600" />
              Transport Fee Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage transport fees for students based on their routes and pickup points
            </p>
          </div>
          <button
            onClick={loadTransports}
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
                placeholder="Search by student name, roll number, admission number, pickup point, or route..."
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
            value={filterRoute}
            onChange={(e) => setFilterRoute(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Routes</option>
            {routes.map(route => (
              <option key={route._id} value={route._id}>
                {route.name} ({route.routeNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Students</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{transports.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Active Routes</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{routes.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Monthly Fee</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            ₹{transports.reduce((sum, t) => sum + (t.monthlyFee || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Filtered Results</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{filteredTransports.length}</div>
        </div>
      </div>

      {/* Transport Fees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Pickup Point
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pickup Time
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
              {filteredTransports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm || filterRoute !== 'all' 
                      ? 'No transport records match your filters. Try adjusting your search criteria.'
                      : 'No transport records found. Please assign transport to students first.'}
                  </td>
                </tr>
              ) : (
                filteredTransports
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map((transport) => {
                  // Safety check for nested data
                  if (!transport || !transport.studentId || !transport.routeId) {
                    console.warn('Invalid transport record:', transport);
                    return null;
                  }
                  
                  return (
                  <tr key={transport._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transport.studentId.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {transport.studentId.rollNumber}
                          {transport.studentId.admissionNumber && ` • ${transport.studentId.admissionNumber}`}
                        </div>
                        {transport.studentId.classId && (
                          <div className="text-xs text-gray-400">
                            {transport.studentId.classId.name}
                            {transport.studentId.classId.section && ` - ${transport.studentId.classId.section}`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transport.routeId.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transport.routeId.routeNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transport.pickupPoint}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transport.pickupTime}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === transport._id ? (
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
                            onClick={() => handleSaveFee(transport._id)}
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
                            ₹{transport.monthlyFee?.toLocaleString() || '0'}
                          </div>
                          {transport.paidAmount > 0 && (
                            <div className="text-xs text-green-600 mt-1">
                              Paid: ₹{transport.paidAmount.toLocaleString()}
                            </div>
                          )}
                          {transport.dueAmount > 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              Outstanding: ₹{transport.dueAmount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transport.feeStatus === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : transport.feeStatus === 'partial'
                            ? 'bg-blue-100 text-blue-800'
                            : transport.feeStatus === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {transport.feeStatus === 'partial' ? 'Partial' : (transport.feeStatus || 'pending')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2 justify-end">
                        {editingId !== transport._id && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedTransport(transport);
                                setPeriodTotalAmount(transport.monthlyFee * 12); // Default to 12 months
                                setIsInstallmentModalOpen(true);
                              }}
                              className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            >
                              <DollarSign className="h-4 w-4" />
                              Generate Installments
                            </button>
                            <button
                              onClick={() => handleEditFee(transport)}
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
        {filteredTransports.length > 0 && (
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={filteredTransports.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* Bulk Update by Pickup Point */}
      {Object.keys(groupedByPickup).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bulk Update by Pickup Point</h3>
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
              {Object.entries(groupedByPickup).map(([key, transportList]) => {
                const [routeId, pickupPoint] = key.split('-');
                const route = routes.find(r => r._id === routeId);
                const currentFee = transportList[0]?.monthlyFee || 0;
                const feeKey = `${routeId}-${pickupPoint}`;

                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {pickupPoint}
                        </div>
                        <div className="text-sm text-gray-500">
                          Route: {route?.name} ({route?.routeNumber}) • {transportList.length} student(s)
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
                              pickupPoint,
                              routeId,
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
      {isInstallmentModalOpen && selectedTransport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Generate Transport Fee Installments</h3>
                <button
                  onClick={() => {
                    setIsInstallmentModalOpen(false);
                    setSelectedTransport(null);
                    setGeneratedInstallments([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Student: {selectedTransport.studentId.name} ({selectedTransport.studentId.admissionNumber || selectedTransport.studentId.rollNumber})
              </p>
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
                    const response = await transportAPI.generateTransportInstallments({
                      studentTransportId: selectedTransport._id,
                      studentId: typeof selectedTransport.studentId === 'object' ? selectedTransport.studentId._id : selectedTransport.studentId,
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
                        toast(response?.message || 'No installments in the given date range.', { icon: 'ℹ️' });
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
                  <p className="mt-4 text-sm text-gray-600">
                    Installments are already saved. Go to <strong>Fee Collection</strong> tab to view and collect fees.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportFees;

