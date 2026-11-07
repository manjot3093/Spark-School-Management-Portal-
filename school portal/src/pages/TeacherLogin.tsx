import ThemeToggle from '../components/ThemeToggle';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { GraduationCap, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const TeacherLogin: React.FC = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setUnverifiedEmail(false);
      
      // 1. Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email.trim(), credentials.password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser.emailVerified) {
        setUnverifiedEmail(true);
        toast.error('Please verify your email address before logging in.');
        setLoading(false);
        return;
      }

      // 2. Exchange ID token for backend JWT
      const idToken = await firebaseUser.getIdToken();
      const response = await authAPI.firebaseLogin(idToken);
      
      const { user, token } = response.data;
      
      // Store teacher token and user data
      localStorage.setItem('teacher_token', token);
      localStorage.setItem('teacher_data', JSON.stringify(user));
      
      toast.success('Login successful!');
      navigate('/staff-checkin');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle the case where backend enforces verification but frontend didn't catch it
      if (error.response?.data?.error === 'email_not_verified' || error.message?.includes('email_not_verified')) {
        setUnverifiedEmail(true);
        toast.error('Email verification required.');
      } else {
        toast.error(error.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      toast.success('Reset email sent! Please check your inbox.');
      setShowForgotModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        toast.success('Verification email resent successfully!');
      } else {
        toast.error('Please sign in again to resend verification link.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification email');
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f7f9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden before:absolute before:w-[35rem] before:h-[35rem] before:rounded-full before:bg-[#dcecf1] before:blur-3xl before:-top-48 before:-left-40">
      <ThemeToggle standalone />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-[#163f5d] rounded-2xl flex items-center justify-center shadow-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-[#163f5d]">
          Teacher sign in
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Open your classroom workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 shadow-xl rounded-2xl border border-slate-200 sm:px-10 relative">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#163f5d] hover:bg-[#0e314b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
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
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <Lock className="h-6 w-6 rotate-45" />
            </button>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Reset Teacher Password</h3>
              <p className="text-gray-600 mt-1">Enter your email for reset instructions.</p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isResetLoading}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isResetLoading ? 'Sending...' : 'Reset'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherLogin;
