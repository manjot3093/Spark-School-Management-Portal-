import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface FeeStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  feeStructure?: any;
  categories: any[];
  classes: any[];
  isLoading?: boolean;
}

const FeeStructureModal: React.FC<FeeStructureModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  feeStructure,
  categories,
  classes,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    class: '',
    amount: '',
    frequency: 'monthly',
    dueDay: '1',
    status: 'active',
    academicYear: '2024-2025',
    description: '',
    lateFee: {
      enabled: false,
      type: 'fixed',
      value: '',
      gracePeriod: '0'
    },
    discount: {
      enabled: false,
      type: 'percentage',
      value: '',
      description: ''
    }
  });

  useEffect(() => {
    if (feeStructure) {
      setFormData({
        name: feeStructure.name || '',
        category: feeStructure.category?._id || feeStructure.category || '',
        class: feeStructure.class?._id || feeStructure.class || '',
        amount: feeStructure.amount?.toString() || '',
        frequency: feeStructure.frequency || 'monthly',
        dueDay: feeStructure.dueDay?.toString() || '1',
        status: feeStructure.status || 'active',
        academicYear: feeStructure.academicYear || '2024-2025',
        description: feeStructure.description || '',
        lateFee: {
          enabled: feeStructure.lateFee?.enabled || false,
          type: feeStructure.lateFee?.type || 'fixed',
          value: feeStructure.lateFee?.value?.toString() || '',
          gracePeriod: feeStructure.lateFee?.gracePeriod?.toString() || '0'
        },
        discount: {
          enabled: feeStructure.discount?.enabled || false,
          type: feeStructure.discount?.type || 'percentage',
          value: feeStructure.discount?.value?.toString() || '',
          description: feeStructure.discount?.description || ''
        }
      });
    } else {
      // Reset form for new fee structure
      setFormData({
        name: '',
        category: '',
        class: '',
        amount: '',
        frequency: 'monthly',
        dueDay: '1',
        status: 'active',
        academicYear: '2024-2025',
        description: '',
        lateFee: {
          enabled: false,
          type: 'fixed',
          value: '',
          gracePeriod: '0'
        },
        discount: {
          enabled: false,
          type: 'percentage',
          value: '',
          description: ''
        }
      });
    }
  }, [feeStructure]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formData.amount);
    const dueDay = Number(formData.dueDay);
    if (!formData.name.trim() || !formData.category || !formData.academicYear.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a name, category, academic year, and amount greater than zero.');
      return;
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      toast.error('Due day must be between 1 and 31.');
      return;
    }
    const lateFee = Number(formData.lateFee.value);
    if (formData.lateFee.enabled && (!Number.isFinite(lateFee) || lateFee < 0 || (formData.lateFee.type === 'percentage' && lateFee > 100))) {
      toast.error('Enter a valid late fee. Percentages cannot exceed 100.');
      return;
    }
    const discount = Number(formData.discount.value);
    if (formData.discount.enabled && (!Number.isFinite(discount) || discount < 0 || (formData.discount.type === 'percentage' && discount > 100) || (formData.discount.type === 'fixed' && discount > amount))) {
      toast.error('Enter a valid discount that does not exceed the fee.');
      return;
    }
    
    const submitData = {
      ...formData,
      amount,
      dueDay,
      class: formData.class && formData.class.trim() !== '' ? formData.class : null,
      lateFee: {
        ...formData.lateFee,
        value: formData.lateFee.enabled ? parseFloat(formData.lateFee.value || '0') : 0,
        gracePeriod: formData.lateFee.enabled ? parseInt(formData.lateFee.gracePeriod || '0') : 0
      },
      discount: {
        ...formData.discount,
        value: formData.discount.enabled ? parseFloat(formData.discount.value || '0') : 0
      }
    };
    
    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="fee-structure-title" className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 id="fee-structure-title" className="text-xl font-semibold text-gray-900">
            {feeStructure ? 'Edit Fee Structure' : 'Create Fee Structure'}
          </h2>
          <button
            type="button"
            aria-label="Close fee structure"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Tuition Fee, Transport Fee"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class (Optional)
                </label>
                <select
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name} {cls.section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency *
                </label>
                <select
                  required
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="one-time">One Time</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi-annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Day of Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dueDay}
                  onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year *
                </label>
                <input
                  type="text"
                  required
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2024-2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* Late Fee Settings */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="lateFeeEnabled"
                checked={formData.lateFee.enabled}
                onChange={(e) => setFormData({
                  ...formData,
                  lateFee: { ...formData.lateFee, enabled: e.target.checked }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="lateFeeEnabled" className="ml-2 block text-sm font-medium text-gray-900">
                Enable Late Fee
              </label>
            </div>

            {formData.lateFee.enabled && (
              <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.lateFee.type}
                    onChange={(e) => setFormData({
                      ...formData,
                      lateFee: { ...formData.lateFee, type: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.lateFee.value}
                    onChange={(e) => setFormData({
                      ...formData,
                      lateFee: { ...formData.lateFee, value: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={formData.lateFee.type === 'percentage' ? '%' : 'Amount'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grace Period (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lateFee.gracePeriod}
                    onChange={(e) => setFormData({
                      ...formData,
                      lateFee: { ...formData.lateFee, gracePeriod: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Discount Settings */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="discountEnabled"
                checked={formData.discount.enabled}
                onChange={(e) => setFormData({
                  ...formData,
                  discount: { ...formData.discount, enabled: e.target.checked }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="discountEnabled" className="ml-2 block text-sm font-medium text-gray-900">
                Enable Discount
              </label>
            </div>

            {formData.discount.enabled && (
              <div className="ml-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.discount.type}
                    onChange={(e) => setFormData({
                      ...formData,
                      discount: { ...formData.discount, type: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">Fixed Amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount.value}
                    onChange={(e) => setFormData({
                      ...formData,
                      discount: { ...formData.discount, value: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={formData.discount.type === 'percentage' ? '%' : 'Amount'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.discount.description}
                    onChange={(e) => setFormData({
                      ...formData,
                      discount: { ...formData.discount, description: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Early bird discount"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : feeStructure ? 'Update Fee Structure' : 'Create Fee Structure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeeStructureModal;

