import React, { useState } from 'react';
import { useAppContext, Complaint } from '../../context/AppContext';
import { 
  Plus, 
  Search, 
  Filter, 
  MessageSquare,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const ComplaintManagement: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState('log-complaint');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const tabs = [
    { id: 'log-complaint', label: 'Log New Complaint' },
    { id: 'assign', label: 'Assign to Admin/Teacher/Dept' },
    { id: 'track', label: 'Track Complaint Status' },
    { id: 'escalation', label: 'Escalation Level Setting' },
    { id: 'resolution', label: 'Complaint Resolution Notes' },
    { id: 'reports', label: 'Complaint Report Logs' }
  ];

  const [newComplaint, setNewComplaint] = useState({
    title: '',
    description: '',
    initiatedBy: 'Student',
    date: new Date().toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: 'General'
  });

  const [assignForm, setAssignForm] = useState({
    assignedTo: '',
    department: '',
    priority: 'medium',
    dueDate: '',
    notes: ''
  });

  const categories = ['General', 'Academic', 'Infrastructure', 'Transport', 'Library', 'Cafeteria', 'Security'];
  const priorities = ['low', 'medium', 'high'];
  const statuses = ['open', 'in-progress', 'resolved', 'closed'];

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComplaint.title || !newComplaint.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const complaint: Complaint = {
        id: Date.now().toString(),
        title: newComplaint.title,
        description: newComplaint.description,
        initiatedBy: newComplaint.initiatedBy,
        date: newComplaint.date,
        status: 'open' as const,
        priority: newComplaint.priority,
        category: newComplaint.category
      };

      dispatch({ type: 'ADD_COMPLAINT', payload: complaint });
      
      setNewComplaint({
        title: '',
        description: '',
        initiatedBy: 'Student',
        date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        category: 'General'
      });
      
      setShowAddModal(false);
      toast.success('Complaint logged successfully!');
    } catch (error) {
      toast.error('Failed to log complaint');
    }
  };

  const handleAssignComplaint = async () => {
    if (!assignForm.assignedTo || !assignForm.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const updatedComplaint: Complaint = {
        ...selectedComplaint!,
        status: 'in-progress' as const,
        assignedTo: assignForm.assignedTo,
        department: assignForm.department,
        priority: assignForm.priority,
        dueDate: assignForm.dueDate
      };

      dispatch({ type: 'UPDATE_COMPLAINT', payload: updatedComplaint });
      
      setShowAssignModal(false);
      setSelectedComplaint(null);
      toast.success('Complaint assigned successfully!');
    } catch (error) {
      toast.error('Failed to assign complaint');
    }
  };

  const handleStatusUpdate = (complaintId: string, newStatus: 'open' | 'in-progress' | 'resolved' | 'closed') => {
    const complaint = state.complaints.find(c => c.id === complaintId);
    if (complaint) {
      const updatedComplaint = { ...complaint, status: newStatus };
      dispatch({ type: 'UPDATE_COMPLAINT', payload: updatedComplaint });
      toast.success('Status updated successfully!');
    }
  };

  const handleDeleteComplaint = (complaintId: string) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      dispatch({ type: 'DELETE_COMPLAINT', payload: complaintId });
      toast.success('Complaint deleted successfully!');
    }
  };

  const filteredComplaints = state.complaints.filter(complaint => {
    const matchesSearch = complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || complaint.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderLogComplaint = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Log New Complaint</h3>
      <form onSubmit={handleSubmitComplaint} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initiated By *
            </label>
            <select
              value={newComplaint.initiatedBy}
              onChange={(e) => setNewComplaint({ ...newComplaint, initiatedBy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Student">Student</option>
              <option value="Parent">Parent</option>
              <option value="Teacher">Teacher</option>
              <option value="Staff">Staff</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={newComplaint.date}
              onChange={(e) => setNewComplaint({ ...newComplaint, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={newComplaint.category}
              onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={newComplaint.priority}
              onChange={(e) => setNewComplaint({ ...newComplaint, priority: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {priorities.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complaint Title *
          </label>
          <input
            type="text"
            value={newComplaint.title}
            onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter complaint title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={newComplaint.description}
            onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the complaint"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Log Complaint</span>
          </button>
        </div>
      </form>
    </div>
  );

  const renderAssignComplaints = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Complaints</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium text-gray-600">Complaint</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Priority</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Assigned To</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((complaint) => (
                <tr key={complaint.id} className="border-b">
                  <td className="py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{complaint.title}</p>
                      <p className="text-xs text-gray-500">{complaint.initiatedBy} • {complaint.date}</p>
                    </div>
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(complaint.priority)}`}>
                      {complaint.priority}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className="text-sm text-gray-600">
                      {complaint.assignedTo || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-2">
                                           <button
                         onClick={() => {
                           setSelectedComplaint(complaint);
                           setShowAssignModal(true);
                         }}
                         className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                       >
                         <UserCheck className="h-4 w-4" />
                         <span>Assign</span>
                       </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTrackStatus = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Track Complaint Status</h3>
        <div className="space-y-4">
          {filteredComplaints.map((complaint) => (
            <div key={complaint.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{complaint.title}</h4>
                  <p className="text-sm text-gray-600">{complaint.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {complaint.initiatedBy} • {complaint.date} • {complaint.category}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(complaint.status)}`}>
                    {complaint.status}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(complaint.priority)}`}>
                    {complaint.priority}
                  </span>
                </div>
              </div>
              
              {complaint.assignedTo && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Assigned to:</span> {complaint.assignedTo}
                    {complaint.department && ` (${complaint.department})`}
                  </p>
                  {complaint.dueDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {complaint.dueDate}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <select
                  value={complaint.status}
                  onChange={(e) => handleStatusUpdate(complaint.id, e.target.value as 'open' | 'in-progress' | 'resolved' | 'closed')}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDeleteComplaint(complaint.id)}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEscalationSettings = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Escalation Level Setting</h3>
      <div className="space-y-6">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Automatic Escalation Rules</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Escalate after 24 hours (High Priority)</span>
              <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Escalate after 48 hours (Medium Priority)</span>
              <input type="checkbox" defaultChecked className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Escalate after 72 hours (Low Priority)</span>
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Escalation Hierarchy</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Level 1:</span>
              <span className="text-sm text-gray-900">Department Head</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Level 2:</span>
              <span className="text-sm text-gray-900">Principal</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Level 3:</span>
              <span className="text-sm text-gray-900">School Management</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Save Escalation Settings
          </button>
        </div>
      </div>
    </div>
  );

  const renderResolutionNotes = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Complaint Resolution Notes</h3>
      <div className="space-y-4">
        {filteredComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').map((complaint) => (
          <div key={complaint.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{complaint.title}</h4>
                <p className="text-sm text-gray-600">{complaint.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(complaint.status)}`}>
                {complaint.status}
              </span>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Resolution:</span> This complaint has been resolved successfully.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Resolved on: {complaint.date} by {complaint.assignedTo || 'System'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Complaint Report Logs</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{state.complaints.length}</p>
          <p className="text-sm text-blue-600">Total Complaints</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {state.complaints.filter(c => c.status === 'open' || c.status === 'in-progress').length}
          </p>
          <p className="text-sm text-yellow-600">Active Complaints</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {state.complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length}
          </p>
          <p className="text-sm text-green-600">Resolved Complaints</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Recent Activity</h4>
        {state.complaints.slice(0, 5).map((complaint) => (
          <div key={complaint.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                complaint.status === 'open' ? 'bg-red-500' :
                complaint.status === 'in-progress' ? 'bg-yellow-500' :
                'bg-green-500'
              }`} />
              <div>
                <p className="text-sm font-medium text-gray-900">{complaint.title}</p>
                <p className="text-xs text-gray-500">{complaint.status} • {complaint.date}</p>
              </div>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(complaint.priority)}`}>
              {complaint.priority}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Generate Full Report
        </button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'log-complaint':
        return renderLogComplaint();
      case 'assign':
        return renderAssignComplaints();
      case 'track':
        return renderTrackStatus();
      case 'escalation':
        return renderEscalationSettings();
      case 'resolution':
        return renderResolutionNotes();
      case 'reports':
        return renderReports();
      default:
        return renderLogComplaint();
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-8 flex flex-col gap-5 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600 mb-2">School community / Support</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Complaint management</h1>
          <p className="text-slate-600 mt-1">Track, assign, and resolve student and staff concerns.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#163f5d] text-white px-5 py-3 rounded-xl hover:bg-[#0e314b] transition-colors flex items-center justify-center space-x-2 font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>New Complaint</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="complaint-search" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Search complaints</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                id="complaint-search"
                type="text"
                placeholder="Search complaints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-end space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              aria-label="Filter by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex gap-7 px-5 sm:px-7 overflow-x-auto" aria-label="Complaint views">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-[#163f5d]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 sm:p-7">
          {renderTabContent()}
        </div>
      </div>

      {/* Add Complaint Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Log New Complaint</h3>
              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newComplaint.title}
                    onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter complaint title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={newComplaint.description}
                    onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the complaint"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Submit
                </button>
              </div>
            </form>
            </div>
              </div>
            </div>
          )}

      {/* Assign Complaint Modal */}
      {showAssignModal && selectedComplaint && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Complaint</h3>
              <form onSubmit={(e) => { e.preventDefault(); handleAssignComplaint(); }} className="space-y-4">
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To *</label>
                  <input
                    type="text"
                    value={assignForm.assignedTo}
                    onChange={(e) => setAssignForm({ ...assignForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter name or email"
                  />
            </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                  <input
                    type="text"
                    value={assignForm.department}
                    onChange={(e) => setAssignForm({ ...assignForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter department"
                  />
            </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={assignForm.dueDate}
                    onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
            </div>
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={assignForm.notes}
                    onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes"
                  />
              </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Assign
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

export default ComplaintManagement;
