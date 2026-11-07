import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, X, AlertCircle, CheckCircle, DollarSign, Printer, FileText } from 'lucide-react';
import { feesAPI, studentsAPI, classroomAPI, transportAPI, dormitoryAPI, settingsAPI } from '../../services/api';
import { Users } from 'lucide-react';
import { handlePrintInvoice, InvoiceData, InvoiceItem } from '../../utils/invoiceHelper';
import toast from 'react-hot-toast';

interface OtherCharge {
  description: string;
  amount: number;
}

interface FeeCollectionData {
  _id?: string;
  student: string;
  studentName?: string;
  admissionNumber?: string;
  month: string;
  class?: string;
  feeAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  remarks?: string;
  status?: 'pending' | 'partial' | 'paid';
}

interface StudentFeesSummary {
  student: any;
  totalFee: number;
  totalPaid: number;
  totalDue: number;
  collections: FeeCollectionData[];
}

const FeeCollection: React.FC = () => {
  const [collections, setCollections] = useState<FeeCollectionData[]>([]);
  const [transportCollections, setTransportCollections] = useState<any[]>([]);
  const [dormitoryCollections, setDormitoryCollections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [transports, setTransports] = useState<any[]>([]);
  const [dormitories, setDormitories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Class-wise selection
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  
  // Payment frequency for generating installments
  const [paymentFrequency, setPaymentFrequency] = useState<string>('monthly');
  const [customPeriodMonths, setCustomPeriodMonths] = useState<number>(1);
  const [installments, setInstallments] = useState<any[]>([]);

  // Form state
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [feeStructureId, setFeeStructureId] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [otherCharges, setOtherCharges] = useState<OtherCharge[]>([]);
  const [formData, setFormData] = useState<FeeCollectionData>({
    student: '',
    month: new Date().toISOString().slice(0, 7),
    remarks: '',
    status: 'pending',
  });

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any | null>(null);
  const [isTransportPayment, setIsTransportPayment] = useState(false);
  const [isDormitoryPayment, setIsDormitoryPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [transactionId, setTransactionId] = useState<string>('');
  const [paymentRemarks, setPaymentRemarks] = useState<string>('');

  // Admission number search states for student selection
  const [studentAdmissionSearch, setStudentAdmissionSearch] = useState('');
  const [selectedStudentForSearch, setSelectedStudentForSearch] = useState<any>(null);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);

  // Student payment plan (annual / monthly / quarterly) for recurring fees
  const [studentPaymentPlan, setStudentPaymentPlan] = useState<'annual' | 'monthly' | 'quarterly'>('monthly');
  const [generatingDues, setGeneratingDues] = useState(false);

  // Get students in selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];

    return students.filter(s => {
      const studentClassId = typeof s.classId === 'object' ? s.classId?._id : s.classId;
      return studentClassId === selectedClassId;
    });
  }, [students, selectedClassId]);

  // Filtered students for autocomplete (from selected class)
  const filteredClassStudents = useMemo(() => {
    if (!studentAdmissionSearch) return classStudents; // Show all if no search
    const searchLower = studentAdmissionSearch.toLowerCase();
    return classStudents.filter(student =>
      (student as any).admissionNumber?.toLowerCase().includes(searchLower) ||
      student.name?.toLowerCase().includes(searchLower) ||
      student.rollNumber?.toLowerCase().includes(searchLower)
    );
  }, [classStudents, studentAdmissionSearch]);

  // Calculate fee summary for each student in the class
  const studentsWithFeeSummary = useMemo(() => {
    return classStudents.map(student => {
      const studentCollections = collections.filter(c => {
        const student_obj = c.student as any;
        if (!student_obj) return false;
        const collectionStudentId = typeof student_obj === 'object' ? student_obj._id : student_obj;
        return collectionStudentId === student._id;
      });

      // Get transport for this student
      const studentTransport = transports.find(t => {
        const transportStudentId = typeof t.studentId === 'object' ? t.studentId?._id : t.studentId;
        return transportStudentId === student._id && t.status === 'active';
      });

      // Get dormitory for this student
      const studentDormitory = dormitories.find(d => {
        const dormitoryStudentId = typeof d.studentId === 'object' ? d.studentId?._id : d.studentId;
        return dormitoryStudentId === student._id && d.status === 'active';
      });

      // Get fee structures for this student's class
      const studentClassId = typeof student.classId === 'object' ? student.classId?._id : student.classId;
      const applicableFeeStructures = feeStructures.filter(fs => {
        const fsClassId = typeof fs.class === 'object' ? fs.class?._id : fs.class;
        return fsClassId === studentClassId;
      });

      const totalFee = studentCollections.reduce((sum, c) => sum + (c.feeAmount || (c as any).totalAmount || 0), 0);
      const totalPaid = studentCollections.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
      
      // Get transport collections for this student (API returns studentId)
      const studentTransportCollections = transportCollections.filter((c: any) => {
        const id = c.studentId?._id ?? c.studentId ?? c.student?._id ?? c.student;
        return id?.toString() === (student._id?.toString?.() ?? student._id);
      });
      
      // Get dormitory collections for this student (API returns studentId)
      const studentDormitoryCollections = dormitoryCollections.filter((c: any) => {
        const id = c.studentId?._id ?? c.studentId ?? c.student?._id ?? c.student;
        return id?.toString() === (student._id?.toString?.() ?? student._id);
      });
      
      // Calculate transport fees: from collections if any, else from assigned transport monthly fee (so amount shows even before installments exist)
      const transportFromCollections = studentTransportCollections.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
      const transportFee = transportFromCollections > 0
        ? transportFromCollections
        : (studentTransport?.monthlyFee ? studentTransport.monthlyFee * 12 : 0);
      const transportPaid = studentTransportCollections.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
      const transportDue = studentTransportCollections.length > 0
        ? studentTransportCollections.reduce((sum, c) => sum + (c.dueAmount || 0), 0)
        : Math.max(0, transportFee - transportPaid);

      // Calculate dormitory fees: from collections if any, else from assigned dormitory monthly fee
      const dormitoryFromCollections = studentDormitoryCollections.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
      const dormitoryFee = dormitoryFromCollections > 0
        ? dormitoryFromCollections
        : (studentDormitory?.monthlyFee ? studentDormitory.monthlyFee * 12 : 0);
      const dormitoryPaid = studentDormitoryCollections.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
      const dormitoryDue = studentDormitoryCollections.length > 0
        ? studentDormitoryCollections.reduce((sum, c) => sum + (c.dueAmount || 0), 0)
        : Math.max(0, dormitoryFee - dormitoryPaid);
      
      const grandTotalFee = totalFee + transportFee + dormitoryFee;
      const grandTotalPaid = totalPaid + transportPaid + dormitoryPaid;
      const grandTotalDue = grandTotalFee - grandTotalPaid;
      
      const pendingCount = studentCollections.filter(c => c.status === 'pending' || c.status === 'partial').length;
      const paidCount = studentCollections.filter(c => c.status === 'paid').length;

      return {
        ...student,
        totalFee,
        totalPaid,
        totalDue: totalFee - totalPaid,
        transportFee,
        transportPaid,
        transportDue,
        dormitoryFee,
        dormitoryPaid,
        dormitoryDue,
        grandTotalFee,
        grandTotalPaid,
        grandTotalDue,
        pendingCount,
        paidCount,
        collections: studentCollections,
        transportCollections: studentTransportCollections,
        dormitoryCollections: studentDormitoryCollections,
        feeStructures: applicableFeeStructures,
        transport: studentTransport,
        dormitory: studentDormitory,
      };
    });
  }, [classStudents, collections, transportCollections, dormitoryCollections, feeStructures, transports, dormitories]);

  // Get the selected student with fee summary (must be after studentsWithFeeSummary)
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return studentsWithFeeSummary.find(s => s._id === selectedStudentId) || null;
  }, [selectedStudentId, studentsWithFeeSummary]);

  useEffect(() => {
    loadData();
    fetchSchoolSettings();
  }, []);

  // Load student payment plan when student is selected (uses optional API to avoid console errors if backend not updated)
  useEffect(() => {
    if (!selectedStudentId || !academicYear) {
      setStudentPaymentPlan('monthly');
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await feesAPI.getPaymentPlansOptional({ studentId: selectedStudentId, academicYear });
      if (!cancelled && res?.success && Array.isArray(res.data) && res.data.length > 0 && res.data[0].plan) {
        setStudentPaymentPlan(res.data[0].plan);
      } else if (!cancelled) {
        setStudentPaymentPlan('monthly');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedStudentId, academicYear]);

  const fetchSchoolSettings = useCallback(async () => {
    try {
      const response = await settingsAPI.getSchoolInfo();
      if (response && response.success) {
        setSchoolSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching school settings:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const schoolId = localStorage.getItem('schoolId') || '';
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      
      const [collectionsRes, studentsRes, structuresRes, classesRes, transportsRes, dormitoriesRes, transportCollectionsRes, dormitoryCollectionsRes] = await Promise.allSettled([
        feesAPI.getCollections(),
        studentsAPI.getAll(),
        feesAPI.getStructures(),
        classroomAPI.getClasses(),
        schoolId ? transportAPI.getStudentsForFeeManagement(schoolId) : Promise.resolve({ success: true, data: [] }),
        schoolId ? dormitoryAPI.getStudentsForFeeManagement(schoolId) : Promise.resolve({ success: true, data: [] }),
        schoolId ? transportAPI.getTransportFeeCollections({ schoolId, academicYear }).catch(() => ({ success: true, data: [] })) : Promise.resolve({ success: true, data: [] }),
        schoolId ? dormitoryAPI.getDormitoryFeeCollections({ schoolId, academicYear }).catch(() => ({ success: true, data: [] })) : Promise.resolve({ success: true, data: [] }),
      ]);

      // Extract values from Promise.allSettled results
      const getValue = (result: any) => result.status === 'fulfilled' ? result.value : { success: false, data: [] };
      
      const collectionsResValue = getValue(collectionsRes);
      const studentsResValue = getValue(studentsRes);
      const structuresResValue = getValue(structuresRes);
      const classesResValue = getValue(classesRes);
      const transportsResValue = getValue(transportsRes);
      const dormitoriesResValue = getValue(dormitoriesRes);
      const transportCollectionsResValue = getValue(transportCollectionsRes);
      const dormitoryCollectionsResValue = getValue(dormitoryCollectionsRes);

      if (collectionsResValue?.success) {
        setCollections(collectionsResValue.data || []);
      }
      if (transportCollectionsResValue?.success) {
        setTransportCollections(transportCollectionsResValue.data || []);
      }
      if (dormitoryCollectionsResValue?.success) {
        setDormitoryCollections(dormitoryCollectionsResValue.data || []);
      }
      if (studentsResValue?.success) {
        // Normalize students data to ensure class is properly populated
        const normalizedStudents = (studentsResValue.data || []).map((student: any) => {
          let className = 'N/A';

          // Handle class field - it could be an object or a string
          if (student.classId) {
            // classId is populated as an object from backend
            if (typeof student.classId === 'object' && student.classId.name) {
              className = `${student.classId.name}${student.classId.section ? ' - ' + student.classId.section : ''}`;
            } else if (typeof student.classId === 'string') {
              className = student.classId;
            }
          } else if (student.class) {
            // Fallback to class field if classId not available
            if (typeof student.class === 'object' && student.class.name) {
              className = `${student.class.name}${student.class.section ? ' - ' + student.class.section : ''}`;
            } else if (typeof student.class === 'string') {
              className = student.class;
            }
          }

          return {
            ...student,
            className: className, // Add normalized className field
          };
        });
        setStudents(normalizedStudents);
      }
      if (structuresResValue?.success) {
        setFeeStructures(structuresResValue.data || []);
      }
      if (classesResValue?.success) {
        setClasses(classesResValue.data || []);
      }
      if (transportsResValue?.success) {
        setTransports(transportsResValue.data || []);
      }
      if (dormitoriesResValue?.success) {
        setDormitories(dormitoriesResValue.data || []);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load fee collections');
    } finally {
      setLoading(false);
    }
  }, []);

  const openAddModal = useCallback(() => {
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }

    // Find fee structure for this student's class
    let classFeeStructureId = '';
    if (selectedStudent.classId) {
      const classStructure = feeStructures.find(fs => {
        const fsClassId = typeof fs.class === 'object' ? fs.class._id : fs.class;
        const studentClassId = typeof selectedStudent.classId === 'object' ? selectedStudent.classId._id : selectedStudent.classId;
        return fsClassId === studentClassId;
      });

      if (classStructure) {
        classFeeStructureId = classStructure._id || '';
      }
    }

    setFormData({
      student: selectedStudent._id,
      studentName: selectedStudent.name,
      admissionNumber: selectedStudent.admissionNumber,
      month: new Date().toISOString().slice(0, 7),
      remarks: '',
      status: 'pending',
    });
    setFeeStructureId(classFeeStructureId);
    setAcademicYear(new Date().getFullYear().toString());
    setDueDate(new Date().toISOString().split('T')[0]);
    setOtherCharges([]);
    setEditingId(null);
    setIsModalOpen(true);
  }, [selectedStudent, feeStructures]);

  const openEditModal = useCallback((collection: FeeCollectionData) => {
    setFormData(collection);
    setEditingId(collection._id || null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
    setOtherCharges([]);
    setInstallments([]);
    setPaymentFrequency('monthly');
    setCustomPeriodMonths(1);
    setFormData({
      student: selectedStudent?._id || '',
      studentName: selectedStudent?.name,
      admissionNumber: selectedStudent?.admissionNumber,
      month: new Date().toISOString().slice(0, 7),
      remarks: '',
      status: 'pending',
    });
  }, [selectedStudent]);

  const openPaymentModal = useCallback((collection: any, isTransport: boolean = false, isDormitory: boolean = false) => {
    setSelectedCollection(collection);
    setIsTransportPayment(isTransport);
    setIsDormitoryPayment(isDormitory);
    if (isTransport || isDormitory) {
      setPaymentAmount(collection.dueAmount || collection.transportDue || collection.dormitoryDue || collection.monthlyFee || 0);
    } else {
      setPaymentAmount(collection.dueAmount || 0);
    }
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setTransactionId('');
    setPaymentRemarks('');
    setIsPaymentModalOpen(true);
  }, []);

  const closePaymentModal = useCallback(() => {
    setIsPaymentModalOpen(false);
    setSelectedCollection(null);
    setIsTransportPayment(false);
    setIsDormitoryPayment(false);
    setPaymentAmount(0);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setTransactionId('');
    setPaymentRemarks('');
  }, []);

  const handleAddPayment = useCallback(async () => {
    if (!selectedCollection || !selectedCollection._id) {
      toast.error('No collection selected');
      return;
    }

    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (!paymentDate) {
      toast.error('Please select payment date');
      return;
    }

    if (!isTransportPayment && !isDormitoryPayment && paymentAmount > selectedCollection.dueAmount) {
      toast.error(`Payment amount cannot exceed due amount of ₹${selectedCollection.dueAmount}`);
      return;
    }
    
    if (isTransportPayment || isDormitoryPayment) {
      // For installment-based collections, use dueAmount; for old records, use the calculated outstanding
      const outstanding = selectedCollection.dueAmount || selectedCollection.transportDue || selectedCollection.dormitoryDue || selectedCollection.monthlyFee || 0;
      if (paymentAmount > outstanding) {
        toast.error(`Payment amount cannot exceed due amount of ₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        return;
      }
    }

    try {
      setLoading(true);
      
      if (isTransportPayment) {
        // Check if this is an installment-based collection or old transport record
        if (selectedCollection.type === 'transport' || selectedCollection.paymentFrequency) {
          // Use installment-based payment endpoint
          const response = await transportAPI.addTransportFeeCollectionPayment(selectedCollection._id, {
            amount: paymentAmount,
            paymentDate: paymentDate,
            paymentMethod: paymentMethod,
            transactionId: transactionId,
            remarks: paymentRemarks,
          });
          
          if (response?.success) {
            toast.success('Transport fee payment recorded successfully');
            closePaymentModal();
            loadData();
          } else {
            toast.error(response?.error || 'Failed to record transport fee payment');
          }
        } else {
          // Use old transport payment endpoint (backward compatibility)
          const response = await transportAPI.addTransportPayment(selectedCollection._id, {
            amount: paymentAmount,
            paymentDate: paymentDate,
            paymentMethod: paymentMethod,
            transactionId: transactionId,
            remarks: paymentRemarks,
          });
          
          if (response?.success) {
            toast.success('Transport fee payment recorded successfully');
            closePaymentModal();
            loadData();
          } else {
            toast.error(response?.error || 'Failed to record transport fee payment');
          }
        }
        setLoading(false);
        return;
      }
      
      if (isDormitoryPayment) {
        // Check if this is an installment-based collection or old dormitory record
        if (selectedCollection.type === 'dormitory' || selectedCollection.paymentFrequency) {
          // Use installment-based payment endpoint
          const response = await dormitoryAPI.addDormitoryFeeCollectionPayment(selectedCollection._id, {
            amount: paymentAmount,
            paymentDate: paymentDate,
            paymentMethod: paymentMethod,
            transactionId: transactionId,
            remarks: paymentRemarks,
          });
          
          if (response?.success) {
            toast.success('Dormitory fee payment recorded successfully');
            closePaymentModal();
            loadData();
          } else {
            toast.error(response?.error || 'Failed to record dormitory fee payment');
          }
        } else {
          // Use old dormitory payment endpoint (backward compatibility)
          const response = await dormitoryAPI.addDormitoryPayment(selectedCollection._id, {
            amount: paymentAmount,
            paymentDate: paymentDate,
            paymentMethod: paymentMethod,
            transactionId: transactionId,
            remarks: paymentRemarks,
          });
          
          if (response?.success) {
            toast.success('Dormitory fee payment recorded successfully');
            closePaymentModal();
            loadData();
          } else {
            toast.error(response?.error || 'Failed to record dormitory fee payment');
          }
        }
        setLoading(false);
        return;
      }
      
      // Handle regular fee payment
      const response = await feesAPI.addPayment(selectedCollection._id, {
        amount: paymentAmount,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        transactionId: transactionId || undefined,
        remarks: paymentRemarks || undefined,
      });

      if (response?.success) {
        toast.success('Payment recorded successfully!');
        await loadData();
        closePaymentModal();
      } else {
        toast.error(response?.message || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  }, [selectedCollection, paymentAmount, paymentDate, paymentMethod, transactionId, paymentRemarks, loadData, closePaymentModal, isTransportPayment, isDormitoryPayment]);

  const addOtherCharge = useCallback(() => {
    setOtherCharges(prev => [...prev, { description: '', amount: 0 }]);
  }, []);

  const removeOtherCharge = useCallback((index: number) => {
    setOtherCharges(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateOtherCharge = useCallback((index: number, field: keyof OtherCharge, value: any) => {
    setOtherCharges(prev => {
      const newCharges = [...prev];
      newCharges[index] = { ...newCharges[index], [field]: value };
      return newCharges;
    });
  }, []);

  const calculateTotalOtherCharges = useCallback(() => {
    return otherCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  }, [otherCharges]);

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

  const calculateStatus = useCallback((feeAmount: number, paidAmount: number) => {
    if (paidAmount === 0) return 'pending';
    if (paidAmount >= feeAmount) return 'paid';
    return 'partial';
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.student) {
      toast.error('Please select a student');
      return;
    }
    if (!feeStructureId) {
      toast.error('Please select a fee structure');
      return;
    }
    if (!academicYear) {
      toast.error('Please provide academic year');
      return;
    }

    // If installments are generated, create all of them
    if (installments.length > 0) {
      try {
        setLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const installment of installments) {
          try {
            const otherChargesText = otherCharges.length > 0
              ? `\n\nOther Charges:\n${otherCharges.map(c => `- ${c.description}: ₹${c.amount}`).join('\n')}\nTotal Other Charges: ₹${calculateTotalOtherCharges()}`
              : '';

            const payload: any = {
              student: formData.student,
              feeStructure: feeStructureId,
              academicYear: academicYear,
              month: installment.month,
              dueDate: installment.dueDate,
              paymentFrequency: paymentFrequency,
              customPeriodMonths: paymentFrequency === 'custom' ? customPeriodMonths : null,
              installmentNumber: installment.installmentNumber,
              quarterMonths: installment.quarterMonths || null,
              periodMonths: installment.periodMonths || null,
              remarks: (formData.remarks || '') + otherChargesText,
            };

            const response = await feesAPI.createCollection(payload);
            if (response?.success) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error: any) {
            console.error('Error creating installment:', error);
            errorCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully created ${successCount} installment(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
          await loadData();
          closeModal();
        } else {
          toast.error(`Failed to create installments. ${errorCount} error(s)`);
        }
      } catch (error: any) {
        console.error('Error:', error);
        toast.error(error.message || 'Failed to create installments');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Single collection creation (old flow)
    if (!dueDate) {
      toast.error('Please provide due date');
      return;
    }

    // Validate other charges
    const invalidCharges = otherCharges.filter(c => !c.description.trim() || c.amount <= 0);
    if (invalidCharges.length > 0) {
      toast.error('Please fill all other charges with valid description and amount');
      return;
    }

    try {
      setLoading(true);

      const otherChargesText = otherCharges.length > 0
        ? `\n\nOther Charges:\n${otherCharges.map(c => `- ${c.description}: ₹${c.amount}`).join('\n')}\nTotal Other Charges: ₹${calculateTotalOtherCharges()}`
        : '';

      const payload: any = {
        student: formData.student,
        feeStructure: feeStructureId,
        academicYear: academicYear,
        month: formData.month || undefined,
        dueDate: dueDate,
        paymentFrequency: paymentFrequency || 'monthly',
        customPeriodMonths: paymentFrequency === 'custom' ? customPeriodMonths : null,
        remarks: (formData.remarks || '') + otherChargesText,
      };

      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      let response;
      if (editingId) {
        response = await feesAPI.updateCollection(editingId, payload);
      } else {
        response = await feesAPI.createCollection(payload);
      }

      if (response?.success) {
        toast.success(editingId ? 'Collection updated!' : 'Collection recorded!');
        await loadData();
        closeModal();
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to save collection');
    } finally {
      setLoading(false);
    }
  }, [formData, editingId, students, loadData, closeModal, feeStructureId, academicYear, dueDate, otherCharges, calculateTotalOtherCharges, installments, paymentFrequency, customPeriodMonths]);


  const handlePrintOverallInvoice = useCallback(() => {
    if (!selectedStudent) return;

    const invoiceItems: InvoiceItem[] = [];
    let calculatedTotal = 0;

    // Standard Fee Collections
    selectedStudent.collections?.forEach((collection: any) => {
      if (collection.paidAmount > 0) {
        const feeStructureName = typeof collection.feeStructure === 'object'
          ? collection.feeStructure.name
          : feeStructures.find(f => f._id === collection.feeStructure)?.name || 'Fee';
        
        invoiceItems.push({
          description: `${feeStructureName}${collection.month ? ` - ${collection.month}` : ''}${collection.academicYear ? ` (${collection.academicYear})` : ''}`,
          amount: collection.paidAmount,
          quantity: 1,
          chargeType: 'recurring',
        });
        calculatedTotal += collection.paidAmount;
      }
    });

    // Transport Collections
    const studentTransportCollections = transportCollections.filter((c: any) => {
      const id = c.studentId?._id ?? c.studentId ?? c.student?._id ?? c.student;
      return id?.toString() === (selectedStudent._id?.toString?.() ?? selectedStudent._id);
    });

    studentTransportCollections.forEach((c: any) => {
      if (c.paidAmount > 0) {
        invoiceItems.push({
          description: `Transport Fee - ${c.month || 'Payment'}`,
          amount: c.paidAmount,
          quantity: 1,
          chargeType: 'recurring',
        });
        calculatedTotal += c.paidAmount;
      }
    });

    // Dormitory Collections
    const studentDormitoryCollections = dormitoryCollections.filter((c: any) => {
      const id = c.studentId?._id ?? c.studentId ?? c.student?._id ?? c.student;
      return id?.toString() === (selectedStudent._id?.toString?.() ?? selectedStudent._id);
    });

    studentDormitoryCollections.forEach((c: any) => {
      if (c.paidAmount > 0) {
        invoiceItems.push({
          description: `Dormitory Fee - ${c.month || 'Payment'}`,
          amount: c.paidAmount,
          quantity: 1,
          chargeType: 'recurring',
        });
        calculatedTotal += c.paidAmount;
      }
    });

    if (invoiceItems.length === 0) {
      toast.error('No payments found for this student to generate an invoice.');
      return;
    }

    const invoice: InvoiceData = {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      studentId: selectedStudent._id,
      studentName: selectedStudent.name,
      admissionNumber: selectedStudent.admissionNumber || '',
      className: selectedStudent.class?.name || selectedStudent.className || '',
      classSection: selectedStudent.class?.section || selectedStudent.classSection || '',
      items: invoiceItems,
      totalAmount: calculatedTotal,
      invoiceDate: new Date().toISOString(),
      paymentStatus: 'paid',
      schoolName: schoolSettings?.name || 'School Portal',
    };

    handlePrintInvoice(invoice, schoolSettings);
  }, [selectedStudent, feeStructures, transportCollections, dormitoryCollections, schoolSettings]);

  const handlePrintCollectionReceipt = useCallback((collection: any, type: 'standard' | 'transport' | 'dormitory', specificPayment?: any) => {
    if (!selectedStudent || !collection) return;

    const invoiceItems: InvoiceItem[] = [];
    const paidAmount = specificPayment ? (specificPayment.amount || 0) : (collection.paidAmount || 0);

    if (paidAmount <= 0) {
      toast.error('No payment has been made for this record.');
      return;
    }

    let description = '';
    if (type === 'standard') {
      const feeStructureName = typeof collection.feeStructure === 'object'
        ? collection.feeStructure.name
        : feeStructures.find(f => f._id === collection.feeStructure)?.name || 'Fee';
      description = `${feeStructureName}${collection.month ? ` - ${collection.month}` : ''}`;
    } else if (type === 'transport') {
      description = `Transport Fee - ${collection.month || 'Payment'}`;
    } else if (type === 'dormitory') {
      description = `Dormitory Fee - ${collection.month || 'Payment'}`;
    }

    invoiceItems.push({
      description: specificPayment ? `${description} (Partial Payment)` : description,
      amount: paidAmount,
      quantity: 1,
      chargeType: 'recurring',
    });

    // Use specific payment date if available, otherwise find latest payment date in history
    let invoiceDate = new Date().toISOString();
    if (specificPayment && specificPayment.paymentDate) {
      invoiceDate = specificPayment.paymentDate;
    } else if (collection.payments && collection.payments.length > 0) {
      // Sort payments by date descending and take the most recent
      const latestPayment = [...collection.payments].sort((a, b) => 
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      )[0];
      invoiceDate = latestPayment.paymentDate;
    } else if (collection.updatedAt) {
      invoiceDate = collection.updatedAt;
    }

    const invoice: InvoiceData = {
      invoiceNumber: `RCP-${Date.now().toString().slice(-6)}`,
      studentId: selectedStudent._id,
      studentName: selectedStudent.name,
      admissionNumber: selectedStudent.admissionNumber || '',
      className: selectedStudent.class?.name || selectedStudent.className || '',
      classSection: selectedStudent.class?.section || selectedStudent.classSection || '',
      items: invoiceItems,
      totalAmount: paidAmount,
      invoiceDate: invoiceDate,
      paymentStatus: 'paid',
      schoolName: schoolSettings?.name || 'School Portal',
    };

    handlePrintInvoice(invoice, schoolSettings);
  }, [selectedStudent, feeStructures, schoolSettings]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this collection record?')) return;

    try {
      setLoading(true);
      const response = await feesAPI.deleteCollection(id);
      if (response?.success) {
        toast.success('Collection deleted!');
        await loadData();
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  // Filter collections for selected student
  const filteredCollections = useMemo(() => {
    if (!selectedStudent) return [];

    return collections
      .filter(c => {
        const student_obj = c.student as any;
        if (!student_obj) return false;
        const collectionStudentId = typeof student_obj === 'object' ? student_obj._id : student_obj;
        return collectionStudentId === selectedStudent._id;
      })
      .filter(c => filterStatus === 'all' || c.status === filterStatus)
      .filter(c => {
        if (selectedMonthFilter === 'all') return true;
        const collectionMonth = (c as any).month || '';
        // For quarterly/custom, check if month falls within the period
        if ((c as any).paymentFrequency === 'quarterly' && (c as any).quarterMonths) {
          return (c as any).quarterMonths.includes(selectedMonthFilter);
        }
        if ((c as any).paymentFrequency === 'custom' && (c as any).periodMonths) {
          return (c as any).periodMonths.includes(selectedMonthFilter);
        }
        return collectionMonth === selectedMonthFilter || collectionMonth.startsWith(selectedMonthFilter);
      });
  }, [collections, selectedStudent, filterStatus, selectedMonthFilter]);

  // Generate month options for filtering
  const getMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    // Show 12 months back and 12 months forward
    for (let i = -12; i <= 12; i++) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthStr = monthDate.toISOString().slice(0, 7);
      months.push({
        value: monthStr,
        label: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    return months;
  };

  // Calculate student fee summary
  const studentFeeSummary = useMemo(() => {
    if (!selectedStudent) return null;

    const studentCollections = collections.filter(c => c.student === selectedStudent._id);
    const totalFee = studentCollections.reduce((sum, c) => sum + (c.feeAmount || 0), 0);
    const totalPaid = studentCollections.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const totalDue = totalFee - totalPaid;

    return { totalFee, totalPaid, totalDue, collections: studentCollections };
  }, [collections, selectedStudent]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Fee Collection</h2>
        <p className="text-gray-600 text-sm mt-1">Record and manage student fee payments</p>
      </div>

      {/* Month and Status Filter */}
      {selectedStudent && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Month</label>
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Months</option>
                {getMonthOptions().map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Class Selection Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">Select Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedStudentId(''); // Reset selected student when class changes
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

          {/* Student Selection */}
          {selectedClassId && classStudents.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-bold text-gray-700 mb-3">Search & Select Student</label>
              <div className="relative">
                <input
                  type="text"
                  value={studentAdmissionSearch}
                  onChange={(e) => {
                    setStudentAdmissionSearch(e.target.value);
                    setShowStudentSuggestions(true);
                  }}
                  onFocus={() => setShowStudentSuggestions(true)}
                  placeholder="Search by admission number, name, or roll number..."
                  className="w-full border border-gray-300 rounded px-3 py-3 text-sm"
                />

                {/* Student Suggestions Dropdown */}
                {showStudentSuggestions && filteredClassStudents.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredClassStudents.map((student) => (
                      <div
                        key={student._id}
                        onClick={() => {
                          setSelectedStudentId(student._id);
                          setStudentAdmissionSearch((student as any).admissionNumber || student.name);
                          setSelectedStudentForSearch(student);
                          setShowStudentSuggestions(false);
                        }}
                        className={`px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 ${selectedStudentId === student._id ? 'bg-blue-50' : ''
                          }`}
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
                {selectedStudentForSearch && selectedStudentId && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">
                      Selected: {selectedStudentForSearch.name} - {(selectedStudentForSearch as any).admissionNumber || selectedStudentForSearch.rollNumber}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Student Fee Details */}
          {selectedStudent && (
            <div className="mt-6 space-y-4">
              {/* Student Info Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedStudent.name || 'Unknown'}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-600">Admission No: {selectedStudent.admissionNumber || 'N/A'}</p>
                      <button
                        onClick={handlePrintOverallInvoice}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-white border border-blue-300 rounded-full hover:bg-blue-50 transition-colors"
                      >
                        <Printer size={12} />
                        Print Statement
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600 mb-1">Overall Summary</div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Total Fee</div>
                        <div className="font-bold text-gray-900">₹{((selectedStudent.grandTotalFee || selectedStudent.totalFee || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        {(selectedStudent.transportFee > 0 || selectedStudent.dormitoryFee > 0) && (
                          <div className="text-xs text-gray-500 mt-1">
                            (Fees: ₹{selectedStudent.totalFee?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            {selectedStudent.transportFee > 0 && <> + Transport: ₹{selectedStudent.transportFee?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>}
                            {selectedStudent.dormitoryFee > 0 && <> + Dormitory: ₹{selectedStudent.dormitoryFee?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>}
                            )
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-green-600">Paid</div>
                        <div className="font-bold text-green-600">₹{((selectedStudent.grandTotalPaid || selectedStudent.totalPaid || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div>
                        <div className="text-red-600">Due</div>
                        <div className="font-bold text-red-600">₹{((selectedStudent.grandTotalDue || selectedStudent.totalDue || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* One-time charges total - visible in fee collection */}
                {(() => {
                  const oneTimeTotal = (selectedStudent.feeStructures || []).reduce((sum: number, f: any) => {
                    const freq = (f.frequency || f.type || '').toString().toLowerCase();
                    if (freq === 'one-time' || freq === 'one_time') return sum + (f.totalAmount || f.amount || 0);
                    return sum;
                  }, 0);
                  if (oneTimeTotal <= 0) return null;
                  return (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-sm font-medium text-amber-800">One-time payment amount</div>
                      <div className="text-lg font-bold text-amber-900">₹{oneTimeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                      <p className="text-xs text-amber-700 mt-1">Admission, exam, lab, etc. — single payment per structure.</p>
                    </div>
                  );
                })()}

                {/* Payment plan and Generate dues - unified view for accountant */}
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Payment plan for {academicYear}:</label>
                      <select
                        value={studentPaymentPlan}
                        onChange={async (e) => {
                          const plan = e.target.value as 'annual' | 'monthly' | 'quarterly';
                          try {
                            const res = await feesAPI.upsertPaymentPlanOptional({
                              studentId: selectedStudent._id,
                              academicYear,
                              plan,
                            });
                            if (res?.success) {
                              setStudentPaymentPlan(plan);
                              toast.success('Payment plan updated');
                            } else if (res?.error) {
                              toast.error(res.error);
                            }
                          } catch (err: any) {
                            toast.error(err?.message || 'Failed to update plan');
                          }
                        }}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                      >
                        <option value="annual">Annual (1 payment)</option>
                        <option value="monthly">Monthly (12 installments)</option>
                        <option value="quarterly">Quarterly (4 installments)</option>
                      </select>
                    </div>
                    {(() => {
                      const hasExistingDues = (selectedStudent.collections || []).filter((c: any) => String(c.academicYear) === String(academicYear)).length > 0;
                      return (
                        <>
                          <button
                            type="button"
                            disabled={generatingDues || hasExistingDues}
                            onClick={async () => {
                              setGeneratingDues(true);
                              try {
                                const res = await feesAPI.generateDuesOptional({
                                  studentId: selectedStudent._id,
                                  academicYear,
                                });
                                if (res?.success) {
                                  toast.success(res?.message || 'Dues generated');
                                  loadData();
                                } else if (res?.error) {
                                  toast.error(res.error);
                                }
                              } catch (err: any) {
                                toast.error(err?.message || 'Failed to generate dues');
                              } finally {
                                setGeneratingDues(false);
                              }
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {generatingDues ? 'Generating...' : hasExistingDues ? 'Dues already generated' : 'Generate dues'}
                          </button>
                          {hasExistingDues && (
                            <span className="text-sm text-gray-600">Dues already generated for {academicYear}. Do not generate again.</span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    One-time charges (admission, exam, lab, etc.) are always one payment; this plan applies to tuition and other recurring fees.
                  </p>
                </div>
              </div>

              {/* Academic fees section label - then Fee Structures below */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                <h4 className="text-sm font-semibold text-gray-800">Academic fees</h4>
                <p className="text-xs text-gray-500">Fee structures and installments for this student (see below)</p>
              </div>

              {/* Dormitory Fee Section - Show when student has dormitory (fee > 0), with or without installments */}
              {selectedStudent.dormitoryFee > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-4 pb-3 border-b">
                    <div>
                      <h5 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                        <span>🏠</span> Dormitory Fee Installments
                      </h5>
                      <p className="text-xs text-gray-600 mt-1">
                        Total: ₹{selectedStudent.dormitoryFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | 
                        Paid: ₹{selectedStudent.dormitoryPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | 
                        Due: ₹{selectedStudent.dormitoryDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dormitory Installments List or placeholder when no installments yet */}
                  <div className="space-y-2">
                    {selectedStudent.dormitoryCollections && selectedStudent.dormitoryCollections.length > 0 ? selectedStudent.dormitoryCollections.map((collection: any) => {
                      const collectionDue = collection.dueAmount || 0;
                      const installmentLabel = collection.month 
                        ? new Date(collection.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        : collection.installmentNumber 
                          ? `Installment ${collection.installmentNumber}`
                          : 'Installment';
                      
                      return (
                        <div key={collection._id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{installmentLabel}</div>
                              {collection.paymentFrequency && (
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                                  {collection.paymentFrequency === 'monthly' ? 'Monthly' : collection.paymentFrequency === 'quarterly' ? 'Quarterly' : 'Custom'}
                                </span>
                              )}
                              {collection.quarterMonths && collection.quarterMonths.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Covers: {collection.quarterMonths.map((m: string) => new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })).join(', ')}
                                </div>
                              )}
                              {collection.periodMonths && collection.periodMonths.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Covers: {collection.periodMonths.map((m: string) => new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })).join(', ')}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Due: {new Date(collection.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                              <div className="flex items-center justify-end gap-2">
                                <div className="text-right">
                                  <div className="text-xs text-gray-600">Amount: ₹{collection.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                  <div className="text-xs text-green-600">Paid: ₹{collection.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                  <div className="text-sm font-bold text-red-600">Due: ₹{collectionDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                </div>
                                {collection.paidAmount > 0 && (
                                  <button
                                    onClick={() => handlePrintCollectionReceipt(collection, 'dormitory')}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Print Receipt"
                                  >
                                    <Printer size={16} />
                                  </button>
                                )}
                              </div>
                              {collectionDue > 0 && (
                                <button
                                  onClick={() => {
                                    openPaymentModal({ ...collection, type: 'dormitory' }, false, true);
                                  }}
                                  className="mt-2 w-full px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                >
                                  Record Payment
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-sm text-gray-500 italic">No installments generated yet. Generate from Transport/Dormitory tabs if needed.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Transport Fee Section - Show when student has transport (fee > 0), with or without installments */}
              {selectedStudent.transportFee > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-4 pb-3 border-b">
                    <div>
                      <h5 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                        <span>🚌</span> Transport Fee Installments
                      </h5>
                      <p className="text-xs text-gray-600 mt-1">
                        Total: ₹{selectedStudent.transportFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | 
                        Paid: ₹{selectedStudent.transportPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | 
                        Due: ₹{selectedStudent.transportDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Transport Installments List or placeholder when no installments yet */}
                  <div className="space-y-2">
                    {selectedStudent.transportCollections && selectedStudent.transportCollections.length > 0 ? selectedStudent.transportCollections.map((collection: any) => {
                      const collectionDue = collection.dueAmount || 0;
                      const installmentLabel = collection.month 
                        ? new Date(collection.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        : collection.installmentNumber 
                          ? `Installment ${collection.installmentNumber}`
                          : 'Installment';
                      
                      return (
                        <div key={collection._id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{installmentLabel}</div>
                              {collection.paymentFrequency && (
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                                  {collection.paymentFrequency === 'monthly' ? 'Monthly' : collection.paymentFrequency === 'quarterly' ? 'Quarterly' : 'Custom'}
                                </span>
                              )}
                              {collection.quarterMonths && collection.quarterMonths.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Covers: {collection.quarterMonths.map((m: string) => new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })).join(', ')}
                                </div>
                              )}
                              {collection.periodMonths && collection.periodMonths.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Covers: {collection.periodMonths.map((m: string) => new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })).join(', ')}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Due: {new Date(collection.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                              <div className="flex items-center justify-end gap-2">
                                <div className="text-right">
                                  <div className="text-xs text-gray-600">Amount: ₹{collection.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                  <div className="text-xs text-green-600">Paid: ₹{collection.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                  <div className="text-sm font-bold text-red-600">Due: ₹{collectionDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                </div>
                                {collection.paidAmount > 0 && (
                                  <button
                                    onClick={() => handlePrintCollectionReceipt(collection, 'transport')}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Print Receipt"
                                  >
                                    <Printer size={16} />
                                  </button>
                                )}
                              </div>
                              {collectionDue > 0 && (
                                <button
                                  onClick={() => {
                                    openPaymentModal({ ...collection, type: 'transport' }, true, false);
                                  }}
                                  className="mt-2 w-full px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                >
                                  Record Payment
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-sm text-gray-500 italic">No installments generated yet. Generate from Transport/Dormitory tabs if needed.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Fee Structures and Payments */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900">Fee Structures & Payments</h4>

                {selectedStudent.feeStructures && Array.isArray(selectedStudent.feeStructures) && selectedStudent.feeStructures.length > 0 ? (
                  selectedStudent.feeStructures.map((feeStructure: any) => {
                    // Find collections for this fee structure
                    const structureCollections = (selectedStudent.collections || []).filter((c: any) => {
                      const collectionStructureId = typeof c.feeStructure === 'object' ? c.feeStructure?._id : c.feeStructure;
                      return collectionStructureId === feeStructure._id;
                    });

                    // Structure total is the annual/period total (e.g. ₹75,000). Each collection is one installment; due = sum of installments' due amounts.
                    const structureTotal = feeStructure.totalAmount || feeStructure.amount || 0;
                    const structurePaid = (structureCollections || []).reduce((sum: number, c: any) => sum + (c.paidAmount || 0), 0);
                    const structureDue = (structureCollections || []).reduce((sum: number, c: any) => {
                      const due = c.dueAmount ?? ((c.totalAmount || c.feeAmount || 0) - (c.paidAmount || 0));
                      return sum + (Number(due) || 0);
                    }, 0);

                    return (
                      <div key={feeStructure._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        {/* Fee Structure Header */}
                        <div className="flex justify-between items-start mb-4 pb-3 border-b">
                          <div>
                            <h5 className="font-semibold text-gray-900 text-lg">{feeStructure.name}</h5>
                            <p className="text-xs text-gray-600 mt-1">
                              {(feeStructure.frequency || feeStructure.type || '').toString().toLowerCase() === 'one-time' || (feeStructure.frequency || feeStructure.type || '').toString().toLowerCase() === 'one_time' ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">One-time</span>
                              ) : (
                                <>
                                  <span className="capitalize">{feeStructure.type || feeStructure.frequency}</span>
                                  {feeStructure.dueDay && (
                                    <> • Due: {feeStructure.dueDay}{getDaySuffix(feeStructure.dueDay)} of each month</>
                                  )}
                                </>
                              )}
                            </p>
                            <p className="text-sm font-medium text-gray-700 mt-1">
                              Fee Amount: <span className="text-blue-600">₹{structureTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              {((feeStructure.frequency || feeStructure.type || '').toString().toLowerCase() === 'one-time' || (feeStructure.frequency || feeStructure.type || '').toString().toLowerCase() === 'one_time') && (
                                <span className="ml-2 text-xs text-amber-700">(one-time payment)</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right bg-gray-50 px-4 py-2 rounded">
                            <div className="text-xs text-gray-600 mb-1">Total for this Structure</div>
                            <div className="text-sm">
                              <div className="text-green-600">Paid: <span className="font-bold">₹{structurePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                              {structureDue > 0 && (
                                <div className="text-red-600">Due: <span className="font-bold">₹{structureDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                              )}
                              {structureDue <= 0 && structureCollections.length > 0 && (
                                <div className="text-green-700 font-semibold">Fully Paid</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Collections for this Fee Structure */}
                        {structureCollections.length > 0 ? (
                          <div className="space-y-3">
                            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Collections & Payments</div>
                            {structureCollections.map((collection: any, idx: number) => {
                              const collectionTotal = collection.totalAmount || collection.feeAmount || structureTotal;
                              const collectionPaid = collection.paidAmount || 0;
                              // Use dueAmount directly from database, or calculate it
                              const collectionDue = collection.dueAmount !== undefined && collection.dueAmount !== null 
                                ? collection.dueAmount 
                                : (collectionTotal - collectionPaid);

                              return (
                                <div key={collection._id || idx} className="bg-gray-50 border border-gray-200 rounded p-3">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {collection.month 
                                          ? new Date(collection.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                          : `Collection ${idx + 1}`}
                                        {(collection as any).paymentFrequency && (
                                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                                            {(collection as any).paymentFrequency === 'monthly' ? 'Monthly' : 
                                             (collection as any).paymentFrequency === 'quarterly' ? 'Quarterly' : 'Custom'}
                                          </span>
                                        )}
                                        {(collection as any).installmentNumber && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            (Installment {(collection as any).installmentNumber})
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        {collection.academicYear && `Academic Year: ${collection.academicYear}`}
                                        {(collection as any).paymentFrequency === 'quarterly' && (collection as any).quarterMonths && (
                                          <div className="mt-1">
                                            Covers: {(collection as any).quarterMonths.map((m: string) => 
                                              new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })
                                            ).join(', ')}
                                          </div>
                                        )}
                                        {(collection as any).paymentFrequency === 'custom' && (collection as any).periodMonths && (
                                          <div className="mt-1">
                                            Covers: {(collection as any).periodMonths.map((m: string) => 
                                              new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })
                                            ).join(', ')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs">
                                        <span className="text-gray-600">Amount: </span>
                                        <span className="font-medium">₹{collectionTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                      <div className="flex items-center justify-end gap-2 text-xs">
                                        <span className="text-green-600">Paid: </span>
                                        <span className="font-medium text-green-600">₹{collectionPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        {collectionPaid > 0 && (
                                          <button
                                            onClick={() => handlePrintCollectionReceipt(collection, 'standard')}
                                            className="ml-1 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Print Receipt"
                                          >
                                            <Printer size={12} />
                                          </button>
                                        )}
                                      </div>
                                      {collectionDue > 0 && (
                                        <div className="text-xs">
                                          <span className="text-red-600">Due: </span>
                                          <span className="font-medium text-red-600">₹{collectionDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Payment History for this Collection */}
                                  {collection.payments && Array.isArray(collection.payments) && collection.payments.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <div className="text-xs font-semibold text-gray-700 mb-2">Payment History:</div>
                                      <div className="space-y-1">
                                        {collection.payments.map((payment: any, paymentIdx: number) => (
                                          <div key={paymentIdx} className="flex justify-between items-center text-xs bg-white px-2 py-1.5 rounded border border-gray-200">
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
                                            <div className="flex items-center gap-2">
                                              <div className="text-gray-600">
                                                {new Date(payment.paymentDate).toLocaleDateString('en-IN', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric'
                                                })}
                                              </div>
                                              <button
                                                onClick={() => handlePrintCollectionReceipt(collection, 'standard', payment)}
                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Print Payment Receipt"
                                              >
                                                <Printer size={12} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Action Button */}
                                  {collectionDue > 0 && (
                                    <div className="mt-3">
                                      <button
                                        onClick={() => {
                                          setEditingId(collection._id);
                                          openPaymentModal(collection);
                                        }}
                                        className="text-sm text-green-600 hover:text-green-800 px-4 py-2 border border-green-300 rounded hover:bg-green-50 transition font-medium"
                                      >
                                        Record Payment (₹{collectionDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                                      </button>
                                    </div>
                                  )}
                                  {collectionDue <= 0 && collectionPaid > 0 && (
                                    <div className="mt-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 inline-block">
                                      ✓ Fully Paid
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic py-2">
                            No collections created yet for this fee structure.
                          </div>
                        )}

                        {/* Create Collection Button if no collections exist */}
                        {structureCollections.length === 0 && (
                          <div className="mt-4 pt-3 border-t">
                            <button
                              onClick={() => {
                                setFeeStructureId(feeStructure._id);
                                openAddModal();
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-300 rounded hover:bg-blue-50 transition font-medium"
                            >
                              Create Fee Collection
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500 italic p-4 bg-yellow-50 border border-yellow-200 rounded">
                    No fee structure defined for this class. Please create one in Fee Structure section.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No Student Selected Message */}
          {selectedClassId && classStudents.length > 0 && !selectedStudent && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-700">Please select a student to view their fee details and payment history.</p>
              </div>
            </div>
          )}

          {selectedClassId && classStudents.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-700">No students found in this class.</p>
            </div>
          )}

          {!selectedClassId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-700">Please select a class to view and manage student fees.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {isTransportPayment ? 'Record Transport Fee Payment' : isDormitoryPayment ? 'Record Dormitory Fee Payment' : 'Record Payment'}
              </h3>
              <button onClick={closePaymentModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Collection Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                {isTransportPayment ? (
                  <>
                    <div className="text-xs text-gray-600 mb-1">Transport Fee Installment</div>
                    {selectedCollection.month && (
                      <div className="font-medium text-gray-900">
                        {new Date(selectedCollection.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                    )}
                    {selectedCollection.installmentNumber && (
                      <div className="text-xs text-gray-600 mt-1">
                        Installment #{selectedCollection.installmentNumber}
                      </div>
                    )}
                    {selectedCollection.paymentFrequency && (
                      <div className="text-xs text-gray-600 mt-1">
                        Frequency: {selectedCollection.paymentFrequency === 'monthly' ? 'Monthly' : selectedCollection.paymentFrequency === 'quarterly' ? 'Quarterly' : 'Custom'}
                      </div>
                    )}
                    {selectedCollection.studentTransport?.routeId && (
                      <div className="text-xs text-gray-600 mt-1">
                        Route: {selectedCollection.studentTransport.routeId.name || 'N/A'}
                      </div>
                    )}
                    <div className="text-xs text-gray-600 mt-1">
                      Amount: ₹{(selectedCollection.totalAmount || selectedCollection.monthlyFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    {selectedCollection.paidAmount > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        Paid: ₹{(selectedCollection.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    <div className="text-xs text-red-600 mt-1 font-semibold">
                      Due: ₹{(selectedCollection.dueAmount || selectedCollection.transportDue || selectedCollection.monthlyFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </>
                ) : isDormitoryPayment ? (
                  <>
                    <div className="text-xs text-gray-600 mb-1">Dormitory Fee Installment</div>
                    {selectedCollection.month && (
                      <div className="font-medium text-gray-900">
                        {new Date(selectedCollection.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                    )}
                    {selectedCollection.installmentNumber && (
                      <div className="text-xs text-gray-600 mt-1">
                        Installment #{selectedCollection.installmentNumber}
                      </div>
                    )}
                    {selectedCollection.paymentFrequency && (
                      <div className="text-xs text-gray-600 mt-1">
                        Frequency: {selectedCollection.paymentFrequency === 'monthly' ? 'Monthly' : selectedCollection.paymentFrequency === 'quarterly' ? 'Quarterly' : 'Custom'}
                      </div>
                    )}
                    {selectedCollection.studentDormitory && (
                      <div className="text-xs text-gray-600 mt-1">
                        Room: {selectedCollection.studentDormitory.roomNumber || 'N/A'}
                      </div>
                    )}
                    <div className="text-xs text-gray-600 mt-1">
                      Amount: ₹{(selectedCollection.totalAmount || selectedCollection.monthlyFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    {selectedCollection.paidAmount > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        Paid: ₹{(selectedCollection.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    <div className="text-xs text-red-600 mt-1 font-semibold">
                      Due: ₹{(selectedCollection.dueAmount || selectedCollection.dormitoryDue || selectedCollection.monthlyFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-gray-600 mb-1">Fee Collection</div>
                    <div className="font-medium text-gray-900">
                      {typeof selectedCollection.feeStructure === 'object'
                        ? selectedCollection.feeStructure?.name
                        : 'Fee Structure'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Due Amount: ₹{selectedCollection.dueAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </div>
                  </>
                )}
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  min="0.01"
                  max={isTransportPayment ? (selectedCollection.dueAmount || selectedCollection.transportDue || selectedCollection.monthlyFee || 0) : isDormitoryPayment ? (selectedCollection.dueAmount || selectedCollection.dormitoryDue || selectedCollection.monthlyFee || 0) : (selectedCollection.dueAmount || 0)}
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isTransportPayment 
                    ? `Due Amount: ₹${(selectedCollection.dueAmount || selectedCollection.transportDue || selectedCollection.monthlyFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} of ₹${(selectedCollection.totalAmount || selectedCollection.monthlyFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : isDormitoryPayment
                    ? `Due Amount: ₹${(selectedCollection.dueAmount || selectedCollection.dormitoryDue || selectedCollection.monthlyFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} of ₹${(selectedCollection.totalAmount || selectedCollection.monthlyFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : `Due Amount: ₹${selectedCollection.dueAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}`
                  }
                </p>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Transaction ID */}
              {(paymentMethod === 'online' || paymentMethod === 'card' || paymentMethod === 'bank_transfer') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="Enter transaction ID"
                  />
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Add any notes"
                />
              </div>
            </div>

            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closePaymentModal}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition disabled:opacity-50"
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Collection' : 'Record Fee Payment'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Student Info Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2">Student Information</h4>
                <div className="text-sm text-gray-700">
                  <p><span className="font-medium">Name:</span> {selectedStudent?.name}</p>
                  <p><span className="font-medium">Admission No:</span> {selectedStudent?.admissionNumber}</p>
                </div>
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year *</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="2024-2025"
                  required
                />
              </div>

              {/* Fee Structure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fee Structure *</label>
                <select
                  value={feeStructureId}
                  onChange={(e) => {
                    setFeeStructureId(e.target.value);
                    setInstallments([]); // Reset installments when structure changes
                    const structure = feeStructures.find(fs => fs._id === e.target.value);
                    if (structure) {
                      setFormData({ ...formData, feeAmount: structure.periodTotalAmount || structure.totalAmount || structure.amount || 0 });
                    }
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select Fee Structure</option>
                  {feeStructures
                    .filter(fs => {
                      if (!selectedStudent?.classId) return false;
                      const fsClassId = typeof fs.class === 'object' ? fs.class._id : fs.class;
                      const studentClassId = typeof selectedStudent.classId === 'object' ? selectedStudent.classId._id : selectedStudent.classId;
                      return fsClassId === studentClassId;
                    })
                    .map(fs => (
                      <option key={fs._id} value={fs._id}>
                        {fs.name} - ₹{(fs.periodTotalAmount || fs.totalAmount || fs.amount || 0).toLocaleString('en-IN')}
                        {fs.startDate && fs.endDate && (
                          ` (${new Date(fs.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${new Date(fs.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`
                        )}
                      </option>
                    ))}
                </select>
              </div>

              {/* Payment Frequency */}
              {feeStructureId && (() => {
                const selectedStructure = feeStructures.find(fs => fs._id === feeStructureId);
                if (!selectedStructure || !selectedStructure.startDate || !selectedStructure.endDate) return null;
                
                return (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Frequency *</label>
                      <select
                        value={paymentFrequency}
                        onChange={(e) => {
                          setPaymentFrequency(e.target.value);
                          setInstallments([]); // Reset installments when frequency changes
                        }}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        required
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="custom">Custom Period</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select how the fee will be divided and collected
                      </p>
                    </div>

                    {/* Custom Period Months */}
                    {paymentFrequency === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Period (Months) *</label>
                        <input
                          type="number"
                          value={customPeriodMonths}
                          onChange={(e) => {
                            setCustomPeriodMonths(parseInt(e.target.value) || 1);
                            setInstallments([]);
                          }}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          min="1"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Number of months in each installment period (e.g., 2 for bi-monthly, 6 for semi-annual)
                        </p>
                      </div>
                    )}

                    {/* Generate Installments Button */}
                    <div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!feeStructureId || !selectedStudent) {
                            toast.error('Please select fee structure and student');
                            return;
                          }
                          
                          try {
                            setLoading(true);
                            const response = await feesAPI.generateInstallments({
                              student: selectedStudent._id,
                              feeStructure: feeStructureId,
                              academicYear: academicYear,
                              paymentFrequency: paymentFrequency,
                              customPeriodMonths: paymentFrequency === 'custom' ? customPeriodMonths : null
                            });
                            
                            if (response?.success) {
                              setInstallments(response.data || []);
                              toast.success(`Generated ${response.data?.length || 0} installments`);
                            } else {
                              toast.error(response?.error || 'Failed to generate installments');
                            }
                          } catch (error: any) {
                            console.error('Error generating installments:', error);
                            toast.error(error.message || 'Failed to generate installments');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition font-medium"
                        disabled={loading}
                      >
                        {loading ? 'Generating...' : 'Generate Installments'}
                      </button>
                    </div>

                    {/* Installments List */}
                    {installments.length > 0 && (
                      <div className="border-t pt-4">
                        <div className="text-sm font-semibold text-gray-700 mb-3">Generated Installments</div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {installments.map((installment, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    Installment {installment.installmentNumber}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Month: {new Date(installment.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                  </div>
                                  {installment.quarterMonths && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Covers: {installment.quarterMonths.map((m: string) => new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })).join(', ')}
                                    </div>
                                  )}
                                  {installment.periodMonths && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Covers: {installment.periodMonths.map((m: string) => new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })).join(', ')}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-600 mt-1">
                                    Due: {new Date(installment.dueDate).toLocaleDateString('en-US')}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-blue-600">
                                    ₹{installment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700">Total Installments:</span>
                            <span className="font-bold text-gray-900">{installments.length}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm mt-1">
                            <span className="font-medium text-gray-700">Total Amount:</span>
                            <span className="font-bold text-blue-600">
                              ₹{installments.reduce((sum, inst) => sum + inst.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Other Charges */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Other Charges</label>
                  <button
                    onClick={addOtherCharge}
                    type="button"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Charge
                  </button>
                </div>

                {otherCharges.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                    {otherCharges.map((charge, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={charge.description}
                            onChange={(e) => updateOtherCharge(idx, 'description', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="Charge description (e.g., Library, Lab, Sports)"
                          />
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            value={charge.amount}
                            onChange={(e) => updateOtherCharge(idx, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            placeholder="Amount"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <button
                          onClick={() => removeOtherCharge(idx)}
                          type="button"
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {otherCharges.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 font-medium">Total Other Charges:</span>
                      <span className="text-blue-700 font-bold">₹{calculateTotalOtherCharges().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                {otherCharges.length === 0 && (
                  <p className="text-xs text-gray-500 italic">No other charges added. Click "Add Charge" to add additional fees like transport, library, etc.</p>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Add any additional notes"
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
                {loading ? 'Saving...' : editingId ? 'Update' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeCollection;
