import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface CollectFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  students: any[];
  feeStructures: any[];
  isLoading?: boolean;
}

const CollectFeeModal: React.FC<CollectFeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  students,
  feeStructures,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    student: '',
    feeStructure: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    transactionId: '',
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    remarks: ''
  });

  const [selectedFeeStructure, setSelectedFeeStructure] = useState<any>(null);
  const [admissionSearch, setAdmissionSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filtered students for autocomplete
  const filteredStudents = students.filter(student => {
    if (!admissionSearch) return false;
    const searchLower = admissionSearch.toLowerCase();
    return (
      (student as any).admissionNumber?.toLowerCase().includes(searchLower) ||
      student.name?.toLowerCase().includes(searchLower) ||
      student.rollNumber?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 5);

  useEffect(() => {
    if (formData.feeStructure) {
      const structure = feeStructures.find(fs => fs._id === formData.feeStructure);
      setSelectedFeeStructure(structure);
      if (structure) {
        // Calculate final amount with discount
        const discount = structure.discount?.enabled
          ? (structure.discount.type === 'percentage'
            ? structure.amount * (structure.discount.value / 100)
            : structure.discount.value)
          : 0;
        const finalAmount = structure.amount - discount;
        setFormData(prev => ({ ...prev, amount: finalAmount.toString() }));
      }
    }
  }, [formData.feeStructure, feeStructures]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formData.amount);
    if (!formData.student || !formData.feeStructure || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Choose a student and fee structure, then enter an amount greater than zero.');
      return;
    }
    if (formData.paymentMethod === 'cheque' && (!formData.chequeNumber.trim() || !formData.chequeDate || !formData.bankName.trim())) {
      toast.error('Enter the cheque number, date, and bank name.');
      return;
    }

    const submitData = {
      ...formData,
      amount,
      chequeDate: formData.chequeDate || undefined,
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    setFormData({
      student: '',
      feeStructure: '',
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      transactionId: '',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      remarks: ''
    });
    setSelectedFeeStructure(null);
    setAdmissionSearch('');
    setSelectedStudent(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="collect-fee-title" className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 id="collect-fee-title" className="text-xl font-semibold text-gray-900">
            Collect Fee Payment
          </h2>
          <button
            type="button"
            aria-label="Close fee collection"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Student and Fee Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Fee Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Admission Number *
                </label>
                <input
                  type="text"
                  required
                  value={admissionSearch}
                  onChange={(e) => {
                    setAdmissionSearch(e.target.value);
                    setShowSuggestions(true);
                    if (!e.target.value) {
                      setFormData({ ...formData, student: '' });
                      setSelectedStudent(null);
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Enter admission number or student name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Student Suggestions Dropdown */}
                {showSuggestions && filteredStudents.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredStudents.map(student => (
                      <div
                        key={student._id}
                        onClick={() => {
                          setSelectedStudent(student);
                          setAdmissionSearch((student as any).admissionNumber || student.name);
                          setFormData({ ...formData, student: student._id });
                          setShowSuggestions(false);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-500">
                          Admission: {(student as any).admissionNumber || 'N/A'} | Roll: {student.rollNumber || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Student Display */}
                {selectedStudent && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">
                      Selected: {selectedStudent.name} - {(selectedStudent as any).admissionNumber || selectedStudent.rollNumber}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee Type *
                </label>
                <select
                  required
                  value={formData.feeStructure}
                  onChange={(e) => setFormData({ ...formData, feeStructure: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select fee type</option>
                  {feeStructures.map((structure) => (
                    <option key={structure._id} value={structure._id}>
                      {structure.name} - ₹{structure.amount}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fee Structure Details */}
            {selectedFeeStructure && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Amount</p>
                    <p className="font-semibold text-gray-900">₹{selectedFeeStructure.amount}</p>
                  </div>
                  {selectedFeeStructure.discount?.enabled && (
                    <div>
                      <p className="text-gray-600">Discount</p>
                      <p className="font-semibold text-green-600">
                        -{selectedFeeStructure.discount.type === 'percentage'
                          ? `₹{selectedFeeStructure.discount.value}%`
                          : `₹₹{selectedFeeStructure.discount.value}`}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600">Frequency</p>
                    <p className="font-semibold text-gray-900 capitalize">{selectedFeeStructure.frequency}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Due Day</p>
                    <p className="font-semibold text-gray-900">{selectedFeeStructure.dueDay} of month</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  required
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Transfer</option>
                  <option value="card">Card Payment</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Cheque Details (show only if payment method is cheque) */}
            {formData.paymentMethod === 'cheque' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cheque Number
                  </label>
                  <input
                    type="text"
                    value={formData.chequeNumber}
                    onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cheque number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cheque Date
                  </label>
                  <input
                    type="date"
                    value={formData.chequeDate}
                    onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bank name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional remarks"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Collect Fee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollectFeeModal;

