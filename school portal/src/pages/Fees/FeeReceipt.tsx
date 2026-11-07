import React, { useState, useEffect } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { feesAPI, studentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

interface ReceiptData {
  receiptNumber: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  email?: string;
  phone?: string;
  feeType: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  remarks?: string;
  schoolName: string;
  schoolAddress?: string;
}

const FeeReceipt: React.FC = () => {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  // Admission number search states
  const [admissionSearch, setAdmissionSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const [formData, setFormData] = useState<Partial<ReceiptData>>({
    receiptNumber: `RCP-${Date.now()}`,
    studentId: '',
    feeType: '',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    remarks: '',
    schoolName: 'Your School Name',
    schoolAddress: 'School Address',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [receiptsRes, studentsRes] = await Promise.all([
        feesAPI.getReceipts?.() || Promise.resolve({ success: true, data: [] }),
        studentsAPI.getAll?.() || Promise.resolve({ success: true, data: [] }),
      ]);

      if (receiptsRes.success) {
        setReceipts(receiptsRes.data || []);
      }
      if (studentsRes.success) {
        setStudents(studentsRes.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReceipt = async () => {
    if (!formData.studentId || !formData.feeType || !formData.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const selectedStudent = students.find(s => s._id === formData.studentId);

      const receiptPayload = {
        receiptNumber: formData.receiptNumber,
        studentId: formData.studentId,
        studentName: selectedStudent?.name || '',
        admissionNumber: selectedStudent?.admissionNumber || '',
        className: selectedStudent?.classId?.name || '',
        email: selectedStudent?.email || '',
        phone: selectedStudent?.phone || '',
        feeType: formData.feeType,
        amount: parseFloat(formData.amount as any),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        remarks: formData.remarks,
      };

      const response = await feesAPI.createReceipt?.(receiptPayload);
      if (response?.success) {
        toast.success('Receipt generated successfully!');
        setShowGenerateModal(false);
        setFormData({
          receiptNumber: `RCP-${Date.now()}`,
          studentId: '',
          feeType: '',
          amount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          remarks: '',
          schoolName: 'Your School Name',
          schoolAddress: 'School Address',
        });
        loadData();
      }
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      toast.error(error.message || 'Failed to generate receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = (receipt: any) => {
    const selectedStudent = students.find(s => s._id === receipt.studentId);
    const printWindow = window.open('', '', 'width=900,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Fee Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .school-name { font-size: 20px; font-weight: bold; }
            .receipt-title { font-size: 18px; font-weight: bold; margin-top: 20px; }
            .details { margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .label { font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; }
            .amount-box { font-size: 20px; font-weight: bold; background: #f0f0f0; padding: 10px; text-align: center; margin: 20px 0; }
            @media print { body { margin: 0; padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="school-name">${formData.schoolName}</div>
              <div style="font-size: 12px; color: #666;">${formData.schoolAddress}</div>
            </div>
            
            <div class="receipt-title">FEE RECEIPT</div>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Receipt No:</span>
                <span>${receipt.receiptNumber || formData.receiptNumber}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date:</span>
                <span>${new Date(receipt.paymentDate || formData.paymentDate).toLocaleDateString()}</span>
              </div>
            </div>
            
            <hr style="margin: 20px 0;">
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Student Name:</span>
                <span>${receipt.studentName || selectedStudent?.name || ''}</span>
              </div>
              <div class="detail-row">
                <span class="label">Admission No:</span>
                <span>${receipt.admissionNumber || selectedStudent?.admissionNumber || ''}</span>
              </div>
              <div class="detail-row">
                <span class="label">Class:</span>
                <span>${receipt.className || selectedStudent?.classId?.name || ''}</span>
              </div>
              <div class="detail-row">
                <span class="label">Email:</span>
                <span>${receipt.email || selectedStudent?.email || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Phone:</span>
                <span>${receipt.phone || selectedStudent?.phone || 'N/A'}</span>
              </div>
            </div>
            
            <hr style="margin: 20px 0;">
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Fee Type:</span>
                <span>${receipt.feeType || formData.feeType}</span>
              </div>
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span>₹${parseFloat(receipt.amount || formData.amount as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="detail-row">
                <span class="label">Payment Method:</span>
                <span>${(receipt.paymentMethod || formData.paymentMethod)?.toUpperCase()}</span>
              </div>
            </div>
            
            <div class="amount-box">
              Total Amount: ₹${parseFloat(receipt.amount || formData.amount as any).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            
            ${receipt.remarks || formData.remarks ? `<div class="details"><div class="label">Remarks:</div><div>${receipt.remarks || formData.remarks}</div></div>` : ''}
            
            <div class="footer" style="margin-top: 30px;">
              <div style="margin-bottom: 50px;">_____________________</div>
              <div style="font-weight: bold;">Authorized Signature</div>
            </div>
          </div>
          <script>
            window.print();
            setTimeout(() => window.close(), 500);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadReceipt = (receipt: any) => {
    const selectedStudent = students.find(s => s._id === receipt.studentId);
    const csvContent = [
      ['Fee Receipt'],
      ['School Name:', formData.schoolName],
      ['Receipt Number:', receipt.receiptNumber],
      ['Date:', new Date(receipt.paymentDate).toLocaleDateString()],
      [],
      ['Student Details'],
      ['Name:', receipt.studentName || selectedStudent?.name],
      ['Admission No:', receipt.admissionNumber || selectedStudent?.admissionNumber],
      ['Class:', receipt.className || selectedStudent?.classId?.name],
      ['Email:', receipt.email || selectedStudent?.email],
      ['Phone:', receipt.phone || selectedStudent?.phone],
      [],
      ['Fee Details'],
      ['Fee Type:', receipt.feeType],
      ['Amount:', receipt.amount],
      ['Payment Method:', receipt.paymentMethod],
      ['Remarks:', receipt.remarks || ''],
    ]
      .map(row => row.join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `receipt-${receipt.receiptNumber}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success('Receipt downloaded!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fee Receipts</h2>
          <p className="text-gray-600 text-sm mt-1">Generate and manage fee receipts</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Printer className="h-4 w-4" />
          Generate Receipt
        </button>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Receipt No</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Student Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Admission No</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Fee Type</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Date</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No receipts found. Click "Generate Receipt" to create one.
                </td>
              </tr>
            ) : (
              receipts
                .slice((page - 1) * pageSize, page * pageSize)
                .map((receipt) => (
                <tr key={receipt._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{receipt.receiptNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{receipt.studentName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{receipt.admissionNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{receipt.feeType}</td>
                  <td className="px-6 py-4 text-sm font-medium text-right text-gray-900">₹{parseFloat(receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(receipt.paymentDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handlePrintReceipt(receipt)}
                        className="text-blue-600 hover:text-blue-800 inline-block"
                        title="Print Receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(receipt)}
                        className="text-green-600 hover:text-green-800 inline-block"
                        title="Download Receipt"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {receipts.length > 0 && (
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={receipts.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* Generate Receipt Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Generate Fee Receipt</h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* School Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
                <input
                  type="text"
                  value={formData.schoolName || ''}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Enter school name"
                />
              </div>

              {/* School Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Address</label>
                <input
                  type="text"
                  value={formData.schoolAddress || ''}
                  onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Enter school address"
                />
              </div>

              {/* Receipt Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Number</label>
                <input
                  type="text"
                  value={formData.receiptNumber || ''}
                  onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Receipt number"
                />
              </div>

              {/* Student Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Student Admission Number *</label>
                <input
                  type="text"
                  value={admissionSearch}
                  onChange={(e) => {
                    setAdmissionSearch(e.target.value);
                    setShowSuggestions(true);
                    if (!e.target.value) {
                      setFormData({ ...formData, studentId: '' });
                      setSelectedStudent(null);
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Enter admission number or student name..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
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
                          setFormData({ ...formData, studentId: student._id });
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

              {/* Fee Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type *</label>
                <input
                  type="text"
                  value={formData.feeType || ''}
                  onChange={(e) => setFormData({ ...formData, feeType: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="e.g., Monthly, Annual, Semester"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹) *</label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                <input
                  type="date"
                  value={formData.paymentDate || ''}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={formData.paymentMethod || 'cash'}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Add any additional notes"
                  rows={3}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReceipt}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeReceipt;
