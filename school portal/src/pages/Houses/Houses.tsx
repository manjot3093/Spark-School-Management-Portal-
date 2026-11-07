import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Home,
  Building,
  Award,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle as XCircleIcon,
  Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

interface House {
  _id: string;
  name: string;
  description?: string;
  color: string;
  houseCaptain?: {
    _id: string;
    name: string;
    rollNumber?: string;
  };
  viceCaptain?: {
    _id: string;
    name: string;
    rollNumber?: string;
  };
  studentCount?: number;
  points?: number;
  isActive: boolean;
}

const Houses: React.FC = () => {
  const [houses, setHouses] = useState<House[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [houseStudents, setHouseStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [houseForm, setHouseForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    customColor: '',
    houseCaptain: '',
    viceCaptain: '',
    points: 0
  });

  const predefinedColors = [
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Yellow', value: '#EAB308' }
  ];

  useEffect(() => {
    fetchHouses();
    fetchStudents();
  }, []);

  const fetchHouses = async () => {
    try {
      setLoading(true);
      const response = await api.houses.getAll();
      const housesData = response?.data || response || [];
      setHouses(Array.isArray(housesData) ? housesData : []);
    } catch (error: any) {
      console.error('Error fetching houses:', error);
      toast.error(error?.response?.data?.error || 'Failed to fetch houses');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.students.getAll();
      const studentsData = response?.data || response || [];
      const studentsArray = Array.isArray(studentsData) ? studentsData : [];
      setStudents(studentsArray);
      return studentsArray;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  };

  const fetchHouseDetails = async (houseId: string) => {
    try {
      const response = await api.houses.getById(houseId);
      const houseData = response?.data || response;
      return houseData;
    } catch (error) {
      console.error('Error fetching house details:', error);
      return null;
    }
  };

  const handleAddHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that captain and vice captain are not the same
    if (houseForm.houseCaptain && houseForm.viceCaptain && houseForm.houseCaptain === houseForm.viceCaptain) {
      toast.error('House captain and vice captain cannot be the same person');
      return;
    }
    
    try {
      setLoading(true);
      const finalColor = houseForm.color || houseForm.customColor || '#3B82F6';
      const payload: any = {
        name: houseForm.name,
        description: houseForm.description,
        color: finalColor
      };

      if (houseForm.houseCaptain) {
        payload.houseCaptain = houseForm.houseCaptain;
      }

      if (houseForm.viceCaptain) {
        payload.viceCaptain = houseForm.viceCaptain;
      }

      await api.houses.create(payload);
      toast.success('House created successfully!');
      setShowAddModal(false);
      resetForm();
      fetchHouses();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create house');
    } finally {
      setLoading(false);
    }
  };

  const handleEditHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHouse) return;

    // Validate that captain and vice captain are not the same
    if (houseForm.houseCaptain && houseForm.viceCaptain && houseForm.houseCaptain === houseForm.viceCaptain) {
      toast.error('House captain and vice captain cannot be the same person');
      return;
    }

    try {
      setLoading(true);
      const finalColor = houseForm.color || houseForm.customColor || '#3B82F6';
      const payload: any = {
        name: houseForm.name,
        description: houseForm.description,
        color: finalColor
      };

      if (houseForm.houseCaptain) {
        payload.houseCaptain = houseForm.houseCaptain;
      } else {
        payload.houseCaptain = null;
      }

      if (houseForm.viceCaptain) {
        payload.viceCaptain = houseForm.viceCaptain;
      } else {
        payload.viceCaptain = null;
      }

      await api.houses.update(selectedHouse._id, payload);
      toast.success('House updated successfully!');
      setShowEditModal(false);
      setSelectedHouse(null);
      resetForm();
      fetchHouses();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update house');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHouse = async (houseId: string) => {
    if (!confirm('Are you sure you want to delete this house? All students will be unassigned.')) {
      return;
    }

    try {
      setLoading(true);
      await api.houses.delete(houseId);
      toast.success('House deleted successfully!');
      fetchHouses();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete house');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStudents = async (studentIds: string[]) => {
    if (!selectedHouse) return;

    const houseId = selectedHouse._id;
    try {
      setLoading(true);
      const response = await api.houses.assignStudents(houseId, studentIds);
      const responseData = response?.data || response;
      
      // Show success message with details
      if (responseData.message) {
        toast.success(responseData.message);
      } else {
        toast.success(`${studentIds.length} student(s) assigned successfully!`);
      }
      
      // Refresh houses and students lists
      await fetchHouses();
      const updatedStudents = await fetchStudents();
      
      // Update house students from the refreshed students array
      const studentsInHouse = updatedStudents.filter(student => {
        if (!student.houseId) return false;
        const studentHouseId = typeof student.houseId === 'object' 
          ? student.houseId._id 
          : student.houseId;
        return studentHouseId === houseId && student.status === 'active';
      });
      setHouseStudents(studentsInHouse);
      
      // Try to get from API as well, but don't block
      try {
        const updatedHouse = await fetchHouseDetails(houseId);
        if (updatedHouse && updatedHouse.students) {
          setHouseStudents(updatedHouse.students);
        }
      } catch (apiError) {
        // Use the local data we already have
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to assign students');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedHouse) return;

    const houseId = selectedHouse._id;
    try {
      setLoading(true);
      await api.houses.removeStudents(houseId, [studentId]);
      toast.success('Student removed successfully!');
      
      // Refresh houses and students lists
      await fetchHouses();
      const updatedStudents = await fetchStudents();
      
      // Update house students from the refreshed students array
      const studentsInHouse = updatedStudents.filter(student => {
        if (!student.houseId) return false;
        const studentHouseId = typeof student.houseId === 'object' 
          ? student.houseId._id 
          : student.houseId;
        return studentHouseId === houseId && student.status === 'active';
      });
      setHouseStudents(studentsInHouse);
      
      // Try to get from API as well, but don't block
      try {
        const updatedHouse = await fetchHouseDetails(houseId);
        if (updatedHouse && updatedHouse.students) {
          setHouseStudents(updatedHouse.students);
        }
      } catch (apiError) {
        // Use the local data we already have
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to remove student');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (house: House) => {
    setSelectedHouse(house);
    const isPredefinedColor = predefinedColors.some(c => c.value === house.color);
    setHouseForm({
      name: house.name,
      description: house.description || '',
      color: isPredefinedColor ? house.color : '',
      customColor: !isPredefinedColor ? house.color : '',
      houseCaptain: house.houseCaptain?._id || '',
      viceCaptain: house.viceCaptain?._id || '',
      points: house.points || 0
    });
    setShowEditModal(true);
  };

  const openAssignModal = async (house: House) => {
    setSelectedHouse(house);
    setSelectedStudentIds([]);
    setSearchStudent('');
    setShowAssignModal(true);
    
    // Filter students from the already-loaded students array
    // This works even if the API call fails
    const studentsInHouse = students.filter(student => {
      if (!student.houseId) return false;
      // Handle both cases: houseId as object with _id or as string
      const studentHouseId = typeof student.houseId === 'object' 
        ? student.houseId._id 
        : student.houseId;
      return studentHouseId === house._id && student.status === 'active';
    });
    setHouseStudents(studentsInHouse);
    
    // Try to fetch from API as well to get the latest data, but don't block on it
    try {
      const houseDetails = await fetchHouseDetails(house._id);
      if (houseDetails && houseDetails.students) {
        setHouseStudents(houseDetails.students);
      }
    } catch (error) {
      // Silently fail - we already have students from the local array
      console.log('Could not fetch house details from API, using local data');
    }
  };

  const resetForm = () => {
    setHouseForm({
      name: '',
      description: '',
      color: '#3B82F6',
      customColor: '',
      houseCaptain: '',
      viceCaptain: '',
      points: 0
    });
  };

  const filteredHouses = houses.filter(house =>
    house.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    house.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get students not in any house (available to add)
  const availableStudents = students.filter(student => {
    if (student.status !== 'active') return false;
    return !student.houseId; // Not in any house
  });

  // Get students in other houses (for transfer to selected house)
  const studentsInOtherHouses = students.filter(student => {
    if (student.status !== 'active') return false;
    if (!student.houseId) return false;
    const studentHouseId = typeof student.houseId === 'object' 
      ? student.houseId._id 
      : student.houseId;
    return selectedHouse && studentHouseId && studentHouseId !== selectedHouse._id;
  });

  const renderHouseModal = (isEdit: boolean) => (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit House' : 'Create New House'}
          </h2>
          <button
            onClick={() => {
              if (isEdit) setShowEditModal(false);
              else setShowAddModal(false);
              resetForm();
              setSelectedHouse(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircleIcon size={24} />
          </button>
        </div>

        <form onSubmit={isEdit ? handleEditHouse : handleAddHouse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">House Name *</label>
            <input
              type="text"
              value={houseForm.name}
              onChange={(e) => setHouseForm({ ...houseForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={houseForm.description}
              onChange={(e) => setHouseForm({ ...houseForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">House Color *</label>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                {predefinedColors.map((color) => (
                  <label
                    key={color.value}
                    className={`relative cursor-pointer border-2 rounded-lg p-3 text-center transition-all ${
                      houseForm.color === color.value
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="color"
                      value={color.value}
                      checked={houseForm.color === color.value}
                      onChange={(e) => {
                        setHouseForm({ ...houseForm, color: e.target.value, customColor: '' });
                      }}
                      className="sr-only"
                    />
                    <div
                      className="w-full h-8 rounded mb-1"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs font-medium text-gray-700">{color.name}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value="custom"
                    checked={!predefinedColors.some(c => c.value === houseForm.color)}
                    onChange={() => setHouseForm({ ...houseForm, color: '', customColor: houseForm.customColor || '#3B82F6' })}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-gray-700">Custom Color:</span>
                  <input
                    type="color"
                    value={houseForm.customColor || '#3B82F6'}
                    onChange={(e) => {
                      setHouseForm({ ...houseForm, customColor: e.target.value, color: '' });
                    }}
                    disabled={predefinedColors.some(c => c.value === houseForm.color)}
                    className={`h-8 w-16 border border-gray-300 rounded cursor-pointer ${
                      predefinedColors.some(c => c.value === houseForm.color) ? 'opacity-50' : ''
                    }`}
                  />
                  {!predefinedColors.some(c => c.value === houseForm.color) && (
                    <span className="text-xs text-gray-500">{houseForm.customColor}</span>
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House Captain</label>
              <select
                value={houseForm.houseCaptain}
                onChange={(e) => setHouseForm({ ...houseForm, houseCaptain: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {students.filter(s => s.status === 'active').map(student => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.rollNumber || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vice Captain</label>
              <select
                value={houseForm.viceCaptain}
                onChange={(e) => setHouseForm({ ...houseForm, viceCaptain: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {students.filter(s => s.status === 'active').map(student => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.rollNumber || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                if (isEdit) setShowEditModal(false);
                else setShowAddModal(false);
                resetForm();
                setSelectedHouse(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update House' : 'Create House'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderAssignModal = () => {
    const filteredHouseStudents = houseStudents.filter(student =>
      student.name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      student.classId?.name?.toLowerCase().includes(searchStudent.toLowerCase())
    );

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Students in {selectedHouse?.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Total: {houseStudents.length} student{houseStudents.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => {
                setShowAssignModal(false);
                setSelectedHouse(null);
                setSearchStudent('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon size={24} />
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search students by name, roll number, or class..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="border border-gray-300 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
            {filteredHouseStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500 text-sm">
                  {houseStudents.length === 0 
                    ? 'No students in this house' 
                    : 'No students found matching your search'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHouseStudents.map((student, index) => (
                  <div 
                    key={student._id} 
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {student.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Roll No: {student.rollNumber || 'N/A'} 
                          {student.classId?.name && ` • Class: ${student.classId.name}${student.classId.section ? ` ${student.classId.section}` : ''}`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveStudent(student._id)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                      title="Remove from house"
                    >
                      <UserMinus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 mt-4 border-t">
            <button
              onClick={() => {
                setSelectedStudentIds([]);
                setSearchStudent('');
                setShowAddStudentModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <UserPlus size={18} />
              Add Students to House
            </button>
            <button
              onClick={() => {
                setShowAssignModal(false);
                setSelectedHouse(null);
                setSearchStudent('');
                setShowAddStudentModal(false);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAddStudentModal = () => {
    const allAvailableStudents = [...availableStudents, ...studentsInOtherHouses];
    const filteredAvailableStudents = allAvailableStudents.filter(student =>
      student.name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchStudent.toLowerCase()) ||
      student.classId?.name?.toLowerCase().includes(searchStudent.toLowerCase())
    );

    const handleAddStudents = async () => {
      if (selectedStudentIds.length === 0) {
        toast.error('Please select at least one student');
        return;
      }

      if (!selectedHouse) return;

      // Check if any selected students are in other houses
      const studentsToTransfer = selectedStudentIds.filter(studentId => {
        const student = students.find(s => s._id === studentId);
        if (!student || !student.houseId) return false;
        const studentHouseId = typeof student.houseId === 'object' 
          ? student.houseId._id 
          : student.houseId;
        return studentHouseId && studentHouseId !== selectedHouse._id;
      });

      if (studentsToTransfer.length > 0) {
        const confirmMessage = `${studentsToTransfer.length} student(s) are currently in other houses. They will be automatically removed from their current houses and added to ${selectedHouse.name}. Continue?`;
        if (!confirm(confirmMessage)) {
          return;
        }
      }

      try {
        setLoading(true);
        await handleAssignStudents(selectedStudentIds);
        setSelectedStudentIds([]);
        setShowAddStudentModal(false);
        setSearchStudent('');
      } catch (error) {
        // Error already handled in handleAssignStudents
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Add Students to {selectedHouse?.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedStudentIds.length > 0 
                  ? `${selectedStudentIds.length} student(s) selected`
                  : 'Select students to add to this house'}
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddStudentModal(false);
                setSelectedStudentIds([]);
                setSearchStudent('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon size={24} />
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search students by name, roll number, or class..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {filteredAvailableStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">No students available to add</p>
            </div>
          ) : (
            <>
              <div className="border border-gray-300 rounded-lg p-4 max-h-[50vh] overflow-y-auto mb-4">
                <div className="space-y-2">
                  {filteredAvailableStudents.map((student) => {
                    const isInOtherHouse = studentsInOtherHouses.some(s => s._id === student._id);
                    const currentHouse = isInOtherHouse 
                      ? houses.find(h => {
                          const studentHouseId = typeof student.houseId === 'object' 
                            ? student.houseId._id 
                            : student.houseId;
                          return h._id === studentHouseId;
                        })
                      : null;
                    const isSelected = selectedStudentIds.includes(student._id);

                    return (
                      <div 
                        key={student._id} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-300' 
                            : 'hover:bg-gray-50 border-gray-200'
                        } ${isInOtherHouse ? 'border-amber-300 bg-amber-50' : ''}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, student._id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== student._id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {student.name}
                              {isInOtherHouse && (
                                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                  Currently in {currentHouse?.name || 'another house'}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              Roll No: {student.rollNumber || 'N/A'} 
                              {student.classId?.name && ` • Class: ${student.classId.name}${student.classId.section ? ` ${student.classId.section}` : ''}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {studentsInOtherHouses.filter(s => selectedStudentIds.includes(s._id)).length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Some selected students are currently in other houses. 
                    They will be automatically removed from their current houses and added to {selectedHouse?.name}.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setSelectedStudentIds([]);
                    setSearchStudent('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudents}
                  disabled={selectedStudentIds.length === 0 || loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <UserPlus size={18} />
                  {loading ? 'Adding...' : `Add ${selectedStudentIds.length} Student(s)`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-7 pb-10">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-8 flex flex-col gap-5 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600 mb-2">Student life / House system</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Student houses</h1>
          <p className="text-slate-600 mt-1">Organise teams, student membership, and house leaders.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#163f5d] text-white rounded-xl hover:bg-[#0e314b] transition-colors font-semibold"
        >
          <Plus size={20} />
          Create House
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <label htmlFor="house-search" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Find a house</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <input
            id="house-search"
            type="text"
            placeholder="Search houses..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {loading && houses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading houses...</p>
        </div>
      ) : filteredHouses.length === 0 ? (
        <div className="text-center py-12">
          <Home size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No houses found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
            {filteredHouses
              .slice((page - 1) * pageSize, page * pageSize)
              .map(house => (
              <div
                key={house._id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden border-t-4 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
                style={{ borderTopColor: house.color }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Home size={20} />
                        {house.name}
                      </h3>
                      {house.description && (
                        <p className="text-sm text-gray-600 mt-1">{house.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(house)}
                        className="text-blue-700 hover:text-blue-900 p-1 rounded focus-visible:outline"
                        title="Edit house"
                        aria-label={`Edit ${house.name}`}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteHouse(house._id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded focus-visible:outline"
                        title="Delete house"
                        aria-label={`Delete ${house.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Students</span>
                      <span className="font-semibold text-gray-900">
                        {house.studentCount || 0}
                      </span>
                    </div>

                    {house.houseCaptain && (
                      <div className="flex items-center gap-2 text-sm">
                        <Crown size={16} className="text-yellow-500" />
                        <span className="text-gray-600">Captain:</span>
                        <span className="font-medium">{house.houseCaptain.name}</span>
                      </div>
                    )}

                    {house.viceCaptain && (
                      <div className="flex items-center gap-2 text-sm">
                        <Award size={16} className="text-blue-500" />
                        <span className="text-gray-600">Vice:</span>
                        <span className="font-medium">{house.viceCaptain.name}</span>
                      </div>
                    )}

                    <button
                      onClick={() => openAssignModal(house)}
                      className="w-full mt-4 px-4 py-3 bg-[#163f5d] text-white rounded-lg hover:bg-[#0e314b] transition-colors flex items-center justify-center gap-2 font-semibold"
                    >
                      <Users size={18} />
                      Students in this House
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredHouses.length > 0 && (
            <Pagination
              currentPage={page}
              pageSize={pageSize}
              totalItems={filteredHouses.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[6, 12, 24]}
            />
          )}
        </>
      )}

      {showAddModal && renderHouseModal(false)}
      {showEditModal && renderHouseModal(true)}
      {showAssignModal && selectedHouse && renderAssignModal()}
      {showAddStudentModal && selectedHouse && renderAddStudentModal()}
    </div>
  );
};

export default Houses;

