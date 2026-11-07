import ThemeToggle from '../components/ThemeToggle';
import LoginSchoolScene from '../components/LoginSchoolScene';
import LoginCelestialSphere from '../components/LoginCelestialSphere';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  AlertCircle,
  Building2
} from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const { state, login, forgotPassword, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated && !state.isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [state.isAuthenticated, state.isLoading, navigate]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setUnverifiedEmail(false);
    try {
      const result = await login(formData);
      
      if (result && result.success) {
        if (!result.emailVerified) {
          setUnverifiedEmail(true);
          toast.error('Email verification required. Please check your inbox.');
        } else {
          toast.success('Login successful! Welcome to your school portal.');
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      toast.error('Enter a valid email address');
      return;
    }

    setIsResetLoading(true);
    try {
      const result = await forgotPassword(resetEmail);
      if (result.success) {
        toast.success('Password reset email sent! Please check your inbox.');
        setShowForgotModal(false);
        setResetEmail('');
      } else {
        toast.error(result.error || 'Failed to send reset email');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const result = await resendVerificationEmail();
      if (result.success) {
        toast.success('Verification email resent successfully!');
      } else {
        toast.error(result.error || 'Failed to resend verification email');
      }
    } catch (error) {
      toast.error('Could not resend email. Please try again later.');
    }
  };

  // Show loading spinner while checking authentication
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Theme toggle — fixed to the screen top-right corner, above everything */}
      <div className="login-global-theme-toggle" aria-label="Color theme">
        <ThemeToggle />
      </div>

      <div className="login-layout">
        <section className="login-story" aria-label="Animated Spark campus and sky">
          {/* Brand badge — glassmorphic frosted pill */}
          <div className="login-story-brand-badge" aria-label="Spark School Management Portal">
            <span className="login-story-brand-title">SPARK</span>
            <span className="login-story-brand-sub">School Management Portal</span>
          </div>
          {/* Sun / Moon celestial widget — top-right of left card */}
          <div className="login-story-celestial-slot" aria-hidden="true">
            <LoginCelestialSphere size={110} />
          </div>
          {/* Shooting stars — dark mode only */}
          <div className="login-shooting-stars" aria-hidden="true">
            <span /><span /><span /><span /><span /><span /><span />
          </div>
          {/* Day-mode birds — hidden in dark mode via CSS */}
          <div className="login-birds" aria-hidden="true">
            <svg className="login-bird login-bird-1" viewBox="0 0 48 20" xmlns="http://www.w3.org/2000/svg">
              <path className="login-bird-wing-left"  d="M24 10 Q16 2 4 6"  stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path className="login-bird-wing-right" d="M24 10 Q32 2 44 6" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            </svg>
            <svg className="login-bird login-bird-2" viewBox="0 0 40 18" xmlns="http://www.w3.org/2000/svg">
              <path className="login-bird-wing-left"  d="M20 9 Q13 2 3 5"   stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
              <path className="login-bird-wing-right" d="M20 9 Q27 2 37 5"  stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
            </svg>
            <svg className="login-bird login-bird-3" viewBox="0 0 36 16" xmlns="http://www.w3.org/2000/svg">
              <path className="login-bird-wing-left"  d="M18 8 Q12 2 2 4"   stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path className="login-bird-wing-right" d="M18 8 Q24 2 34 4"  stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
            <svg className="login-bird login-bird-4" viewBox="0 0 44 18" xmlns="http://www.w3.org/2000/svg">
              <path className="login-bird-wing-left"  d="M22 9 Q14 2 2 5"   stroke="currentColor" strokeWidth="2.3" fill="none" strokeLinecap="round"/>
              <path className="login-bird-wing-right" d="M22 9 Q30 2 42 5"  stroke="currentColor" strokeWidth="2.3" fill="none" strokeLinecap="round"/>
            </svg>
            <svg className="login-bird login-bird-5" viewBox="0 0 32 14" xmlns="http://www.w3.org/2000/svg">
              <path className="login-bird-wing-left"  d="M16 7 Q10 1 2 3"   stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
              <path className="login-bird-wing-right" d="M16 7 Q22 1 30 3"  stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <LoginSchoolScene />
        </section>
        <div className="login-panel max-w-md w-full space-y-5 relative">

          {/* Header */}
          <div className="text-center">
            <div className="login-card-brand">
              <img 
                src="/assets/spark-logo-transparent.png" 
                alt="Spark Educational ERP"
                draggable={false}
              />
            </div>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">Welcome back.</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to your school workspace.</p>
          </div>

          {/* Login Form */}
          <div className="bg-white py-6 px-6 shadow-xl rounded-2xl">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className={`relative login-input-wrap ${errors.email ? 'login-input-error' : ''}`}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'login-email-error' : undefined}
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                  />
                </div>
                {errors.email && (
                  <div id="login-email-error" role="alert" className="mt-1 flex items-center text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className={`relative login-input-wrap ${errors.password ? 'login-input-error' : ''}`}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`block w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff key="visible" className="h-5 w-5 text-gray-400 hover:text-gray-600 login-eye-icon" />
                    ) : (
                      <Eye key="hidden" className="h-5 w-5 text-gray-400 hover:text-gray-600 login-eye-icon" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <div id="login-password-error" role="alert" className="mt-1 flex items-center text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.password}
                  </div>
                )}
              </div>
              {/* Forgot Password */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Forgot your password?
                </button>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              
              </div>
            </form>

            {unverifiedEmail && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Email not verified</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Please verify your email to continue.{' '}
                    <button 
                      onClick={handleResendVerification}
                      className="font-bold underline hover:text-yellow-800"
                    >
                      Resend verification link
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* Info Section */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center text-sm text-gray-600">
                <Building2 className="h-4 w-4 mr-2" />
                <span>Access your school's management portal</span>
              </div>
              <p className="mt-2 text-xs text-center text-gray-500">
                Use the credentials provided by your school administrator
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-3">
            <p className="text-sm text-gray-600">
              Need help? Contact your school administrator
            </p>
          </div>
        </div>

      </div>
      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowForgotModal(false)}
              aria-label="Close password reset"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Lock className="h-6 w-6 rotate-45" />
            </button>
            
            <div className="text-center mb-8">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h3 id="reset-title" className="text-2xl font-bold text-gray-900">Reset password</h3>
              <p className="text-gray-600 mt-2">
                No worries! Enter your email and we'll send you reset instructions.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isResetLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all font-semibold shadow-lg shadow-blue-200"
              >
                {isResetLoading ? 'Sending...' : 'Reset Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
