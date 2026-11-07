import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { auth } from '../config/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';

// Get API base URL from environment variable
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'school_admin' | 'teacher' | 'student' | 'librarian' | 'accountant';
  schoolId?: string;
  school?: {
    _id: string;
    name: string;
    address: string;
    status: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Action types
export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESTORE_AUTH'; payload: { user: User; token: string } };

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

// Reducer function
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'RESTORE_AUTH':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    default:
      return state;
  }
}

// Context interface
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<any>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('🔥 School Portal Firebase Auth: User is signed in:', firebaseUser.email);
        
        if (firebaseUser.emailVerified) {
          try {
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/auth/firebase-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken })
            });

            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.includes('application/json')) {
              const data = await response.json();
              const { user, token } = data.data;
              
              localStorage.setItem('school_token', token);
              if (user.schoolId) localStorage.setItem('schoolId', user.schoolId);
              
              dispatch({
                type: 'RESTORE_AUTH',
                payload: { user, token },
              });
            } else {
              console.error('❌ Backend exchange failed');
              localStorage.removeItem('school_token');
              localStorage.removeItem('schoolId');
              dispatch({ type: 'LOGIN_FAILURE' });
            }
          } catch (error) {
            console.error('❌ Auth refresh error:', error);
            localStorage.removeItem('school_token');
            localStorage.removeItem('schoolId');
            dispatch({ type: 'LOGIN_FAILURE' });
          }
        } else {
          console.log('⚠️ Email not verified');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('🔥 School Portal Firebase Auth: User is signed out');
        localStorage.removeItem('school_token');
        localStorage.removeItem('schoolId');
        dispatch({ type: 'LOGOUT' });
      }
    });

    return () => unsubscribe();
  }, []);

  const checkAuth = async () => {
    if (!auth.currentUser) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    
    try {
      const token = localStorage.getItem('school_token');
      if (token) {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          const user = userData.data.user;
          dispatch({ type: 'RESTORE_AUTH', payload: { user, token } });
        }
      }
    } catch (error) {
       console.error('Auth check failed:', error);
    } finally {
       dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'LOGIN_START' });

      // 1. Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email.trim(), credentials.password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser.emailVerified) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return { success: true, emailVerified: false };
      }

      // 2. Exchange ID token for backend JWT
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/auth/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        dispatch({ type: 'LOGIN_FAILURE' });
        throw new Error(`Backend server is not reachable at ${API_BASE_URL}. Ensure your backend server is deployed and running on your VM.`);
      }

      if (response.ok) {
        const data = await response.json();
        const { user, token } = data.data;

        localStorage.setItem('school_token', token);
        if (user.schoolId) localStorage.setItem('schoolId', user.schoolId);

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token },
        });
        return { success: true, emailVerified: true };
      } else {
        const errorData = await response.json();
        dispatch({ type: 'LOGIN_FAILURE' });
        return { 
          success: false, 
          error: errorData.error, 
          emailVerified: errorData.error !== 'email_not_verified' 
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const resendVerificationEmail = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return { success: true };
      }
      return { success: false, error: 'No user signed in' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem('school_token');
    localStorage.removeItem('schoolId');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ state, login, logout, checkAuth, forgotPassword, resendVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
