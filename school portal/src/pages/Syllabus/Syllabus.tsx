import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  GraduationCap,
  Calendar,
  User,
  FileText,
  Map,
  Video
} from 'lucide-react';
import { api, API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

interface Topic {
  topic: string;
  description: string;
  order: number;
}

interface Resource {
  title: string;
  type: 'textbook' | 'reference' | 'website' | 'video' | 'other';
  url: string;
}

interface Document {
  _id?: string;
  name: string;
  description?: string;
  type?: string;
  url: string;
  uploadedAt?: string;
}

interface Syllabus {
  _id: string;
  classId: {
    _id: string;
    name: string;
    section: string;
  };
  subjectId: {
    _id: string;
    name: string;
    code: string;
  };
  teacherId?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  academicYear: string;
  syllabusContent: string;
  topics: Topic[];
  learningObjectives: string[];
  assessmentCriteria: string;
  resources: Resource[];
  status: string;
  category?: string;
  contentType?: 'upload_content' | 'syllabus' | 'assignment' | 'lesson_plan';
  documents?: Document[];
  createdAt: string;
  updatedAt: string;
}

const Syllabus: React.FC = () => {
  const { state: authState } = useAuth();
  const [activeTab, setActiveTab] = useState<'syllabus' | 'lesson_plan' | 'curriculum_map' | 'e_content'>('syllabus');
  const [syllabus, setSyllabus] = useState<Syllabus[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<any[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingSyllabus, setEditingSyllabus] = useState<Syllabus | null>(null);
  const [originalDocuments, setOriginalDocuments] = useState<Document[]>([]);
  
  // Simplified Filters - only Class and Search
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Tab configuration
  const tabs = [
    { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
    { id: 'lesson_plan', label: 'Lesson Plan', icon: FileText },
    { id: 'curriculum_map', label: 'Curriculum Map', icon: Map },
    { id: 'e_content', label: 'E-Content', icon: Video },
  ];

  // Simplified Form state
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    syllabusContent: '',
    // files for upload
    files: [] as File[],
    // existing documents (for editing)
    existingDocuments: [] as Document[],
  });

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchData();
    }
  }, [authState.isAuthenticated]);

  // Filter subjects and teachers based on selected class in form
  useEffect(() => {
    if (formData.classId) {
      // Filter subjects by selected class
      const classSubjects = subjects.filter(subject => 
        subject.classId?._id === formData.classId || subject.classId === formData.classId
      );
      setFilteredSubjects(classSubjects);
      
      // Filter teachers based on selected subject
      if (formData.subjectId) {
        const selectedSubjectData = classSubjects.find(s => s._id === formData.subjectId);
        if (selectedSubjectData) {
          const teacherId = selectedSubjectData.teacherId?._id || selectedSubjectData.teacherId;
          if (teacherId) {
            const teacherForSubject = teachers.filter(teacher => 
              teacher._id === teacherId
            );
            setFilteredTeachers(teacherForSubject);
          } else {
            setFilteredTeachers(teachers);
          }
        } else {
          setFilteredTeachers([]);
        }
      } else {
        // Show all teachers who teach any subject in this class
        const teachersForClass = teachers.filter(teacher => {
          return classSubjects.some(subject => 
            (subject.teacherId?._id === teacher._id || subject.teacherId === teacher._id)
          );
        });
        setFilteredTeachers(teachersForClass);
      }
    } else {
      setFilteredSubjects([]);
      setFilteredTeachers([]);
    }
  }, [formData.classId, formData.subjectId, subjects, teachers]);

  useEffect(() => {
    fetchSyllabus();
  }, [selectedClass, searchTerm, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes, teachersRes] = await Promise.all([
        api.classroom.getClasses(),
        api.subjects.getAll(),
        api.classroom.getTeachers()
      ]);

      const classesData = classesRes?.data || classesRes || [];
      const subjectsData = subjectsRes?.data || subjectsRes || [];
      const teachersData = teachersRes?.data || teachersRes || [];

      setClasses(Array.isArray(classesData) ? classesData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load classes, subjects, and teachers');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyllabus = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedClass) params.classId = selectedClass;

      // Filter by contentType based on active tab
      const contentTypeMap: { [key: string]: string } = {
        'syllabus': 'syllabus',
        'lesson_plan': 'lesson_plan',
        'curriculum_map': 'curriculum_map',
        'e_content': 'e_content'
      };
      params.contentType = contentTypeMap[activeTab] || 'syllabus';

      const response = await api.syllabus.getAll(params);
      let syllabusData = response?.data || response || [];
      
      // Additional filter by contentType if backend doesn't filter
      syllabusData = syllabusData.filter((s: Syllabus) => {
        const contentTypeMatch = !s.contentType || s.contentType === contentTypeMap[activeTab];
        return contentTypeMatch;
      });
      
      // Filter by search term if provided (search in subject name, class name, teacher name, academic year)
      if (searchTerm) {
        syllabusData = syllabusData.filter((s: Syllabus) => 
          s.subjectId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.classId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.academicYear.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.teacherId && s.teacherId.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      setSyllabus(Array.isArray(syllabusData) ? syllabusData : []);
    } catch (error) {
      console.error('Error fetching syllabus:', error);
      toast.error(`Failed to load ${tabs.find(t => t.id === activeTab)?.label || 'content'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (syllabusItem?: Syllabus) => {
    if (syllabusItem) {
      setEditingSyllabus(syllabusItem);
      const documents = syllabusItem.documents || [];
      setOriginalDocuments(documents);
      setFormData({
        classId: syllabusItem.classId._id,
        subjectId: syllabusItem.subjectId._id,
        teacherId: syllabusItem.teacherId?._id || '',
        academicYear: syllabusItem.academicYear,
        syllabusContent: syllabusItem.syllabusContent || '',
        files: [],
        existingDocuments: documents
      });
    } else {
      setEditingSyllabus(null);
      setOriginalDocuments([]);
      setFormData({
        classId: '',
        subjectId: '',
        teacherId: '',
        academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        syllabusContent: '',
        files: [],
        existingDocuments: []
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSyllabus(null);
    setOriginalDocuments([]);
    setFormData({
      classId: '',
      subjectId: '',
      teacherId: '',
      academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      syllabusContent: '',
      files: [],
      existingDocuments: []
    });
  };

  const removeExistingDocument = (index: number) => {
    setFormData({
      ...formData,
      existingDocuments: formData.existingDocuments.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.classId || !formData.subjectId || !formData.academicYear || !formData.syllabusContent) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // If files are present, submit as multipart/form-data
      if (formData.files && formData.files.length > 0) {
        const fd = new FormData();
        fd.append('classId', formData.classId);
        fd.append('subjectId', formData.subjectId);
        fd.append('teacherId', formData.teacherId || '');
        fd.append('academicYear', formData.academicYear);
        fd.append('syllabusContent', formData.syllabusContent);
        fd.append('contentType', activeTab);
        
        // Append existing documents (for editing - to track which ones to keep)
        if (editingSyllabus && formData.existingDocuments) {
          fd.append('existingDocuments', JSON.stringify(formData.existingDocuments));
        }

        // Append files
        formData.files.forEach((file) => {
          fd.append('files', file);
        });

        if (editingSyllabus) {
          await api.syllabus.update(editingSyllabus._id, fd);
          toast.success('Syllabus updated successfully');
        } else {
          await api.syllabus.create(fd);
          toast.success('Syllabus created successfully');
        }
      } else {
        // No files - send as JSON
        const dataToSend: any = {
          classId: formData.classId,
          subjectId: formData.subjectId,
          teacherId: formData.teacherId || null,
          academicYear: formData.academicYear,
          syllabusContent: formData.syllabusContent,
          contentType: activeTab
        };
        
        // Include existing documents when editing
        if (editingSyllabus && formData.existingDocuments) {
          dataToSend.existingDocuments = formData.existingDocuments;
        }

        if (editingSyllabus) {
          await api.syllabus.update(editingSyllabus._id, dataToSend);
          toast.success('Syllabus updated successfully');
        } else {
          await api.syllabus.create(dataToSend);
          toast.success('Syllabus created successfully');
        }
      }
      handleCloseModal();
      fetchSyllabus();
    } catch (error: any) {
      console.error('Error saving syllabus:', error);
      toast.error(error.message || 'Failed to save syllabus');
    }
  };

  const handleDelete = async (id: string) => {
    const syllabusItem = syllabus.find(s => s._id === id);
    const confirmMessage = syllabusItem 
      ? `Are you sure you want to permanently delete the syllabus for ${syllabusItem.subjectId.name} - ${syllabusItem.classId.name}? This action cannot be undone and will also delete all associated files.`
      : 'Are you sure you want to permanently delete this syllabus? This action cannot be undone.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.syllabus.delete(id);
      toast.success('Syllabus deleted successfully from database');
      fetchSyllabus();
    } catch (error: any) {
      console.error('Error deleting syllabus:', error);
      toast.error(error.message || 'Failed to delete syllabus');
    }
  };


  // File handlers for upload_content
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    // When uploading new files, replace existing documents (clear existingDocuments)
    setFormData({ ...formData, files, existingDocuments: [] });
  };

  const removeFile = (index: number) => {
    const newFiles = formData.files.filter((_, i) => i !== index);
    // If all new files are removed and we're editing, restore original documents
    if (newFiles.length === 0 && editingSyllabus && originalDocuments.length > 0) {
      setFormData({ 
        ...formData, 
        files: newFiles,
        existingDocuments: [...originalDocuments]
      });
    } else {
      setFormData({ ...formData, files: newFiles });
    }
  };

  const getAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
      years.push(`${currentYear + i}-${currentYear + i + 1}`);
    }
    return years;
  };

  if (loading && syllabus.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Get current tab label
  const currentTabLabel = tabs.find(t => t.id === activeTab)?.label || 'Syllabus';

  return (
    <div className="min-h-full [font-family:DM_Sans,sans-serif]">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="bg-white border border-[#dfe7ed] rounded-xl overflow-hidden mb-6">
          <div className="relative overflow-hidden bg-[#eaf2f6] px-5 py-7 sm:px-8 sm:py-9">
            <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full border-[28px] border-white/40 pointer-events-none" />
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[.22em] text-[#ba6030]">Academic planning / Curriculum</p>
            <h1 className="text-3xl font-extrabold tracking-[-.05em] text-[#17283c] sm:text-4xl [font-family:Manrope,sans-serif]">What we teach<span className="text-[#e7773b]">.</span></h1>
            <p className="text-[#52697b] mt-2">Keep syllabus, lesson plans, curriculum maps and learning material together.</p>
          </div>

          {/* Navigation Tabs */}
          <div className="border-t">
            <nav className="flex gap-6 px-5 sm:px-8 overflow-x-auto scrollbar-hide" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'border-[#e7773b] text-[#245a82]'
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
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{currentTabLabel}</h2>
              <p className="text-gray-600 mt-1">
                {activeTab === 'syllabus' && 'Manage syllabus content for classes and subjects'}
                {activeTab === 'lesson_plan' && 'Create and manage lesson plans for your classes'}
                {activeTab === 'curriculum_map' && 'Map curriculum structure and learning outcomes'}
                {activeTab === 'e_content' && 'Upload and manage electronic learning content'}
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="bg-[#245a82] text-white px-4 py-2 rounded-lg hover:bg-[#194e74] flex items-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add {currentTabLabel}
            </button>
          </div>

      {/* Simplified Filters - Only Class and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} - {cls.section}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by subject, class, teacher, or year..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {syllabus.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No {currentTabLabel.toLowerCase()} found</p>
            <p className="text-gray-500 text-sm mt-2">Create a new {currentTabLabel.toLowerCase()} to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {syllabus
                  .slice((page - 1) * pageSize, page * pageSize)
                  .map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <GraduationCap className="w-5 h-5 text-blue-600 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.classId.name}</div>
                          <div className="text-sm text-gray-500">{item.classId.section}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BookOpen className="w-5 h-5 text-green-600 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.subjectId.name}</div>
                          <div className="text-sm text-gray-500">{item.subjectId.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-orange-600 mr-2" />
                        <span className="text-sm text-gray-900">
                          {item.teacherId ? item.teacherId.name : 'Not assigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-purple-600 mr-2" />
                        <span className="text-sm text-gray-900">{item.academicYear}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : item.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {syllabus.length > 0 && (
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={syllabus.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSyllabus ? `Edit ${currentTabLabel}` : `Add New ${currentTabLabel}`}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => {
                      const newClassId = e.target.value;
                      setFormData({ ...formData, classId: newClassId, subjectId: '', teacherId: '' });
                      setSelectedClass(newClassId);
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name} - {cls.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.subjectId}
                    onChange={(e) => {
                      const newSubjectId = e.target.value;
                      setFormData({ ...formData, subjectId: newSubjectId, teacherId: '' });
                    }}
                    required
                    disabled={!formData.classId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select Subject</option>
                    {filteredSubjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teacher <span className="text-gray-500">(Optional)</span>
                  </label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    disabled={!formData.classId || !formData.subjectId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select Teacher (Optional)</option>
                    {filteredTeachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select a teacher to assign this syllabus to a specific teacher
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {getAcademicYears().map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Files (PDF, Document)</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="application/pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  className="w-full"
                />

                {/* Display existing documents when editing */}
                {editingSyllabus && formData.existingDocuments && formData.existingDocuments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Existing Files:</p>
                    {formData.existingDocuments.map((doc, idx) => {
                      const fileUrl = doc.url.startsWith('http')
                        ? doc.url
                        : `${API_BASE_URL}/syllabus/${editingSyllabus._id}/documents/${doc._id}`;
                      return (
                        <div key={doc._id || idx} className="flex items-center justify-between bg-blue-50 p-2 rounded-lg border border-blue-200">
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">{doc.name}</div>
                            {doc.description && (
                              <div className="text-xs text-gray-500">{doc.description}</div>
                            )}
                            <div className="text-xs text-gray-500">
                              {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Uploaded'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  if (doc.url.startsWith('http')) { window.open(fileUrl, '_blank', 'noopener,noreferrer'); return; }
                                  const response = await fetch(fileUrl, { headers: { Authorization: `Bearer ${localStorage.getItem('school_token') || ''}` } });
                                  if (!response.ok) throw new Error('Document access failed');
                                  const objectUrl = URL.createObjectURL(await response.blob());
                                  const link = document.createElement('a');
                                  link.href = objectUrl;
                                  link.target = '_blank';
                                  link.rel = 'noopener noreferrer';
                                  link.click();
                                  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
                                } catch { toast.error('Could not open this document'); }
                              }}
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View
                            </button>
                            <button 
                              type="button" 
                              onClick={() => removeExistingDocument(idx)} 
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Display newly uploaded files */}
                {formData.files && formData.files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {editingSyllabus && formData.existingDocuments && formData.existingDocuments.length > 0 && (
                      <p className="text-sm font-medium text-gray-700">New Files (will replace existing):</p>
                    )}
                    {formData.files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{file.name}</div>
                          <div className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB • {file.type || 'file'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={URL.createObjectURL(file)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Preview
                          </a>
                          <button type="button" onClick={() => removeFile(idx)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {activeTab === 'syllabus' && 'Syllabus Content'}
                  {activeTab === 'lesson_plan' && 'Lesson Plan Content'}
                  {activeTab === 'curriculum_map' && 'Curriculum Map Content'}
                  {activeTab === 'e_content' && 'Content Description'}
                  <span className="text-red-500"> *</span>
                </label>
                <textarea
                  value={formData.syllabusContent}
                  onChange={(e) => setFormData({ ...formData, syllabusContent: e.target.value })}
                  required
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={
                    activeTab === 'syllabus' ? 'Enter the syllabus content describing what should be taught...' :
                    activeTab === 'lesson_plan' ? 'Enter lesson plan details, objectives, activities, and materials...' :
                    activeTab === 'curriculum_map' ? 'Enter curriculum map structure, learning outcomes, and assessment criteria...' :
                    'Enter description of the e-content, learning objectives, and usage instructions...'
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  {activeTab === 'syllabus' && 'Describe the syllabus content, topics, learning objectives, and any other relevant information.'}
                  {activeTab === 'lesson_plan' && 'Describe the lesson objectives, activities, materials needed, assessment methods, and homework.'}
                  {activeTab === 'curriculum_map' && 'Describe the curriculum structure, learning outcomes, assessment criteria, and timeline.'}
                  {activeTab === 'e_content' && 'Describe the e-content, its purpose, learning objectives, and how students should use it.'}
                </p>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingSyllabus ? 'Update' : 'Create'} {currentTabLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default Syllabus;

