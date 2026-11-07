import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Download, Printer, X, AlertCircle, CheckCircle, DollarSign, Calendar, Filter, MessageCircle } from 'lucide-react';
import { feesAPI, studentsAPI, classroomAPI, transportAPI, dormitoryAPI, settingsAPI, API_BASE_URL, getAssetUrl } from '../../services/api';
import { getWhatsAppUrl } from '../../utils/whatsapp';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

import { generateInvoiceHTML, handlePrintInvoice, InvoiceData, InvoiceItem } from '../../utils/invoiceHelper';

interface Student {
  _id: string;
  name: string;
  admissionNumber: string;
  classId?: {
    name: string;
    section?: string;
  };
  class?: {
    name: string;
    section?: string;
  };
  className?: string;
  classSection?: string;
  email?: string;
  phone?: string;
}

const Invoice: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [feeCollections, setFeeCollections] = useState<any[]>([]);
  const [allCollections, setAllCollections] = useState<any[]>([]);
  const [studentTransport, setStudentTransport] = useState<any | null>(null);
  const [studentDormitory, setStudentDormitory] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [admissionSearch, setAdmissionSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'search' | 'classwise'>('classwise'); // Default to classwise
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(10);

  const getDefaultFormData = (): InvoiceData => {
    const defaultSchool = {
      name: schoolSettings?.name || 'Spark Educational Institute',
      address: schoolSettings?.address || '123 Education Street, Knowledge City, State - 123456',
      phone: schoolSettings?.phone || '+91-9876543210',
      email: schoolSettings?.email || 'info@sparkedu.com',
    };

    return {
      invoiceNumber: `INV-${Date.now()}`,
      studentId: '',
      studentName: '',
      admissionNumber: '',
      className: '',
      classSection: '',
      email: '',
      phone: '',
      items: [{ description: '', amount: 0, quantity: 1 }],
      totalAmount: 0,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentStatus: 'pending',
      remarks: '',
      schoolName: defaultSchool.name,
      schoolAddress: defaultSchool.address,
      schoolPhone: defaultSchool.phone,
      schoolEmail: defaultSchool.email,
    };
  };

  const [formData, setFormData] = useState<InvoiceData>(getDefaultFormData());

  useEffect(() => {
    loadData();
    loadSchoolSettings();
  }, []);

  useEffect(() => {
    // Update form data when school settings change
    if (schoolSettings) {
      setFormData(prev => ({
        ...prev,
        schoolName: schoolSettings.name || prev.schoolName,
        schoolAddress: schoolSettings.address || prev.schoolAddress,
        schoolPhone: schoolSettings.phone || prev.schoolPhone,
        schoolEmail: schoolSettings.email || prev.schoolEmail,
      }));
    }
  }, [schoolSettings]);

  const loadSchoolSettings = async () => {
    try {
      const response = await settingsAPI.getSchoolInfo();
      const schoolData = response?.data || response;
      if (schoolData) {
        console.log('School settings loaded:', schoolData);
        setSchoolSettings(schoolData);
      }
    } catch (error: any) {
      console.error('Error loading school settings:', error);
      // Try to show a warning but don't block the user
      if (error.message && !error.message.includes('Not Found')) {
        toast.error('Failed to load school settings. Using default values.');
      }
      // Use default values if settings can't be loaded
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      loadStudentFeeCollections();
      loadStudentTransport();
      loadStudentDormitory();
    } else {
      setFeeCollections([]);
      setStudentTransport(null);
      setStudentDormitory(null);
    }
  }, [selectedStudent]);

  const loadStudentFeeCollections = async () => {
    if (!selectedStudent?._id) return;

    try {
      // Use already loaded collections or fetch if needed
      let collectionsToUse = allCollections;
      if (collectionsToUse.length === 0) {
        const collectionsRes = await feesAPI.getCollections();
        if (collectionsRes?.success) {
          collectionsToUse = collectionsRes.data || [];
          setAllCollections(collectionsToUse);
        }
      }

      // Filter collections for selected student
      const studentCollections = collectionsToUse.filter((col: any) => {
        const collectionStudentId = typeof col.student === 'object' ? col.student?._id : col.student;
        return collectionStudentId === selectedStudent._id;
      });

      // Sort by date (newest first)
      studentCollections.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.paymentDate || 0);
        const dateB = new Date(b.createdAt || b.paymentDate || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setFeeCollections(studentCollections);
    } catch (error) {
      console.error('Error loading fee collections:', error);
      toast.error('Failed to load fee collections');
    }
  };

  const loadStudentTransport = async () => {
    if (!selectedStudent?._id) return;

    try {
      const schoolId = localStorage.getItem('schoolId') || '';
      if (!schoolId) {
        console.warn('School ID not found');
        return;
      }

      const transportsRes = await transportAPI.getStudentsForFeeManagement(schoolId);
      if (transportsRes?.success) {
        const transportsData = transportsRes.data || [];
        // Find transport for selected student
        const transport = transportsData.find((t: any) => {
          const transportStudentId = typeof t.studentId === 'object' ? t.studentId?._id : t.studentId;
          return transportStudentId === selectedStudent._id && t.status === 'active';
        });
        setStudentTransport(transport || null);
      }
    } catch (error) {
      console.error('Error loading transport data:', error);
      // Don't show error toast for transport, it's optional
    }
  };

  const loadStudentDormitory = async () => {
    if (!selectedStudent?._id) return;

    try {
      const schoolId = localStorage.getItem('schoolId') || '';
      if (!schoolId) {
        console.warn('School ID not found');
        return;
      }

      const dormitoriesRes = await dormitoryAPI.getStudentsForFeeManagement(schoolId);
      if (dormitoriesRes?.success) {
        const dormitoriesData = dormitoriesRes.data || [];
        // Find dormitory for selected student
        const dormitory = dormitoriesData.find((d: any) => {
          const dormitoryStudentId = typeof d.studentId === 'object' ? d.studentId?._id : d.studentId;
          return dormitoryStudentId === selectedStudent._id && d.status === 'active';
        });
        setStudentDormitory(dormitory || null);
      }
    } catch (error) {
      console.error('Error loading dormitory data:', error);
      // Don't show error toast for dormitory, it's optional
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch students, classes, and collections from API
      try {
        const [studentsRes, classesRes, collectionsRes] = await Promise.all([
          studentsAPI.getAll(),
          classroomAPI.getClasses(),
          feesAPI.getCollections()
        ]);

        if (studentsRes?.success) {
          const studentsData = studentsRes.data || [];

          const normalizedStudents = studentsData.map((student: any) => {
            let className = 'N/A';
            let classSection = '';

            // Handle class information from different possible structures
            if (student?.classId) {
              if (typeof student.classId === 'object' && student.classId?.name) {
                className = student.classId.name;
                classSection = student.classId?.section || '';
              } else if (typeof student.classId === 'string') {
                className = student.classId;
              }
            } else if (student?.class) {
              if (typeof student.class === 'object' && student.class?.name) {
                className = student.class.name;
                classSection = student.class?.section || '';
              } else if (typeof student.class === 'string') {
                className = student.class;
              }
            }

            return {
              _id: student?._id || '',
              name: student?.name || '',
              admissionNumber: student?.admissionNumber || '',
              classId: student?.classId,
              class: student?.class,
              className,
              classSection,
              email: student?.email,
              phone: student?.phone,
            };
          });

          setStudents(normalizedStudents);
        } else {
          toast.error('Failed to load students');
        }

        if (classesRes?.success) {
          setClasses(classesRes.data || []);
        }

        if (collectionsRes?.success) {
          setAllCollections(collectionsRes.data || []);
        }
      } catch (apiError) {
        console.error('API Error:', apiError);
        toast.error('Unable to connect to backend. Please ensure the server is running.');
      }

      // Load invoices from localStorage
      const savedInvoices = localStorage.getItem('invoices');
      if (savedInvoices) {
        try {
          setInvoices(JSON.parse(savedInvoices));
        } catch (e) {
          console.error('Failed to parse invoices:', e);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }

    // Reload school settings if not loaded to ensure we have the latest data
    if (!schoolSettings) {
      await loadSchoolSettings();
    }

    // Check if there are any paid amounts before allowing invoice creation
    const totalPaidFromCollections = feeCollections.reduce((sum: number, c: any) => sum + (c.paidAmount || 0), 0);
    const totalPaidFromTransport = studentTransport?.paidAmount || 0;
    const totalPaidFromDormitory = studentDormitory?.paidAmount || 0;
    const totalPaid = totalPaidFromCollections + totalPaidFromTransport + totalPaidFromDormitory;

    if (totalPaid === 0) {
      toast.error('Cannot generate invoice: No paid fees found. Invoices can only be generated for fees that have been paid, not for dues.');
      return;
    }

    // Auto-populate invoice items from fee collections if available
    let invoiceItems: InvoiceItem[] = [];
    let calculatedTotal = 0;
    let suggestedPaymentStatus: 'pending' | 'partial' | 'paid' = 'paid';

    if (feeCollections.length > 0) {
      // Create invoice items from fee collections - ONLY include paid amounts, NOT dues
      // Classify as one-time or recurring for clear invoice display
      feeCollections.forEach((collection: any) => {
        const feeStructureName = typeof collection.feeStructure === 'object'
          ? collection.feeStructure?.name
          : 'Fee Collection';
        const paidAmount = collection.paidAmount || 0;
        const isOneTime = collection.feeStructure?.frequency === 'one-time' || !collection.month;

        // Only add to invoice if there's a paid amount (no dues allowed)
        if (paidAmount > 0) {
          invoiceItems.push({
            description: `${feeStructureName}${collection.month ? ` - ${collection.month}` : ''}${collection.academicYear ? ` (${collection.academicYear})` : ''} - Paid Amount`,
            amount: paidAmount,
            quantity: 1,
            chargeType: isOneTime ? 'one_time' : 'recurring',
          });
          calculatedTotal += paidAmount;
        }
      });
    }

    // Add transport fees if available - ONLY include paid amounts, NOT dues
    if (studentTransport && studentTransport.status === 'active') {
      const transportPaid = studentTransport.paidAmount || 0;
      const routeName = studentTransport.routeId && typeof studentTransport.routeId === 'object'
        ? studentTransport.routeId.name
        : 'Transport';
      const pickupPoint = studentTransport.pickupPoint || '';

      // Only add to invoice if there's a paid amount (no dues allowed)
      if (transportPaid > 0) {
        invoiceItems.push({
          description: `Transport Fee - ${routeName}${pickupPoint ? ` (${pickupPoint})` : ''} - Paid Amount`,
          amount: transportPaid,
          quantity: 1,
        });
        calculatedTotal += transportPaid;
      }
    }

    // Add dormitory fees if available - ONLY include paid amounts, NOT dues
    if (studentDormitory && studentDormitory.status === 'active') {
      const dormitoryPaid = studentDormitory.paidAmount || 0;
      const dormitoryName = studentDormitory.dormitoryId && typeof studentDormitory.dormitoryId === 'object'
        ? studentDormitory.dormitoryId.name
        : 'Dormitory';
      const roomNumber = studentDormitory.roomNumber || '';

      // Only add to invoice if there's a paid amount (no dues allowed)
      if (dormitoryPaid > 0) {
        invoiceItems.push({
          description: `Dormitory Fee - ${dormitoryName}${roomNumber ? ` (Room: ${roomNumber})` : ''} - Paid Amount`,
          amount: dormitoryPaid,
          quantity: 1,
        });
        calculatedTotal += dormitoryPaid;
      }
    }

    // Determine payment status - since we only include paid amounts, status should be 'paid'
    if (calculatedTotal > 0) {
      suggestedPaymentStatus = 'paid';
    }

    // If no items from collections, use default
    if (invoiceItems.length === 0) {
      invoiceItems = [{ description: '', amount: 0, quantity: 1 }];
    }

    setFormData({
      invoiceNumber: `INV-${Date.now()}`,
      studentId: selectedStudent._id || '',
      studentName: selectedStudent.name || '',
      admissionNumber: selectedStudent.admissionNumber || '',
      className: selectedStudent.className || 'N/A',
      classSection: selectedStudent.classSection || '',
      email: selectedStudent.email || '',
      phone: selectedStudent.phone || '',
      items: invoiceItems,
      totalAmount: calculatedTotal,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentStatus: suggestedPaymentStatus,
      remarks: feeCollections.length > 0 || studentTransport || studentDormitory ? `Invoice generated based on PAID amounts only (dues excluded) from fee collections${studentTransport ? ', transport fees' : ''}${studentDormitory ? ', and dormitory fees' : ''}. Total Paid Amount: ₹${(feeCollections.reduce((sum: number, c: any) => sum + (c.paidAmount || 0), 0) + (studentTransport?.paidAmount || 0) + (studentDormitory?.paidAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '',
      schoolName: schoolSettings?.name || 'Spark Educational Institute',
      schoolAddress: schoolSettings?.address || '123 Education Street, Knowledge City, State - 123456',
      schoolPhone: schoolSettings?.phone || '+91-9876543210',
      schoolEmail: schoolSettings?.email || 'info@sparkedu.com',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(getDefaultFormData());
  };

  const calculateTotal = (items: InvoiceItem[]): number => {
    return items.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0);
  };

  const handleAddItem = () => {
    const newItems = [...formData.items, { description: '', amount: 0, quantity: 1 }];
    const newTotal = calculateTotal(newItems);
    setFormData({ ...formData, items: newItems, totalAmount: newTotal });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const newTotal = calculateTotal(newItems);
    setFormData({ ...formData, items: newItems, totalAmount: newTotal });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    const newTotal = calculateTotal(newItems);
    setFormData({ ...formData, items: newItems, totalAmount: newTotal });
  };

  const handleSubmit = () => {
    if (!formData.studentId) {
      toast.error('Please select a student');
      return;
    }

    if (formData.items.length === 0 || formData.items.some(item => !item.description || item.amount <= 0)) {
      toast.error('Please add at least one item with description and amount');
      return;
    }

    try {
      let existingInvoices: InvoiceData[] = [];
      const saved = localStorage.getItem('invoices');
      if (saved) {
        existingInvoices = JSON.parse(saved);
      }

      const invoicePayload: InvoiceData = {
        ...formData,
        _id: formData._id || `INV-${Date.now()}`,
      };

      existingInvoices.push(invoicePayload);
      localStorage.setItem('invoices', JSON.stringify(existingInvoices));
      setInvoices(existingInvoices);

      // Try to save to backend as well
      saveInvoiceToBackend(invoicePayload);

      toast.success('Invoice created successfully!');
      closeModal();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to save invoice');
    }
  };

  const saveInvoiceToBackend = async (invoice: InvoiceData) => {
    try {
      const token = localStorage.getItem('school_token');
      const response = await fetch(`${API_BASE_URL}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(invoice),
      });

      if (!response.ok) {
        console.warn('Backend save failed, but invoice saved locally');
      }
    } catch (error) {
      console.warn('Could not save to backend, invoice saved locally:', error);
    }
  };

// Moved to src/utils/invoiceHelper.ts

  const handleDownloadInvoice = (invoice: InvoiceData) => {
    handlePrintInvoice(invoice, schoolSettings);
    toast.success('Opening PDF preview. Select "Save as PDF" to download.');
  };

  const handleDeleteInvoice = (invoiceId: string | undefined) => {
    if (!invoiceId) {
      toast.error('Invalid invoice');
      return;
    }

    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      let existingInvoices: InvoiceData[] = [];
      const saved = localStorage.getItem('invoices');
      if (saved) {
        existingInvoices = JSON.parse(saved);
      }
      existingInvoices = existingInvoices.filter((inv: InvoiceData) => inv._id !== invoiceId);
      localStorage.setItem('invoices', JSON.stringify(existingInvoices));
      setInvoices(existingInvoices);

      // Try to delete from backend
      deleteInvoiceFromBackend(invoiceId);

      toast.success('Invoice deleted!');
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };

  const deleteInvoiceFromBackend = async (invoiceId: string) => {
    try {
      const token = localStorage.getItem('school_token');
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        console.warn('Backend delete failed, but invoice deleted locally');
      }
    } catch (error) {
      console.warn('Could not delete from backend:', error);
    }
  };

  // Get students in selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];

    return students.filter(s => {
      const studentClassId = typeof s.classId === 'object' ? (s.classId as any)?._id : s.classId;
      return studentClassId === selectedClassId;
    });
  }, [students, selectedClassId]);

  // Calculate fee summary for each student in the class (only those with payments)
  const studentsWithFeeSummary = useMemo(() => {
    if (!selectedClassId) return [];

    return classStudents
      .map(student => {
        const studentCollections = allCollections.filter((c: any) => {
          const collectionStudentId = typeof c.student === 'object' ? c.student?._id : c.student;
          return collectionStudentId === student._id;
        });

        const totalFee = studentCollections.reduce((sum: number, c: any) => sum + (c.totalAmount || c.feeAmount || 0), 0);
        const totalPaid = studentCollections.reduce((sum: number, c: any) => sum + (c.paidAmount || 0), 0);
        const totalDue = totalFee - totalPaid;

        return {
          ...student,
          totalFee,
          totalPaid,
          totalDue,
          collections: studentCollections,
          isFullyPaid: totalDue === 0 && totalPaid > 0,
          isPartiallyPaid: totalPaid > 0 && totalDue > 0,
        };
      })
      .filter(student => student.totalPaid > 0); // Only show students who have made at least some payment
  }, [classStudents, allCollections, selectedClassId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Invoice Generation</h2>
        <p className="text-gray-600 text-sm mt-1">Create and manage student fee invoices</p>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setViewMode('classwise');
              setSelectedClassId('');
              setSelectedStudent(null);
            }}
            className={`px-4 py-2 rounded text-sm font-medium transition ${viewMode === 'classwise'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            <Filter className="h-4 w-4 inline mr-2" />
            Class-wise Selection
          </button>
          <button
            onClick={() => {
              setViewMode('search');
              setAdmissionSearch('');
              setSelectedStudent(null);
            }}
            className={`px-4 py-2 rounded text-sm font-medium transition ${viewMode === 'search'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            <Search className="h-4 w-4 inline mr-2" />
            Search by Admission Number
          </button>
        </div>
      </div>

      {/* Class-wise Selection */}
      {viewMode === 'classwise' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Select Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedStudent(null);
                }}
                className="w-full border border-gray-300 rounded px-3 py-3 text-sm"
              >
                <option value="">-- Select a Class --</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Student List for Selected Class */}
            {selectedClassId && studentsWithFeeSummary.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Students with Fee Payments ({studentsWithFeeSummary.length})
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Student</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Admission No</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Total Fee</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Paid</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Due</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Status</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {studentsWithFeeSummary.map((student) => (
                          <tr key={student._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                            <td className="px-4 py-3 text-gray-600">{student.admissionNumber}</td>
                            <td className="px-4 py-3 text-right text-gray-700">₹{student.totalFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right text-green-600 font-medium">₹{student.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right text-red-600 font-medium">₹{student.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.isFullyPaid ? 'bg-green-100 text-green-800' :
                                student.isPartiallyPaid ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                {student.isFullyPaid ? 'Paid' : student.isPartiallyPaid ? 'Partial' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setAdmissionSearch(student.admissionNumber || '');
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 border border-blue-300 rounded hover:bg-blue-50 transition"
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {selectedClassId && studentsWithFeeSummary.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  No students found with fee payments in this class. Students will appear here once they make payments in the Fee Collection section.
                </p>
              </div>
            )}

            {!selectedClassId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">Please select a class to view students with fee payments.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search by Admission Number */}
      {viewMode === 'search' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Search Student by Admission Number</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Enter admission number (e.g., ADM001)..."
                    value={admissionSearch}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setAdmissionSearch(value);
                      if (value.length > 0) {
                        const found = students.find(
                          s => s.admissionNumber?.toLowerCase() === value.toLowerCase()
                        );
                        if (found) {
                          setSelectedStudent(found);
                        } else {
                          setSelectedStudent(null);
                        }
                      } else {
                        setSelectedStudent(null);
                      }
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-3 pl-10 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setAdmissionSearch('');
                    setSelectedStudent(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 text-sm font-medium transition"
                >
                  Clear
                </button>
              </div>
              {students.length === 0 && !loading && (
                <p className="text-sm text-orange-600 mt-2">⚠️ No students loaded. Make sure backend is running.</p>
              )}
              {loading && (
                <p className="text-sm text-blue-600 mt-2">Loading students...</p>
              )}
              {students.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">{students.length} students available</p>
              )}
            </div>

            {/* Student Not Found Message (only for search view) */}
            {!selectedStudent && admissionSearch && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-red-700 font-medium">Student not found</p>
                    <p className="text-xs text-red-600">
                      Please check the admission number. {students.length > 0 && `We have ${students.length} students in the system.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Student Details & Fee Collections (shown for both views) */}
      {selectedStudent && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          {/* Student Info Card */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{selectedStudent.name}</h3>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <p>
                    Admission: <span className="font-medium">{selectedStudent.admissionNumber}</span>
                  </p>
                  <p>
                    Class: <span className="font-medium">{selectedStudent.className || 'Not assigned'}</span>
                  </p>
                  {selectedStudent.classSection && (
                    <p>
                      Section: <span className="font-medium">{selectedStudent.classSection}</span>
                    </p>
                  )}
                  {selectedStudent.email && (
                    <p>
                      Email: <span className="font-medium">{selectedStudent.email}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fee Collections Display */}
          {(feeCollections.length > 0 || studentTransport || studentDormitory) ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Fee Collections, Transport & Dormitory Fees</h4>
                </div>
                <button
                  onClick={() => {
                    loadStudentFeeCollections();
                    loadStudentTransport();
                    loadStudentDormitory();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-100 transition"
                  title="Refresh fee collections and transport"
                >
                  Refresh
                </button>
              </div>
              <div className="space-y-3">
                {feeCollections.map((collection: any) => {
                  const feeStructureName = typeof collection.feeStructure === 'object'
                    ? collection.feeStructure?.name
                    : 'Fee Collection';
                  const totalAmount = collection.totalAmount || collection.feeAmount || 0;
                  const paidAmount = collection.paidAmount || 0;
                  const dueAmount = collection.dueAmount !== undefined ? collection.dueAmount : (totalAmount - paidAmount);
                  const payments = collection.payments || [];
                  const status = collection.status || (dueAmount <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending'));

                  return (
                    <div key={collection._id} className="bg-white rounded p-3 border border-blue-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">{feeStructureName}</div>
                          {collection.month && (
                            <div className="text-xs text-gray-600 mt-1">Month: {collection.month}</div>
                          )}
                          {collection.academicYear && (
                            <div className="text-xs text-gray-600">Academic Year: {collection.academicYear}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-600">Total: <span className="font-medium">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                          <div className="text-xs text-green-600">Paid: <span className="font-medium">₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                          {dueAmount > 0 ? (
                            <div className="text-xs text-red-600">Due: <span className="font-medium">₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                          ) : (
                            <div className="text-xs text-green-700 font-semibold">Fully Paid ✓</div>
                          )}
                          <div className="mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${status === 'paid' ? 'bg-green-100 text-green-800' :
                              status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {payments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs font-semibold text-gray-700 mb-1">Payment History:</div>
                          <div className="space-y-1">
                            {payments.map((payment: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-green-600">₹{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-600 capitalize">{payment.paymentMethod}</span>
                                  {payment.transactionId && (
                                    <>
                                      <span className="text-gray-500">•</span>
                                      <span className="text-gray-500 text-xs">TXN: {payment.transactionId}</span>
                                    </>
                                  )}
                                </div>
                                <div className="text-gray-600">
                                  {new Date(payment.paymentDate).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Transport Fee Display */}
                {studentTransport && studentTransport.status === 'active' && (
                  <div className="bg-white rounded p-3 border border-blue-100 mt-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          Transport Fee - {studentTransport.routeId && typeof studentTransport.routeId === 'object'
                            ? studentTransport.routeId.name
                            : 'Transport'}
                        </div>
                        {studentTransport.pickupPoint && (
                          <div className="text-xs text-gray-600 mt-1">Pickup Point: {studentTransport.pickupPoint}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-600">Monthly Fee: <span className="font-medium">₹{(studentTransport.monthlyFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        <div className="text-xs text-green-600">Paid: <span className="font-medium">₹{(studentTransport.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        {(studentTransport.dueAmount || 0) > 0 ? (
                          <div className="text-xs text-red-600">Due: <span className="font-medium">₹{(studentTransport.dueAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        ) : (
                          <div className="text-xs text-green-700 font-semibold">Fully Paid ✓</div>
                        )}
                        <div className="mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${studentTransport.feeStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            studentTransport.feeStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {(studentTransport.feeStatus || 'pending').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {studentTransport.paymentHistory && studentTransport.paymentHistory.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Payment History:</div>
                        <div className="space-y-1">
                          {studentTransport.paymentHistory.map((payment: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-green-600">₹{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-600 capitalize">{payment.paymentMethod}</span>
                                {payment.transactionId && (
                                  <>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-gray-500 text-xs">TXN: {payment.transactionId}</span>
                                  </>
                                )}
                              </div>
                              <div className="text-gray-600">
                                {new Date(payment.paymentDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Dormitory Fee Display */}
                {studentDormitory && studentDormitory.status === 'active' && (
                  <div className="bg-white rounded p-3 border border-blue-100 mt-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          Dormitory Fee - {studentDormitory.dormitoryId && typeof studentDormitory.dormitoryId === 'object'
                            ? studentDormitory.dormitoryId.name
                            : 'Dormitory'}
                        </div>
                        {studentDormitory.roomNumber && (
                          <div className="text-xs text-gray-600 mt-1">Room: {studentDormitory.roomNumber}</div>
                        )}
                        {studentDormitory.bedNumber && (
                          <div className="text-xs text-gray-600">Bed: {studentDormitory.bedNumber}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-600">Monthly Fee: <span className="font-medium">₹{(studentDormitory.monthlyFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        <div className="text-xs text-green-600">Paid: <span className="font-medium">₹{(studentDormitory.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        {(studentDormitory.dueAmount || 0) > 0 ? (
                          <div className="text-xs text-red-600">Due: <span className="font-medium">₹{(studentDormitory.dueAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        ) : (
                          <div className="text-xs text-green-700 font-semibold">Fully Paid ✓</div>
                        )}
                        <div className="mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${studentDormitory.feeStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            studentDormitory.feeStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {(studentDormitory.feeStatus || 'pending').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {studentDormitory.paymentHistory && studentDormitory.paymentHistory.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Payment History:</div>
                        <div className="space-y-1">
                          {studentDormitory.paymentHistory.map((payment: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-green-600">₹{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-600 capitalize">{payment.paymentMethod}</span>
                                {payment.transactionId && (
                                  <>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-gray-500 text-xs">TXN: {payment.transactionId}</span>
                                  </>
                                )}
                              </div>
                              <div className="text-gray-600">
                                {new Date(payment.paymentDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">No fee collections, transport fees, or dormitory fees found for this student.</p>
              <p className="text-xs text-gray-500 mt-1">Fee collections, transport fees, and dormitory fees will appear here once payments are recorded.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Invoice Button */}
      {selectedStudent && (
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition w-full md:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create New Invoice
        </button>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Invoice No</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Student Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Class</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-700">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Date</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700">Status</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No invoices created yet. Select a student and click "Create New Invoice".
                </td>
              </tr>
            ) : (
              invoices
                .slice((invoicePage - 1) * invoicePageSize, invoicePage * invoicePageSize)
                .map((invoice) => (
                <tr key={invoice._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{invoice.studentName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{invoice.className}</td>
                  <td className="px-6 py-4 text-sm font-medium text-right text-gray-900">
                    ₹{parseFloat(invoice.totalAmount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${invoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {invoice.paymentStatus.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          const text = `Hello *${invoice.studentName}*, your invoice *${invoice.invoiceNumber}* for *₹${invoice.totalAmount}* has been generated. Status: ${invoice.paymentStatus.toUpperCase()}. You can view/download it from the school portal.`;
                          const wappUrl = getWhatsAppUrl(invoice.phone, text);
                          window.open(wappUrl, '_blank');
                        }}
                        className="text-green-500 hover:text-green-700 inline-block p-1.5 rounded-full hover:bg-green-50 transition"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(invoice, schoolSettings)}
                        className="text-blue-600 hover:text-blue-800 inline-block p-1.5 rounded-full hover:bg-blue-50 transition"
                        title="Print Invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="text-indigo-600 hover:text-indigo-800 inline-block p-1.5 rounded-full hover:bg-indigo-50 transition"
                        title="View/Save PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(invoice._id!)}
                        className="text-red-500 hover:text-red-700 inline-block p-1.5 rounded-full hover:bg-red-50 transition"
                        title="Delete Invoice"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {invoices.length > 0 && (
          <Pagination
            currentPage={invoicePage}
            pageSize={invoicePageSize}
            totalItems={invoices.length}
            onPageChange={setInvoicePage}
            onPageSizeChange={setInvoicePageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* Create Invoice Modal */}
      {
        isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Create Invoice</h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* School Information Display */}
                {schoolSettings && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-3">School Information</h4>
                    <div className="flex items-start gap-4">
                      {schoolSettings.logo && (
                        <img
                          src={schoolSettings.logo.startsWith('http')
                            ? schoolSettings.logo
                            : getAssetUrl(schoolSettings.logo)}
                          alt="School Logo"
                          className="w-20 h-20 object-contain border border-gray-200 rounded"
                        />
                      )}
                      <div className="flex-1 text-sm text-gray-700 space-y-1">
                        <div className="font-semibold text-gray-900">{formData.schoolName}</div>
                        {formData.schoolAddress && <div>{formData.schoolAddress}</div>}
                        <div className="flex gap-4 mt-2">
                          {formData.schoolPhone && <div>Phone: {formData.schoolPhone}</div>}
                          {formData.schoolEmail && <div>Email: {formData.schoolEmail}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Student Info Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2">Student Information</h4>
                  <div className="text-sm text-gray-700 grid grid-cols-2 gap-4">
                    <div><span className="font-medium">Name:</span> {selectedStudent?.name}</div>
                    <div><span className="font-medium">Admission No:</span> {selectedStudent?.admissionNumber}</div>
                    <div><span className="font-medium">Class:</span> {selectedStudent?.className}</div>
                    <div><span className="font-medium">Section:</span> {selectedStudent?.classSection || 'N/A'}</div>
                  </div>
                </div>

                {/* Invoice Meta */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number *</label>
                    <input
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date *</label>
                    <input
                      type="date"
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate || ''}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status *</label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                {/* Invoice Items */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-bold text-gray-700">Invoice Items *</label>
                    <button
                      onClick={handleAddItem}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start border p-3 rounded">
                        <div className="col-span-6">
                          <input
                            type="text"
                            placeholder="Description (e.g., Monthly Fees, Tuition)"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity || 1}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            min="1"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            placeholder="Amount"
                            value={item.amount}
                            onChange={(e) => handleItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-1">
                          {formData.items.length > 1 && (
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-900">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₹{parseFloat(formData.totalAmount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Add any additional notes or terms"
                  />
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
                  {loading ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Invoice;
