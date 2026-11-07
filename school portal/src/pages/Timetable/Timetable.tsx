import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Calendar, 
  Clock, 
  Users, 
  BookOpen,
  Save,
  Plus,
  Minus,
  X,
  Edit2,
  Download,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import TimetableGenerator from './TimetableGenerator';

const Timetable: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [numberOfPeriods, setNumberOfPeriods] = useState<number>(8);
  const [timetableData, setTimetableData] = useState<any>({});
  const [existingSchedules, setExistingSchedules] = useState<any[]>([]);
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const defaultTimes = [
    '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00'
  ];

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassSchedule();
      initializeTimetable();
    }
  }, [selectedClass, numberOfPeriods]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await api.classroom.getClasses();
      const classesData = response?.data || response || [];
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.classroom.getSubjects();
      const subjectsData = response?.data || response || [];
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects');
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.classroom.getTeachers();
      const teachersData = response?.data || response || [];
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to fetch teachers');
    }
  };

  const fetchClassSchedule = async () => {
    if (!selectedClass) return;
    
    try {
      setLoading(true);
      const response = await api.schedule.getByClass(selectedClass);
      const schedules = response?.data || [];
      setExistingSchedules(Array.isArray(schedules) ? schedules : []);
      
      // Initialize timetable with existing schedules
      // Group by day and sort by start time to assign period indices
      const scheduleMap: any = {};
      const dayScheduleMap: Record<string, any[]> = {};
      
      schedules.forEach((schedule: any) => {
        const day = schedule.dayOfWeek;
        if (!dayScheduleMap[day]) {
          dayScheduleMap[day] = [];
        }
        dayScheduleMap[day].push({
          ...schedule,
          subjectId: schedule.subjectId?._id || schedule.subjectId,
          teacherId: schedule.teacherId?._id || schedule.teacherId,
        });
      });
      
      // Sort schedules by start time for each day and assign period indices
      Object.keys(dayScheduleMap).forEach(day => {
        dayScheduleMap[day].sort((a, b) => {
          const timeA = a.startTime.split(':').map(Number);
          const timeB = b.startTime.split(':').map(Number);
          return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });
        
        dayScheduleMap[day].forEach((schedule, index) => {
          if (index < numberOfPeriods) {
            const key = `${day}_${index}`;
            scheduleMap[key] = {
              subjectId: schedule.subjectId,
              teacherId: schedule.teacherId,
              scheduleId: schedule._id,
              startTime: schedule.startTime,
              endTime: schedule.endTime
            };
          }
        });
      });
      
      setTimetableData(scheduleMap);
    } catch (error) {
      console.error('Error fetching class schedule:', error);
      toast.error('Failed to fetch class schedule');
    } finally {
      setLoading(false);
    }
  };

  const initializeTimetable = () => {
    const initialData: any = { ...timetableData };
    daysOfWeek.forEach(day => {
      for (let i = 0; i < numberOfPeriods; i++) {
        const key = `${day}_${i}`;
        if (!initialData[key]) {
          initialData[key] = {
            subjectId: '',
            teacherId: '',
            scheduleId: null,
            startTime: defaultTimes[i] || `08:${String(i).padStart(2, '0')}`,
            endTime: defaultTimes[i + 1] || `09:${String(i).padStart(2, '0')}`
          };
        } else {
          // Ensure times are set even for existing data
          if (!initialData[key].startTime) {
            initialData[key].startTime = defaultTimes[i] || `08:${String(i).padStart(2, '0')}`;
          }
          if (!initialData[key].endTime) {
            initialData[key].endTime = defaultTimes[i + 1] || `09:${String(i).padStart(2, '0')}`;
          }
        }
      }
    });
    setTimetableData(initialData);
  };

  const handleCellChange = (day: string, periodIndex: number, field: string, value: string) => {
    const key = `${day}_${periodIndex}`;
    
    setTimetableData((prev: any) => {
      const cellData = prev[key] || {
        subjectId: '',
        teacherId: '',
        scheduleId: null,
        startTime: defaultTimes[periodIndex] || `08:${String(periodIndex).padStart(2, '0')}`,
        endTime: defaultTimes[periodIndex + 1] || `09:${String(periodIndex + 1).padStart(2, '0')}`
      };
      
      // If teacher is changed, clear subject
      if (field === 'teacherId' && cellData.teacherId !== value) {
        return {
          ...prev,
          [key]: {
            ...cellData,
            [field]: value,
            subjectId: ''
          }
        };
      }
      
      return {
        ...prev,
        [key]: {
          ...cellData,
          [field]: value
        }
      };
    });
  };

  const getCellData = (day: string, periodIndex: number) => {
    const key = `${day}_${periodIndex}`;
    const cellData = timetableData[key];
    return cellData || {
      subjectId: '',
      teacherId: '',
      scheduleId: null,
      startTime: defaultTimes[periodIndex] || `08:${String(periodIndex).padStart(2, '0')}`,
      endTime: defaultTimes[periodIndex + 1] || `09:${String(periodIndex + 1).padStart(2, '0')}`
    };
  };

  // Filter subjects based on teacher and class
  const getFilteredSubjects = (teacherId: string, classId: string) => {
    if (!teacherId || !classId) return [];
    
    return subjects.filter(subject => {
      const subjectTeacherId = subject.teacherId?._id || subject.teacherId;
      const subjectClassId = subject.classId?._id || subject.classId;
      return subjectTeacherId === teacherId && subjectClassId === classId;
    });
  };

  const handleSaveSchedule = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }

    try {
      setLoading(true);
      const schedulesToSave: any[] = [];
      const schedulesToUpdate: any[] = [];
      const schedulesToDelete: any[] = [];

      // Process each cell in the timetable
      daysOfWeek.forEach(day => {
        for (let i = 0; i < numberOfPeriods; i++) {
          const cellData = getCellData(day, i);
          const startTime = cellData.startTime || defaultTimes[i] || `08:${String(i).padStart(2, '0')}`;
          const endTime = cellData.endTime || defaultTimes[i + 1] || `09:${String(i + 1).padStart(2, '0')}`;

          // Validate time format
          const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeFormatRegex.test(startTime) || !timeFormatRegex.test(endTime)) {
            toast.error(`Invalid time format for ${day} Period ${i + 1}. Please use HH:MM format.`);
            setLoading(false);
            return;
          }

          if (cellData.subjectId && cellData.teacherId) {
            // If there's an existing schedule ID, update it
            if (cellData.scheduleId) {
              schedulesToUpdate.push({
                id: cellData.scheduleId,
                teacherId: cellData.teacherId,
                subjectId: cellData.subjectId,
                dayOfWeek: day,
                startTime,
                endTime
              });
            } else {
              // Create new schedule
              schedulesToSave.push({
                teacherId: cellData.teacherId,
                classId: selectedClass,
                subjectId: cellData.subjectId,
                dayOfWeek: day,
                startTime,
                endTime,
                academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                status: 'active'
              });
            }
          } else if (cellData.scheduleId) {
            // Delete schedule if cell is empty but had an existing schedule
            schedulesToDelete.push(cellData.scheduleId);
          }
        }
      });

      // Delete old schedules first
      const deleteResults = [];
      for (const scheduleId of schedulesToDelete) {
        try {
          await api.schedule.delete(scheduleId);
          deleteResults.push({ success: true, scheduleId });
        } catch (error: any) {
          console.error('Error deleting schedule:', error);
          const errorMsg = error?.message || error?.response?.data?.error || 'Failed to delete schedule';
          deleteResults.push({ success: false, scheduleId, error: errorMsg });
          toast.error(`Failed to delete schedule: ${errorMsg}`);
        }
      }

      // Create new schedules
      const createResults = [];
      for (const schedule of schedulesToSave) {
        try {
          const result = await api.schedule.create(schedule);
          createResults.push({ success: true, schedule });
        } catch (error: any) {
          console.error('Error creating schedule:', error);
          const errorMsg = error?.message || error?.response?.data?.error || 'Failed to create schedule';
          createResults.push({ success: false, schedule, error: errorMsg });
          toast.error(`Failed to create schedule: ${errorMsg}`);
        }
      }

      // Update existing schedules
      const updateResults = [];
      for (const schedule of schedulesToUpdate) {
        try {
          const result = await api.schedule.update(schedule.id, {
            teacherId: schedule.teacherId,
            subjectId: schedule.subjectId,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime
          });
          updateResults.push({ success: true, schedule });
        } catch (error: any) {
          console.error('Error updating schedule:', error);
          const errorMsg = error?.message || error?.response?.data?.error || 'Failed to update schedule';
          updateResults.push({ success: false, schedule, error: errorMsg });
          toast.error(`Failed to update schedule: ${errorMsg}`);
        }
      }

      // Check if all operations succeeded
      const allSucceeded = 
        createResults.every(r => r.success) && 
        updateResults.every(r => r.success) &&
        deleteResults.every(r => r.success);

      // Refresh the schedule to show latest data
      await fetchClassSchedule();
      
      if (allSucceeded) {
        toast.success(`Timetable saved successfully! ${schedulesToSave.length} created, ${schedulesToUpdate.length} updated, ${schedulesToDelete.length} deleted.`);
      } else {
        const created = createResults.filter(r => r.success).length;
        const updated = updateResults.filter(r => r.success).length;
        toast.success(`Timetable partially saved: ${created}/${schedulesToSave.length} created, ${updated}/${schedulesToUpdate.length} updated, ${schedulesToDelete.length} deleted.`);
      }
    } catch (error: any) {
      console.error('Error saving timetable:', error);
      toast.error(error.response?.data?.error || 'Failed to save timetable');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCell = (day: string, periodIndex: number) => {
    const key = `${day}_${periodIndex}`;
    
    setTimetableData((prev: any) => ({
      ...prev,
      [key]: {
        ...prev[key],
        subjectId: '',
        teacherId: ''
      }
    }));
  };

  const handleTimeChange = (day: string, periodIndex: number, field: 'startTime' | 'endTime', value: string) => {
    const key = `${day}_${periodIndex}`;
    
    setTimetableData((prev: any) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleViewPDF = async () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }

    try {
      setLoading(true);
      
      const selectedClassData = classes.find(c => c._id === selectedClass);
      const className = selectedClassData ? `${selectedClassData.name} ${selectedClassData.section || ''}`.trim() : 'Class';
      
      const pdfData: any = {
        className,
        days: daysOfWeek,
        periods: Array.from({ length: numberOfPeriods }, (_, i) => i + 1),
        numberOfPeriods,
        schedule: {}
      };

      daysOfWeek.forEach(day => {
        pdfData.schedule[day] = [];
        for (let i = 0; i < numberOfPeriods; i++) {
          const cellData = getCellData(day, i);
          const subject = subjects.find(s => s._id === cellData.subjectId);
          const teacher = teachers.find(t => t._id === cellData.teacherId);
          
          pdfData.schedule[day].push({
            period: i + 1,
            time: `${cellData.startTime || defaultTimes[i] || '08:00'} - ${cellData.endTime || defaultTimes[i + 1] || '09:00'}`,
            subject: subject?.name || '-',
            teacher: teacher?.name || '-'
          });
        }
      });

      const htmlContent = generateTimetableHTML(pdfData);

      // Use Native Browser Printing for 100% Reliability
      // This bypasses the canvas-based "White Screen" issues entirely
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        setLoading(true);
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for fonts and layouts to be fully ready in the new window
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            // Optional: Close the window after printing
            // printWindow.close();
            setLoading(false);
            toast.success('Timetable Print Preview Ready!');
          }, 500);
        };
      } else {
        toast.error('Please allow popups to view the timetable');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error in handleViewPDF:', error);
      toast.error('Failed to generate timetable');
      setLoading(false);
    }
  };

  const generateTimetableHTML = (data: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Timetable - ${data.className}</title>
          <style>
            @page { size: ${data.numberOfPeriods > 6 ? 'landscape' : 'portrait'}; margin: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              padding: 0; 
              margin: 0; 
              color: #1f2937;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
            }
            .page {
              padding: 40px;
              box-sizing: border-box;
              background: #ffffff;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-bottom: 30px;
              border-bottom: 4px solid #4f46e5;
              padding-bottom: 20px;
            }
            .school-branding {
              text-align: left;
            }
            .school-name { 
              font-size: 28px; 
              font-weight: 800; 
              color: #312e81; 
              margin: 0;
              text-transform: uppercase;
            }
            .timetable-tag {
              display: inline-block;
              background-color: #4f46e5;
              color: #ffffff;
              padding: 4px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 8px;
              text-transform: uppercase;
            }
            .meta-info {
              text-align: right;
              font-size: 13px;
              color: #6b7280;
              line-height: 1.6;
            }
            .meta-info strong {
              color: #1f2937;
            }
            
            table { 
              width: 100%; 
              border-collapse: separate; 
              border-spacing: 0;
              table-layout: fixed;
              border: 1px solid #e5e7eb;
              border-top-left-radius: 12px;
              border-top-right-radius: 12px;
              overflow: hidden;
            }
            
            th, td { 
              border: 1px solid #e5e7eb; 
              padding: 16px 10px; 
              text-align: center;
              vertical-align: middle;
            }
            
            thead th { 
              background-color: #4338ca; 
              color: #ffffff; 
              font-weight: 600; 
              font-size: 13px;
              text-transform: uppercase;
            }
            
            .day-label { 
              width: 120px; 
              background-color: #f8fafc; 
              color: #4338ca; 
              font-weight: 700; 
              text-align: left; 
              padding-left: 20px;
              font-size: 14px;
            }
            
            .period-header {
              border-bottom: 2px solid #3730a3;
            }
            
            .time-slot {
              display: block;
              font-weight: 400;
              font-size: 11px;
              opacity: 0.85;
              margin-top: 6px;
            }
            
            .subject-box {
              display: flex;
              flex-direction: column;
              gap: 4px;
              min-height: 44px;
              justify-content: center;
            }
            
            .subject-title { 
              font-weight: 700; 
              font-size: 14px; 
              color: #1e1b4b;
            }
            
            .teacher-sub { 
              font-size: 11px; 
              color: #6366f1; 
              font-weight: 500;
              text-transform: uppercase;
            }
            
            .empty-placeholder { 
              color: #e5e7eb; 
              font-size: 18px;
            }
            
            .footer-strip {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #9ca3af;
              border-top: 1px solid #f3f4f6;
              padding-top: 15px;
            }
            
            .stamp-box {
              width: 140px;
              height: 60px;
              border: 1px dashed #d1d5db;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: #9ca3af;
              text-transform: uppercase;
              font-weight: 600;
              letter-spacing: 1px;
            }

            /* Zebra striping for rows */
            tr:nth-child(even) td:not(.day-label) {
              background-color: #fcfcfd;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header-container">
              <div class="school-branding">
                <h1 class="school-name">SPARK EDUCATIONAL SYSTEM</h1>
                <span class="timetable-tag">OFFICIAL CLASS SCHEDULE</span>
              </div>
              <div class="meta-info">
                <div>Class: <strong>${data.className}</strong></div>
                <div>Session: <strong>${new Date().getFullYear()}-${new Date().getFullYear() + 1}</strong></div>
                <div>Issued: <strong>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th class="day-label" style="background-color: #312e81; color: #ffffff;">Day / Period</th>
                  ${data.schedule[data.days[0]].map((p: any) => `
                    <th class="period-header">
                      Period ${p.period}
                      <span class="time-slot">${p.time}</span>
                    </th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.days.map((day) => `
                  <tr>
                    <td class="day-label">${day}</td>
                    ${data.schedule[day].map((period: any) => `
                      <td>
                        ${period.subject !== '-' ? `
                          <div class="subject-box">
                            <span class="subject-title">${period.subject}</span>
                            <span class="teacher-sub">${period.teacher}</span>
                          </div>
                        ` : '<span class="empty-placeholder">—</span>'}
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="footer-strip">
              <div>Document ID: SP-TT-${Math.random().toString(36).substr(2, 9).toUpperCase()} • Confirmed Information</div>
              <div class="stamp-box">Principal Signature</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div className="space-y-2.5 [font-family:DM_Sans,sans-serif]">
      <TimetableGenerator selectedClass={selectedClass} teachers={teachers} subjects={subjects} onPublished={fetchClassSchedule} />
      {/* Class Selection and Period Settings */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Select Class *
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setTimetableData({});
              }}
              className="w-full h-9 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              required
            >
              <option value="">Select a class</option>
              {classes.map(cls => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} - {cls.section || 'Section A'}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Periods Per Day
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setNumberOfPeriods(Math.max(1, numberOfPeriods - 1))}
                disabled={numberOfPeriods <= 1}
                className="h-9 w-9 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min="1"
                max="12"
                value={numberOfPeriods}
                onChange={(e) => setNumberOfPeriods(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                className="w-20 h-9 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-sm font-semibold"
              />
              <button
                type="button"
                onClick={() => setNumberOfPeriods(Math.min(12, numberOfPeriods + 1))}
                disabled={numberOfPeriods >= 12}
                className="h-9 w-9 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={handleSaveSchedule}
              disabled={!selectedClass || loading}
              className="flex-1 h-9 bg-[#245a82] hover:bg-[#1a4463] text-white px-4 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors text-sm font-semibold shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Timetable'}</span>
            </button>
            <button
              onClick={handleViewPDF}
              disabled={!selectedClass || loading}
              className="h-9 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 px-3.5 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 transition-colors text-sm font-medium shadow-xs"
              title="View/Download Timetable PDF"
            >
              <FileText className="h-4 w-4 text-gray-500" />
              <span>View PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      {selectedClass ? (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 z-20 bg-[#245a82] shadow-xs">
                <tr className="bg-[#245a82] text-white">
                  <th className="border border-[#1e4c70] px-4 py-2.5 text-left font-semibold sticky left-0 bg-[#245a82] z-30 text-xs shadow-xs">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-200" />
                      <span>Day / Period</span>
                    </div>
                  </th>
                  {Array.from({ length: numberOfPeriods }, (_, i) => {
                    const firstCellData = daysOfWeek.length > 0 ? getCellData(daysOfWeek[0], i) : null;
                    const displayStartTime = firstCellData?.startTime || defaultTimes[i] || `08:${String(i).padStart(2, '0')}`;
                    const displayEndTime = firstCellData?.endTime || defaultTimes[i + 1] || `09:${String(i + 1).padStart(2, '0')}`;
                    
                    return (
                      <th key={i} className="border border-[#1e4c70] px-3 py-2 text-center font-semibold min-w-[190px] text-xs">
                        <div className="flex flex-col items-center">
                          <span className="font-bold tracking-wide">Period {i + 1}</span>
                          <span className="text-[11px] font-normal text-blue-100 opacity-90 mt-0.5">
                            {displayStartTime} - {displayEndTime}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {daysOfWeek.map((day, dayIndex) => (
                  <tr key={day} className={dayIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="border border-gray-200 px-4 py-3 font-semibold sticky left-0 bg-white z-10 min-w-[130px] text-xs text-gray-800 shadow-xs">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                          <Calendar className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-bold">{day}</span>
                      </div>
                    </td>
                    {Array.from({ length: numberOfPeriods }, (_, periodIndex) => {
                      const cellData = getCellData(day, periodIndex);
                      const filteredSubjects = getFilteredSubjects(cellData.teacherId || '', selectedClass);
                      const isAssigned = Boolean(cellData.subjectId && cellData.teacherId);
                      const teacherObj = teachers.find(t => t._id === cellData.teacherId);
                      const subjectObj = subjects.find(s => s._id === cellData.subjectId);
                      
                      return (
                        <td key={periodIndex} className="border border-gray-200 p-2 align-top">
                          {isAssigned ? (
                            <div className="rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/90 to-indigo-50/60 p-2.5 shadow-xs relative group transition-all hover:border-blue-400 hover:shadow-sm">
                              <div className="flex items-start justify-between gap-1 mb-1.5">
                                <span className="font-bold text-xs text-blue-900 leading-tight truncate" title={subjectObj?.name}>
                                  {subjectObj?.name || 'Assigned Subject'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleClearCell(day, periodIndex)}
                                  className="text-gray-400 hover:text-red-600 p-0.5 rounded transition"
                                  title="Clear slot"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                                <Users className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">{teacherObj?.name || 'Teacher'}</span>
                              </div>
                              <div className="mt-2 pt-1.5 border-t border-blue-100/80 flex items-center justify-between text-[10px] text-blue-700">
                                <span>{cellData.startTime || defaultTimes[periodIndex] || '08:00'} - {cellData.endTime || defaultTimes[periodIndex + 1] || '09:00'}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCellChange(day, periodIndex, 'subjectId', '')}
                                  className="text-blue-600 hover:underline font-semibold"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 hover:bg-white hover:border-blue-300 p-2.5 space-y-1.5 transition-all">
                              <div>
                                <select
                                  value={cellData.teacherId || ''}
                                  onChange={(e) => handleCellChange(day, periodIndex, 'teacherId', e.target.value)}
                                  className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                >
                                  <option value="">+ Assign Teacher</option>
                                  {teachers.map(teacher => (
                                    <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                                  ))}
                                </select>
                              </div>

                              {cellData.teacherId ? (
                                <div>
                                  <select
                                    value={cellData.subjectId || ''}
                                    onChange={(e) => handleCellChange(day, periodIndex, 'subjectId', e.target.value)}
                                    className="w-full h-8 px-2 text-xs border border-blue-200 rounded-lg bg-white text-blue-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="">Select Subject</option>
                                    {filteredSubjects.map(subject => (
                                      <option key={subject._id} value={subject._id}>
                                        {subject.name} {subject.code ? `(${subject.code})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <div className="h-7 flex items-center justify-center text-[10px] text-gray-400 font-medium italic">
                                  Empty period
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-xs p-8 text-center border border-gray-200/80">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-blue-50 rounded-full">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No Class Selected</h3>
              <p className="text-xs text-gray-500">Please select a class from the dropdown above to view and edit the timetable</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      {selectedClass && (
        <div className="mt-2.5 bg-blue-50 rounded-xl p-2.5 border border-blue-100">
          <div className="flex items-start space-x-2">
            <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-xs text-blue-900 mb-0.5">Timetable Instructions</h4>
              <ul className="text-[11px] text-blue-800 space-y-0.5 list-disc list-inside">
                <li>Set the start and end time for each period</li>
                <li>Select a teacher first for each period</li>
                <li>Subject dropdown will show only subjects that the selected teacher teaches for this class</li>
                <li>You can adjust the number of periods per day using the +/- buttons</li>
                <li>Click "Save Timetable" to save all changes</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;
