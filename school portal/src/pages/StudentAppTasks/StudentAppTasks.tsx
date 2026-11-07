import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Download, BookOpen, Clock, AlertCircle, FileText, Calendar, User } from 'lucide-react';
import { assignmentsAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Assignment {
  _id: string;
  title: string;
  description: string;
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
  teacherId: {
    _id: string;
    name: string;
    email: string;
  };
  dueDate: string;
  dueTime?: string;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  totalMarks: number;
  points: number;
  status: string;
  submissionCount: number;
  totalStudents: number;
  submissions: Array<{
    studentId: {
      _id: string;
      name: string;
      rollNumber?: string;
    } | string;
    submittedAt: string;
    attachments: Array<{
      name: string;
      url: string;
      type: string;
      size: number;
    }>;
    marks?: number;
    pointsEarned?: number;
    feedback?: string;
    status: string;
  }>;
  createdAt: string;
}

const StudentAppTasks: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: CheckSquare },
    { id: 'assignments', label: 'Assignments', icon: BookOpen },
    { id: 'submissions', label: 'Submissions', icon: Clock },
    { id: 'reports', label: 'Reports', icon: AlertCircle },
  ];

  // Fetch assignments on component mount
  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await assignmentsAPI.getAll();
      
      if (response.success) {
        const assignmentsData = response.data || [];
        console.log('📚 Assignments loaded:', assignmentsData.length);
        if (assignmentsData.length > 0 && assignmentsData[0].submissions?.length > 0) {
          console.log('👤 Sample submission student data:', assignmentsData[0].submissions[0].studentId);
        }
        setAssignments(assignmentsData);
        
        // Calculate stats
        const now = new Date();
        const statsData = {
          total: assignmentsData.length,
          pending: 0,
          completed: 0,
          overdue: 0,
        };
        
        assignmentsData.forEach((assignment: Assignment) => {
          const dueDate = new Date(assignment.dueDate);
          const hasSubmissions = assignment.submissions && assignment.submissions.some(s => 
            s.status === 'submitted' || s.status === 'late' || s.status === 'graded'
          );
          const isOverdue = now > dueDate && assignment.status === 'active' && !hasSubmissions;
          
          // If assignment has submissions, count it as completed
          if (assignment.status === 'completed' || hasSubmissions) {
            statsData.completed++;
          } else if (isOverdue) {
            statsData.overdue++;
          } else if (assignment.status === 'active') {
            statsData.pending++;
          }
        });
        
        setStats(statsData);
      }
    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      toast.error(error.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (assignment: Assignment, checkSubmission: boolean = false) => {
    // If we're checking submission status in overview
    if (checkSubmission && assignment.submissions && assignment.submissions.length > 0) {
      const hasSubmitted = assignment.submissions.some(s => s.status === 'submitted' || s.status === 'late' || s.status === 'graded');
      if (hasSubmitted) {
        return 'bg-green-100 text-green-800';
      }
    }
    
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const isOverdue = now > dueDate && assignment.status === 'active';
    
    if (assignment.status === 'completed') {
      return 'bg-green-100 text-green-800';
    } else if (isOverdue) {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (assignment: Assignment, checkSubmission: boolean = false) => {
    // If we're checking submission status in overview
    if (checkSubmission && assignment.submissions && assignment.submissions.length > 0) {
      const hasSubmitted = assignment.submissions.some(s => s.status === 'submitted' || s.status === 'late' || s.status === 'graded');
      if (hasSubmitted) {
        const lateSubmission = assignment.submissions.find(s => s.status === 'late');
        return lateSubmission ? 'Submitted (Late)' : 'Submitted';
      }
    }
    
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const isOverdue = now > dueDate && assignment.status === 'active';
    
    if (assignment.status === 'completed') {
      return 'Completed';
    } else if (isOverdue) {
      return 'Overdue';
    } else {
      return 'Active';
    }
  };

  const handleDownloadFile = (url: string, name: string) => {
    const fullUrl = url.startsWith('http') ? url : (window.location.origin + (url.startsWith('/') ? url : '/' + url));
    window.open(fullUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-[28px] bg-[#20386b] px-6 py-8 text-white shadow-[0_20px_50px_#243d711f] md:px-9 md:py-10">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[34px] border-[#f57a3224]" aria-hidden="true" />
        <div className="relative"><p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-[#ffad72]">Learning / assignments</p>
      <h1 className="font-['Manrope'] text-3xl font-extrabold tracking-[-.05em] md:text-[40px]">Student app tasks</h1>
          <p className="mt-2 text-sm text-[#d9e3f5]">Track assignments, completions and work that needs attention.</p></div>
      </div>

      {/* Key Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">All time</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Finished</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckSquare className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              <p className="text-sm text-gray-500">Need attention</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 overflow-hidden rounded-[24px] border border-[#e0e7f2] bg-white shadow-[0_18px_50px_#2038630c]">
        <div className="border-b border-[#e7ecf5] bg-[#fbfcff]">
          <nav className="flex gap-7 overflow-x-auto px-6" aria-label="Task views">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center whitespace-nowrap border-b-[3px] px-1 py-5 text-sm font-bold ${
                    activeTab === tab.id
                    ? 'border-[#f4782e] text-[#20386b]'
                    : 'border-transparent text-[#7b879d] hover:border-[#efb793] hover:text-[#20386b]'
                  }`}
              >
                  <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks Overview</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Recent Assignments</h4>
                  {assignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No assignments available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignments.slice(0, 5).map((assignment) => (
                        <div key={assignment._id} className="flex items-center justify-between p-3 bg-white rounded border">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{assignment.title}</p>
                            <p className="text-sm text-gray-500">
                              {assignment.classId.name} {assignment.classId.section} • 
                              Due: {formatDate(assignment.dueDate)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Teacher: {assignment.teacherId.name}
                            </p>
                          </div>
                          <div className="text-right ml-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(assignment, true)}`}>
                              {getStatusText(assignment, true)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Assignment Statistics</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Completion Rate</span>
                      <span className="font-medium">
                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Assignments</span>
                      <span className="font-medium">{stats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Assignments</span>
                      <span className="font-medium">{stats.pending}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-medium">{stats.completed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Overdue</span>
                      <span className="font-medium text-red-600">{stats.overdue}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === 'assignments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assignments ({assignments.length})</h3>
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No assignments available yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment._id} className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">{assignment.title}</h4>
                          <p className="text-gray-600 text-sm mb-3">{assignment.description}</p>
                          
                          {/* Assignment Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            <div className="flex items-center text-sm">
                              <User className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="text-gray-600">Teacher: </span>
                              <span className="ml-1 font-medium text-gray-900">{assignment.teacherId.name}</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <BookOpen className="h-4 w-4 mr-2 text-green-600" />
                              <span className="text-gray-600">Subject: </span>
                              <span className="ml-1 font-medium text-gray-900">{assignment.subjectId.name}</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                              <span className="text-gray-600">Class: </span>
                              <span className="ml-1 font-medium text-gray-900">{assignment.classId.name} {assignment.classId.section}</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 mr-2 text-orange-600" />
                              <span className="text-gray-600">Due: </span>
                              <span className="ml-1 font-medium text-gray-900">{formatDate(assignment.dueDate)}</span>
                              {assignment.dueTime && <span className="ml-1 text-gray-700">at {assignment.dueTime}</span>}
                            </div>
                            {assignment.totalMarks > 0 && (
                              <div className="flex items-center text-sm">
                                <CheckSquare className="h-4 w-4 mr-2 text-indigo-600" />
                                <span className="text-gray-600">Total Marks: </span>
                                <span className="ml-1 font-medium text-gray-900">{assignment.totalMarks}</span>
                              </div>
                            )}
                            {assignment.points > 0 && (
                              <div className="flex items-center text-sm">
                                <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
                                <span className="text-gray-600">Points: </span>
                                <span className="ml-1 font-medium text-gray-900">{assignment.points}</span>
                              </div>
                            )}
                          </div>

                          {/* Attachments/PDFs */}
                          {assignment.attachments && assignment.attachments.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                              <div className="flex flex-wrap gap-2">
                                {assignment.attachments.map((file, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleDownloadFile(file.url, file.name)}
                                    className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                  >
                                    <FileText className="h-4 w-4 mr-2 text-red-600" />
                                    <span className="text-gray-700">{file.name}</span>
                                    <Download className="h-3 w-3 ml-2 text-gray-500" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Submission Info */}
                          <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-gray-600">
                              Submissions: <span className="font-medium text-gray-900">{assignment.submissionCount || 0}/{assignment.totalStudents || 0}</span>
                            </div>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(assignment)}`}>
                              {getStatusText(assignment)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-3 border-t border-gray-200 pt-4">
                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Details</button>
                        <button className="text-green-600 hover:text-green-900 text-sm font-medium">View Submissions</button>
                        <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">Edit</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}



          {/* Submissions Tab */}
          {activeTab === 'submissions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assignment Submissions</h3>
                <div className="flex space-x-3">
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    <Download className="h-4 w-4 inline mr-2" />
                    Export
                  </button>
                </div>
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No submissions available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.filter(a => a.submissions && a.submissions.length > 0).map((assignment) => (
                    <div key={assignment._id} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">{assignment.title}</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-white">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student Name
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Submitted At
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Points Earned
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Files
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {assignment.submissions.filter(s => s.status !== 'pending').map((submission, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {typeof submission.studentId === 'object' && submission.studentId?.name 
                                    ? submission.studentId.name 
                                    : typeof submission.studentId === 'string' 
                                    ? `Student ID: ${submission.studentId.substring(0, 8)}...` 
                                    : 'Unknown Student'}
                                  {typeof submission.studentId === 'object' && submission.studentId?.rollNumber && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      (#{submission.studentId.rollNumber})
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDateTime(submission.submittedAt)}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    submission.status === 'graded' ? 'bg-green-100 text-green-800' :
                                    submission.status === 'late' ? 'bg-red-100 text-red-800' :
                                    submission.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {submission.status}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {submission.pointsEarned || 0} pts
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  {submission.attachments && submission.attachments.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {submission.attachments.map((file, fileIdx) => (
                                        <button
                                          key={fileIdx}
                                          onClick={() => handleDownloadFile(file.url, file.name)}
                                          className="flex items-center px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs"
                                        >
                                          <FileText className="h-3 w-3 mr-1" />
                                          {file.name}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">No files</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {assignment.submissions.some(s => s.feedback) && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <h5 className="text-sm font-semibold text-gray-900 mb-2">Feedback:</h5>
                          {assignment.submissions.filter(s => s.feedback).map((submission, idx) => (
                            <p key={idx} className="text-sm text-gray-700">{submission.feedback}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {assignments.filter(a => a.submissions && a.submissions.length > 0 && a.submissions.some(s => s.status !== 'pending')).length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No submissions yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assignment Reports</h3>
                <div className="flex space-x-3">
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    <Download className="h-4 w-4 inline mr-2" />
                    Generate Report
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Submission Summary</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Assignments</span>
                      <span className="font-medium">{stats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active</span>
                      <span className="font-medium">{stats.pending}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-medium">{stats.completed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Overdue</span>
                      <span className="font-medium text-red-600">{stats.overdue}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Completion Rate</span>
                      <span className="font-medium">
                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Assignment Breakdown by Subject</h4>
                  <div className="space-y-4">
                    {(() => {
                      // Group assignments by subject
                      const subjectMap = new Map();
                      assignments.forEach(assignment => {
                        const subjectName = assignment.subjectId.name;
                        if (!subjectMap.has(subjectName)) {
                          subjectMap.set(subjectName, { total: 0, completed: 0, submitted: 0 });
                        }
                        const subject = subjectMap.get(subjectName);
                        subject.total++;
                        
                        // Check if has submissions
                        const hasSubmissions = assignment.submissions && assignment.submissions.some(s => 
                          s.status === 'submitted' || s.status === 'late' || s.status === 'graded'
                        );
                        
                        if (assignment.status === 'completed' || hasSubmissions) {
                          subject.completed++;
                        }
                        
                        if (hasSubmissions) {
                          subject.submitted++;
                        }
                      });
                      
                      return Array.from(subjectMap.entries()).map(([subjectName, data]) => (
                        <div key={subjectName}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600">{subjectName}</span>
                            <span className="font-medium">
                              {data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0}% 
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 flex justify-between">
                            <span>Submitted: {data.submitted}</span>
                            <span>Total: {data.total}</span>
                          </div>
                        </div>
                      ));
                    })()}
                    {assignments.length === 0 && (
                      <div className="text-center text-gray-400 py-4">
                        No data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAppTasks; 
