import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Users, 
  Plus, 
  Download, 
  Calendar, 
  TrendingUp,
  Play,
  Eye,
  Clock,
  User,
  BookOpen
} from 'lucide-react';
import { meetingsAPI, classesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const LiveClass: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('all');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'scheduled', label: 'Scheduled Classes', icon: Calendar },
  ];

  useEffect(() => {
    loadData();
  }, [selectedClass]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [meetingsResponse, classesResponse] = await Promise.all([
        meetingsAPI.getAll({ schoolId: localStorage.getItem('schoolId') }),
        classesAPI.getAll()
      ]);
      
      if (meetingsResponse.success) {
        console.log('Loaded meetings:', meetingsResponse.data);
        console.log('Meeting classId examples:', meetingsResponse.data.map(m => ({ 
          title: m.title, 
          classId: m.classId, 
          classIdType: typeof m.classId 
        })));
        setMeetings(meetingsResponse.data);
      }
      
      if (classesResponse.success) {
        console.log('Loaded classes:', classesResponse.data);
        setClasses(classesResponse.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getMeetingStatus = (meeting: any) => {
    const now = new Date();
    const meetingTime = new Date(meeting.meetingTime);
    const meetingEndTime = new Date(meetingTime.getTime() + (meeting.duration || 60) * 60000);
    
    if (now >= meetingTime && now <= meetingEndTime) {
      return { text: 'LIVE', color: 'bg-green-100 text-green-800', icon: '🔴' };
    } else if (now < meetingTime) {
      return { text: 'SCHEDULED', color: 'bg-blue-100 text-blue-800', icon: '⏰' };
    } else {
      return { text: 'ENDED', color: 'bg-gray-100 text-gray-800', icon: '✅' };
    }
  };

  const filteredMeetings = () => {
    if (selectedClass === 'all') {
      return meetings;
    }
    
    console.log('Filtering by class:', selectedClass);
    console.log('Available meetings:', meetings.map(m => ({ 
      title: m.title, 
      classId: m.classId, 
      classIdType: typeof m.classId 
    })));
    
    const filtered = meetings.filter(meeting => {
      // Handle both ObjectId and populated class object
      const meetingClassId = typeof meeting.classId === 'object' && meeting.classId !== null 
        ? meeting.classId._id || meeting.classId 
        : meeting.classId;
      
      console.log('Comparing:', meetingClassId, '===', selectedClass, '=', meetingClassId === selectedClass);
      return meetingClassId === selectedClass;
    });
    
    console.log('Filtered results:', filtered.length);
    return filtered;
  };

  const getStats = () => {
    const filtered = filteredMeetings();
    const now = new Date();
    
    const live = filtered.filter(m => {
      const meetingTime = new Date(m.meetingTime);
      const meetingEndTime = new Date(meetingTime.getTime() + (m.duration || 60) * 60000);
      return now >= meetingTime && now <= meetingEndTime;
    }).length;
    
    const scheduled = filtered.filter(m => new Date(m.meetingTime) > now).length;
    const ended = filtered.filter(m => {
      const meetingTime = new Date(m.meetingTime);
      const meetingEndTime = new Date(meetingTime.getTime() + (m.duration || 60) * 60000);
      return now > meetingEndTime;
    }).length;
    
    return { live, scheduled, ended, total: filtered.length };
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-[28px] bg-[#20386b] px-6 py-8 text-white shadow-[0_20px_50px_#243d711f] md:px-9 md:py-10">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[34px] border-[#f57a3224]" aria-hidden="true" />
        <p className="relative mb-4 text-xs font-bold uppercase tracking-[.18em] text-[#ffad72]">Teaching / live sessions</p>
        <h1 className="relative font-['Manrope'] text-3xl font-extrabold tracking-[-.05em] md:text-[40px]">Live classes</h1>
        <p className="relative mt-2 text-sm text-[#d9e3f5]">See ongoing, scheduled and completed meetings across your classes.</p>
      </div>

      {/* Class Filter */}
      <div className="mb-6 rounded-2xl border border-[#e2e9f3] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <label htmlFor="live-class-filter" className="text-sm font-bold text-[#274171]">Filter by class</label>
          <select 
            id="live-class-filter"
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name} - {cls.section}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Live Meetings</p>
              <p className="text-2xl font-bold text-green-600">{getStats().live}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Video className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-blue-600">{getStats().scheduled}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ended</p>
              <p className="text-2xl font-bold text-gray-600">{getStats().ended}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Meetings</p>
              <p className="text-2xl font-bold text-purple-600">{getStats().total}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
              </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Live Meetings</h3>
                  <div className="space-y-3">
                    {filteredMeetings().filter(m => {
                      const now = new Date();
                      const meetingTime = new Date(m.meetingTime);
                      const meetingEndTime = new Date(meetingTime.getTime() + (m.duration || 60) * 60000);
                      return now >= meetingTime && now <= meetingEndTime;
                    }).map((meeting) => (
                      <div key={meeting._id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <div>
                          <p className="font-medium">{meeting.title}</p>
                          <p className="text-sm text-gray-600">{meeting.teacherId?.name || 'Teacher'}</p>
                          <p className="text-sm text-gray-500">{meeting.classId?.name || 'Class'} - {meeting.subjectId?.name || 'Subject'}</p>
                      </div>
                      <div className="text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            🔴 LIVE
                          </span>
                    </div>
                      </div>
                    ))}
                    {filteredMeetings().filter(m => {
                      const now = new Date();
                      const meetingTime = new Date(m.meetingTime);
                      const meetingEndTime = new Date(meetingTime.getTime() + (m.duration || 60) * 60000);
                      return now >= meetingTime && now <= meetingEndTime;
                    }).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Video className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No live meetings at the moment</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Upcoming Meetings</h3>
                  <div className="space-y-3">
                    {filteredMeetings().filter(m => new Date(m.meetingTime) > new Date()).slice(0, 5).map((meeting) => (
                      <div key={meeting._id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                <div>
                          <p className="font-medium">{meeting.title}</p>
                          <p className="text-sm text-gray-600">{meeting.teacherId?.name || 'Teacher'}</p>
                          <p className="text-sm text-gray-500">{meeting.classId?.name || 'Class'} - {meeting.subjectId?.name || 'Subject'}</p>
                      </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-600">{new Date(meeting.meetingTime).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600">{new Date(meeting.meetingTime).toLocaleTimeString()}</p>
                </div>
                      </div>
                    ))}
                    {filteredMeetings().filter(m => new Date(m.meetingTime) > new Date()).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No upcoming meetings</p>
                      </div>
                    )}
              </div>
              </div>
              </div>
            </div>
          )}

          {activeTab === 'scheduled' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">All Meetings</h3>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => toast.success('Export functionality coming soon')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meeting</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMeetings().map((meeting) => {
                      const status = getMeetingStatus(meeting);
                      return (
                        <tr key={meeting._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{meeting.title}</div>
                              {meeting.description && (
                                <div className="text-sm text-gray-500">{meeting.description}</div>
                              )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">{meeting.teacherId?.name || 'Teacher'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                              <BookOpen className="h-4 w-4 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">{meeting.classId?.name || 'Class'}</div>
                        </div>
                      </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {meeting.subjectId?.name || 'Subject'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{new Date(meeting.meetingTime).toLocaleDateString()}</div>
                            <div className="text-sm text-gray-500">{new Date(meeting.meetingTime).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.icon} {status.text}
                        </span>
                      </td>
                    </tr>
                      );
                    })}
                    {filteredMeetings().length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-sm font-medium text-gray-900 mb-2">No meetings found</h3>
                          <p className="text-sm text-gray-500">No meetings have been created yet.</p>
                      </td>
                    </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveClass;
