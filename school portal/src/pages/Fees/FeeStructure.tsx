import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DollarSign, Plus, Edit, Trash2, Download, Filter, X } from 'lucide-react';
import { feesAPI, classroomAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

interface FeeItem {
  category: string;
  amount: number;
  excludeFromSum?: boolean;
}

interface FeeStructureData {
  _id?: string;
  class: string | { _id: string } | null;
  name: string;
  startDate: string; // Date range start (YYYY-MM-DD)
  endDate: string; // Date range end (YYYY-MM-DD)
  periodTotalAmount: number; // Total amount for the entire period
  components: FeeItem[];
  totalAmount: number;
  description?: string;
  academicYear?: string;
  status?: string;
  dueDay?: number; // Day of month when fee is due (1-31)
  /** One-time = single payment for period; monthly = divided into monthly installments */
  frequency?: 'one-time' | 'monthly';
}

interface FeeCategoryOption {
  _id: string;
  name: string;
  chargeType?: 'one_time' | 'recurring';
  isMandatory?: boolean;
  status?: string;
}

const FeeStructure: React.FC = () => {
  const [structures, setStructures] = useState<FeeStructureData[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [categories, setCategories] = useState<FeeCategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filter states
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [feeTypeFilter, setFeeTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Form states
  const [formData, setFormData] = useState<FeeStructureData>({
    class: '',
    name: '',
    startDate: new Date().toISOString().slice(0, 10), // Today's date
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10), // 1 year from today
    periodTotalAmount: 0,
    components: [{ category: '', amount: 0, excludeFromSum: false }],
    totalAmount: 0,
    description: '',
    academicYear: new Date().getFullYear().toString(),
    status: 'active',
    dueDay: 1, // Default to 1st of the month
    frequency: 'monthly', // Recurring = divided monthly; use 'one-time' for single payment
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [structuresRes, classesRes, categoriesRes] = await Promise.all([
        feesAPI.getStructures(),
        classroomAPI.getClasses(),
        feesAPI.getCategories({ limit: 500 }),
      ]);

      if (structuresRes?.success) {
        // Normalize the structures to ensure class is an ID and components is an array
        const normalizedStructures = (structuresRes.data || []).map((structure: any) => {
          let classId = structure.class;
          
          // If class is an object, extract the _id
          if (structure.class && typeof structure.class === 'object' && structure.class._id) {
            classId = structure.class._id;
          }
          
          // Ensure components is always an array and add excludeFromSum if not present
          let components = structure.components;
          if (!Array.isArray(components)) {
            components = [];
          }
          // Ensure each component has excludeFromSum property
          components = components.map((comp: any) => ({
            ...comp,
            excludeFromSum: comp.excludeFromSum || false
          }));
          
          return {
            ...structure,
            class: classId,
            components: components
          };
        });
        
        setStructures(normalizedStructures);
      }
      if (classesRes?.success) {
        setClasses(classesRes.data || []);
      }
      if (categoriesRes?.success && Array.isArray(categoriesRes.data)) {
        setCategories(categoriesRes.data);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  }, []);

  const openAddModal = useCallback(() => {
    setFormData({
      class: '',
      name: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
      periodTotalAmount: 0,
      components: [{ category: '', amount: 0, excludeFromSum: false }],
      totalAmount: 0,
      description: '',
      academicYear: new Date().getFullYear().toString(),
      status: 'active',
      dueDay: 1,
      frequency: 'monthly',
    });
    setEditingId(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((structure: FeeStructureData) => {
    let classId: string | null = null;
    const classValue = structure.class;
    if (classValue !== null && classValue !== undefined) {
      if (typeof classValue === 'object' && '_id' in classValue) {
        classId = classValue._id;
      } else if (typeof classValue === 'string') {
        classId = classValue;
      }
    }
    const updatedStructure: FeeStructureData = {
      _id: structure._id,
      class: classId,
      name: structure.name,
      startDate: structure.startDate || new Date().toISOString().slice(0, 10),
      endDate: structure.endDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
      periodTotalAmount: structure.periodTotalAmount || structure.totalAmount || 0,
      components: structure.components && structure.components.length > 0 
        ? structure.components 
        : [{ category: '', amount: 0, excludeFromSum: false }],
      totalAmount: structure.totalAmount || getComponentsTotal(structure.components || []),
      description: structure.description || '',
      academicYear: structure.academicYear || new Date().getFullYear().toString(),
      status: structure.status || 'active',
      dueDay: structure.dueDay || 1,
      frequency: (structure as any).frequency === 'one-time' ? 'one-time' : 'monthly',
    };
    setFormData(updatedStructure);
    setEditingId(structure._id || null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      class: '',
      name: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
      periodTotalAmount: 0,
      components: [{ category: '', amount: 0, excludeFromSum: false }],
      totalAmount: 0,
      description: '',
      academicYear: new Date().getFullYear().toString(),
      status: 'active',
      dueDay: 1,
      frequency: 'monthly',
    });
  }, []);

  const addComponent = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, { category: '', amount: 0, excludeFromSum: false }],
    }));
  }, []);

  const removeComponent = useCallback((index: number) => {
    setFormData(prev => {
      const newComponents = prev.components.filter((_, i) => i !== index);
      const newTotal = newComponents.reduce((sum, item) => sum + (item.amount || 0), 0);
      return { ...prev, components: newComponents, totalAmount: newTotal };
    });
  }, []);

  const updateComponent = useCallback((index: number, field: keyof FeeItem, value: any) => {
    setFormData(prev => {
      const newComponents = [...prev.components];
      newComponents[index] = { ...newComponents[index], [field]: value };
      const newTotal = newComponents.reduce((sum, item) => sum + (item.amount || 0), 0);
      return { ...prev, components: newComponents, totalAmount: newTotal };
    });
  }, []);

  // Helper function to calculate total from components
  const getComponentsTotal = (components: FeeItem[]) => {
    return (components || []).reduce((sum, item) => {
      return sum + (item.amount || 0);
    }, 0);
  };

  // Helper function to get day suffix (1st, 2nd, 3rd, etc.)
  const getDaySuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const handleSubmit = useCallback(async () => {
    // Step 1: Check class
    const classValue = typeof formData.class === 'string' ? formData.class : '';
    if (!classValue || !classValue.trim()) {
      toast.error('Please select a class');
      return;
    }

    // Step 2: Check name
    if (!formData.name || !formData.name.trim()) {
      toast.error('Please enter a structure name');
      return;
    }

    // Step 3: Validate date range
    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start date and end date');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }

    // Step 4: Validate period total amount
    if (!formData.periodTotalAmount || formData.periodTotalAmount <= 0) {
      toast.error('Please enter total amount for the fee period');
      return;
    }

    // Step 5: Components are optional now, but if provided, validate them
    let validComponents = [];
    if (formData.components && formData.components.length > 0) {
      validComponents = formData.components.filter(
        item => (item.category && item.category.trim()) && item.amount > 0
      );
      
      if (validComponents.length > 0) {
        const hasEmptyCategory = validComponents.some(item => !item.category || !item.category.trim());
        if (hasEmptyCategory) {
          toast.error('All components must have a category name');
          return;
        }

        const hasZeroAmount = validComponents.some(item => !item.amount || item.amount <= 0);
        if (hasZeroAmount) {
          toast.error('All components must have an amount greater than 0');
          return;
        }
      }
    }

    try {
      setLoading(true);
      
      // Calculate total from valid components (optional)
      const componentsTotal = getComponentsTotal(validComponents);
      // Use periodTotalAmount as the main amount
      const totalAmount = formData.periodTotalAmount;

      const payload = {
        class: formData.class,
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        periodTotalAmount: formData.periodTotalAmount,
        components: validComponents,
        totalAmount: totalAmount,
        description: formData.description || '',
        academicYear: formData.academicYear || new Date().getFullYear().toString(),
        status: 'active',
      dueDay: formData.dueDay || 1,
      frequency: formData.frequency || 'monthly', // one-time = single payment; monthly = divided into monthly installments
    };

      console.log('Submitting fee structure:', payload);

      let response;
      if (editingId) {
        response = await feesAPI.updateStructure(editingId, payload);
      } else {
        response = await feesAPI.createStructure(payload);
      }

      if (response?.success) {
        toast.success(editingId ? 'Fee structure updated!' : 'Fee structure created!');
        await loadData();
        closeModal();
      } else {
        toast.error(response?.message || 'Failed to save fee structure');
      }
    } catch (error: any) {
      console.error('Error saving fee structure:', error);
      toast.error(error.message || 'Failed to save fee structure');
    } finally {
      setLoading(false);
    }
  }, [formData, editingId, loadData, closeModal]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;

    try {
      setLoading(true);
      const response = await feesAPI.deleteStructure(id);
      if (response?.success) {
        toast.success('Fee structure deleted!');
        await loadData();
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to delete fee structure');
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // Filter data
  const filteredStructures = structures.filter(structure => {
    if (selectedClass !== 'all' && structure.class !== selectedClass) return false;
    return true;
  });

  // Calculate class-wise summary
  const classWiseSummary = useMemo(() => {
    const summary: { [key: string]: { className: string; totalFee: number; structureCount: number } } = {};
    
    structures.forEach((structure) => {
      let classId: string = '';
      if (typeof structure.class === 'object' && structure.class !== null && '_id' in structure.class) {
        classId = structure.class._id;
      } else if (typeof structure.class === 'string') {
        classId = structure.class;
      }
      
      if (!classId) return; // Skip if no class ID
      
      const className = classes.find(c => c._id === classId)?.name || 'Unknown';
      
      if (!summary[classId]) {
        summary[classId] = {
          className,
          totalFee: 0,
          structureCount: 0
        };
      }
      
      const totalAmount = getComponentsTotal(structure.components || []);
      summary[classId].totalFee += totalAmount;
      summary[classId].structureCount += 1;
    });
    
    return Object.values(summary);
  }, [structures, classes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fee Structure</h2>
          <p className="text-gray-600 text-sm mt-1">Manage school fee structures by class and type</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="h-4 w-4" />
          Add Fee Structure
        </button>
      </div>

      {/* Class-wise Summary Section */}
      {classWiseSummary.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sum of Overall Fee (Class-wise)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classWiseSummary.map((item, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Class: {item.className}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.structureCount} structure(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">₹{item.totalFee.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Grand Total (All Classes):</span>
              <span className="text-xl font-bold text-gray-900">
                ₹{classWiseSummary.reduce((sum, item) => sum + item.totalFee, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>


        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm font-medium text-blue-800">
            {filteredStructures.length} structure(s)
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Class</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Fee Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Period</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Fee Items</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Total Amount</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredStructures.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No fee structures found
                </td>
              </tr>
            ) : (
              filteredStructures
                .slice((page - 1) * pageSize, page * pageSize)
                .map((structure) => (
                <tr key={structure._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {classes.find(c => c._id === structure.class)?.name || structure.class}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {structure.name}
                  </td>
                  <td className="px-6 py-4">
                    {structure.startDate && structure.endDate ? (
                      <div className="text-xs">
                        <div>{new Date(structure.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                        <div className="text-gray-500">to</div>
                        <div>{new Date(structure.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="max-w-xs">
                      {Array.isArray(structure.components) && structure.components.map((item, idx) => {
                        const cat = categories.find((c) => c.name === item.category);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs mb-1 gap-2">
                            <span className="flex items-center gap-1 flex-wrap">
                              <span>{item.category}</span>
                              {cat && (
                                <>
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] ${cat.chargeType === 'one_time' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {cat.chargeType === 'one_time' ? 'One-time' : 'Recurring'}
                                  </span>
                                  {cat.isMandatory !== false && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700">Mandatory</span>}
                                </>
                              )}
                            </span>
                            <span className="font-medium">₹{item.amount}</span>
                          </div>
                        );
                      })}
                      {(!Array.isArray(structure.components) || structure.components.length === 0) && (
                        <span className="text-xs text-gray-500">No components</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">₹{(structure.periodTotalAmount || structure.totalAmount || getComponentsTotal(structure.components || [])).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openEditModal(structure)}
                      className="text-blue-600 hover:text-blue-800 mr-3 inline-block"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(structure._id!)}
                      className="text-red-600 hover:text-red-800 inline-block"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filteredStructures.length > 0 && (
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={filteredStructures.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Fee Structure' : 'Add Fee Structure'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                <select
                  value={typeof formData.class === 'string' ? formData.class : ''}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Structure Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="e.g., Class 10 Monthly Fees"
                  required
                />
              </div>

              {/* Payment type: one-time = single payment; recurring = monthly installments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment type *</label>
                <select
                  value={formData.frequency || 'monthly'}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'one-time' | 'monthly' })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="one-time">One-time (single payment for the period)</option>
                  <option value="monthly">Recurring (divided into monthly installments)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.frequency === 'one-time' ? 'One payment for the full amount.' : 'Amount will be split into monthly dues (e.g. 12 installments per year).'}
                </p>
              </div>

              {/* Date Range Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    required
                    min={formData.startDate}
                  />
                </div>
              </div>

              {/* Period Total Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount for Period *</label>
                <input
                  type="number"
                  value={formData.periodTotalAmount}
                  onChange={(e) => setFormData({ ...formData, periodTotalAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="e.g., 10000 for 1 year"
                  min="0"
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Total fee amount for the entire period (e.g., ₹10,000 for Jan 2026 - Jan 2027)
                </p>
                {formData.startDate && formData.endDate && formData.periodTotalAmount > 0 && (() => {
                  const start = new Date(formData.startDate);
                  const end = new Date(formData.endDate);
                  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                  const monthlyAmount = formData.periodTotalAmount / Math.max(1, months);
                  return (
                    <p className="text-xs text-blue-600 mt-1">
                      Period: {months} month(s) • Monthly average: ₹{monthlyAmount.toFixed(2)}
                    </p>
                  );
                })()}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Add notes or description"
                />
              </div>


              {/* Fee Components */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Fee Components</label>
                  <button
                    onClick={addComponent}
                    type="button"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add Component
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Break down the total amount into components (e.g., Tuition, Library). One-time = single payment for the period; Recurring = divided into monthly installments.
                </p>

                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {formData.components.map((item, idx) => {
                    const cat = categories.find((c) => c.name === item.category);
                    return (
                      <div key={idx} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <select
                            value={item.category}
                            onChange={(e) => updateComponent(idx, 'category', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          >
                            <option value="">Select charge type</option>
                            {categories.filter((c) => c.status !== 'inactive').map((c) => (
                              <option key={c._id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                          {item.category && cat && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] ${cat.chargeType === 'one_time' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                {cat.chargeType === 'one_time' ? 'One-time' : 'Recurring'}
                              </span>
                              {cat.isMandatory !== false && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700">Mandatory</span>}
                            </div>
                          )}
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateComponent(idx, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="Amount"
                            min="0"
                          />
                        </div>
                        {formData.components.length > 1 && (
                          <button
                            onClick={() => removeComponent(idx)}
                            type="button"
                            className="text-red-600 hover:text-red-800 p-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Amount Display */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="text-sm text-gray-600 mb-1">Period Total Amount</div>
                <div className="text-2xl font-bold text-blue-600">₹{formData.periodTotalAmount.toLocaleString()}</div>
                {formData.components && formData.components.length > 0 && getComponentsTotal(formData.components) > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Components Total: ₹{getComponentsTotal(formData.components).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeStructure;
