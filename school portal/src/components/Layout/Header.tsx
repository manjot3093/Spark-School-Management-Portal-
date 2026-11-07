
import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Building,
  ChevronDown,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { menuSections } from './menuConfig';
import ThemeToggle from '../ThemeToggle';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = menuSections.flatMap(section => section.items.map(item => ({ ...item, section: section.title }))).find(item => item.path === pathname);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowUserDropdown(false); };
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);
  return (
    <header className="portal-header">
      <div className="portal-header-content">
        {/* Left Section */}
        <div className="portal-header-start">
          <button
            onClick={onMenuClick}
            type="button" aria-label="Open navigation" className="portal-menu-button"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="portal-page-heading"><span>{current?.section || 'Workspace'} / {state.user?.school?.name || 'Spark School'}</span><h1>{current?.label || 'Workspace'}</h1></div>
          
        </div>

        {/* Right Section */}
        <div className="portal-header-end">
          {/* School Name Display */}
          <div className="portal-school-pill">
            <Building className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {state.user?.school?.name || 'Spark School'}
            </span>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              type="button" aria-label="Account menu" aria-expanded={showUserDropdown}  className="portal-user-button"
            >
              <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-700">{state.user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{state.user?.role?.replace('_', ' ')}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {/* User Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                <div className="py-1">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{state.user?.name}</p>
                    <p className="text-sm text-gray-500">{state.user?.email}</p>
                    <p className="text-xs text-gray-400 capitalize mt-1">{state.user?.role?.replace('_', ' ')}</p>
                  </div>
                  <ThemeToggle />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 
