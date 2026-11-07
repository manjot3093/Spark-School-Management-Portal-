import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'school_admin' | 'teacher' | 'student' | 'librarian' | 'accountant';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { state } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!state.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if required
  if (requiredRole && state.user?.role !== requiredRole) {
    // Redirect to dashboard if user doesn't have required role
    return <Navigate to="/dashboard" replace />;
  }

  // Allow access to school admin, librarian, and accountant roles for school portal
  const allowedRoles = ['admin', 'school_admin', 'teacher', 'librarian', 'accountant'];
  if (state.user?.role && !allowedRoles.includes(state.user.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the school portal.
          </p>
          <p className="text-sm text-gray-500">
            Only school administrators, librarians, and accountants can access this portal.
          </p>
        </div>
      </div>
    );
  }

  // Role-based route access control
  const currentPath = location.pathname;
  const userRole = state.user?.role;

  if (userRole === 'teacher' && !['/exams', '/assistant'].includes(currentPath)) {
    return <Navigate to="/exams" replace />;
  }

  // Librarian can only access /library (no dashboard access)
  if (userRole === 'librarian') {
    // Block dashboard access
    if (currentPath === '/dashboard' || currentPath === '/') {
      return <Navigate to="/library" replace />;
    }
    // Only allow library access
    if (currentPath !== '/library') {
      return <Navigate to="/library" replace />;
    }
  }

  // Accountant can access Fee & Finance Management ERP section (no dashboard access)
  if (userRole === 'accountant') {
    // Block dashboard access
    if (currentPath === '/dashboard' || currentPath === '/') {
      return <Navigate to="/accounts" replace />;
    }
    // Allow access to fee and finance management routes
    const allowedAccountantPaths = ['/fees', '/salary', '/fee-salary-manager', '/accounts', '/shop'];
    if (!allowedAccountantPaths.includes(currentPath)) {
      return <Navigate to="/accounts" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
