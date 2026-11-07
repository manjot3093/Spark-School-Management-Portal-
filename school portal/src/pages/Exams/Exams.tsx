import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Users,
  Plus,
  Calendar,
  FileText,
  CheckCircle,
  TrendingUp,
  BarChart3,
  X,
  Download,
  LayoutGrid
} from 'lucide-react';
import { examsAPI, classroomAPI } from '../../services/api';
import QuestionPapers from './QuestionPapers';
import Pagination from '../../components/common/Pagination';
import { useAuth } from '../../context/AuthContext';

interface Exam {
  _id: string;
  name: string;
  examType: string;
  subjectId: any;
  classId: any;
  examDate: string;
  examTime: string;
  duration: number;
  totalMarks: number;
  status: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  roomNumber?: string;
}

interface ExamMark {
  _id: string;
  studentId: any;
  examId: any;
  subjectId: any;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  isPassed: boolean;
}

interface Stats {
  totalExams: number;
  activeExams: number;
  totalStudents: number;
  avgScore: number;
  upcomingExams: any[];
  recentResults: any[];
}

const Exams: React.FC = () => {
  const { state: authState } = useAuth();
  const isTeacher = authState.user?.role === 'teacher';
  const [activeTab, setActiveTab] = useState(isTeacher ? 'question-papers' : 'overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [recentMarks, setRecentMarks] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<Exam[]>([]);
  const [dateSheet, setDateSheet] = useState<any>({});
  const [classes, setClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [overviewMarksPage, setOverviewMarksPage] = useState(1);
  const [overviewUpcomingPage, setOverviewUpcomingPage] = useState(1);
  const overviewPageSize = 5;
  
  // Filters for marks update
  const [filterExamType, setFilterExamType] = useState<string>('');
  const [filterMarksClass, setFilterMarksClass] = useState<string>('');
  const [bulkMarksEntries, setBulkMarksEntries] = useState<{ [key: string]: { marks: number; isAbsent: boolean } }>({});

  // Seating Plan state
  const [seatingPlans, setSeatingPlans] = useState<any[]>([]);
  const [seatingPlanForm, setSeatingPlanForm] = useState({
    examId: '',
    subjectId: '',
    roomNumber: '',
    selectedClasses: [] as string[],
    classCapacities: {} as { [key: string]: number },
    arrangementType: 'manual' as 'auto' | 'manual',
    rows: 5,
    columns: 6,
    studentsPerBench: 1 as 1 | 2,
    seatingArrangement: [] as any[]
  });
  const [selectedExamStudents, setSelectedExamStudents] = useState<any[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([]);
  const [viewingPlan, setViewingPlan] = useState<any | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditExamModal, setShowEditExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Form state for creating exam
  const [examForm, setExamForm] = useState({
    name: '',
    examType: 'Mid Term',
    subjectId: '',
    classId: '',
    startDate: '',
    endDate: '',
    examDate: '',
    examTime: '09:00',
    duration: 120,
    totalMarks: 100,
    description: '',
    roomNumber: ''
  });

  // Bulk exam creation state
  const [bulkExamForm, setBulkExamForm] = useState({
    name: '',
    examType: 'Mid Term',
    classId: '',
    startDate: '',
    endDate: '',
    duration: 120,
    totalMarks: 100,
    description: '',
    roomNumber: ''
  });
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
  const [subjectSchedules, setSubjectSchedules] = useState<{ [key: string]: { examDate: string, examTime: string } }>({});

  // Form state for marks entry
  const [marksForm, setMarksForm] = useState({
    examId: '',
    studentId: '',
    marksObtained: 0,
    remarks: '',
    isAbsent: false
  });

  // Admission number search states for marks modal
  const [marksAdmissionSearch, setMarksAdmissionSearch] = useState('');
  const [selectedMarksStudent, setSelectedMarksStudent] = useState<any>(null);
  const [showMarksSuggestions, setShowMarksSuggestions] = useState(false);

  // Filtered students for marks modal autocomplete
  const filteredMarksStudents = students.filter(student => {
    if (!marksAdmissionSearch) return false;
    const searchLower = marksAdmissionSearch.toLowerCase();
    return (
      (student as any).admissionNumber?.toLowerCase().includes(searchLower) ||
      student.name?.toLowerCase().includes(searchLower) ||
      student.rollNumber?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 5);

  const schoolId = localStorage.getItem('schoolId') || '';
  const token = localStorage.getItem('school_token') || '';

  const tabs = [
    ...(isTeacher ? [] : [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'create-exam', label: 'Create New Exam', icon: Plus },
    { id: 'exam-marks', label: 'Add / Update Exam Marks', icon: BarChart3 },
    { id: 'exam-schedule', label: 'Exam Schedule', icon: Calendar },
    { id: 'date-sheet', label: 'Date Sheet', icon: BookOpen },
    ]),
    { id: 'question-papers', label: 'Question Papers', icon: FileText },
    ...(isTeacher ? [] : [
    { id: 'seating-plan', label: 'Seating Plan', icon: LayoutGrid },
    ]),
  ];

  useEffect(() => {
    if (!token) {
      console.error('No authentication token found! User needs to login.');
      alert('You are not logged in. Please login first.');
      return;
    }

    if (schoolId) {
      loadInitialData();
      if (!isTeacher) loadExams();
    } else {
      console.warn('No schoolId found in localStorage');
    }
  }, [schoolId, isTeacher]);

  useEffect(() => {
    if (isTeacher) { setActiveTab('question-papers'); return; }
    if (activeTab === 'overview' && schoolId) {
      loadStats();
      loadRecentMarks();
    } else if (activeTab === 'exam-marks') {
      loadExams(); // Load exams for dropdown
      loadMarks();
    } else if (activeTab === 'exam-schedule') {
      loadSchedule();
    } else if (activeTab === 'date-sheet') {
      loadDateSheet();
    } else if (activeTab === 'seating-plan') {
      loadExams(); // Load exams for seating plan
      loadSeatingPlans();
    }
  }, [activeTab, schoolId, isTeacher]);

  // Load students when exam is selected for seating plan
  useEffect(() => {
    if (activeTab === 'seating-plan' && seatingPlanForm.examId && seatingPlanForm.selectedClasses.length > 0) {
      loadStudentsForSeatingPlan();
    }
  }, [seatingPlanForm.examId, seatingPlanForm.selectedClasses, activeTab]);

  // Filter subjects when class is selected in exam form or bulk exam form
  useEffect(() => {
    const classIdToUse = examForm.classId || bulkExamForm.classId;

    if (classIdToUse && allSubjects.length > 0) {
      // Find the selected class
      const selectedClassData = classes.find(c => c._id === classIdToUse);
      if (selectedClassData && selectedClassData.subjects && selectedClassData.subjects.length > 0) {
        // Filter subjects that are assigned to this class
        const classSubjectIds = selectedClassData.subjects.map((s: any) => typeof s === 'string' ? s : s._id);
        const filtered = allSubjects.filter(subject => classSubjectIds.includes(subject._id));
        setFilteredSubjects(filtered);
      } else {
        // If class doesn't have subjects array, filter by classId field in subjects
        const filtered = allSubjects.filter(subject => subject.classId === classIdToUse || subject.classId?._id === classIdToUse);
        if (filtered.length > 0) {
          setFilteredSubjects(filtered);
        } else {
          // Fallback: show all subjects if no class-specific filtering works
          setFilteredSubjects(allSubjects);
        }
      }
    } else {
      // No class selected, show empty list for bulk form
      if (bulkExamForm.classId === '') {
        setFilteredSubjects([]);
      } else {
        setFilteredSubjects(allSubjects);
      }
    }
  }, [examForm.classId, bulkExamForm.classId, allSubjects, classes]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('Loading initial data with schoolId:', schoolId);

      const [classesData, subjectsData, studentsData] = await Promise.all([
        classroomAPI.getClasses({ limit: 1000 }),
        classroomAPI.getSubjects({ limit: 1000 }),
        isTeacher ? Promise.resolve({ data: [] }) : classroomAPI.getStudents({ schoolId, limit: 1000 })
      ]);

      console.log('Raw Classes Response:', classesData);
      console.log('Raw Subjects Response:', subjectsData);
      console.log('Raw Students Response:', studentsData);

      // Extract data properly
      const extractedClasses = classesData?.data || classesData || [];
      const extractedSubjects = subjectsData?.data || subjectsData || [];
      const extractedStudents = studentsData?.data || studentsData || [];

      console.log('Extracted Classes:', extractedClasses);
      console.log('Extracted Subjects:', extractedSubjects);
      console.log('Extracted Students:', extractedStudents);

      setClasses(extractedClasses);
      setAllSubjects(extractedSubjects);
      setStudents(extractedStudents);

      if (extractedClasses.length === 0) {
        console.warn('No classes found! Check if user has schoolId in token');
      }
      if (extractedSubjects.length === 0) {
        console.warn('No subjects found!');
      }
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      console.error('Error details:', error.message);
      console.error('Error response:', error.response);
      alert(`Error loading data: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await examsAPI.getStats(schoolId);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentMarks = async () => {
    try {
      console.log('Loading recent exam marks...');
      const response = await examsAPI.getAllMarks({ schoolId, limit: 20 });
      console.log('Recent marks response:', response);
      const marksData = response.data || response || [];
      console.log('Recent marks data:', marksData);
      // Sort by creation date to get most recent first
      const sortedMarks = marksData.sort((a: any, b: any) => {
        return new Date(b.createdAt || b.examId?.examDate).getTime() -
          new Date(a.createdAt || a.examId?.examDate).getTime();
      });
      setRecentMarks(sortedMarks.slice(0, 10)); // Take top 10 most recent
    } catch (error) {
      console.error('Error loading recent marks:', error);
    }
  };

  const loadExams = async () => {
    try {
      console.log('Loading exams with schoolId:', schoolId);
      const response = await examsAPI.getAll({ schoolId });
      console.log('Exams API Response:', response);

      const examsList = response.data || response || [];
      console.log('Extracted Exams:', examsList);

      setExams(examsList);

      if (examsList.length === 0) {
        console.warn('No exams found! Create some exams first.');
      }
    } catch (error: any) {
      console.error('Error loading exams:', error);
      console.error('Error message:', error.message);
    }
  };

  const loadMarks = async () => {
    try {
      setLoading(true);
      const response = await examsAPI.getAllMarks({ schoolId });
      setMarks(response.data || []);
    } catch (error) {
      console.error('Error loading marks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await examsAPI.getSchedule({ schoolId });
      setSchedule(response.data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDateSheet = async (classId?: string) => {
    try {
      setLoading(true);
      const params: any = { schoolId };
      const classIdToUse = classId !== undefined ? classId : selectedClass;
      if (classIdToUse) {
        params.classId = classIdToUse;
      }
      const response = await examsAPI.getDateSheet(params);
      setDateSheet(response.data || {});
    } catch (error) {
      console.error('Error loading date sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await examsAPI.create({
        ...examForm,
        schoolId
      });
      alert('Exam created successfully!');
      setExamForm({
        name: '',
        examType: 'Mid Term',
        subjectId: '',
        classId: '',
        startDate: '',
        endDate: '',
        examDate: '',
        examTime: '09:00',
        duration: 120,
        totalMarks: 100,
        description: '',
        roomNumber: ''
      });
      loadExams();
    } catch (error: any) {
      alert('Error creating exam: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCreateExams = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSubjects.length === 0) {
      alert('Please select at least one subject');
      return;
    }

    // Check if all selected subjects have schedules
    const unscheduledSubjects = selectedSubjects.filter(subject => !subjectSchedules[subject._id]);
    if (unscheduledSubjects.length > 0) {
      alert(`Please set exam date and time for: ${unscheduledSubjects.map(s => s.name).join(', ')}`);
      return;
    }

    try {
      setLoading(true);
      const examsToCreate = selectedSubjects.map(subject => ({
        name: `${bulkExamForm.name} - ${subject.name}`,
        examType: bulkExamForm.examType,
        subjectId: subject._id,
        classId: bulkExamForm.classId,
        startDate: bulkExamForm.startDate,
        endDate: bulkExamForm.endDate,
        examDate: subjectSchedules[subject._id].examDate,
        examTime: subjectSchedules[subject._id].examTime,
        duration: bulkExamForm.duration,
        totalMarks: bulkExamForm.totalMarks,
        description: bulkExamForm.description,
        roomNumber: bulkExamForm.roomNumber || '',
        schoolId
      }));

      await examsAPI.bulkCreate(examsToCreate);
      alert(`Successfully created ${examsToCreate.length} exams!`);

      // Reset form
      setBulkExamForm({
        name: '',
        examType: 'Mid Term',
        classId: '',
        startDate: '',
        endDate: '',
        duration: 120,
        totalMarks: 100,
        description: '',
        roomNumber: ''
      });
      setSelectedSubjects([]);
      setSubjectSchedules({});
      loadExams();
    } catch (error: any) {
      alert('Error creating exams: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubject = (subject: any) => {
    setSelectedSubjects(prevSubjects => {
      const isSelected = prevSubjects.find(s => s._id === subject._id);
      if (isSelected) {
        // Remove subject
        const newSchedules = { ...subjectSchedules };
        delete newSchedules[subject._id];
        setSubjectSchedules(newSchedules);
        return prevSubjects.filter(s => s._id !== subject._id);
      } else {
        // Add subject
        return [...prevSubjects, subject];
      }
    });
  };

  const handleSetSubjectSchedule = (subjectId: string, examDate: string, examTime: string) => {
    setSubjectSchedules(prevSchedules => ({
      ...prevSchedules,
      [subjectId]: { examDate, examTime }
    }));
  };

  const handleAddMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    const examToUse = marksForm.examId || selectedExam;
    if (!examToUse) {
      alert('Please select an exam');
      return;
    }
    try {
      setLoading(true);
      await examsAPI.addMarks(examToUse, {
        studentId: marksForm.studentId,
        marksObtained: marksForm.marksObtained,
        remarks: marksForm.remarks,
        isAbsent: marksForm.isAbsent
      });
      alert('Marks added successfully!');
      setShowMarksModal(false);
      setMarksForm({
        examId: '',
        studentId: '',
        marksObtained: 0,
        remarks: '',
        isAbsent: false
      });
      loadMarks();
      loadRecentMarks(); // Refresh recent marks in overview
      setCurrentPage(1); // Reset to first page after adding marks
    } catch (error: any) {
      alert('Error adding marks: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;

    try {
      await examsAPI.delete(id);
      alert('Exam deleted successfully!');
      loadSchedule();
    } catch (error: any) {
      alert('Error deleting exam: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEditExam = (exam: Exam) => {
    console.log('handleEditExam called with exam:', exam);
    try {
      setEditingExam(exam);
      // Format dates for input fields
      const examDate = exam.examDate ? new Date(exam.examDate).toISOString().split('T')[0] : '';
      const startDate = (exam as any).startDate ? new Date((exam as any).startDate).toISOString().split('T')[0] : '';
      const endDate = (exam as any).endDate ? new Date((exam as any).endDate).toISOString().split('T')[0] : '';

      setExamForm({
        name: exam.name || '',
        examType: exam.examType || 'Mid Term',
        subjectId: typeof exam.subjectId === 'object' ? exam.subjectId?._id : exam.subjectId || '',
        classId: typeof exam.classId === 'object' ? exam.classId?._id : exam.classId || '',
        startDate: startDate,
        endDate: endDate,
        examDate: examDate,
        examTime: exam.examTime || '09:00',
        duration: exam.duration || 120,
        totalMarks: exam.totalMarks || 100,
        description: exam.description || '',
        roomNumber: (exam as any).roomNumber || ''
      });
      setShowEditExamModal(true);
      console.log('Edit modal should be visible now');
    } catch (error) {
      console.error('Error in handleEditExam:', error);
      alert('Error opening edit form: ' + (error as Error).message);
    }
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;

    try {
      setLoading(true);
      await examsAPI.update(editingExam._id, {
        ...examForm,
        schoolId
      });
      alert('Exam updated successfully!');
      setShowEditExamModal(false);
      setEditingExam(null);
      setExamForm({
        name: '',
        examType: 'Mid Term',
        subjectId: '',
        classId: '',
        startDate: '',
        endDate: '',
        examDate: '',
        examTime: '09:00',
        duration: 120,
        totalMarks: 100,
        description: '',
        roomNumber: ''
      });
      loadExams();
      loadSchedule();
    } catch (error: any) {
      alert('Error updating exam: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Helper function to check if exam is still upcoming (date + time is in the future)
  const isExamUpcoming = (exam: any) => {
    if (!exam.examDate) return false;
    
    try {
      const examDate = new Date(exam.examDate);
      
      // If examTime is provided, combine date and time
      if (exam.examTime) {
        const [hours, minutes] = exam.examTime.split(':');
        examDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        // If no time, check if date is today or in the future
        examDate.setHours(23, 59, 59, 999);
      }
      
      const now = new Date();
      return examDate > now;
    } catch (error) {
      console.error('Error checking exam date:', error);
      return false;
    }
  };

  // Seating Plan functions
  const loadSeatingPlans = async () => {
    try {
      // For now, load from localStorage - later can be moved to backend API
      const savedPlans = localStorage.getItem(`seatingPlans_${schoolId}`);
      if (savedPlans) {
        setSeatingPlans(JSON.parse(savedPlans));
      }
    } catch (error) {
      console.error('Error loading seating plans:', error);
    }
  };

  const loadStudentsForSeatingPlan = async () => {
    try {
      setLoading(true);
      const allStudents: any[] = [];

      // Load students from all selected classes
      for (const classId of seatingPlanForm.selectedClasses) {
        const response = await classroomAPI.getStudents({ classId, schoolId, limit: 1000 });
        const classStudents = response.data || response || [];
        allStudents.push(...classStudents);
      }

      setSelectedExamStudents(allStudents);
    } catch (error: any) {
      console.error('Error loading students for seating plan:', error);
      alert(`Error loading students: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelectionForSeating = (examId: string) => {
    const selectedExam = exams.find(e => e._id === examId);
    if (selectedExam) {
      setSeatingPlanForm({
        ...seatingPlanForm,
        examId: examId,
        subjectId: typeof selectedExam.subjectId === 'string' ? selectedExam.subjectId : selectedExam.subjectId?._id || '',
      });
    }
  };

  const handleToggleClassForSeating = (classId: string) => {
    const isSelected = seatingPlanForm.selectedClasses.includes(classId);
    let newSelectedClasses: string[];
    const newClassCapacities = { ...seatingPlanForm.classCapacities };

    if (isSelected) {
      newSelectedClasses = seatingPlanForm.selectedClasses.filter(id => id !== classId);
      delete newClassCapacities[classId];
    } else {
      newSelectedClasses = [...seatingPlanForm.selectedClasses, classId];
      // Set default capacity from class data
      const classData = classes.find(c => c._id === classId);
      if (classData) {
        newClassCapacities[classId] = classData.capacity || 30;
      }
    }

    setSeatingPlanForm({
      ...seatingPlanForm,
      selectedClasses: newSelectedClasses,
      classCapacities: newClassCapacities
    });
  };

  const handleUpdateClassCapacity = (classId: string, capacity: number | string) => {
    // If it's a string (empty input), allow it temporarily
    if (typeof capacity === 'string') {
      setSeatingPlanForm({
        ...seatingPlanForm,
        classCapacities: {
          ...seatingPlanForm.classCapacities,
          [classId]: capacity as any
        }
      });
      return;
    }

    // Ensure capacity is a valid number between 1 and 100
    const validCapacity = capacity > 0 && capacity <= 100 ? capacity : 1;

    setSeatingPlanForm({
      ...seatingPlanForm,
      classCapacities: {
        ...seatingPlanForm.classCapacities,
        [classId]: validCapacity
      }
    });
  };

  const generateSeatingArrangement = () => {
    // Calculate total seats based on students per bench
    const totalBenches = seatingPlanForm.rows * seatingPlanForm.columns;
    const totalSeats = totalBenches * seatingPlanForm.studentsPerBench;

    // Generate empty seating arrangement
    const arrangement: any[] = [];
    let seatNumber = 1;

    let benchNumber = 1;
    for (let row = 0; row < seatingPlanForm.rows; row++) {
      const rowArrangement: any[] = [];
      for (let col = 0; col < seatingPlanForm.columns; col++) {
        const bench = {
          benchNumber: benchNumber++,
          row: row + 1,
          col: col + 1,
          students: [] as any[]
        };

        // Add seats based on students per bench
        for (let i = 0; i < seatingPlanForm.studentsPerBench; i++) {
          bench.students.push({
            seatNumber: seatNumber,
            studentId: null,
            studentName: `Empty Seat ${seatNumber}`,
            classId: null,
            className: null,
            row: row + 1,
            col: col + 1,
            position: i + 1 // Position on bench (1 or 2)
          });
          seatNumber++;
        }

        rowArrangement.push(bench);
      }
      arrangement.push(rowArrangement);
    }

    setSeatingPlanForm({
      ...seatingPlanForm,
      seatingArrangement: arrangement
    });

    // Set all students as unassigned initially
    setUnassignedStudents([...selectedExamStudents]);
  };

  const handleAssignStudentToSeat = (rowIndex: number, colIndex: number, seatPosition: number, studentId?: string) => {
    // First, find and remove student from any existing seat (if reassigning)
    let oldSeatInfo: any = null;
    const arrangementWithStudentRemoved = seatingPlanForm.seatingArrangement.map((row: any, rIdx: number) => {
      return row.map((bench: any, cIdx: number) => {
        return {
          ...bench,
          students: bench.students.map((seat: any) => {
            if (seat.studentId === studentId && (rIdx !== rowIndex || cIdx !== colIndex || seat.position !== seatPosition)) {
              // Found student in different seat - remove them
              oldSeatInfo = seat;
              return {
                ...seat,
                studentId: null,
                studentName: `Empty Seat ${seat.seatNumber}`,
                classId: null,
                className: null
              };
            }
            return seat;
          })
        };
      });
    });

    if (!studentId) {
      // If no student selected, clear the seat
      const newArrangement = arrangementWithStudentRemoved.map((row: any, rIdx: number) => {
        if (rIdx === rowIndex) {
          return row.map((bench: any, cIdx: number) => {
            if (cIdx === colIndex) {
              return {
                ...bench,
                students: bench.students.map((seat: any, sIdx: number) => {
                  if (sIdx === seatPosition - 1) {
                    const oldStudentId = seat.studentId;
                    if (oldStudentId) {
                      // Add student back to unassigned list
                      const student = selectedExamStudents.find(s => s._id === oldStudentId);
                      if (student && !unassignedStudents.find(s => s._id === oldStudentId)) {
                        setUnassignedStudents([...unassignedStudents, student]);
                      }
                    }
                    return {
                      ...seat,
                      studentId: null,
                      studentName: `Empty Seat ${seat.seatNumber}`,
                      classId: null,
                      className: null
                    };
                  }
                  return seat;
                })
              };
            }
            return bench;
          });
        }
        return row;
      });

      setSeatingPlanForm({
        ...seatingPlanForm,
        seatingArrangement: newArrangement
      });
      return;
    }

    // Assign student to seat
    const student = selectedExamStudents.find(s => s._id === studentId);
    if (!student) return;

    const className = typeof student?.classId === 'object' ? student?.classId?.name :
      (student?.classId ? classes.find(c => c._id === student.classId)?.name : null);

    const newArrangement = arrangementWithStudentRemoved.map((row: any, rIdx: number) => {
      if (rIdx === rowIndex) {
        return row.map((bench: any, cIdx: number) => {
          if (cIdx === colIndex) {
            return {
              ...bench,
              students: bench.students.map((seat: any, sIdx: number) => {
                if (sIdx === seatPosition - 1) {
                  // If there was a student here before, add them back to unassigned
                  if (seat.studentId && seat.studentId !== studentId) {
                    const oldStudent = selectedExamStudents.find(s => s._id === seat.studentId);
                    if (oldStudent && !unassignedStudents.find(s => s._id === seat.studentId)) {
                      setUnassignedStudents([...unassignedStudents, oldStudent]);
                    }
                  }

                  return {
                    ...seat,
                    studentId: student._id,
                    studentName: student.name,
                    classId: student?.classId?._id || student?.classId || null,
                    className: className
                  };
                }
                return seat;
              })
            };
          }
          return bench;
        });
      }
      return row;
    });

    // Update unassigned students list
    const newUnassigned = unassignedStudents.filter(s => s._id !== studentId);
    setUnassignedStudents(newUnassigned);

    setSeatingPlanForm({
      ...seatingPlanForm,
      seatingArrangement: newArrangement
    });
  };

  const handleSaveSeatingPlan = () => {
    if (!seatingPlanForm.examId || !seatingPlanForm.roomNumber || seatingPlanForm.selectedClasses.length === 0) {
      alert('Please fill in all required fields: Exam, Room Number, and at least one class');
      return;
    }

    if (seatingPlanForm.seatingArrangement.length === 0) {
      alert('Please generate seating arrangement first');
      return;
    }

    try {
      const newPlan = {
        _id: Date.now().toString(), // Temporary ID
        examId: seatingPlanForm.examId,
        subjectId: seatingPlanForm.subjectId,
        roomNumber: seatingPlanForm.roomNumber,
        selectedClasses: seatingPlanForm.selectedClasses,
        classCapacities: seatingPlanForm.classCapacities,
        arrangementType: seatingPlanForm.arrangementType,
        rows: seatingPlanForm.rows,
        columns: seatingPlanForm.columns,
        studentsPerBench: seatingPlanForm.studentsPerBench,
        seatingArrangement: seatingPlanForm.seatingArrangement,
        schoolId,
        createdAt: new Date().toISOString()
      };

      const updatedPlans = [...seatingPlans, newPlan];
      setSeatingPlans(updatedPlans);
      localStorage.setItem(`seatingPlans_${schoolId}`, JSON.stringify(updatedPlans));

      alert('Seating plan saved successfully!');

      // Reset form
      setSeatingPlanForm({
        examId: '',
        subjectId: '',
        roomNumber: '',
        selectedClasses: [],
        classCapacities: {},
        arrangementType: 'manual',
        rows: 5,
        columns: 6,
        studentsPerBench: 1,
        seatingArrangement: []
      });
      setSelectedExamStudents([]);
      setUnassignedStudents([]);
    } catch (error: any) {
      alert('Error saving seating plan: ' + (error.message || 'Unknown error'));
    }
  };

  const handleViewSeatingPlan = (plan: any) => {
    setViewingPlan(plan);
    setShowViewModal(true);
  };

  const handleDeleteSeatingPlan = (planId: string) => {
    if (!confirm('Are you sure you want to delete this seating plan?')) return;

    try {
      const updatedPlans = seatingPlans.filter(p => p._id !== planId);
      setSeatingPlans(updatedPlans);
      localStorage.setItem(`seatingPlans_${schoolId}`, JSON.stringify(updatedPlans));
      alert('Seating plan deleted successfully!');
    } catch (error: any) {
      alert('Error deleting seating plan: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Key Metrics - Only show on overview tab */}
        {activeTab === 'overview' && !loading && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Exams</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.totalExams}</p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Exams</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.activeExams}</p>
              </div>
              <div className="p-2.5 bg-green-50 rounded-xl text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Students</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{stats.totalStudents}</p>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}

        {/* Content Card with Navigation Tabs */}
        <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-xs">
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 bg-gray-50/50">
            <nav className="flex space-x-8 px-6 overflow-x-auto scrollbar-hide" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                    className={`
                      py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition whitespace-nowrap
                      ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                >
                  <Icon className="h-4 w-4" />
                    {tab.label}
                </button>
              );
            })}
          </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'question-papers' && <QuestionPapers classes={classes} subjects={allSubjects} />}
          {/* Action Button for Create Exam Tab */}
          {activeTab === 'create-exam' && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleBulkCreateExams}
                disabled={loading || selectedSubjects.length === 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>{loading ? 'Creating...' : `Create ${selectedSubjects.length} Exam${selectedSubjects.length !== 1 ? 's' : ''}`}</span>
              </button>
            </div>
          )}

          {/* Loading State for Overview */}
          {loading && activeTab === 'overview' ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading statistics...</p>
            </div>
          ) : (
            <>
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Upcoming Exams</h3>
                  <div className="space-y-3">
                    {stats.upcomingExams && stats.upcomingExams.length > 0 ? (
                      (() => {
                        // Filter out past exams
                        const upcomingExams = stats.upcomingExams.filter((exam: any) => isExamUpcoming(exam));
                        const paginatedUpcoming = upcomingExams.slice(
                          (overviewUpcomingPage - 1) * overviewPageSize,
                          overviewUpcomingPage * overviewPageSize
                        );
                        return upcomingExams.length > 0 ? (
                          <>
                            {paginatedUpcoming.map((exam: any) => (
                              <div key={exam._id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                                <div>
                                  <p className="font-medium">{exam.name}</p>
                                  <p className="text-sm text-gray-600">
                                    {exam.classId?.name} - {exam.subjectId?.name}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{formatDate(exam.examDate)}</p>
                                  <p className="text-sm text-gray-600">{formatTime(exam.examTime)}</p>
                                </div>
                              </div>
                            ))}
                            <Pagination
                              compact
                              currentPage={overviewUpcomingPage}
                              pageSize={overviewPageSize}
                              totalItems={upcomingExams.length}
                              onPageChange={setOverviewUpcomingPage}
                            />
                          </>
                        ) : (
                          <p className="text-gray-500 text-center py-4">No upcoming exams</p>
                        );
                      })()
                    ) : (
                      <p className="text-gray-500 text-center py-4">No upcoming exams</p>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Recent Exam Results (Marks)</h3>
                  <div className="space-y-3">
                    {recentMarks && recentMarks.length > 0 ? (
                      <>
                        {recentMarks
                          .slice(
                            (overviewMarksPage - 1) * overviewPageSize,
                            overviewMarksPage * overviewPageSize
                          )
                          .map((mark: any, index: number) => {
                            const getGradeColor = (grade: string) => {
                              if (['A+', 'A'].includes(grade)) return 'bg-green-100 text-green-800';
                              if (['B+', 'B'].includes(grade)) return 'bg-blue-100 text-blue-800';
                              if (grade === 'C') return 'bg-yellow-100 text-yellow-800';
                              if (['D', 'E', 'F'].includes(grade)) return 'bg-red-100 text-red-800';
                              return 'bg-gray-100 text-gray-800';
                            };

                            return (
                              <div key={mark._id || index} className="bg-white p-3 rounded border">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <p className="font-semibold text-sm text-gray-900">
                                      {mark.studentId?.name || 'Unknown Student'}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {mark.examId?.name || 'Unknown Exam'} - {mark.subjectId?.name || 'Unknown Subject'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {mark.examId?.examType || 'Exam'} • {mark.classId?.name || 'Class'}
                                    </p>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getGradeColor(mark.grade)}`}>
                                    {mark.isAbsent ? 'Absent' : mark.grade}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">
                                    Marks: <span className="font-bold text-gray-900">
                                      {mark.isAbsent ? 'Ab' : `${mark.marksObtained}/${mark.totalMarks}`}
                                    </span>
                                  </span>
                                  <span className="text-gray-600">
                                    Percentage: <span className="font-bold text-gray-900">
                                      {mark.isAbsent ? '-' : `${Math.round(mark.percentage)}%`}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        <Pagination
                          compact
                          currentPage={overviewMarksPage}
                          pageSize={overviewPageSize}
                          totalItems={recentMarks.length}
                          onPageChange={setOverviewMarksPage}
                        />
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No exam results available yet</p>
                        <p className="text-sm text-gray-400 mt-1">Add exam marks to see results here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'create-exam' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Create Multiple Exams</h3>
                <button
                  onClick={handleBulkCreateExams}
                  disabled={loading || selectedSubjects.length === 0}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : `Create ${selectedSubjects.length} Exam${selectedSubjects.length !== 1 ? 's' : ''}`}
                </button>
              </div>

              <form onSubmit={handleBulkCreateExams} className="space-y-6">
                {/* Basic Exam Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                  <h4 className="font-semibold text-gray-900 mb-4">Exam Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exam Name *</label>
                      <input
                        type="text"
                        value={bulkExamForm.name}
                        onChange={(e) => setBulkExamForm({ ...bulkExamForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Mid Term 2025"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Subject name will be auto-appended</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type *</label>
                      <select
                        value={bulkExamForm.examType}
                        onChange={(e) => setBulkExamForm({ ...bulkExamForm, examType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="Mid Term">Mid Term</option>
                        <option value="Final Term">Final Term</option>
                        <option value="Unit Test">Unit Test</option>
                        <option value="Quiz">Quiz</option>
                        <option value="Monthly Test">Monthly Test</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                      <select
                        value={bulkExamForm.classId}
                        onChange={(e) => {
                          setBulkExamForm({ ...bulkExamForm, classId: e.target.value });
                          setSelectedSubjects([]);
                          setSubjectSchedules({});
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Select Class</option>
                        {classes.map(cls => (
                          <option key={cls._id} value={cls._id}>
                            {cls.name} {cls.section ? `- ${cls.section}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Minutes) *</label>
                      <input
                        type="number"
                        value={bulkExamForm.duration}
                        onChange={(e) => setBulkExamForm({ ...bulkExamForm, duration: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="120"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exam Period Start *</label>
                      <input
                        type="date"
                        value={bulkExamForm.startDate}
                        onChange={(e) => setBulkExamForm({ ...bulkExamForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exam Period End *</label>
                      <input
                        type="date"
                        value={bulkExamForm.endDate}
                        onChange={(e) => setBulkExamForm({ ...bulkExamForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks *</label>
                      <input
                        type="number"
                        value={bulkExamForm.totalMarks}
                        onChange={(e) => setBulkExamForm({ ...bulkExamForm, totalMarks: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                      <input
                        type="text"
                        value={bulkExamForm.roomNumber}
                        onChange={(e) => setBulkExamForm({ ...bulkExamForm, roomNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="e.g., Room 101, Hall A"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={bulkExamForm.description}
                        onChange={(e) => setBulkExamForm({ ...bulkExamForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                        placeholder="Enter exam description..."
                      />
                    </div>
                  </div>
                </div>

                {/* Subject Selection and Scheduling */}
                {bulkExamForm.classId && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">
                      Select Subjects & Set Schedule
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({selectedSubjects.length} selected)
                      </span>
                    </h4>

                    {filteredSubjects.length === 0 ? (
                      <p className="text-gray-500 text-sm">No subjects found for this class. Please add subjects first.</p>
                    ) : (
                      <div className="space-y-3">
                        {filteredSubjects.map((subject) => {
                          const isSelected = selectedSubjects.find(s => s._id === subject._id);
                          const schedule = subjectSchedules[subject._id];

                          return (
                            <div
                              key={subject._id}
                              className={`border rounded-lg p-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex items-center h-10">
                                  <input
                                    type="checkbox"
                                    checked={!!isSelected}
                                    onChange={() => handleToggleSubject(subject)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                  />
                                </div>
                                <div
                                  className="flex-1"
                                  onClick={(e) => {
                                    // Only toggle if clicking on the subject name area, not on inputs
                                    if (!(e.target as HTMLElement).closest('input, label, .schedule-container')) {
                                      handleToggleSubject(subject);
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-3 cursor-pointer">
                                    <div>
                                      <h5 className="font-medium text-gray-900">{subject.name}</h5>
                                      {subject.code && (
                                        <p className="text-sm text-gray-500">{subject.code}</p>
                                      )}
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <div
                                      className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-300 schedule-container"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Exam Date *</label>
                                        <input
                                          type="date"
                                          value={schedule?.examDate || ''}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleSetSubjectSchedule(subject._id, e.target.value, schedule?.examTime || '09:00');
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          onFocus={(e) => e.stopPropagation()}
                                          min={bulkExamForm.startDate}
                                          max={bulkExamForm.endDate}
                                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                                          required
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Exam Time *</label>
                                        <input
                                          type="time"
                                          value={schedule?.examTime || '09:00'}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleSetSubjectSchedule(subject._id, schedule?.examDate || '', e.target.value);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          onFocus={(e) => e.stopPropagation()}
                                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                                          required
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Summary */}
                {selectedSubjects.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Summary</h5>
                    <p className="text-sm text-blue-800">
                      You are about to create <strong>{selectedSubjects.length}</strong> exam(s) for {bulkExamForm.name}:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {selectedSubjects.map(subject => (
                        <li key={subject._id} className="text-sm text-blue-800">
                          • {subject.name}
                          {subjectSchedules[subject._id] && (
                            <span className="text-blue-600">
                              {' '}on {new Date(subjectSchedules[subject._id].examDate).toLocaleDateString()} at {subjectSchedules[subject._id].examTime}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </form>
            </div>
          )}

          {activeTab === 'exam-marks' && (() => {
            // Filter marks based on selected exam
            const filteredMarks = selectedExam
              ? marks.filter(mark => mark.examId?._id === selectedExam)
              : marks;

            // Calculate pagination
            const indexOfLastItem = currentPage * itemsPerPage;
            const indexOfFirstItem = indexOfLastItem - itemsPerPage;
            const currentMarks = filteredMarks.slice(indexOfFirstItem, indexOfLastItem);
            const totalPages = Math.ceil(filteredMarks.length / itemsPerPage);

            // Get filtered exams based on type and class
            const filteredExamsForMarks = exams.filter(exam => {
              if (filterExamType && exam.examType !== filterExamType) return false;
              if (filterMarksClass) {
                const examClassId = typeof exam.classId === 'object' ? exam.classId?._id : exam.classId;
                if (examClassId !== filterMarksClass) return false;
              }
              return true;
            });

            // Get students for selected exam/class, sorted by roll number
            const studentsForMarksEntry = filterMarksClass ? (() => {
              const examForStudents = filteredExamsForMarks[0] || exams.find(e => {
                const examClassId = typeof e.classId === 'object' ? e.classId?._id : e.classId;
                return examClassId === filterMarksClass;
              });
              if (!examForStudents) return [];
              
              const examClassId = typeof examForStudents.classId === 'object' ? examForStudents.classId?._id : examForStudents.classId;
              return students
                .filter(s => {
                  const studentClassId = typeof s.classId === 'object' ? s.classId?._id : s.classId;
                  return studentClassId === examClassId;
                })
                .sort((a, b) => {
                  const rollA = parseInt(a.rollNumber || '0');
                  const rollB = parseInt(b.rollNumber || '0');
                  return rollA - rollB;
                });
            })() : [];

            return (
              <div className="space-y-6">
                {/* Filters for Bulk Entry */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold mb-4">Quick Filters for Bulk Entry</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Exam Type</label>
                      <select
                        value={filterExamType}
                        onChange={(e) => {
                          setFilterExamType(e.target.value);
                          setSelectedExam('');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">All Types</option>
                        <option value="Mid Term">Mid Term</option>
                        <option value="Final Term">Final Term</option>
                        <option value="Unit Test">Unit Test</option>
                        <option value="Quiz">Quiz</option>
                        <option value="Monthly Test">Monthly Test</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Class</label>
                      <select
                        value={filterMarksClass}
                        onChange={(e) => {
                          setFilterMarksClass(e.target.value);
                          setSelectedExam('');
                          setBulkMarksEntries({});
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">All Classes</option>
                        {classes.map(cls => (
                          <option key={cls._id} value={cls._id}>
                            {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam</label>
                    <select
                      value={selectedExam}
                      onChange={(e) => {
                        setSelectedExam(e.target.value);
                          setCurrentPage(1);
                      }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">
                          {filteredExamsForMarks.length === 0 ? 'No exams match filters' : 'Select Exam'}
                      </option>
                        {filteredExamsForMarks.map(exam => (
                        <option key={exam._id} value={exam._id}>
                            {exam.name} - {exam.subjectId?.name || 'No Subject'}
                        </option>
                      ))}
                    </select>
                    </div>
                  </div>
                </div>

                {/* Bulk Entry Section - Show students sorted by roll number */}
                {selectedExam && filterMarksClass && studentsForMarksEntry.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4">Bulk Marks Entry - Students (Sorted by Roll Number)</h4>
                    <p className="text-sm text-gray-600 mb-4">Enter marks for all students. Students are listed according to their roll numbers for easy entry.</p>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks Obtained</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Absent</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {studentsForMarksEntry.map((student) => {
                            const studentMarkEntry = bulkMarksEntries[student._id] || { marks: 0, isAbsent: false };
                            const existingMark = marks.find(m => {
                              const studentId = typeof m.studentId === 'object' ? m.studentId?._id : m.studentId;
                              return studentId === student._id && m.examId?._id === selectedExam;
                            });
                            const examDetails = exams.find(e => e._id === selectedExam);
                            const maxMarks = examDetails?.totalMarks || 100;
                            
                            return (
                              <tr key={student._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{student.rollNumber || 'N/A'}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{student.name}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {existingMark ? (
                                    <div className="text-sm text-gray-900 font-medium">
                                      {existingMark.marksObtained}/{existingMark.totalMarks}
                                    </div>
                                  ) : (
                                    <input
                                      type="number"
                                      min="0"
                                      max={maxMarks}
                                      value={studentMarkEntry.marks || ''}
                                      onChange={(e) => {
                                        const marksValue = e.target.value ? parseInt(e.target.value) : 0;
                                        setBulkMarksEntries({
                                          ...bulkMarksEntries,
                                          [student._id]: { ...studentMarkEntry, marks: marksValue, isAbsent: false }
                                        });
                                      }}
                                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                      placeholder="0"
                                      disabled={studentMarkEntry.isAbsent}
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {!existingMark && (
                                    <input
                                      type="checkbox"
                                      checked={studentMarkEntry.isAbsent}
                                      onChange={(e) => {
                                        setBulkMarksEntries({
                                          ...bulkMarksEntries,
                                          [student._id]: { marks: 0, isAbsent: e.target.checked }
                                        });
                                      }}
                                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {existingMark ? (
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      Recorded
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        onClick={() => setBulkMarksEntries({})}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Clear All
                      </button>
                      <button
                        onClick={async () => {
                          if (Object.keys(bulkMarksEntries).length === 0) {
                            alert('Please enter marks for at least one student');
                            return;
                          }
                          
                          try {
                            setLoading(true);
                            const examDetails = exams.find(e => e._id === selectedExam);
                            if (!examDetails) {
                              alert('Exam not found');
                              return;
                            }
                            
                            let successCount = 0;
                            let errorCount = 0;
                            
                            for (const [studentId, entry] of Object.entries(bulkMarksEntries)) {
                              try {
                                await examsAPI.addMarks(selectedExam, {
                                  studentId,
                                  marksObtained: entry.isAbsent ? 0 : entry.marks,
                                  isAbsent: entry.isAbsent,
                                  remarks: entry.isAbsent ? 'Absent' : ''
                                });
                                successCount++;
                              } catch (error) {
                                console.error(`Error adding marks for student ${studentId}:`, error);
                                errorCount++;
                              }
                            }
                            
                            alert(`Marks saved! Success: ${successCount}, Errors: ${errorCount}`);
                            setBulkMarksEntries({});
                            await loadMarks();
                            await loadRecentMarks();
                          } catch (error: any) {
                            alert('Error saving marks: ' + (error.message || 'Unknown error'));
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading || Object.keys(bulkMarksEntries).length === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Saving...' : `Save All Marks (${Object.keys(bulkMarksEntries).length} students)`}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">All Marks Records</h3>
                  <div className="flex space-x-3">
                    {exams.length === 0 && (
                      <button
                        onClick={() => setActiveTab('create-exam')}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create First Exam</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMarksForm({
                          examId: selectedExam,
                          studentId: '',
                          marksObtained: 0,
                          remarks: '',
                          isAbsent: false
                        });
                        setShowMarksModal(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Marks</span>
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                      <Download className="h-4 w-4" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentMarks.length > 0 ? (
                        currentMarks.map((mark) => (
                          <tr key={mark._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {mark.studentId?.name || 'Unknown'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{mark.examId?.name || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{mark.subjectId?.name || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{mark.marksObtained}/{mark.totalMarks}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{Math.round(mark.percentage)}%</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {mark.grade}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${mark.isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {mark.isPassed ? 'Passed' : 'Failed'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button className="text-blue-600 hover:text-blue-900">Edit</button>
                                <button className="text-red-600 hover:text-red-900">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                            {selectedExam ? 'No marks recorded for this exam yet. Click "Add Marks" to start.' : 'Please select an exam above to view or add marks.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredMarks.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    pageSize={itemsPerPage}
                    totalItems={filteredMarks.length}
                    onPageChange={setCurrentPage}
                  />
                )}

                {!loading && exams.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-yellow-800 mb-2">
                      <strong>No exams available!</strong> You need to create exams before you can add marks.
                    </p>
                    <button
                      onClick={() => setActiveTab('create-exam')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Your First Exam</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'exam-schedule' && (() => {
            // Filter out past exams before grouping
            const upcomingSchedule = schedule.filter((exam: any) => isExamUpcoming(exam));
            
            // Group exams by class and date for cleaner display
            const groupedSchedule = upcomingSchedule.reduce((acc: any, exam: any) => {
              const className = exam.classId?.name || 'Unknown';
              const examDate = exam.examDate || 'No Date';
              
              if (!acc[className]) acc[className] = {};
              if (!acc[className][examDate]) acc[className][examDate] = [];
              
              acc[className][examDate].push(exam);
              return acc;
            }, {});

            return (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Exam Schedule</h3>
              </div>

                {upcomingSchedule.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No upcoming scheduled exams</p>
                    <p className="text-sm text-gray-400 mt-2">Create exams to see schedule here</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(groupedSchedule).map((className) => (
                      <div key={className} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                          <h4 className="text-lg font-semibold text-white">{className}</h4>
                        </div>
                        <div className="p-6">
                          {Object.keys(groupedSchedule[className])
                            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                            .map((examDate) => (
                              <div key={examDate} className="mb-6 last:mb-0">
                                <div className="flex items-center mb-3 pb-2 border-b border-gray-200">
                                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                                  <h5 className="text-md font-semibold text-gray-900">{formatDate(examDate)}</h5>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {groupedSchedule[className][examDate].map((exam: any) => (
                                    <div
                                      key={exam._id}
                                      className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all hover:border-blue-400"
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <div className="flex items-center mb-2">
                                            <BookOpen className="h-4 w-4 text-blue-600 mr-2" />
                                            <h6 className="font-semibold text-gray-900">{exam.subjectId?.name || 'Subject'}</h6>
                                          </div>
                                          <p className="text-sm text-gray-600 mb-1">{exam.name}</p>
                                          <p className="text-xs text-gray-500">{exam.examType}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
                                          exam.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                              exam.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                                exam.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                                          {exam.status || 'scheduled'}
                          </span>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center text-gray-700">
                                          <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                                          <span className="font-medium">{formatTime(exam.examTime)}</span>
                                          <span className="mx-2">•</span>
                                          <span>{exam.duration} min</span>
                                        </div>
                                        {exam.roomNumber && (
                                          <div className="flex items-center text-gray-700">
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">Room: {exam.roomNumber}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-3 pt-3 border-t border-gray-200 flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleEditExam(exam);
                              }}
                                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteExam(exam._id);
                              }}
                                          className="text-xs text-red-600 hover:text-red-800 hover:underline font-medium"
                            >
                              Delete
                            </button>
                          </div>
                                    </div>
                    ))}
              </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
            </div>
          )}
              </div>
            );
          })()}

          {activeTab === 'date-sheet' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Date Sheet</h3>
                <div className="flex space-x-3">
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      const newClass = e.target.value;
                      setSelectedClass(newClass);
                      loadDateSheet(newClass);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Classes</option>
                    {classes.map(cls => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      if (Object.keys(dateSheet).length === 0) {
                        alert('No date sheet data available. Please create exams first.');
                      } else {
                        // Generate and download date sheet report
                        const reportContent = Object.keys(dateSheet).map(className => {
                          const classExams = dateSheet[className];
                          return `\n${className}\n${'='.repeat(50)}\n${classExams.map((exam: any) => {
                            const date = formatDate(exam.examDate);
                            const time = formatTime(exam.examTime);
                            return `${exam.subjectId?.name || 'Subject'}: ${date} at ${time} (${exam.duration} min)`;
                          }).join('\n')}`;
                        }).join('\n\n');
                        
                        const blob = new Blob([`DATE SHEET\n${'='.repeat(50)}${reportContent}`], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `date-sheet-${new Date().toISOString().split('T')[0]}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        alert('Date sheet report generated and downloaded successfully!');
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Generate Report</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading date sheet...</p>
                </div>
              ) : Object.keys(dateSheet).length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <Calendar className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                  <p className="text-yellow-800 mb-2">
                    <strong>No exam schedule available</strong>
                  </p>
                  <p className="text-sm text-yellow-700 mb-4">
                    {selectedClass ? 'No exams scheduled for this class yet.' : 'No exams scheduled yet.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('create-exam')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Exams</span>
                  </button>
                </div>
              ) : (
                Object.keys(dateSheet).map((className) => {
                  // Filter out past exams for this class
                  const upcomingExams = dateSheet[className].filter((exam: any) => isExamUpcoming(exam));
                  
                  return (
                  <div key={className} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                      <h4 className="text-lg font-semibold text-white">{className}</h4>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {upcomingExams.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No upcoming exams scheduled for this class</p>
                        ) : (
                          upcomingExams.map((exam: any) => (
                            <div key={exam._id} className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-1">
                                  <BookOpen className="h-5 w-5 text-blue-600" />
                                  <p className="font-semibold text-gray-900">{exam.subjectId?.name || 'Subject'}</p>
                                </div>
                                <p className="text-sm text-gray-600 ml-8">{exam.name} ({exam.examType})</p>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center justify-end space-x-2 mb-1">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <p className="font-medium text-gray-900">{formatDate(exam.examDate)}</p>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {formatTime(exam.examTime)} • {exam.duration} min
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'seating-plan' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Seating Plan</h3>
                <button
                  onClick={handleSaveSeatingPlan}
                  disabled={loading || !seatingPlanForm.examId || !seatingPlanForm.roomNumber || seatingPlanForm.selectedClasses.length === 0 || seatingPlanForm.seatingArrangement.length === 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Save Seating Plan</span>
                </button>
              </div>

              {/* Seating Plan Form */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                {/* Exam and Room Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam *</label>
                    <select
                      value={seatingPlanForm.examId}
                      onChange={(e) => handleExamSelectionForSeating(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select Exam</option>
                      {exams.map(exam => (
                        <option key={exam._id} value={exam._id}>
                          {exam.name} ({exam.examType}) - {exam.classId?.name || 'No Class'} - {exam.subjectId?.name || 'No Subject'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Number *</label>
                    <input
                      type="text"
                      value={seatingPlanForm.roomNumber}
                      onChange={(e) => setSeatingPlanForm({ ...seatingPlanForm, roomNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Room 101, Hall A"
                      required
                    />
                  </div>
                </div>

                {/* Subject Display (Auto-populated from exam) */}
                {seatingPlanForm.examId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Subject:</strong> {
                        exams.find(e => e._id === seatingPlanForm.examId)?.subjectId?.name ||
                        (typeof exams.find(e => e._id === seatingPlanForm.examId)?.subjectId === 'object'
                          ? exams.find(e => e._id === seatingPlanForm.examId)?.subjectId?.name
                          : 'N/A')
                      }
                    </p>
                  </div>
                )}

                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Classes for This Room *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map(cls => {
                      const isSelected = seatingPlanForm.selectedClasses.includes(cls._id);
                      return (
                        <div
                          key={cls._id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }`}
                          onClick={() => handleToggleClassForSeating(cls._id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleClassForSeating(cls._id)}
                                className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="font-medium text-gray-900">
                                {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-gray-300">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Capacity for this room:</label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={
                                  seatingPlanForm.classCapacities[cls._id] !== undefined
                                    ? String(seatingPlanForm.classCapacities[cls._id])
                                    : String(cls.capacity || 30)
                                }
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const inputValue = e.target.value;

                                  // If empty, allow it temporarily (don't update state yet)
                                  if (inputValue === '') {
                                    setSeatingPlanForm({
                                      ...seatingPlanForm,
                                      classCapacities: {
                                        ...seatingPlanForm.classCapacities,
                                        [cls._id]: '' as any // Temporarily allow empty string
                                      }
                                    });
                                    return;
                                  }

                                  // Parse the number
                                  const numValue = parseInt(inputValue, 10);

                                  // Only update if it's a valid positive number
                                  if (!isNaN(numValue) && numValue > 0 && numValue <= 100) {
                                    handleUpdateClassCapacity(cls._id, numValue);
                                  }
                                }}
                                onBlur={(e) => {
                                  e.stopPropagation();
                                  const inputValue = e.target.value;
                                  const numValue = parseInt(inputValue, 10);

                                  // If empty or invalid on blur, reset to default capacity
                                  if (inputValue === '' || isNaN(numValue) || numValue <= 0) {
                                    const defaultCapacity = cls.capacity || 30;
                                    handleUpdateClassCapacity(cls._id, defaultCapacity);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                placeholder="Enter capacity"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Class capacity: {cls.capacity || 'N/A'} students
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {seatingPlanForm.selectedClasses.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">Please select at least one class</p>
                  )}
                </div>

                {/* Seating Arrangement Configuration */}
                {seatingPlanForm.selectedClasses.length > 0 && (
                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <h4 className="font-semibold text-gray-900">Seating Arrangement Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rows</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={seatingPlanForm.rows}
                          onChange={(e) => setSeatingPlanForm({ ...seatingPlanForm, rows: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Number of rows"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Columns</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={seatingPlanForm.columns}
                          onChange={(e) => setSeatingPlanForm({ ...seatingPlanForm, columns: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Number of columns"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Students Per Bench</label>
                        <select
                          value={seatingPlanForm.studentsPerBench}
                          onChange={(e) => setSeatingPlanForm({ ...seatingPlanForm, studentsPerBench: parseInt(e.target.value) as 1 | 2 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value={1}>1 Student per Bench</option>
                          <option value={2}>2 Students per Bench</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900">
                        <strong>Total Benches:</strong> {seatingPlanForm.rows * seatingPlanForm.columns} •
                        <strong> Total Seats:</strong> {seatingPlanForm.rows * seatingPlanForm.columns * seatingPlanForm.studentsPerBench} •
                        <strong> Available Students:</strong> {selectedExamStudents.length}
                      </p>
                    </div>
                    <button
                      onClick={generateSeatingArrangement}
                      disabled={loading || selectedExamStudents.length === 0 || seatingPlanForm.rows <= 0 || seatingPlanForm.columns <= 0}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span>Generate Seating Grid</span>
                    </button>
                    {selectedExamStudents.length === 0 && seatingPlanForm.selectedClasses.length > 0 && (
                      <p className="text-sm text-yellow-600">Loading students from selected classes...</p>
                    )}
                  </div>
                )}

                {/* Seating Plan Visualization */}
                {seatingPlanForm.seatingArrangement.length > 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-900">Seating Plan - Assign Students</h4>
                      <div className="text-sm text-gray-600">
                        <span className="bg-green-100 px-2 py-1 rounded">Assigned: {selectedExamStudents.length - unassignedStudents.length}</span>
                        <span className="bg-yellow-100 px-2 py-1 rounded ml-2">Unassigned: {unassignedStudents.length}</span>
                      </div>
                    </div>

                    {/* Unassigned Students List */}
                    {unassignedStudents.length > 0 && (
                      <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">Unassigned Students ({unassignedStudents.length})</h5>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {unassignedStudents.map((student) => (
                            <div
                              key={student._id}
                              className="bg-white border border-gray-300 rounded px-2 py-1 text-xs"
                            >
                              {student.name}
                              {typeof student.classId === 'object' && student.classId?.name
                                ? ` (${student.classId.name})`
                                : student.classId
                                  ? ` (${classes.find(c => c._id === student.classId)?.name || ''})`
                                  : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 p-6 rounded-lg overflow-x-auto -mx-4 px-4 border-2 border-gray-300">
                      <div className="inline-block">
                        <div className="text-sm text-gray-700 mb-3 text-center font-bold bg-gray-200 py-2 px-4 rounded">
                          Front of Room (Teacher's Desk)
                        </div>
                        <div className="space-y-3">
                          {seatingPlanForm.seatingArrangement.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex gap-3 justify-center">
                              {row.map((bench: any, colIndex: number) => (
                                <div
                                  key={colIndex}
                                  className="border-2 border-gray-600 rounded-lg p-3 shadow-lg relative"
                                  style={{ 
                                    minWidth: seatingPlanForm.studentsPerBench === 2 ? '160px' : '120px',
                                    borderWidth: '3px',
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                                  }}
                                >
                                  <div className="text-xs text-gray-700 text-center mb-2 font-semibold bg-white px-2 py-1 rounded">
                                    Bench {bench.benchNumber}
                                  </div>
                                  <div className={`space-y-2 ${seatingPlanForm.studentsPerBench === 2 ? 'grid grid-cols-2 gap-2' : ''}`}>
                                    {bench.students.map((seat: any, seatIndex: number) => (
                                      <div
                                        key={seatIndex}
                                        className={`border-2 rounded-lg p-2 text-xs cursor-pointer hover:shadow-md transition-all transform hover:scale-105 ${seat.studentId
                                            ? 'bg-blue-200 border-blue-600 shadow-md'
                                            : 'bg-white border-gray-400'
                                          }`}
                                        style={{
                                          minHeight: '60px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          justifyContent: 'center',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <select
                                          value={seat.studentId || ''}
                                          onChange={(e) => handleAssignStudentToSeat(rowIndex, colIndex, seat.position, e.target.value || undefined)}
                                          className="w-full text-xs border-0 bg-transparent p-0 cursor-pointer focus:outline-none"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <option value="">Empty Seat {seat.seatNumber}</option>
                                          {selectedExamStudents.map((student) => {
                                            // Show all students, but mark assigned ones differently
                                            const isAssignedElsewhere = seatingPlanForm.seatingArrangement.some((r: any) =>
                                              r.some((b: any) =>
                                                b.students.some((s: any) => s.studentId === student._id && s.studentId !== seat.studentId)
                                              )
                                            );
                                            return (
                                              <option
                                                key={student._id}
                                                value={student._id}
                                              >
                                                {student.name}
                                                {typeof student.classId === 'object' && student.classId?.name
                                                  ? ` (${student.classId.name})`
                                                  : student.classId
                                                    ? ` (${classes.find(c => c._id === student.classId)?.name || ''})`
                                                    : ''}
                                                {isAssignedElsewhere && student._id !== seat.studentId ? ' (Assigned elsewhere)' : ''}
                                              </option>
                                            );
                                          })}
                                        </select>
                                        {seat.studentId && (
                                          <div className="text-xs text-gray-600 mt-1 truncate">
                                            {seat.studentName.length > 15 ? seat.studentName.substring(0, 13) + '...' : seat.studentName}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div className="text-sm text-gray-700 mt-3 text-center font-bold bg-gray-200 py-2 px-4 rounded">
                          Back of Room
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-blue-100 p-2 rounded">
                        <strong>Total Benches:</strong> {seatingPlanForm.rows * seatingPlanForm.columns}
                      </div>
                      <div className="bg-green-100 p-2 rounded">
                        <strong>Total Seats:</strong> {seatingPlanForm.rows * seatingPlanForm.columns * seatingPlanForm.studentsPerBench}
                      </div>
                      <div className="bg-yellow-100 p-2 rounded">
                        <strong>Students:</strong> {selectedExamStudents.length}
                      </div>
                      <div className="bg-purple-100 p-2 rounded">
                        <strong>Per Bench:</strong> {seatingPlanForm.studentsPerBench}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Saved Seating Plans */}
              {seatingPlans.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Saved Seating Plans</h4>
                  <div className="space-y-3">
                    {seatingPlans.map((plan) => {
                      const planExam = exams.find(e => e._id === plan.examId);
                      return (
                        <div key={plan._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {planExam?.name || 'Unknown Exam'} - Room {plan.roomNumber}
                              </p>
                              <p className="text-sm text-gray-600">
                                {planExam?.subjectId?.name || 'Unknown Subject'} • {plan.selectedClasses.length} class(es)
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {plan.rows} rows × {plan.columns} columns • {plan.studentsPerBench || 1} student(s) per bench • {new Date(plan.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewSeatingPlan(plan)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDeleteSeatingPlan(plan._id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* View Seating Plan Modal */}
      {showViewModal && viewingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Seating Plan</h3>
                <p className="text-sm text-gray-600">
                  {exams.find(e => e._id === viewingPlan.examId)?.name || 'Unknown Exam'} - Room {viewingPlan.roomNumber}
                </p>
              </div>
              <button onClick={() => setShowViewModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-blue-100 p-2 rounded">
                <strong>Total Benches:</strong> {viewingPlan.rows * viewingPlan.columns}
              </div>
              <div className="bg-green-100 p-2 rounded">
                <strong>Total Seats:</strong> {viewingPlan.rows * viewingPlan.columns * (viewingPlan.studentsPerBench || 1)}
              </div>
              <div className="bg-yellow-100 p-2 rounded">
                <strong>Rows:</strong> {viewingPlan.rows}
              </div>
              <div className="bg-purple-100 p-2 rounded">
                <strong>Per Bench:</strong> {viewingPlan.studentsPerBench || 1}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg overflow-x-auto border-2 border-gray-300">
              <div className="inline-block">
                <div className="text-sm text-gray-700 mb-3 text-center font-bold bg-gray-200 py-2 px-4 rounded">
                  Front of Room (Teacher's Desk)
                </div>
                <div className="space-y-3">
                  {viewingPlan.seatingArrangement.map((row: any, rowIndex: number) => (
                    <div key={rowIndex} className="flex gap-3 justify-center">
                      {row.map((bench: any, colIndex: number) => (
                        <div
                          key={colIndex}
                          className="border-2 border-gray-600 rounded-lg p-3 shadow-lg"
                          style={{ 
                            minWidth: (viewingPlan.studentsPerBench || 1) === 2 ? '160px' : '120px',
                            borderWidth: '3px',
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                          }}
                        >
                          <div className="text-xs text-gray-700 text-center mb-2 font-semibold bg-white px-2 py-1 rounded">
                            Bench {bench.benchNumber}
                          </div>
                          <div className={`space-y-2 ${(viewingPlan.studentsPerBench || 1) === 2 ? 'grid grid-cols-2 gap-2' : ''}`}>
                            {bench.students.map((seat: any, seatIndex: number) => (
                              <div
                                key={seatIndex}
                                className={`border-2 rounded-lg p-2 text-xs ${seat.studentId
                                    ? 'bg-blue-200 border-blue-600 shadow-md'
                                    : 'bg-white border-gray-400'
                                  }`}
                                style={{
                                  minHeight: '60px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center'
                                }}
                              >
                                {seat.studentId ? (
                                  <>
                                    <div className="font-semibold text-gray-700 truncate">
                                      {seat.studentName.length > 15 ? seat.studentName.substring(0, 13) + '...' : seat.studentName}
                                    </div>
                                    {seat.className && (
                                      <div className="text-xs text-gray-600 truncate">
                                        {seat.className}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500">
                                      Seat {seat.seatNumber}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-gray-500 text-center">
                                    Empty Seat {seat.seatNumber}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-600 mt-2 text-center font-semibold">
                  Back of Room
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Marks Modal */}
      {showMarksModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Exam Marks</h3>
              <button onClick={() => setShowMarksModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddMarks} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exam *</label>
                <select
                  value={marksForm.examId}
                  onChange={(e) => setMarksForm({ ...marksForm, examId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select Exam</option>
                  {exams.map(exam => (
                    <option key={exam._id} value={exam._id}>
                      {exam.name} ({exam.examType}) - {exam.classId?.name || 'No Class'} - {exam.subjectId?.name || 'No Subject'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Student Admission Number *</label>
                <input
                  type="text"
                  value={marksAdmissionSearch}
                  onChange={(e) => {
                    setMarksAdmissionSearch(e.target.value);
                    setShowMarksSuggestions(true);
                    if (!e.target.value) {
                      setMarksForm({ ...marksForm, studentId: '' });
                      setSelectedMarksStudent(null);
                    }
                  }}
                  onFocus={() => setShowMarksSuggestions(true)}
                  placeholder="Enter admission number or student name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />

                {/* Student Suggestions Dropdown */}
                {showMarksSuggestions && filteredMarksStudents.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredMarksStudents.map(student => (
                      <div
                        key={student._id}
                        onClick={() => {
                          setSelectedMarksStudent(student);
                          setMarksAdmissionSearch((student as any).admissionNumber || student.name);
                          setMarksForm({ ...marksForm, studentId: student._id });
                          setShowMarksSuggestions(false);
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
                {selectedMarksStudent && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">
                      Selected: {selectedMarksStudent.name} - {(selectedMarksStudent as any).admissionNumber || selectedMarksStudent.rollNumber}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marks Obtained *</label>
                <input
                  type="number"
                  value={marksForm.marksObtained}
                  onChange={(e) => setMarksForm({ ...marksForm, marksObtained: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={marksForm.remarks}
                  onChange={(e) => setMarksForm({ ...marksForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={marksForm.isAbsent}
                  onChange={(e) => setMarksForm({ ...marksForm, isAbsent: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Student was absent</label>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowMarksModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {showEditExamModal && editingExam && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Exam</h3>
                <button
                  onClick={() => {
                    setShowEditExamModal(false);
                    setEditingExam(null);
                    setExamForm({
                      name: '',
                      examType: 'Mid Term',
                      subjectId: '',
                      classId: '',
                      startDate: '',
                      endDate: '',
                      examDate: '',
                      examTime: '09:00',
                      duration: 120,
                      totalMarks: 100,
                      description: '',
                      roomNumber: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateExam} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exam Name *</label>
                    <input
                      type="text"
                      value={examForm.name}
                      onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type *</label>
                    <select
                      value={examForm.examType}
                      onChange={(e) => setExamForm({ ...examForm, examType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="Mid Term">Mid Term</option>
                      <option value="Final Term">Final Term</option>
                      <option value="Unit Test">Unit Test</option>
                      <option value="Quiz">Quiz</option>
                      <option value="Monthly Test">Monthly Test</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                    <select
                      value={examForm.classId}
                      onChange={(e) => {
                        setExamForm({ ...examForm, classId: e.target.value, subjectId: '' });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls._id} value={cls._id}>
                          {cls.name} {cls.section ? `- ${cls.section}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                    <select
                      value={examForm.subjectId}
                      onChange={(e) => setExamForm({ ...examForm, subjectId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                      disabled={!examForm.classId}
                    >
                      <option value="">Select Subject</option>
                      {filteredSubjects.map(subject => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name} {subject.code ? `(${subject.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exam Date *</label>
                    <input
                      type="date"
                      value={examForm.examDate}
                      onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Exam Time *</label>
                    <input
                      type="time"
                      value={examForm.examTime}
                      onChange={(e) => setExamForm({ ...examForm, examTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={examForm.startDate}
                      onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                    <input
                      type="date"
                      value={examForm.endDate}
                      onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Minutes) *</label>
                    <input
                      type="number"
                      value={examForm.duration}
                      onChange={(e) => setExamForm({ ...examForm, duration: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks *</label>
                    <input
                      type="number"
                      value={examForm.totalMarks}
                      onChange={(e) => setExamForm({ ...examForm, totalMarks: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={examForm.description}
                    onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditExamModal(false);
                      setEditingExam(null);
                      setExamForm({
                        name: '',
                        examType: 'Mid Term',
                        subjectId: '',
                        classId: '',
                        startDate: '',
                        endDate: '',
                        examDate: '',
                        examTime: '09:00',
                        duration: 120,
                        totalMarks: 100,
                        description: '',
                        roomNumber: ''
                      });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Exam'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
