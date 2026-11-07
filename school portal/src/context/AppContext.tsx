import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface Student {
  id: string;
  name: string;
  class: string;
  rollNumber: string;
  email: string;
  phone: string;
  address: string;
  parentName: string;
  parentPhone: string;
  admissionDate: string;
  status: 'active' | 'inactive';
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  department: string;
  salary: number;
  joinDate: string;
  status: 'active' | 'inactive';
}

export interface Class {
  id: string;
  name: string;
  section: string;
  teacher: string;
  students: number;
  subjects: string[];
  capacity: number;
  room: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  teacher: string;
  class: string;
  credits: number;
}

export interface Fee {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  type: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  initiatedBy: string;
  date: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  department?: string;
  dueDate?: string;
}

export interface Message {
  id: string;
  recipient: string;
  subject: string;
  content: string;
  type: 'sms' | 'email' | 'whatsapp';
  status: 'sent' | 'delivered' | 'failed' | 'scheduled';
  timestamp: string;
  priority: 'low' | 'normal' | 'high';
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface SchoolInfo {
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  academicBoard: string;
  logo?: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
}

// State interface
export interface AppState {
  students: Student[];
  employees: Employee[];
  classes: Class[];
  subjects: Subject[];
  fees: Fee[];
  complaints: Complaint[];
  messages: Message[];
  schoolInfo: SchoolInfo;
  storeProducts: StoreProduct[];
  currentUser: {
    name: string;
    role: string;
    institute: string;
  };
}

// Action types
export type AppAction =
  | { type: 'ADD_STUDENT'; payload: Student }
  | { type: 'UPDATE_STUDENT'; payload: Student }
  | { type: 'DELETE_STUDENT'; payload: string }
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
  | { type: 'DELETE_EMPLOYEE'; payload: string }
  | { type: 'ADD_CLASS'; payload: Class }
  | { type: 'UPDATE_CLASS'; payload: Class }
  | { type: 'DELETE_CLASS'; payload: string }
  | { type: 'ADD_SUBJECT'; payload: Subject }
  | { type: 'UPDATE_SUBJECT'; payload: Subject }
  | { type: 'DELETE_SUBJECT'; payload: string }
  | { type: 'ADD_FEE'; payload: Fee }
  | { type: 'UPDATE_FEE'; payload: Fee }
  | { type: 'DELETE_FEE'; payload: string }
  | { type: 'ADD_COMPLAINT'; payload: Complaint }
  | { type: 'UPDATE_COMPLAINT'; payload: Complaint }
  | { type: 'DELETE_COMPLAINT'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: Message }
  | { type: 'DELETE_MESSAGE'; payload: string }
  | { type: 'UPDATE_SCHOOL_INFO'; payload: Partial<SchoolInfo> }
  | { type: 'ADD_STORE_PRODUCT'; payload: StoreProduct }
  | { type: 'UPDATE_STORE_PRODUCT'; payload: StoreProduct }
  | { type: 'DELETE_STORE_PRODUCT'; payload: string }
  | { type: 'SET_CURRENT_USER'; payload: { name: string; role: string; institute: string } };

// Initial state
const initialState: AppState = {
  students: [
    {
      id: '1',
      name: 'John Doe',
      class: 'Class 10',
      rollNumber: '1001',
      email: 'john.doe@school.com',
      phone: '+1234567890',
      address: '123 Student St, City',
      parentName: 'Jane Doe',
      parentPhone: '+1234567891',
      admissionDate: '2023-09-01',
      status: 'active'
    },
    {
      id: '2',
      name: 'Jane Smith',
      class: 'Class 9',
      rollNumber: '2001',
      email: 'jane.smith@school.com',
      phone: '+1234567892',
      address: '456 Student Ave, City',
      parentName: 'John Smith',
      parentPhone: '+1234567893',
      admissionDate: '2023-09-01',
      status: 'active'
    }
  ],
  employees: [
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      position: 'Principal',
      email: 'principal@school.com',
      phone: '+1234567894',
      department: 'Administration',
      salary: 80000,
      joinDate: '2020-01-01',
      status: 'active'
    },
    {
      id: '2',
      name: 'Mr. Michael Brown',
      position: 'Mathematics Teacher',
      email: 'math.teacher@school.com',
      phone: '+1234567895',
      department: 'Mathematics',
      salary: 60000,
      joinDate: '2021-09-01',
      status: 'active'
    }
  ],
  classes: [
    {
      id: '1',
      name: 'Class 10',
      section: 'A',
      teacher: 'Dr. Sarah Johnson',
      students: 25,
      subjects: ['Mathematics', 'Science', 'English', 'History'],
      capacity: 40,
      room: 'Room 101'
    },
    {
      id: '2',
      name: 'Class 9',
      section: 'B',
      teacher: 'Mr. Michael Brown',
      students: 28,
      subjects: ['Mathematics', 'Science', 'English', 'Geography'],
      capacity: 40,
      room: 'Room 102'
    }
  ],
  subjects: [
    {
      id: '1',
      name: 'Mathematics',
      code: 'MATH101',
      teacher: 'Mr. Michael Brown',
      class: 'Class 10',
      credits: 4
    },
    {
      id: '2',
      name: 'Science',
      code: 'SCI101',
      teacher: 'Dr. Sarah Johnson',
      class: 'Class 10',
      credits: 4
    }
  ],
  fees: [
    {
      id: '1',
      studentId: '1',
      studentName: 'John Doe',
      amount: 500,
      dueDate: '2024-01-15',
      status: 'paid',
      type: 'Tuition Fee'
    },
    {
      id: '2',
      studentId: '2',
      studentName: 'Jane Smith',
      amount: 500,
      dueDate: '2024-01-15',
      status: 'pending',
      type: 'Tuition Fee'
    }
  ],
  complaints: [
    {
      id: '1',
      title: 'Library Book Issue',
      description: 'Unable to access library books online',
      initiatedBy: 'Student',
      date: '2024-01-10',
      status: 'open',
      priority: 'medium',
      category: 'Technical Issue'
    }
  ],
  messages: [
    {
      id: '1',
      recipient: 'Class 10',
      subject: 'Parent Meeting Reminder',
      content: 'Reminder: Parent meeting scheduled for next week',
      type: 'sms',
      status: 'sent',
      timestamp: '2024-01-10T10:00:00Z',
      priority: 'normal'
    }
  ],
  schoolInfo: {
    name: 'Rootbase School',
    code: 'ES001',
    email: 'info@rootbase.com',
    phone: '+1 234 567 8900',
    address: '123 Education Street, Learning City, LC 12345',
    website: 'https://www.rootbase.com',
    academicBoard: 'CBSE'
  },
  storeProducts: [
    {
      id: '1',
      name: 'School Uniform',
      description: 'Standard school uniform for all students',
      price: 25.99,
      category: 'Uniforms',
      stock: 100
    },
    {
      id: '2',
      name: 'Textbook Set',
      description: 'Complete set of textbooks for Class 10',
      price: 89.99,
      category: 'Books',
      stock: 50
    }
  ],
  currentUser: {
    name: 'Admin User',
    role: 'Administrator',
    institute: 'Institute Name'
  }
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_STUDENT':
      return { ...state, students: [...state.students, action.payload] };
    case 'UPDATE_STUDENT':
      return {
        ...state,
        students: state.students.map(student =>
          student.id === action.payload.id ? action.payload : student
        )
      };
    case 'DELETE_STUDENT':
      return {
        ...state,
        students: state.students.filter(student => student.id !== action.payload)
      };
    case 'ADD_EMPLOYEE':
      return { ...state, employees: [...state.employees, action.payload] };
    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map(employee =>
          employee.id === action.payload.id ? action.payload : employee
        )
      };
    case 'DELETE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.filter(employee => employee.id !== action.payload)
      };
    case 'ADD_CLASS':
      return { ...state, classes: [...state.classes, action.payload] };
    case 'UPDATE_CLASS':
      return {
        ...state,
        classes: state.classes.map(cls =>
          cls.id === action.payload.id ? action.payload : cls
        )
      };
    case 'DELETE_CLASS':
      return {
        ...state,
        classes: state.classes.filter(cls => cls.id !== action.payload)
      };
    case 'ADD_SUBJECT':
      return { ...state, subjects: [...state.subjects, action.payload] };
    case 'UPDATE_SUBJECT':
      return {
        ...state,
        subjects: state.subjects.map(subject =>
          subject.id === action.payload.id ? action.payload : subject
        )
      };
    case 'DELETE_SUBJECT':
      return {
        ...state,
        subjects: state.subjects.filter(subject => subject.id !== action.payload)
      };
    case 'ADD_FEE':
      return { ...state, fees: [...state.fees, action.payload] };
    case 'UPDATE_FEE':
      return {
        ...state,
        fees: state.fees.map(fee =>
          fee.id === action.payload.id ? action.payload : fee
        )
      };
    case 'DELETE_FEE':
      return {
        ...state,
        fees: state.fees.filter(fee => fee.id !== action.payload)
      };
    case 'ADD_COMPLAINT':
      return { ...state, complaints: [...state.complaints, action.payload] };
    case 'UPDATE_COMPLAINT':
      return {
        ...state,
        complaints: state.complaints.map(complaint =>
          complaint.id === action.payload.id ? action.payload : complaint
        )
      };
    case 'DELETE_COMPLAINT':
      return {
        ...state,
        complaints: state.complaints.filter(complaint => complaint.id !== action.payload)
      };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(message =>
          message.id === action.payload.id ? action.payload : message
        )
      };
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(message => message.id !== action.payload)
      };
    case 'UPDATE_SCHOOL_INFO':
      return { ...state, schoolInfo: { ...state.schoolInfo, ...action.payload } };
    case 'ADD_STORE_PRODUCT':
      return { ...state, storeProducts: [...state.storeProducts, action.payload] };
    case 'UPDATE_STORE_PRODUCT':
      return {
        ...state,
        storeProducts: state.storeProducts.map(product =>
          product.id === action.payload.id ? action.payload : product
        )
      };
    case 'DELETE_STORE_PRODUCT':
      return {
        ...state,
        storeProducts: state.storeProducts.filter(product => product.id !== action.payload)
      };
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    default:
      return state;
  }
}

// Context interface
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
