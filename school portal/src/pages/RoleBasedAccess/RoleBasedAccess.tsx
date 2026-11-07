import React, { useState, useEffect } from 'react';
import { api, apiRequest } from '../../services/api';
import { 
  UserPlus,
  BookOpen,
  Calculator,
  CheckCircle,
  X,
  Users,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

const RoleBasedAccess: React.FC = () => {
  // Add Librarian state
  const [showAddLibrarianModal, setShowAddLibrarianModal] = useState(false);
  const [showLibrarianSuccessModal, setShowLibrarianSuccessModal] = useState(false);
  const [createdLibrarian, setCreatedLibrarian] = useState<any>(null);
  const [newLibrarianCredentials, setNewLibrarianCredentials] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  // Add Accountant state
  const [showAddAccountantModal, setShowAddAccountantModal] = useState(false);
  const [showAccountantSuccessModal, setShowAccountantSuccessModal] = useState(false);
  const [createdAccountant, setCreatedAccountant] = useState<any>(null);
  const [newAccountantCredentials, setNewAccountantCredentials] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  // Lists state
  const [librarians, setLibrarians] = useState<any[]>([]);
  const [accountants, setAccountants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddLibrarian = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!newLibrarianCredentials.name || !newLibrarianCredentials.email || 
        !newLibrarianCredentials.password || !newLibrarianCredentials.confirmPassword || !newLibrarianCredentials.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newLibrarianCredentials.password !== newLibrarianCredentials.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newLibrarianCredentials.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const librarianData = {
        name: newLibrarianCredentials.name,
        email: newLibrarianCredentials.email,
        password: newLibrarianCredentials.password,
        phone: newLibrarianCredentials.phone
      };

      const response = await api.classroom.createLibrarian(librarianData);
      const newLibrarian = response.data.librarian;
      
      // Set created librarian data for success modal
      setCreatedLibrarian(newLibrarian);
      
      // Reset form
      setNewLibrarianCredentials({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: ''
      });
      
      // Close add librarian modal and show success modal
      setShowAddLibrarianModal(false);
      setShowLibrarianSuccessModal(true);
      toast.success('Librarian created successfully!');
      // Refresh librarians list
      fetchLibrarians();
    } catch (error: any) {
      console.error('Error adding librarian:', error);
      if (error.message?.includes('email already exists')) {
        toast.error('A user with this email already exists. Please use a different email address.');
      } else {
        toast.error('Failed to add librarian. Please try again.');
      }
    }
  };

  // Fetch librarians and accountants
  const fetchLibrarians = async () => {
    try {
      setLoading(true);
      const schoolId = localStorage.getItem('schoolId');
      const params: any = { role: 'librarian', limit: '1000' };
      if (schoolId) params.schoolId = schoolId;
      
      const queryString = new URLSearchParams(params).toString();
      const response = await apiRequest(`/users?${queryString}`);
      
      if (response.success || response.data) {
        setLibrarians(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching librarians:', error);
      toast.error('Failed to load librarians');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountants = async () => {
    try {
      setLoading(true);
      const schoolId = localStorage.getItem('schoolId');
      const params: any = { role: 'accountant', limit: '1000' };
      if (schoolId) params.schoolId = schoolId;
      
      const queryString = new URLSearchParams(params).toString();
      const response = await apiRequest(`/users?${queryString}`);
      
      if (response.success || response.data) {
        setAccountants(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching accountants:', error);
      toast.error('Failed to load accountants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrarians();
    fetchAccountants();
  }, []);

  const handleAddAccountant = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!newAccountantCredentials.name || !newAccountantCredentials.email || 
        !newAccountantCredentials.password || !newAccountantCredentials.confirmPassword || !newAccountantCredentials.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newAccountantCredentials.password !== newAccountantCredentials.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newAccountantCredentials.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const accountantData = {
        name: newAccountantCredentials.name,
        email: newAccountantCredentials.email,
        password: newAccountantCredentials.password,
        phone: newAccountantCredentials.phone
      };

      const response = await api.classroom.createAccountant(accountantData);
      const newAccountant = response.data.accountant;
      
      // Set created accountant data for success modal
      setCreatedAccountant(newAccountant);
      
      // Reset form
      setNewAccountantCredentials({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: ''
      });
      
      // Close add accountant modal and show success modal
      setShowAddAccountantModal(false);
      setShowAccountantSuccessModal(true);
      toast.success('Accountant created successfully!');
      // Refresh accountants list
      fetchAccountants();
    } catch (error: any) {
      console.error('Error adding accountant:', error);
      if (error.message?.includes('email already exists')) {
        toast.error('A user with this email already exists. Please use a different email address.');
      } else {
        toast.error('Failed to add accountant. Please try again.');
      }
    }
  };

  return (
    <div className="pb-10 space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-8 flex justify-between items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600 mb-2">Administration / Access</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Role based access</h1>
          <p className="text-slate-600 mt-1">Manage librarian and accountant accounts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Librarian Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">Librarian</h4>
              <p className="text-sm text-gray-600">Create librarian accounts</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Librarians can access and manage the library section. They can add books, manage borrowings, and track library inventory.
          </p>
          <button
            onClick={() => setShowAddLibrarianModal(true)}
            className="w-full bg-[#163f5d] text-white px-4 py-3 rounded-lg hover:bg-[#0e314b] transition-colors flex items-center justify-center space-x-2 font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Librarian</span>
          </button>
        </div>

        {/* Accountant Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Calculator className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">Accountant</h4>
              <p className="text-sm text-gray-600">Create accountant accounts</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Accountants can access and manage the accounts section. They can handle financial transactions, fees, and accounting records.
          </p>
          <button
            onClick={() => setShowAddAccountantModal(true)}
            className="w-full bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2 font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Accountant</span>
          </button>
        </div>
      </div>

      {/* Librarians List */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span>Librarians ({librarians.length})</span>
          </h4>
          <button
            onClick={fetchLibrarians}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : librarians.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p>No librarians added yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {librarians.map((librarian) => (
                  <tr key={librarian._id || librarian.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{librarian.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {librarian.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {librarian.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        librarian.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {librarian.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {librarian.createdAt ? new Date(librarian.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Accountants List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-green-600" />
            <span>Accountants ({accountants.length})</span>
          </h4>
          <button
            onClick={fetchAccountants}
            className="text-sm text-green-600 hover:text-green-800"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : accountants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p>No accountants added yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountants.map((accountant) => (
                  <tr key={accountant._id || accountant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{accountant.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {accountant.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {accountant.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        accountant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {accountant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {accountant.createdAt ? new Date(accountant.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Access Control</h4>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Librarian Access</p>
              <p className="text-sm text-gray-600">Librarians can only access the Library section of the school portal.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Accountant Access</p>
              <p className="text-sm text-gray-600">Accountants can only access the Accounts section of the school portal.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Librarian Modal */}
      {showAddLibrarianModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Librarian with Login Credentials</h3>
                <button
                  onClick={() => setShowAddLibrarianModal(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAddLibrarian} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={newLibrarianCredentials.name}
                    onChange={(e) => setNewLibrarianCredentials({ ...newLibrarianCredentials, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter librarian's full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newLibrarianCredentials.email}
                    onChange={(e) => setNewLibrarianCredentials({ ...newLibrarianCredentials, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter librarian's email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={newLibrarianCredentials.password}
                    onChange={(e) => setNewLibrarianCredentials({ ...newLibrarianCredentials, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                  <input
                    type="password"
                    value={newLibrarianCredentials.confirmPassword}
                    onChange={(e) => setNewLibrarianCredentials({ ...newLibrarianCredentials, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={newLibrarianCredentials.phone}
                    onChange={(e) => setNewLibrarianCredentials({ ...newLibrarianCredentials, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddLibrarianModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Librarian
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Librarian Success Modal */}
      {showLibrarianSuccessModal && createdLibrarian && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Librarian Added Successfully!</h3>
              <div className="text-sm text-gray-600 mb-4">
                <p className="mb-2"><strong>Name:</strong> {createdLibrarian.name}</p>
                <p className="mb-2"><strong>Email:</strong> {createdLibrarian.email}</p>
                <p className="mb-2"><strong>Phone:</strong> {createdLibrarian.phone}</p>
                <p className="mb-2"><strong>Role:</strong> Librarian</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-md mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Login Credentials:</strong><br/>
                  The librarian can now login using their email and the password you provided. They will have access to the Library section only.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowLibrarianSuccessModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Accountant Modal */}
      {showAddAccountantModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Accountant with Login Credentials</h3>
                <button
                  onClick={() => setShowAddAccountantModal(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAddAccountant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={newAccountantCredentials.name}
                    onChange={(e) => setNewAccountantCredentials({ ...newAccountantCredentials, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter accountant's full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={newAccountantCredentials.email}
                    onChange={(e) => setNewAccountantCredentials({ ...newAccountantCredentials, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter accountant's email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={newAccountantCredentials.password}
                    onChange={(e) => setNewAccountantCredentials({ ...newAccountantCredentials, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                  <input
                    type="password"
                    value={newAccountantCredentials.confirmPassword}
                    onChange={(e) => setNewAccountantCredentials({ ...newAccountantCredentials, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Re-enter password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={newAccountantCredentials.phone}
                    onChange={(e) => setNewAccountantCredentials({ ...newAccountantCredentials, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAccountantModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add Accountant
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Accountant Success Modal */}
      {showAccountantSuccessModal && createdAccountant && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Accountant Added Successfully!</h3>
              <div className="text-sm text-gray-600 mb-4">
                <p className="mb-2"><strong>Name:</strong> {createdAccountant.name}</p>
                <p className="mb-2"><strong>Email:</strong> {createdAccountant.email}</p>
                <p className="mb-2"><strong>Phone:</strong> {createdAccountant.phone}</p>
                <p className="mb-2"><strong>Role:</strong> Accountant</p>
              </div>
              <div className="bg-green-50 p-3 rounded-md mb-4">
                <p className="text-sm text-green-800">
                  <strong>Login Credentials:</strong><br/>
                  The accountant can now login using their email and the password you provided. They will have access to the Accounts section only.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAccountantSuccessModal(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleBasedAccess;

