import React, { useState, useEffect } from 'react';
import { Bus, MapPin, Users, Plus, Download, Car, X, Edit, Trash2 } from 'lucide-react';
import { transportAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BusTrackingDemo from './BusTrackingDemo';
import Pagination from '../../components/common/Pagination';

interface Route {
  _id: string;
  name: string;
  routeNumber: string;
  startPoint: string;
  endPoint: string;
  distance: string;
  status: string;
  stops?: Array<{
    name: string;
    arrivalTime: string;
    latitude?: number;
    longitude?: number;
  }>;
}

interface Vehicle {
  _id: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  registrationNumber: string;
  status: string;
  routeId?: { _id?: string; name: string; routeNumber: string };
  driverId?: { name: string; licenseNumber: string; phone: string };
}

interface Driver {
  _id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  status: string;
  vehicleId?: { vehicleNumber: string; vehicleType: string };
  routeId?: { name: string; routeNumber: string };
}

interface StudentTransport {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    rollNumber: string;
    classId?: { name: string; section: string };
  };
  routeId: { name: string; routeNumber: string };
  pickupPoint: string;
  pickupTime: string;
  status: string;
}

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  admissionNumber?: string;
  classId?: { name: string; section: string };
}

const Transport: React.FC = () => {
  const { state } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [studentTransports, setStudentTransports] = useState<StudentTransport[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [routePage, setRoutePage] = useState(1);
  const [routePageSize, setRoutePageSize] = useState(10);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [vehiclePageSize, setVehiclePageSize] = useState(10);
  const [studentTransportPage, setStudentTransportPage] = useState(1);
  const [studentTransportPageSize, setStudentTransportPageSize] = useState(10);
  const [driverPage, setDriverPage] = useState(1);
  const [driverPageSize, setDriverPageSize] = useState(10);

  // Modal states
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showStudentTransportModal, setShowStudentTransportModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Get schoolId from authenticated user
  const schoolId = state.user?.schoolId || '';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Bus },
    { id: 'routes', label: 'Routes', icon: MapPin },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'students', label: 'Student Transport', icon: Users },
    { id: 'drivers', label: 'Drivers', icon: Users },
  ];

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [routesData, vehiclesData, driversData, transportsData] = await Promise.all([
        transportAPI.getRoutes(schoolId),
        transportAPI.getVehicles(schoolId),
        transportAPI.getDrivers(schoolId),
        transportAPI.getStudentTransports(schoolId),
      ]);

      setRoutes(routesData.data || []);
      setVehicles(vehiclesData.data || []);
      setDrivers(driversData.data || []);
      setStudentTransports(transportsData.data || []);
    } catch (error) {
      console.error('Error fetching transport data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedStudents = async () => {
    setLoadingStudents(true);
    try {
      console.log('Fetching unassigned students for schoolId:', schoolId);
      const response = await transportAPI.getUnassignedStudents(schoolId);
      console.log('Unassigned students response:', response);
      setUnassignedStudents(response.data || []);
    } catch (error) {
      console.error('Error fetching unassigned students:', error);
      setUnassignedStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Fetch unassigned students when the student transport modal or bulk assign modal opens
  useEffect(() => {
    if ((showStudentTransportModal || showBulkAssignModal) && !editingItem) {
      console.log('Student transport modal or bulk assign modal opened, fetching unassigned students...');
      fetchUnassignedStudents();
    }
  }, [showStudentTransportModal, showBulkAssignModal, editingItem, schoolId]);

  // Export list to CSV
  const handleExportList = () => {
    if (studentTransports.length === 0) {
      alert('No student transport data to export');
      return;
    }

    // Create CSV headers
    const headers = ['Student Name', 'Roll Number', 'Class', 'Route', 'Pickup Point', 'Pickup Time', 'Status'];

    // Create CSV rows
    const rows = studentTransports.map(transport => [
      transport.studentId.name || '',
      transport.studentId.rollNumber || '',
      transport.studentId.classId ? `${transport.studentId.classId.name} ${transport.studentId.classId.section}` : 'N/A',
      transport.routeId.name || '',
      transport.pickupPoint || '',
      transport.pickupTime || '',
      transport.status || ''
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `student-transport-list-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Route Modal Component
  const RouteModal = () => {
    const [formData, setFormData] = useState({
      name: editingItem?.name || '',
      routeNumber: editingItem?.routeNumber || '',
      startPoint: editingItem?.startPoint || '',
      endPoint: editingItem?.endPoint || '',
      distance: editingItem?.distance || '',
      status: editingItem?.status || 'active',
      schoolId: schoolId,
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        if (editingItem) {
          await transportAPI.updateRoute(editingItem._id, formData);
        } else {
          await transportAPI.createRoute(formData);
        }
        setShowRouteModal(false);
        setEditingItem(null);
        fetchAllData();
      } catch (error) {
        console.error('Error saving route:', error);
        alert('Failed to save route');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingItem ? 'Edit Route' : 'Add New Route'}</h3>
            <button onClick={() => { setShowRouteModal(false); setEditingItem(null); }} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route Number</label>
              <input
                type="text"
                required
                value={formData.routeNumber}
                onChange={(e) => setFormData({ ...formData, routeNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Point</label>
              <input
                type="text"
                required
                value={formData.startPoint}
                onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Point</label>
              <input
                type="text"
                required
                value={formData.endPoint}
                onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distance</label>
              <input
                type="text"
                required
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 15 km"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingItem ? 'Update' : 'Create'} Route
              </button>
              <button
                type="button"
                onClick={() => { setShowRouteModal(false); setEditingItem(null); }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Vehicle Modal Component
  const VehicleModal = () => {
    const [formData, setFormData] = useState({
      vehicleNumber: editingItem?.vehicleNumber || '',
      vehicleType: editingItem?.vehicleType || 'School Bus',
      capacity: editingItem?.capacity || '',
      registrationNumber: editingItem?.registrationNumber || '',
      status: editingItem?.status || 'active',
      routeId: editingItem?.routeId?._id || '',
      driverId: editingItem?.driverId?._id || '',
      schoolId: schoolId,
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const submitData = {
          ...formData,
          capacity: Number(formData.capacity),
          routeId: formData.routeId || null,
          driverId: formData.driverId || null,
        };

        if (editingItem) {
          await transportAPI.updateVehicle(editingItem._id, submitData);
        } else {
          await transportAPI.createVehicle(submitData);
        }
        setShowVehicleModal(false);
        setEditingItem(null);
        fetchAllData();
      } catch (error) {
        console.error('Error saving vehicle:', error);
        alert('Failed to save vehicle');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingItem ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
            <button onClick={() => { setShowVehicleModal(false); setEditingItem(null); }} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
              <input
                type="text"
                required
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="School Bus">School Bus</option>
                <option value="Mini Bus">Mini Bus</option>
                <option value="Van">Van</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input
                type="number"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Number of seats"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
              <input
                type="text"
                required
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route (Optional)</label>
              <select
                value={formData.routeId}
                onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Route Assigned</option>
                {routes.filter(r => r.status === 'active').map(route => (
                  <option key={route._id} value={route._id}>{route.name} ({route.routeNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver (Optional)</label>
              <select
                value={formData.driverId}
                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Driver Assigned</option>
                {drivers.filter(d => d.status === 'active').map(driver => (
                  <option key={driver._id} value={driver._id}>{driver.name} ({driver.licenseNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingItem ? 'Update' : 'Create'} Vehicle
              </button>
              <button
                type="button"
                onClick={() => { setShowVehicleModal(false); setEditingItem(null); }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Driver Modal Component
  const DriverModal = () => {
    const [formData, setFormData] = useState({
      name: editingItem?.name || '',
      licenseNumber: editingItem?.licenseNumber || '',
      phone: editingItem?.phone || '',
      licenseType: editingItem?.licenseType || 'Heavy Vehicle',
      licenseExpiryDate: editingItem?.licenseExpiryDate ? editingItem.licenseExpiryDate.split('T')[0] : '',
      status: editingItem?.status || 'active',
      vehicleId: editingItem?.vehicleId?._id || '',
      routeId: editingItem?.routeId?._id || '',
      schoolId: schoolId,
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const submitData = {
          ...formData,
          vehicleId: formData.vehicleId || null,
          routeId: formData.routeId || null,
        };

        if (editingItem) {
          await transportAPI.updateDriver(editingItem._id, submitData);
        } else {
          await transportAPI.createDriver(submitData);
        }
        setShowDriverModal(false);
        setEditingItem(null);
        fetchAllData();
      } catch (error) {
        console.error('Error saving driver:', error);
        alert('Failed to save driver');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingItem ? 'Edit Driver' : 'Add New Driver'}</h3>
            <button onClick={() => { setShowDriverModal(false); setEditingItem(null); }} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
              <input
                type="text"
                required
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Type</label>
              <select
                value={formData.licenseType}
                onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Heavy Vehicle">Heavy Vehicle</option>
                <option value="Light Vehicle">Light Vehicle</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry Date</label>
              <input
                type="date"
                required
                value={formData.licenseExpiryDate}
                onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle (Optional)</label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Vehicle Assigned</option>
                {vehicles.filter(v => v.status === 'active').map(vehicle => (
                  <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleNumber} ({vehicle.vehicleType})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route (Optional)</label>
              <select
                value={formData.routeId}
                onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Route Assigned</option>
                {routes.filter(r => r.status === 'active').map(route => (
                  <option key={route._id} value={route._id}>{route.name} ({route.routeNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="on-leave">On Leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingItem ? 'Update' : 'Create'} Driver
              </button>
              <button
                type="button"
                onClick={() => { setShowDriverModal(false); setEditingItem(null); }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Bulk Assign Modal Component
  const BulkAssignModal = () => {
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [formData, setFormData] = useState({
      routeId: '',
      vehicleId: '',
      pickupPoint: '',
      pickupTime: '',
      schoolId: schoolId,
    });
    const [submitting, setSubmitting] = useState(false);

    const handleStudentToggle = (studentId: string) => {
      setSelectedStudents(prev =>
        prev.includes(studentId)
          ? prev.filter(id => id !== studentId)
          : [...prev, studentId]
      );
    };

    // Filter students based on search term
    const filteredUnassignedStudents = unassignedStudents.filter(student => {
      if (!studentSearchTerm) return true;
      const searchLower = studentSearchTerm.toLowerCase();
      return (
        student.name?.toLowerCase().includes(searchLower) ||
        student.rollNumber?.toLowerCase().includes(searchLower) ||
        student.admissionNumber?.toLowerCase().includes(searchLower)
      );
    });

    const handleSelectAll = () => {
      if (selectedStudents.length === filteredUnassignedStudents.length) {
        setSelectedStudents([]);
      } else {
        setSelectedStudents(filteredUnassignedStudents.map(s => s._id));
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (selectedStudents.length === 0) {
        alert('Please select at least one student');
        return;
      }

      if (!formData.routeId || !formData.pickupPoint || !formData.pickupTime) {
        alert('Please fill in all required fields (Route, Pickup Point, Pickup Time)');
        return;
      }

      setSubmitting(true);
      try {
        const response = await transportAPI.bulkAssignStudents({
          students: selectedStudents,
          routeId: formData.routeId,
          vehicleId: formData.vehicleId || null,
          pickupPoint: formData.pickupPoint,
          pickupTime: formData.pickupTime,
          schoolId: formData.schoolId,
        });

        alert(`Successfully assigned ${response.data.created} students. ${response.data.errors > 0 ? `${response.data.errors} students had errors.` : ''}`);
        setShowBulkAssignModal(false);
        setSelectedStudents([]);
        setFormData({
          routeId: '',
          vehicleId: '',
          pickupPoint: '',
          pickupTime: '',
          schoolId: schoolId,
        });
        fetchAllData();
        fetchUnassignedStudents();
      } catch (error: any) {
        console.error('Error bulk assigning students:', error);
        alert(error.message || 'Failed to bulk assign students');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Bulk Assign Students to Transport</h3>
            <button
              onClick={() => {
                setShowBulkAssignModal(false);
                setSelectedStudents([]);
                setFormData({
                  routeId: '',
                  vehicleId: '',
                  pickupPoint: '',
                  pickupTime: '',
                  schoolId: schoolId,
                });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Transport Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Route *</label>
                <select
                  required
                  value={formData.routeId}
                  onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Route</option>
                  {routes.filter(r => r.status === 'active').map(route => (
                    <option key={route._id} value={route._id}>{route.name} ({route.routeNumber})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle (Optional)</label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Vehicle Assigned</option>
                  {vehicles.filter(v => {
                    if (v.status !== 'active') return false;
                    if (!formData.routeId) return true;
                    return v.routeId && typeof v.routeId === 'object' && '_id' in v.routeId && v.routeId._id === formData.routeId;
                  }).map(vehicle => (
                    <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleNumber} ({vehicle.vehicleType})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Point *</label>
                <input
                  type="text"
                  required
                  value={formData.pickupPoint}
                  onChange={(e) => setFormData({ ...formData, pickupPoint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Central Station"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time *</label>
                <input
                  type="time"
                  required
                  value={formData.pickupTime}
                  onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Student Selection */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Students ({selectedStudents.length} selected)
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedStudents.length === filteredUnassignedStudents.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Search Filter */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search by name, roll number, or admission number..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {loadingStudents ? (
                <div className="text-center py-8 text-gray-500">Loading students...</div>
              ) : unassignedStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  All students are already assigned to transport.
                </div>
              ) : filteredUnassignedStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No students found matching your search.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          <input
                            type="checkbox"
                            checked={selectedStudents.length === filteredUnassignedStudents.length && filteredUnassignedStudents.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Admission No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUnassignedStudents.map((student) => (
                        <tr key={student._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student._id)}
                              onChange={() => handleStudentToggle(student._id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{student.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{student.rollNumber || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{student.admissionNumber || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {student.classId ? `${student.classId.name} ${student.classId.section}` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {routes.length > 0 && (
                <Pagination
                  currentPage={routePage}
                  pageSize={routePageSize}
                  totalItems={routes.length}
                  onPageChange={setRoutePage}
                  onPageSizeChange={setRoutePageSize}
                  pageSizeOptions={[10, 20, 50]}
                />
              )}
            </div>

            <div className="flex space-x-3 pt-4 border-t">
              <button
                type="submit"
                disabled={submitting || selectedStudents.length === 0}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Assigning...' : `Assign ${selectedStudents.length} Student(s)`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setSelectedStudents([]);
                  setFormData({
                    routeId: '',
                    vehicleId: '',
                    pickupPoint: '',
                    pickupTime: '',
                    schoolId: schoolId,
                  });
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Student Transport Modal Component
  const StudentTransportModal = () => {
    const [admissionSearch, setAdmissionSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(editingItem?.studentId || null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [formData, setFormData] = useState({
      studentId: editingItem?.studentId?._id || '',
      routeId: editingItem?.routeId?._id || '',
      vehicleId: editingItem?.vehicleId?._id || '',
      pickupPoint: editingItem?.pickupPoint || '',
      pickupTime: editingItem?.pickupTime || '',
      transportType: editingItem?.transportType || 'both-way',
      status: editingItem?.status || 'active',
      schoolId: schoolId,
    });

    // Filter students by admission number or name
    const filteredStudentSuggestions = (editingItem ? [] : unassignedStudents).filter(student => {
      if (!admissionSearch) return false;
      const searchLower = admissionSearch.toLowerCase();
      return (
        student.admissionNumber?.toLowerCase().includes(searchLower) ||
        student.name?.toLowerCase().includes(searchLower) ||
        student.rollNumber?.toLowerCase().includes(searchLower)
      );
    }).slice(0, 5);

    const handleStudentSelect = (student: Student) => {
      setSelectedStudent(student);
      setAdmissionSearch(student.admissionNumber || student.name);
      setFormData({ ...formData, studentId: student._id });
      setShowSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const submitData = {
          ...formData,
          vehicleId: formData.vehicleId || null,
        };

        if (editingItem) {
          await transportAPI.updateStudentTransport(editingItem._id, submitData);
        } else {
          await transportAPI.createStudentTransport(submitData);
        }
        setShowStudentTransportModal(false);
        setEditingItem(null);
        fetchAllData();
      } catch (error: any) {
        console.error('Error saving student transport:', error);
        alert(error.message || 'Failed to save student transport');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingItem ? 'Edit Student Transport' : 'Assign Student to Transport'}</h3>
            <button onClick={() => { setShowStudentTransportModal(false); setEditingItem(null); }} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Admission Number *</label>
              {loadingStudents ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <p className="text-gray-500 text-sm">Loading students...</p>
                </div>
              ) : editingItem ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <p className="text-sm font-medium text-gray-900">{selectedStudent?.name}</p>
                  <p className="text-xs text-gray-500">
                    Admission: {selectedStudent?.admissionNumber || 'N/A'} | Roll: {selectedStudent?.rollNumber}
                  </p>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    required
                    value={admissionSearch}
                    onChange={(e) => {
                      setAdmissionSearch(e.target.value);
                      setShowSuggestions(true);
                      if (!e.target.value) {
                        setSelectedStudent(null);
                        setFormData({ ...formData, studentId: '' });
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Enter admission number or student name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Suggestions Dropdown */}
                  {showSuggestions && filteredStudentSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredStudentSuggestions.map(student => (
                        <div
                          key={student._id}
                          onClick={() => handleStudentSelect(student)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        >
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">
                            Admission: {student.admissionNumber || 'N/A'} | Roll: {student.rollNumber} | Class: {student.classId ? `${student.classId.name} ${student.classId.section}` : 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected Student Display */}
                  {selectedStudent && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm font-medium text-blue-900">
                        Selected: {selectedStudent.name} - {selectedStudent.admissionNumber || selectedStudent.rollNumber}
                      </p>
                    </div>
                  )}

                  {!loadingStudents && unassignedStudents.length === 0 && (
                    <p className="text-sm text-orange-600 mt-1">
                      All students are already assigned to transport.
                    </p>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
              <select
                required
                value={formData.routeId}
                onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Route</option>
                {routes.filter(r => r.status === 'active').map(route => (
                  <option key={route._id} value={route._id}>{route.name} ({route.routeNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle (Optional)</label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Vehicle Assigned</option>
                {vehicles.filter(v => {
                  if (v.status !== 'active') return false;
                  if (!formData.routeId) return true;
                  return v.routeId && typeof v.routeId === 'object' && '_id' in v.routeId && v.routeId._id === formData.routeId;
                }).map(vehicle => (
                  <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleNumber} ({vehicle.vehicleType})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Point</label>
              <input
                type="text"
                required
                value={formData.pickupPoint}
                onChange={(e) => setFormData({ ...formData, pickupPoint: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Central Station"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time</label>
              <input
                type="time"
                required
                value={formData.pickupTime}
                onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transport Type</label>
              <select
                value={formData.transportType}
                onChange={(e) => setFormData({ ...formData, transportType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="both-way">Both Way</option>
                <option value="pickup-only">Pickup Only</option>
                <option value="drop-only">Drop Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingItem ? 'Update' : 'Assign'} Transport
              </button>
              <button
                type="button"
                onClick={() => { setShowStudentTransportModal(false); setEditingItem(null); }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleDeleteRoute = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await transportAPI.deleteRoute(id);
        fetchAllData();
      } catch (error: any) {
        alert(error.message || 'Failed to delete route');
      }
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        await transportAPI.deleteVehicle(id);
        fetchAllData();
      } catch (error: any) {
        alert(error.message || 'Failed to delete vehicle');
      }
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      try {
        await transportAPI.deleteDriver(id);
        fetchAllData();
      } catch (error: any) {
        alert(error.message || 'Failed to delete driver');
      }
    }
  };

  const handleDeleteStudentTransport = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this student from transport?')) {
      try {
        await transportAPI.deleteStudentTransport(id);
        fetchAllData();
      } catch (error: any) {
        alert(error.message || 'Failed to remove student transport');
      }
    }
  };

  useEffect(() => {
    if (schoolId) {
      fetchAllData();
    }
  }, [schoolId]);

  // Show loading or error if user not authenticated
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!state.user || !schoolId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load transport management. Please ensure you are logged in.</p>
          <p className="text-gray-600">School ID: {schoolId || 'Not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      {/* Header */}
      <div className="relative flex flex-col gap-6 overflow-hidden rounded-[28px] bg-[#20396c] px-6 py-9 text-white sm:flex-row sm:items-end sm:justify-between sm:px-10">
        <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[34px] border-white/10" aria-hidden="true" />
        <div className="relative">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-[#ffb17c]">Campus mobility</p>
          <h1 className="font-['Manrope'] text-3xl font-extrabold tracking-tight sm:text-4xl">Transport</h1>
          <p className="mt-2 text-sm text-blue-100">Routes, vehicles and the people who keep every journey moving.</p>
        </div>
        <div className="relative flex space-x-3">
          <button
            onClick={() => setShowRouteModal(true)}
            className="rounded-xl bg-[#f47b35] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#10244b]/20 hover:bg-[#e96b27]"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Add Route
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
              <p className="text-2xl font-bold text-gray-900">{vehicles.length}</p>
              <p className="text-sm text-gray-500">Active vehicles</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Bus className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Routes</p>
              <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
              <p className="text-sm text-gray-500">Covered areas</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Students</p>
              <p className="text-2xl font-bold text-gray-900">{studentTransports.length}</p>
              <p className="text-sm text-gray-500">Using transport</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
              <p className="text-sm text-gray-500">Available</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transport Overview</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-x-auto">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Active Routes</h4>
                  <div className="space-y-3">
                    {routes.slice(0, 4).map((route) => (
                      <div key={route._id} className="flex items-center justify-between p-3 bg-white rounded border">
                        <div>
                          <p className="font-medium text-gray-900">{route.name}</p>
                          <p className="text-sm text-gray-500">{route.routeNumber} • {route.startPoint} to {route.endPoint}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{route.distance}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${route.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {route.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Transport Statistics</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Routes</span>
                      <span className="font-medium">{routes.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Vehicles</span>
                      <span className="font-medium">{vehicles.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Drivers</span>
                      <span className="font-medium">{drivers.filter(d => d.status === 'active').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Students Using Transport</span>
                      <span className="font-medium">{studentTransports.filter(st => st.status === 'active').length}</span>
                    </div>
                  </div>
                </div>
              </div>
              <BusTrackingDemo routes={routes} vehicles={vehicles} />
            </div>
          )}

          {/* Routes Tab */}
          {activeTab === 'routes' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Transport Routes</h3>
                <button
                  onClick={() => setShowRouteModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Add Route
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : routes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No routes found. Add your first route!</div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Point
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Point
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Distance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {routes
                        .slice((routePage - 1) * routePageSize, routePage * routePageSize)
                        .map((route) => (
                        <tr key={route._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {route.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {route.routeNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {route.startPoint}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {route.endPoint}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {route.distance}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs px-2 py-1 rounded-full ${route.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {route.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => { setEditingItem(route); setShowRouteModal(true); }}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <Edit className="h-4 w-4 inline" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoute(route._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {routes.length > 0 && (
                <Pagination
                  currentPage={routePage}
                  pageSize={routePageSize}
                  totalItems={routes.length}
                  onPageChange={setRoutePage}
                  onPageSizeChange={setRoutePageSize}
                  pageSizeOptions={[10, 20, 50]}
                />
              )}
            </div>
          )}

          {/* Vehicles Tab */}
          {activeTab === 'vehicles' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Vehicle Management</h3>
                <button
                  onClick={() => setShowVehicleModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Add Vehicle
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No vehicles found. Add your first vehicle!</div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vehicle Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Capacity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Driver
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vehicles.map((vehicle) => (
                        <tr key={vehicle._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {vehicle.vehicleNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vehicle.vehicleType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vehicle.capacity} seats
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vehicle.driverId ? vehicle.driverId.name : 'Not Assigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {vehicle.routeId ? vehicle.routeId.name : 'Not Assigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs px-2 py-1 rounded-full ${vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                              vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {vehicle.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => { setEditingItem(vehicle); setShowVehicleModal(true); }}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <Edit className="h-4 w-4 inline" />
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(vehicle._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {routes.length > 0 && (
                <Pagination
                  currentPage={routePage}
                  pageSize={routePageSize}
                  totalItems={routes.length}
                  onPageChange={setRoutePage}
                  onPageSizeChange={setRoutePageSize}
                  pageSizeOptions={[10, 20, 50]}
                />
              )}
            </div>
          )}

          {/* Student Transport Tab */}
          {activeTab === 'students' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Student Transport</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowStudentTransportModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 inline mr-2" />
                    Assign Student
                  </button>
                  <button
                    onClick={() => setShowBulkAssignModal(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Users className="h-4 w-4 inline mr-2" />
                    Bulk Assign
                  </button>
                  <button
                    onClick={handleExportList}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4 inline mr-2" />
                    Export List
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : studentTransports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No students assigned to transport. Add your first assignment!</div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roll Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pickup Point
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pickup Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentTransports.map((transport) => (
                        <tr key={transport._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {transport.studentId?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transport.studentId?.rollNumber || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transport.studentId?.classId
                              ? `${transport.studentId.classId.name} ${transport.studentId.classId.section}`
                              : 'N/A'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transport.routeId?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transport.pickupPoint || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transport.pickupTime || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs px-2 py-1 rounded-full ${transport.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {transport.status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => { setEditingItem(transport); setShowStudentTransportModal(true); }}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <Edit className="h-4 w-4 inline" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudentTransport(transport._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {routes.length > 0 && (
                <Pagination
                  currentPage={routePage}
                  pageSize={routePageSize}
                  totalItems={routes.length}
                  onPageChange={setRoutePage}
                  onPageSizeChange={setRoutePageSize}
                  pageSizeOptions={[10, 20, 50]}
                />
              )}
            </div>
          )}

          {/* Drivers Tab */}
          {activeTab === 'drivers' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Driver Management</h3>
                <button
                  onClick={() => setShowDriverModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Add Driver
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : drivers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No drivers found. Add your first driver!</div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Driver Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          License No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vehicle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {drivers.map((driver) => (
                        <tr key={driver._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {driver.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {driver.licenseNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {driver.vehicleId ? driver.vehicleId.vehicleNumber : 'Not Assigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {driver.routeId ? driver.routeId.name : 'Not Assigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {driver.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs px-2 py-1 rounded-full ${driver.status === 'active' ? 'bg-green-100 text-green-800' :
                              driver.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {driver.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => { setEditingItem(driver); setShowDriverModal(true); }}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <Edit className="h-4 w-4 inline" />
                            </button>
                            <button
                              onClick={() => handleDeleteDriver(driver._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {routes.length > 0 && (
                <Pagination
                  currentPage={routePage}
                  pageSize={routePageSize}
                  totalItems={routes.length}
                  onPageChange={setRoutePage}
                  onPageSizeChange={setRoutePageSize}
                  pageSizeOptions={[10, 20, 50]}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showRouteModal && <RouteModal />}
      {showVehicleModal && <VehicleModal />}
      {showDriverModal && <DriverModal />}
      {showStudentTransportModal && <StudentTransportModal />}
      {showBulkAssignModal && <BulkAssignModal />}
    </div>
  );
};

export default Transport;
